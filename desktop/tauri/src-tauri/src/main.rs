#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod connectors;

use connectors::DetectedAccount;
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::thread::sleep;
use std::time::Duration;
use tauri::Manager;

const LOCAL_RUNTIME_HOST: &str = "127.0.0.1";
const LOCAL_RUNTIME_PORT: u16 = 4173;

struct RuntimeProcess(Mutex<Option<Child>>);

fn wait_for_runtime_port() -> bool {
	let address = format!("{LOCAL_RUNTIME_HOST}:{LOCAL_RUNTIME_PORT}");
	for _ in 0..40 {
		if TcpStream::connect(&address).is_ok() {
			return true;
		}
		sleep(Duration::from_millis(250));
	}
	false
}

fn resolve_runtime_root(app: &tauri::AppHandle) -> Option<PathBuf> {
	let resource_dir = app.path().resource_dir().ok()?;
	let runtime_dir = resource_dir.join("next-runtime");
	if runtime_dir.exists() {
		return Some(runtime_dir);
	}
	None
}

fn start_local_runtime(app: &tauri::AppHandle) -> Result<Child, String> {
	let runtime_root = resolve_runtime_root(app)
		.ok_or_else(|| String::from("Unable to resolve next-runtime resources directory."))?;
	let launcher_path = runtime_root.join("start-runtime.cjs");
	if !launcher_path.exists() {
		return Err(String::from(
			"start-runtime.cjs not found in next-runtime resources.",
		));
	}

	let mut command = Command::new("node");
	command
		.current_dir(&runtime_root)
		.arg(launcher_path)
		.env("PORT", LOCAL_RUNTIME_PORT.to_string())
		.env("HOSTNAME", LOCAL_RUNTIME_HOST)
		.env("NODE_ENV", "production");

	command
		.spawn()
		.map_err(|error| format!("Failed to spawn Node runtime: {error}"))
}

/// Detects a locally logged-in account for the given AI provider.
/// Called from the frontend via `invoke("detect_local_accounts", { provider: "gemini-cli" })`.
#[tauri::command]
fn detect_local_accounts(provider: String) -> Option<DetectedAccount> {
	match provider.as_str() {
		"gemini-cli" => connectors::detect_gemini(),
		"codex" => connectors::detect_codex(),
		"zed" => connectors::detect_zed(),
		"cursor" => connectors::detect_cursor(),
		"windsurf" => connectors::detect_windsurf(),
		"github-copilot" => connectors::detect_copilot(),
		_ => None,
	}
}

/// Detects ALL locally logged-in accounts for the given provider.
/// Useful for providers that support multiple simultaneous sessions (e.g. Zed).
/// Returns an empty Vec when no accounts are found.
/// Called from the frontend via `invoke("detect_multiple_local_accounts", { provider: "zed" })`.
#[tauri::command]
fn detect_multiple_local_accounts(provider: String) -> Vec<DetectedAccount> {
	match provider.as_str() {
		"zed" => connectors::detect_zed_multiple(),
		// For single-account providers, wrap the Option into a Vec
		other => detect_local_accounts(other.to_string())
			.map(|a| vec![a])
			.unwrap_or_default(),
	}
}

/// Sends a native OS notification when a quota threshold is exceeded.
/// In desktop mode with the `notifications` feature enabled, this produces
/// a real OS toast. In web/fallback mode it logs to stderr.
/// Called from the frontend via `invoke("send_quota_alert", { title, body })`.
#[tauri::command]
fn send_quota_alert(app: tauri::AppHandle, title: String, body: String) {
	#[cfg(feature = "notifications")]
	{
		use tauri_plugin_notification::NotificationExt;
		let _ = app
			.notification()
			.builder()
			.title(&title)
			.body(&body)
			.show();
	}
	#[cfg(not(feature = "notifications"))]
	{
		let _ = &app; // suppress unused warning
		eprintln!("[quota-alert] {title}: {body}");
	}
}

fn main() {
	let app = tauri::Builder::default()
		.manage(RuntimeProcess(Mutex::new(None)))
		.invoke_handler(tauri::generate_handler![
			detect_local_accounts,
			detect_multiple_local_accounts,
			send_quota_alert
		])
		// Register the native notification plugin when the feature is enabled
		.setup(|app| {
			#[cfg(feature = "notifications")]
			app.handle().plugin(tauri_plugin_notification::init())?;
			#[cfg(not(debug_assertions))]
			{
				match start_local_runtime(app.handle()) {
					Ok(child) => {
						let state = app.state::<RuntimeProcess>();
						if let Ok(mut process_slot) = state.0.lock() {
							*process_slot = Some(child);
						}

						if wait_for_runtime_port() {
							if let Some(window) = app.get_webview_window("main") {
								let runtime_url =
									format!("http://{LOCAL_RUNTIME_HOST}:{LOCAL_RUNTIME_PORT}");
								if let Err(error) =
									window.eval(&format!("window.location.replace('{runtime_url}');"))
								{
									eprintln!("Failed to navigate to runtime URL: {error}");
								}
							}
						} else {
							eprintln!("Desktop runtime did not start within the expected timeout.");
						}
					}
					Err(error) => {
						eprintln!("{error}");
					}
				}
			}
			// ── Scheduled backup daemon ────────────────────────────────────────
			// Spawns a background thread that creates an automatic backup every
			// 24 hours while the Tauri app is running. This is the desktop
			// equivalent of the web-mode useScheduledBackup hook.
			//
			// The thread wakes every 24h and POSTs to the Next.js backup API
			// via raw HTTP. On first launch it waits 30 seconds to ensure the
			// runtime is ready.
			std::thread::spawn(move || {
				const INITIAL_DELAY_SECS: u64 = 30;
				const INTERVAL_SECS: u64 = 24 * 60 * 60; // 24 hours
				let addr = format!("{LOCAL_RUNTIME_HOST}:{LOCAL_RUNTIME_PORT}");

				// Wait for app to fully initialize before first backup attempt
				sleep(Duration::from_secs(INITIAL_DELAY_SECS));

				loop {
					// Generate ISO-like date string from system time
					let secs_since_epoch = std::time::SystemTime::now()
						.duration_since(std::time::UNIX_EPOCH)
						.unwrap_or_default()
						.as_secs();
					// Simplified date: days since epoch → rough YYYY-MM-DD approximation
					let days = secs_since_epoch / 86400;
					let label = format!("Auto-backup (desktop) day-{days}");

					// Build JSON body
					let body = format!("{{\"label\":\"{label}\"}}");
					let request = format!(
						"POST /api/export/backup/schedule HTTP/1.1\r\nHost: {LOCAL_RUNTIME_HOST}:{LOCAL_RUNTIME_PORT}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
						body.len()
					);

					// Best-effort HTTP POST — ignore errors silently
					if let Ok(mut stream) = TcpStream::connect(&addr) {
						use std::io::Write;
						let _ = stream.write_all(request.as_bytes());
					}

					// Sleep for the full 24h interval
					sleep(Duration::from_secs(INTERVAL_SECS));
				}
			});
			// ── End of scheduled backup daemon ─────────────────────────────────────
			Ok(())
		})
		.build(tauri::generate_context!())
		.expect("error while building tauri application");

	app.run(|app_handle, event| {
		if let tauri::RunEvent::ExitRequested { .. } = event {
			let state = app_handle.state::<RuntimeProcess>();
			let mut process_slot = match state.0.lock() {
				Ok(guard) => guard,
				Err(_) => return,
			};

			if let Some(child) = process_slot.as_mut() {
				let _ = child.kill();
				let _ = child.wait();
			}
			*process_slot = None;
		}
	});
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Strips the `\\?\` extended-length UNC prefix that Rust's PathBuf can produce
/// on Windows. Node.js does not accept that prefix as a script argument.
fn normalize_path_for_arg(path: &std::path::Path) -> String {
	let s = path.to_string_lossy();
	if let Some(stripped) = s.strip_prefix(r"\\?\") {
		stripped.to_string()
	} else {
		s.into_owned()
	}
}

mod connectors;

use connectors::DetectedAccount;
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::thread::sleep;
use std::time::Duration;
use tauri::Manager;

const LOCAL_RUNTIME_HOST: &str = "127.0.0.1";
const LOCAL_RUNTIME_PORT: u16 = 4173;

/// Polls TCP port 4173 every 500 ms for up to 60 s.
/// Returns true only when a real TCP connection is accepted.
/// This is reliable — unlike fetch(mode:'no-cors') in WebView2 which can
/// resolve immediately even when the port is not listening.
fn wait_for_runtime_port() -> bool {
	let address = format!("{LOCAL_RUNTIME_HOST}:{LOCAL_RUNTIME_PORT}");
	for _ in 0..120 {
		if TcpStream::connect(&address).is_ok() {
			return true;
		}
		sleep(Duration::from_millis(500));
	}
	false
}

fn resolve_runtime_root(app: &tauri::AppHandle) -> Option<PathBuf> {
	let resource_dir = app.path().resource_dir().ok()?;
	let runtime_dir = resource_dir.join("next-runtime");
	runtime_dir.exists().then_some(runtime_dir)
}

fn start_local_runtime(app: &tauri::AppHandle) -> Result<Child, String> {
	let runtime_root = resolve_runtime_root(app)
		.ok_or_else(|| String::from("Unable to resolve next-runtime directory."))?;

	let launcher_path = runtime_root.join("start-runtime.cjs");
	if !launcher_path.exists() {
		return Err(String::from("start-runtime.cjs not found."));
	}

	let launcher_arg = normalize_path_for_arg(&launcher_path);

	let mut command = Command::new("node");
	command
		.current_dir(&runtime_root)
		.arg(&launcher_arg)
		.env("PORT", LOCAL_RUNTIME_PORT.to_string())
		.env("HOSTNAME", LOCAL_RUNTIME_HOST)
		.env("NODE_ENV", "production");

	// Windows: hide the Node.js console window entirely.
	#[cfg(target_os = "windows")]
	{
		use std::os::windows::process::CommandExt;
		const CREATE_NO_WINDOW: u32 = 0x0800_0000;
		command.creation_flags(CREATE_NO_WINDOW);
	}

	command
		.spawn()
		.map_err(|e| format!("Failed to spawn Node runtime: {e}"))
}

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

#[tauri::command]
fn detect_multiple_local_accounts(provider: String) -> Vec<DetectedAccount> {
	match provider.as_str() {
		"zed" => connectors::detect_zed_multiple(),
		other => detect_local_accounts(other.to_string())
			.map(|a| vec![a])
			.unwrap_or_default(),
	}
}

#[tauri::command]
fn send_quota_alert(app: tauri::AppHandle, title: String, body: String) {
	#[cfg(feature = "notifications")]
	{
		use tauri_plugin_notification::NotificationExt;
		let _ = app.notification().builder().title(&title).body(&body).show();
	}
	#[cfg(not(feature = "notifications"))]
	{
		let _ = &app;
		eprintln!("[quota-alert] {title}: {body}");
	}
}

fn main() {
	// Use a plain Arc<Mutex<>> instead of Tauri's state system for the child
	// process. Tauri's State<'_, T> has a lifetime tied to the App reference
	// inside setup(), which causes borrow-checker errors when combined with
	// MutexGuard temporaries. Arc<Mutex<>> is simpler and lifetime-free.
	let node_process: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
	let node_for_setup = node_process.clone();
	let node_for_exit = node_process.clone();

	let app = tauri::Builder::default()
		.invoke_handler(tauri::generate_handler![
			detect_local_accounts,
			detect_multiple_local_accounts,
			send_quota_alert
		])
		.setup(move |app| {
			#[cfg(feature = "notifications")]
			app.handle().plugin(tauri_plugin_notification::init())?;

			// In release builds only: spawn the embedded Node.js server.
			// setup() must return immediately — blocking it freezes the Tauri
			// event loop and makes the window unresponsive.
			#[cfg(not(debug_assertions))]
			{
				match start_local_runtime(app.handle()) {
					Ok(child) => {
						// Store the child handle for cleanup on exit.
						if let Ok(mut slot) = node_for_setup.lock() {
							*slot = Some(child);
						}

						// ── Background navigation thread ─────────────────────────────
						// Polls the TCP port reliably (no false-positives unlike
						// fetch+no-cors in WebView2) and navigates via window.eval(),
						// which is thread-safe in Tauri (dispatched to the WebView
						// thread internally).
						let app_handle = app.handle().clone();
						std::thread::spawn(move || {
							if wait_for_runtime_port() {
								// 800 ms grace: let Next.js finish first-render warm-up
								// after the TCP port opens but before we navigate.
								sleep(Duration::from_millis(800));
								if let Some(window) = app_handle.get_webview_window("main") {
									// Navigate to the desktop-init endpoint which:
									//   1. Expires the session cookie server-side (reliable)
									//   2. Redirects to /login
									// This prevents stale WebView2 cookies from skipping
									// the login screen and causing 401 loops / blank content.
									let url = format!(
										"http://{LOCAL_RUNTIME_HOST}:{LOCAL_RUNTIME_PORT}/api/auth/desktop-init"
									);
									let _ = window.eval(&format!(
										"window.location.replace('{url}');"
									));
								}
							} else {
								eprintln!("[runtime] Server did not start within 60 s.");
							}
						});
						// ── End navigation thread ────────────────────────────────────
					}
					Err(e) => eprintln!("[runtime] Failed to start Node: {e}"),
				}
			}

			// ── Scheduled backup daemon (24 h) ────────────────────────────────
			std::thread::spawn(move || {
				const INITIAL_DELAY: u64 = 30;
				const INTERVAL: u64 = 24 * 60 * 60;
				let addr = format!("{LOCAL_RUNTIME_HOST}:{LOCAL_RUNTIME_PORT}");
				sleep(Duration::from_secs(INITIAL_DELAY));
				loop {
					let days = std::time::SystemTime::now()
						.duration_since(std::time::UNIX_EPOCH)
						.unwrap_or_default()
						.as_secs()
						/ 86400;
					let label = format!("Auto-backup (desktop) day-{days}");
					let body = format!("{{\"label\":\"{label}\"}}");
					let req = format!(
						"POST /api/export/backup/schedule HTTP/1.1\r\n\
						Host: {LOCAL_RUNTIME_HOST}:{LOCAL_RUNTIME_PORT}\r\n\
						Content-Type: application/json\r\n\
						Content-Length: {}\r\n\
						Connection: close\r\n\r\n{body}",
						body.len()
					);
					if let Ok(mut s) = TcpStream::connect(&addr) {
						use std::io::Write;
						let _ = s.write_all(req.as_bytes());
					}
					sleep(Duration::from_secs(INTERVAL));
				}
			});
			// ── End backup daemon ─────────────────────────────────────────────

			Ok(())
		})
		.build(tauri::generate_context!())
		.expect("error while building tauri application");

	app.run(move |_app_handle, event| {
		if let tauri::RunEvent::ExitRequested { .. } = event {
			if let Ok(mut slot) = node_for_exit.lock() {
				if let Some(child) = slot.as_mut() {
					let _ = child.kill();
					let _ = child.wait();
				}
				*slot = None;
			}
		}
	});
}

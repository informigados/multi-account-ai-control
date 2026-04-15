#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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

fn main() {
	let app = tauri::Builder::default()
		.manage(RuntimeProcess(Mutex::new(None)))
		.setup(|app| {
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

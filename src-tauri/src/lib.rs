use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

struct ServerProcess(Mutex<Option<Child>>);

/// Find the `node` binary — checks nvm locations then common fixed paths.
fn find_node() -> Option<PathBuf> {
    let home = std::env::var("HOME").unwrap_or_default();

    // Scan all nvm-managed versions
    if let Ok(entries) = std::fs::read_dir(format!("{home}/.nvm/versions/node")) {
        for entry in entries.flatten() {
            let candidate = entry.path().join("bin").join("node");
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    // Common fixed paths (Homebrew, system)
    for path in &[
        "/usr/local/bin/node",
        "/opt/homebrew/bin/node",
        "/usr/bin/node",
    ] {
        let p = PathBuf::from(path);
        if p.exists() {
            return Some(p);
        }
    }

    // Last resort: ask the shell
    if let Ok(out) = Command::new("which").arg("node").output() {
        if out.status.success() {
            let s = String::from_utf8(out.stdout).unwrap_or_default();
            let s = s.trim();
            if !s.is_empty() {
                return Some(PathBuf::from(s));
            }
        }
    }

    None
}

/// Bind to port 0 to let the OS give us a free port, then release and return it.
fn find_free_port() -> u16 {
    use std::net::TcpListener;
    // Prefer something in the 4000-range so it doesn't clash with common dev servers
    for port in 4321u16..4400 {
        if TcpListener::bind(format!("127.0.0.1:{port}")).is_ok() {
            return port;
        }
    }
    // Fallback: let the OS pick
    let l = TcpListener::bind("127.0.0.1:0").expect("no free port");
    l.local_addr().unwrap().port()
}

/// Poll until the given port accepts a TCP connection (or timeout).
fn wait_for_port(port: u16, timeout_secs: u64) -> bool {
    let deadline = std::time::Instant::now() + Duration::from_secs(timeout_secs);
    while std::time::Instant::now() < deadline {
        if std::net::TcpStream::connect(format!("127.0.0.1:{port}")).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(300));
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ServerProcess(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                // Dev mode: beforeDevCommand already starts `npm run dev`.
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
                return Ok(());
            }

            // ── Production / release mode ────────────────────────────────────
            let resource_dir = app
                .path()
                .resource_dir()
                .expect("Could not resolve resource directory");

            let server_dir = resource_dir.join("server");
            let server_js  = server_dir.join("server.js");

            if !server_js.exists() {
                eprintln!("❌  server.js not found at {server_js:?}");
                return Ok(());
            }

            // Writable data directory (persists between app launches)
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Could not resolve app data directory");
            std::fs::create_dir_all(&data_dir).ok();

            // Seed the database from the bundled snapshot on first launch
            let bundled_db = server_dir.join("data").join("dashboard.db");
            let live_db    = data_dir.join("dashboard.db");
            if !live_db.exists() && bundled_db.exists() {
                std::fs::copy(&bundled_db, &live_db).ok();
                eprintln!("📦  Seeded database from bundle");
            }

            let node = match find_node() {
                Some(p) => p,
                None => {
                    eprintln!("❌  Could not find the node binary");
                    return Ok(());
                }
            };

            // Pick a free port so we never clash with `npm run dev` on 3000
            let port = find_free_port();
            eprintln!("🚀  Starting server on port {port} using {node:?}");

            // Log server output to a file so errors are visible
            let log_path = data_dir.join("server.log");
            let log_file = std::fs::OpenOptions::new()
                .create(true).write(true).truncate(true)
                .open(&log_path)
                .expect("Cannot open log file");
            let log_err = log_file.try_clone().expect("Cannot clone log file");

            let child = Command::new(&node)
                .arg(&server_js)
                .current_dir(&server_dir)
                .env("PORT",                 port.to_string())
                .env("HOSTNAME",             "127.0.0.1")
                .env("DASHBOARD_DATA_DIR",   &data_dir)
                .stdout(log_file)
                .stderr(log_err)
                .spawn()
                .expect("Failed to spawn Next.js server");

            *app.state::<ServerProcess>().0.lock().unwrap() = Some(child);

            // Wait for the server in a background thread, then load the URL
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                if wait_for_port(port, 30) {
                    let url = format!("http://localhost:{port}");
                    eprintln!("✅  Server ready — navigating to {url}");
                    if let Some(win) = handle.get_webview_window("main") {
                        let _ = win.navigate(url.parse().unwrap());
                    }
                } else {
                    eprintln!("⏱  Timed out waiting for server on :{port}");
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(child) = window
                    .app_handle()
                    .state::<ServerProcess>()
                    .0
                    .lock()
                    .unwrap()
                    .as_mut()
                {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

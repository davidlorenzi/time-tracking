use std::fs;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, WindowEvent,
};

/// Becomes `true` a short moment after startup. Until then, window-moved events are the
/// OS placing the window (or our own repositioning), not the user dragging it — ignore them
/// so a transient startup placement never overwrites the saved position.
struct Settled(Arc<AtomicBool>);

/// Whether `position` would leave at least a corner of the window actually on some monitor.
/// A saved position computed for a since-changed display arrangement can otherwise point
/// completely off-screen, making the widget "disappear" on every future launch.
fn position_is_visible(window: &tauri::WebviewWindow, position: PhysicalPosition<i32>) -> bool {
    let Ok(monitors) = window.available_monitors() else {
        return false;
    };
    let size = window
        .outer_size()
        .unwrap_or(tauri::PhysicalSize::new(720, 400));
    let win_right = position.x + size.width as i32;
    let win_bottom = position.y + size.height as i32;
    monitors.iter().any(|m| {
        let mp = m.position();
        let ms = m.size();
        let visible_w = win_right.min(mp.x + ms.width as i32) - position.x.max(mp.x);
        let visible_h = win_bottom.min(mp.y + ms.height as i32) - position.y.max(mp.y);
        visible_w > 100 && visible_h > 100
    })
}

#[derive(Serialize, Deserialize)]
struct SavedPosition {
    x: i32,
    y: i32,
}

fn position_file(app: &AppHandle) -> Option<std::path::PathBuf> {
    let dir = app.path().app_data_dir().ok()?;
    fs::create_dir_all(&dir).ok()?;
    Some(dir.join("widget-position.json"))
}

fn load_saved_position(app: &AppHandle) -> Option<PhysicalPosition<i32>> {
    let path = position_file(app)?;
    let data = fs::read_to_string(path).ok()?;
    let saved: SavedPosition = serde_json::from_str(&data).ok()?;
    Some(PhysicalPosition::new(saved.x, saved.y))
}

fn save_position(app: &AppHandle, position: PhysicalPosition<i32>) {
    let Some(path) = position_file(app) else {
        return;
    };
    let saved = SavedPosition {
        x: position.x,
        y: position.y,
    };
    if let Ok(json) = serde_json::to_string(&saved) {
        let _ = fs::write(path, json);
    }
}

#[cfg(target_os = "macos")]
#[allow(deprecated)]
mod desktop_widget {
    use cocoa::appkit::NSWindowCollectionBehavior;
    use cocoa::base::id;
    use objc::{msg_send, sel, sel_impl};

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGWindowLevelForKey(key: i32) -> i32;
    }

    const DESKTOP_ICON_WINDOW_LEVEL_KEY: i32 = 18;

    /// One above the desktop icons: below every normal app window, but above Finder's
    /// desktop window, which would otherwise swallow clicks meant for the widget.
    fn desktop_widget_level() -> i64 {
        unsafe { CGWindowLevelForKey(DESKTOP_ICON_WINDOW_LEVEL_KEY) as i64 + 1 }
    }

    /// Pins the window to the desktop like a native widget: always behind other windows,
    /// visible on every Space and skipped by Cmd+Tab / Mission Control.
    pub fn pin_as_widget(window: &tauri::WebviewWindow) {
        if let Ok(ns_window) = window.ns_window() {
            let ns_window = ns_window as id;
            unsafe {
                let behavior = NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
                    | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
                    | NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle
                    | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary;
                let _: () = msg_send![ns_window, setCollectionBehavior: behavior];
                let _: () = msg_send![ns_window, setLevel: desktop_widget_level()];
            }
        }
    }

    pub fn move_to_secondary_monitor(window: &tauri::WebviewWindow) {
        let Ok(monitors) = window.available_monitors() else {
            return;
        };
        if monitors.len() < 2 {
            return;
        }
        let primary_pos = window.primary_monitor().ok().flatten().map(|m| *m.position());
        if let Some(secondary) = monitors.iter().find(|m| Some(*m.position()) != primary_pos) {
            let pos = secondary.position();
            let margin = 32;
            let _ = window.set_position(tauri::PhysicalPosition::new(pos.x + margin, pos.y + margin));
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let window = app.get_webview_window("main").unwrap();

            let restored_saved_position = load_saved_position(app.handle())
                .filter(|position| position_is_visible(&window, *position))
                .map(|position| window.set_position(position).is_ok())
                .unwrap_or(false);
            if !restored_saved_position {
                #[cfg(target_os = "macos")]
                desktop_widget::move_to_secondary_monitor(&window);
            }

            #[cfg(target_os = "macos")]
            desktop_widget::pin_as_widget(&window);

            window.show()?;

            let settled = Arc::new(AtomicBool::new(false));
            app.manage(Settled(settled.clone()));
            thread::spawn(move || {
                thread::sleep(Duration::from_millis(500));
                settled.store(true, Ordering::SeqCst);
            });

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| match event {
            // Clicking outside, or an accidental close, just hides the widget instead of
            // quitting or losing it — the tray icon brings it back.
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            // Remembers where you dragged it to, so it reopens in the same spot next time.
            // Ignored during the brief startup window, when "moved" events are just the OS
            // or our own code placing it, not a real drag.
            WindowEvent::Moved(position) => {
                if window.state::<Settled>().0.load(Ordering::SeqCst) {
                    save_position(&window.app_handle().clone(), *position);
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

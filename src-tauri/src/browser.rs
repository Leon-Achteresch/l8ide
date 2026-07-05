use tauri::webview::{PageLoadEvent, WebviewBuilder};
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Position, Rect, Size, Url,
    WebviewUrl,
};

const LABEL: &str = "browser";

fn bounds(x: f64, y: f64, width: f64, height: f64) -> Rect {
    Rect {
        position: Position::Logical(LogicalPosition::new(x, y)),
        size: Size::Logical(LogicalSize::new(width.max(1.0), height.max(1.0))),
    }
}

#[tauri::command]
pub fn browser_open(
    app: AppHandle,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(view) = app.get_webview(LABEL) {
        view.set_bounds(bounds(x, y, width, height))
            .map_err(|e| e.to_string())?;
        return view.show().map_err(|e| e.to_string());
    }

    let target = Url::parse(&url).map_err(|e| e.to_string())?;
    let window = app
        .get_webview_window("main")
        .ok_or("main window missing")?
        .as_ref()
        .window();

    let title = app.clone();
    let load = app.clone();
    let builder = WebviewBuilder::new(LABEL, WebviewUrl::External(target))
        .on_navigation(|_| true)
        .on_document_title_changed(move |_, t| {
            let _ = title.emit("browser-title", t);
        })
        .on_page_load(move |view, payload| match payload.event() {
            PageLoadEvent::Started => {
                let _ = load.emit("browser-loading", true);
            }
            PageLoadEvent::Finished => {
                let _ = load.emit("browser-loading", false);
                if let Ok(u) = view.url() {
                    let _ = load.emit("browser-url", u.to_string());
                }
            }
        });

    window
        .add_child(
            builder,
            LogicalPosition::new(x, y),
            LogicalSize::new(width.max(1.0), height.max(1.0)),
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn browser_set_bounds(
    app: AppHandle,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(view) = app.get_webview(LABEL) {
        view.set_bounds(bounds(x, y, width, height))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_show(app: AppHandle, visible: bool) -> Result<(), String> {
    if let Some(view) = app.get_webview(LABEL) {
        if visible {
            view.show()
        } else {
            view.hide()
        }
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_navigate(app: AppHandle, url: String) -> Result<(), String> {
    let target = Url::parse(&url).map_err(|e| e.to_string())?;
    if let Some(view) = app.get_webview(LABEL) {
        view.navigate(target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_eval(app: AppHandle, js: String) -> Result<(), String> {
    if let Some(view) = app.get_webview(LABEL) {
        view.eval(js).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn browser_close(app: AppHandle) -> Result<(), String> {
    if let Some(view) = app.get_webview(LABEL) {
        view.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

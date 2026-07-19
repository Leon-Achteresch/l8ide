use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpListener;
use tauri::{AppHandle, Emitter};

pub fn start(app: AppHandle) -> Option<u16> {
    let listener = TcpListener::bind("127.0.0.1:0").ok()?;
    let port = listener.local_addr().ok()?.port();
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(mut stream) = stream else { continue };
            let app = app.clone();
            std::thread::spawn(move || {
                let mut reader = BufReader::new(&mut stream);
                let mut request_line = String::new();
                if reader.read_line(&mut request_line).is_err() {
                    return;
                }
                let is_post = request_line.starts_with("POST");
                let mut content_length = 0usize;
                loop {
                    let mut header = String::new();
                    if reader.read_line(&mut header).is_err() {
                        return;
                    }
                    let trimmed = header.trim();
                    if trimmed.is_empty() {
                        break;
                    }
                    if let Some(v) = trimmed
                        .to_ascii_lowercase()
                        .strip_prefix("content-length:")
                    {
                        content_length = v.trim().parse().unwrap_or(0);
                    }
                }
                let len = content_length.min(1_000_000);
                let mut body = vec![0u8; len];
                if len > 0 && reader.read_exact(&mut body).is_err() {
                    return;
                }
                if is_post {
                    if let Ok(text) = String::from_utf8(body) {
                        let _ = app.emit("browser-console", text);
                    }
                }
                let _ = stream.write_all(
                    b"HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: content-type\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
                );
            });
        }
    });
    Some(port)
}

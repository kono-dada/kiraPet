// src/active_window_watcher.rs

use std::collections::HashMap;
use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use x_win::get_active_window;

/// 一分钟汇总的 payload：
/// - total_secs: 本周期实际统计的秒数（一般≈60）
/// - by_title: 各个窗口 title 在这一分钟内被激活的总秒数
#[derive(Debug, Serialize, Clone)]
pub struct MinuteActiveSummary {
    pub total_secs: u64,
    pub by_title_app: HashMap<String, u64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ActiveWindowPayload {
    pub title: String,
    pub app_name: Option<String>,
}

/// 启动一个后台线程：
/// - 每秒采样当前活跃窗口
/// - 用 HashMap 累加每个 title 的“激活秒数”
/// - 每分钟发射一次事件 "window-active-minute"
pub fn spawn_active_window_watcher(app_handle: AppHandle) {
    thread::spawn(move || {
        let mut stats_title_app: HashMap<String, u64> = HashMap::new();
        let mut minute_start = Instant::now();
        let mut total_secs_in_current_window = 0u64;

        loop {
            // 1. 每秒尝试获取一次当前活动窗口
            if let Ok(win) = get_active_window() {
                let title = if win.title.is_empty() {
                    // 防御：有的窗口可能拿不到标题
                    "<untitled>".to_string()
                } else {
                    win.title.clone()
                };

                let exec_name_key = if win.info.exec_name.is_empty() {
                    "<unknown-exec>".to_string()
                } else {
                    win.info.exec_name.clone()
                };

                let combined_key = format!("{}-{}", title, exec_name_key);
                *stats_title_app.entry(combined_key).or_insert(0) += 1;

                let payload = ActiveWindowPayload {
                    title: win.title,
                    app_name: Some(exec_name_key)
                };

                if let Err(e) = app_handle.emit("WINDOW_ACTIVE", &payload) {
                    eprintln!("failed to emit window-active event: {e}");
                }
                total_secs_in_current_window += 1;
            } else {
                // 拿不到窗口时，你可以选择：
                // - 忽略这一秒
                // - 或者统计到一个特殊 key，比如 "<no-active-window>"
                // 这里先选择忽略
            }

            // 2. 检查是否已经过了一分钟
            if minute_start.elapsed() >= Duration::from_secs(60) {
                // 构造 payload
                let payload = MinuteActiveSummary {
                    total_secs: total_secs_in_current_window,
                    by_title_app: stats_title_app.clone(),
                };

                // 发事件给前端
                if let Err(e) = app_handle.emit("WINDOW_ACTIVE_MINUTE", &payload) {
                    eprintln!("failed to emit window-active-minute event: {e}");
                }

                // 重置本轮统计
                stats_title_app.clear();
                total_secs_in_current_window = 0;
                minute_start = Instant::now();
            }

            // 3. 每秒采样
            thread::sleep(Duration::from_secs(1));
        }
    });
}

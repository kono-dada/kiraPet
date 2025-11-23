import { ref } from 'vue';

// 简单的事件日志总线，外部通过 pushLog 追加事件
export type LogItem = {
  id: number;
  text: string;
  time: string;
  createdAt: number;
  color: LogColor;
};

const logs = ref<LogItem[]>([]);
let idSeed = 0;
const MAX_ITEMS = 5; // 视图区域高度有限，只保留最新 5 条
export type LogColor = 'info' | 'success' | 'warning' | 'error' | 'muted';
const allowedColors: LogColor[] = ['info', 'success', 'warning', 'error', 'muted'];

// 随机选一个颜色
export function getRandomColor(): LogColor {
  const index = Math.floor(Math.random() * allowedColors.length);
  return allowedColors[index];
}

// 允许外部指定颜色，不在预设列表时回落为 info
export function pushLog(text: string, color: LogColor = 'info') {
  const now = new Date();
  const time = now.toLocaleTimeString('zh-CN', { hour12: false });
  const safeColor = allowedColors.includes(color) ? color : 'info';
  const item: LogItem = {
    id: ++idSeed,
    text,
    time,
    createdAt: now.getTime(),
    color: safeColor
  };
  // 最新事件插入顶部
  logs.value = [item, ...logs.value].slice(0, MAX_ITEMS);
}

export function useEventLog() {
  return { logs, allowedColors };
}

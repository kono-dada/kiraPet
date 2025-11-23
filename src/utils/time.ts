// 将绝对时间转为中文相对时间，精确到秒：
// 例如 “37秒前/12分5秒前/3小时01分09秒前/2天3小时4分8秒前/1年2个月3天...”
export function formatRelativeTime(iso: string, nowMs: number): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return iso
  let diff = Math.max(0, Math.floor((nowMs - t) / 1000))

  const YEAR = 365 * 24 * 3600
  const MONTH = 30 * 24 * 3600
  const DAY = 24 * 3600
  const HOUR = 3600
  const MIN = 60

  const y = Math.floor(diff / YEAR); diff -= y * YEAR
  const mo = Math.floor(diff / MONTH); diff -= mo * MONTH
  const d = Math.floor(diff / DAY); diff -= d * DAY
  const h = Math.floor(diff / HOUR); diff -= h * HOUR
  const m = Math.floor(diff / MIN); diff -= m * MIN
  const s = diff

  const parts: string[] = []
  if (y) parts.push(`${y}年`)
  if (mo) parts.push(`${mo}个月`)
  if (d) parts.push(`${d}天`)
  // 小时/分/秒始终展示到秒，但跳过前导 0 的大单位以避免噪音
  if (h) parts.push(`${h}小时`)
  if (m || (!y && !mo && !d && !h)) parts.push(`${m}分`)
  parts.push(`${s}秒`)

  return parts.join('') + '前'
}

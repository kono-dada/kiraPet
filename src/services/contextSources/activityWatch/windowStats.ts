// 窗口活跃时长统计工具
import { ActivityWatchClient, AWEvent } from './activitywatchClient.js'

export interface WindowEventData {
  app?: string
  title?: string
  url?: string
  [k: string]: any
}

export interface WindowDurationStat {
  app?: string
  title?: string
  totalMs: number
}

interface ResolveBucketOptions {
  bucketId?: string
}

interface WindowStatOptions extends ResolveBucketOptions {
  pastMs: number
  now?: Date
  limit?: number
}

async function resolveWindowBucket(client: ActivityWatchClient, bucketId?: string): Promise<string> {
  if (bucketId) return bucketId
  const buckets = await client.listBuckets()
  const found = buckets.find(b => b.startsWith('aw-watcher-window'))
  if (!found) throw new Error('未找到 aw-watcher-window 开头的 bucket')
  return found
}

function overlapMs(event: AWEvent<WindowEventData>, startMs: number, endMs: number): number {
  const ts = Date.parse(event.timestamp)
  if (!Number.isFinite(ts)) return 0
  const durationMs = Math.max(0, Math.round((event.duration ?? 0) * 1000))
  const eventEnd = ts + durationMs
  const overlap = Math.min(eventEnd, endMs) - Math.max(ts, startMs)
  return Math.max(0, overlap)
}

// 统计过去 t 毫秒内窗口的活跃时长，按 app+title 聚合
export async function getWindowActiveDurations(
  client: ActivityWatchClient,
  options: WindowStatOptions
): Promise<WindowDurationStat[]> {
  const { pastMs, now = new Date(), bucketId, limit = 5000 } = options
  if (!client) throw new Error('client 不能为空')
  if (!Number.isFinite(pastMs) || pastMs <= 0) throw new Error('pastMs 必须为正数')

  const resolvedBucket = await resolveWindowBucket(client, bucketId)
  const end = now
  const start = new Date(end.getTime() - pastMs)

  const events = await client.getBucketEvents<WindowEventData>(resolvedBucket, {
    start,
    end,
    limit,
    sort: 'asc',
  })

  const startMs = start.getTime()
  const endMs = end.getTime()
  const statMap = new Map<string, WindowDurationStat>()

  for (const e of events) {
    const overlap = overlapMs(e, startMs, endMs)
    if (!overlap) continue
    const app = e.data?.app
    const title = e.data?.title
    const key = `${app ?? 'unknown'}::${title ?? ''}`
    const prev = statMap.get(key) ?? { app, title, totalMs: 0 }
    prev.totalMs += overlap
    statMap.set(key, prev)
  }

  return Array.from(statMap.values()).sort((a, b) => b.totalMs - a.totalMs)
}

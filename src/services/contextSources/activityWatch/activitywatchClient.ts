// 只读的 ActivityWatch 客户端，便于在 Node 与 Tauri 间复用 fetch。

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<FetchResponseLike>

export interface FetchResponseLike {
  ok: boolean
  status: number
  statusText: string
  json(): Promise<any>
}

export interface AWEvent<T = any> {
  timestamp: string
  duration?: number
  data?: T
  [k: string]: any
}

export interface GetEventsParams {
  start?: Date | string
  end?: Date | string
  limit?: number
  offset?: number
  sort?: 'asc' | 'desc'
}

function toISO(val?: Date | string): string | undefined {
  if (!val) return undefined
  if (typeof val === 'string') return val
  try {
    return val.toISOString()
  } catch {
    return undefined
  }
}

function withQuery(url: string, params: Record<string, any | undefined>): string {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    usp.set(k, String(v))
  })
  const qs = usp.toString()
  return qs ? `${url}?${qs}` : url
}

export class ActivityWatchClient {
  private readonly baseURL: string
  private readonly fetch: FetchLike

  constructor(fetch: FetchLike, baseURL = 'http://127.0.0.1:5600') {
    if (!fetch) throw new Error('必须传入 fetch 实例')
    this.fetch = fetch
    this.baseURL = baseURL.replace(/\/$/, '')
  }

  // GET /api/0/buckets
  async listBuckets(): Promise<string[]> {
    const url = `${this.baseURL}/api/0/buckets`
    const resp = await this.fetch(url, { method: 'GET' })
    if (!resp.ok) {
      throw new Error(`获取 buckets 失败：${resp.status} ${resp.statusText}`)
    }
    const data = await resp.json()
    if (Array.isArray(data)) {
      // 兼容返回数组或对象两种形式
      return data.map((item: any) => (typeof item === 'string' ? item : item?.id)).filter(Boolean)
    }
    return Object.keys(data ?? {})
  }

  // GET /api/0/buckets/{id}/events
  async getBucketEvents<T = any>(bucketId: string, params: GetEventsParams = {}): Promise<AWEvent<T>[]> {
    if (!bucketId) throw new Error('bucketId 不能为空')
    const path = `${this.baseURL}/api/0/buckets/${encodeURIComponent(bucketId)}/events`
    const url = withQuery(path, {
      start: toISO(params.start),
      end: toISO(params.end),
      limit: params.limit,
      offset: params.offset,
      sort: params.sort,
    })

    const resp = await this.fetch(url, { method: 'GET' })
    if (!resp.ok) {
      throw new Error(`获取 bucket 事件失败：${resp.status} ${resp.statusText}`)
    }
    return await resp.json()
  }
}

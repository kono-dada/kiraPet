import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { ActivityWatchClient } from './activitywatchClient.js'
import { getWindowActiveDurations } from './windowStats.js'

const BASE_URL = process.env.AW_BASE_URL || 'http://127.0.0.1:5600'
let client: ActivityWatchClient

before(() => {
  // 使用真实的全局 fetch；Node 18+ 原生支持
  client = new ActivityWatchClient(fetch, BASE_URL)
})

test('listBuckets 返回至少一个 bucket（需本地 ActivityWatch 运行）', async () => {
  const buckets = await client.listBuckets()
  assert.ok(Array.isArray(buckets), '返回值应为数组')
  assert.ok(buckets.length > 0, '需要 ActivityWatch 正在运行并有 bucket')
})

test('getBucketEvents 能读取指定 bucket 的事件', async () => {
  const buckets = await client.listBuckets()
  console.log('Buckets:', buckets)
  const bucketId = buckets[1]
  const end = new Date()
  const start = new Date(end.getTime() - 60 * 60 * 1000) // 过去一小时
  const events = await client.getBucketEvents(bucketId, { start, end })
  console.log('Events:', events.length)
  assert.ok(Array.isArray(events), '返回值应为事件数组')
})

test('getWindowActiveDurations 统计窗口活跃时长', async () => {
  const stats = await getWindowActiveDurations(client, { pastMs: 60 * 60 * 1000 })
  console.log(stats)
  assert.ok(Array.isArray(stats), '返回值应为数组')
  // 若有结果，验证按 totalMs 降序
  if (stats.length > 1) {
    for (let i = 1; i < stats.length; i++) {
      assert.ok(stats[i - 1].totalMs >= stats[i].totalMs, '结果需按时长降序')
    }
  }
})

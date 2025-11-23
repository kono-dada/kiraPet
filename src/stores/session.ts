//  引入必要的依赖
import { defineStore } from 'pinia'
import { ModelMessage } from 'ai';
import { generateText } from 'ai';
import { myModel } from 'services/agents/model';

// 历史会话结构，可按需扩展元数据（标题、摘要等）
export type HistorySession = {
  abstract: string
  closedAt: string
  messages: ModelMessage[]
}

async function getAbstract(messages: ModelMessage[]): Promise<string> {
  const abstract = await generateText({
    model: myModel(),
    messages:[
      { role: 'system', content: '为以下对话用中文生成一个简短的摘要，表示对话的主题。10个字以内。' },
      { role: 'user', content: `\`\`\`chatHistory\n${JSON.stringify(messages)}\n\`\`\`` }
    ]
  })
  return abstract.text
}

export const useSessionStore = defineStore('session', {
  // 仅保留核心字段: 当前会话、历史会话、不活跃超时与内部计时器
  state: () => ({
    currentSession: [] as ModelMessage[],
    historySessions: [] as HistorySession[],
    backendSessions: [] as HistorySession[],
    inactivityTimeoutMs: 30 * 60 * 1000, // 默认 30 分钟不活跃分割
    _inactivityTimer: null as number | null,
  }),
  actions: {
    // 添加消息，并重新启动不活跃计时
    addMessage(message: ModelMessage) {
      this.currentSession.push(message as any)
      this._restartTimer()
    },
    addBackendSession(session: ModelMessage[]) {
      this.backendSessions.push({
        abstract: '',
        closedAt: new Date().toISOString(),
        messages: session as any[],
      });
    },
    // 
    // 归档当前会话并清空；若为空则忽略
    async newSession() {
      if (this.currentSession.length > 0) {
        this.historySessions.push({
          abstract: await getAbstract(this.currentSession as any),
          closedAt: new Date().toISOString(),
          messages: this.currentSession,
        })
        // backendChat(
        //   getBackendSessionUserPrompt((this.currentSession as any).slice(2))
        // )
        this.currentSession = []
      }
      this._clearTimer()
    },
    // 删除 index 及之后的消息，并重置计时器（视作一次活动）
    deleteMessageAndAfter(index: number) {
      this.currentSession = this.currentSession.slice(0, index)
      this._restartTimer()
    },
    // 清空所有会话（当前与历史），并清除计时器
    clearAll() {
      this.currentSession = []
      this.historySessions = []
      this._clearTimer()
    },
    // 内部: 重启计时器
    _restartTimer() {
      if (this.inactivityTimeoutMs <= 0) return
      this._clearTimer()
      this._inactivityTimer = window.setTimeout(() => {
        if (this.currentSession.length > 0) {
          this.newSession()
        } else {
          this._clearTimer()
        }
      }, this.inactivityTimeoutMs)
    },
    // 内部: 清除计时器
    _clearTimer() {
      if (this._inactivityTimer != null) {
        clearTimeout(this._inactivityTimer)
        this._inactivityTimer = null
      }
    },
  },
  tauri: {
    saveOnChange: true,
    saveStrategy: 'debounce',
    saveInterval: 500,
  },
})
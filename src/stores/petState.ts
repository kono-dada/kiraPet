import { defineStore } from 'pinia'
import { ref } from 'vue'
import { debug } from '@tauri-apps/plugin-log';

export const usePetStateStore = defineStore('state', {
  state: () => ({
    // 仅保存情绪编号
    currentExpression: ref<number>(0), //
    allExpressions: ref<string[]>([]), // 所有表情名称列表
    lastClickTimestamp: ref<number>(Date.now()), // 上次点击时间戳
  }),
  actions: {
    setPetExpression(expressionCode: number) {
      if (expressionCode >= 0 && expressionCode < this.allExpressions.length) {
        this.currentExpression = expressionCode;
      } else {
        debug(`无效的情绪编号: ${expressionCode}`);
        this.currentExpression = 0;
      }
    },
    updateLastClickTimestamp() {
      this.lastClickTimestamp = Date.now();
    }
  },
  getters: {
    millisecondsSinceLastClick(): number {
      return Date.now() - this.lastClickTimestamp;
    },
    getEmotionCodePrompt(): string {
      return this.allExpressions
        .flatMap((item, index) => `${item}：${index}`)
        .join('\n');
    }
  }
});

// 番茄钟服务：全局单例，负责管理专注状态及分心提醒
import { checkActivity } from 'services/agents/toolAgents/distractionAlert';
import { emitTriggerLLM } from 'services/events/emitters';
import { EventPayloadMap } from '../events/appEvents';

interface PomodoroSession {
  id: number;
  goal: string;
  notes: string | null;
  endAt: number;
  durationMs: number;
  timer: ReturnType<typeof setTimeout>;
}

class PomodoroService {
  private static _instance: PomodoroService | null = null;

  static get instance(): PomodoroService {
    if (!PomodoroService._instance) {
      PomodoroService._instance = new PomodoroService();
    }
    return PomodoroService._instance;
  }

  private session: PomodoroSession | null = null;
  private handling = false;
  private sessionSeq = 0;
  private listeners = new Set<() => void>();

  get isFocusing(): boolean {
    return this.session !== null;
  }

  // 获取剩余毫秒数，用于 UI 实时展示
  getRemainingMs(): number {
    const endAt = this.session?.endAt ?? 0;
    return endAt > 0 ? Math.max(0, endAt - Date.now()) : 0;
  }

  // 获取当前总时长，若未在专注则返回 0
  getDurationMs(): number {
    return this.session?.durationMs ?? 0;
  }

  // 订阅状态变更（启动/停止），返回取消函数
  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notifyChange() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn('[pomodoro] change listener error:', err);
      }
    });
  }

  // 启动专注计时，单位毫秒；会覆盖之前的专注状态
  start(durationMs: number, goal = '', notes: string | null = null): void {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error('专注时长必须为正数');
    }

    this.stop();

    const id = ++this.sessionSeq;
    const timer = setTimeout(() => this.stop(true), durationMs);
    this.session = {
      id,
      goal,
      notes,
      durationMs,
      endAt: Date.now() + durationMs,
      timer,
    };
    this.notifyChange();
  }

  // 主动停止专注状态
  stop(finish: boolean = false): void {
    if (this.session?.timer) {
      clearTimeout(this.session.timer);
    }
    this.session = null;
    this.handling = false;
    this.notifyChange();
    if (finish) {
      emitTriggerLLM({ prompt: '<maidMessage>user完成了刚刚设定的专注哦</maidMessage>' });
    }
  }

  // 接收外部事件（字符串摘要）。仅在专注中才会触发分心检测。
  async pushEvent(summary: EventPayloadMap['WINDOW_ACTIVE_MINUTE']): Promise<void> {
    const current = this.session;
    if (!current) return;
    if (this.handling) return; // 简单节流，避免重复请求

    this.handling = true;
    try {
      const verdict = await checkActivity(summary, current.goal, current.notes);
      // 若在检查过程中已退出专注，则忽略结果
      if (!this.session || this.session.id !== current.id) return;

      if (verdict && verdict !== 'OK') {
        const prompt = `<maidMessage>分心提醒：${verdict}。用户可能并没有在专注于${
          current.goal ? `「${current.goal}」` : ''
        }。</maidMessage>`;
        await emitTriggerLLM({ prompt });
      }
    } catch (err) {
      console.warn('[pomodoro] 处理分心事件失败：', err);
    } finally {
      this.handling = false;
    }
  }
}

export const pomodoro = PomodoroService.instance;
export const startFocus = (durationMs: number, goal = '', notes: string | null = null) =>
  pomodoro.start(durationMs, goal, notes);
export const stopFocus = (finish = false) => pomodoro.stop(finish);
export const pushFocusEvent = (summary: EventPayloadMap['WINDOW_ACTIVE_MINUTE']) => pomodoro.pushEvent(summary);

export default pomodoro;

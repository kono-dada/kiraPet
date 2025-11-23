<template>
  <input type="text" v-model="inputMessage" @keyup.enter="sendMessage" @keydown.enter="preventSendWhenThinking"
    :readonly="currentConfig.readonly" :placeholder="placeholder" class="chat-input" :class="currentConfig.cssClass"
    :style="inputStyle" data-avatar-type="live2d" />
</template>

<script lang="ts" setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useConversationStore } from '../../stores/conversation';
import { storeToRefs } from 'pinia';
import { useAppearanceConfigStore } from '../../stores/configs/appearanceConfig';
import { userStartChat } from '../../services/agents/character/chat';
import { preProcessUserInput } from '../../services/agents/toolAgents/maid';
import { defaultUserMessageFormatSpec } from '../../services/shared/messageProcessor';
import { useAIConfigStore } from '../../stores/configs/aiConfig';

const conversation = useConversationStore();
const { isStreaming, isTooling } = storeToRefs(conversation);
const ac = useAppearanceConfigStore();

const inputMessage = ref('');
const thinkingMessages = ['正在思考中', '正在思考中.', '正在思考中..', '正在思考中...'];
const thinkingIndex = ref(0);
const toolingMessages = ['使用工具中', '使用工具中.', '使用工具中..', '使用工具中...'];

// 计算输入框样式：放在额外 40% 高度的上半部分（即 petSize 的 20% 区域），绝对居中
// 注意：直接返回字符串样式可以避免 TypeScript 对 Vue `style` 的严格类型校验
//（尤其是自定义 CSS 变量 `--input-scale`），从而消除类型错误。
const inputStyle = computed(() => {
  const basePetSize = 200;
  const scale = ac.petSize / basePetSize;
  return `position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 80%; height: 70%; --input-scale: ${scale};`;
});

// 全局思考计时器（当 conversation.isStreaming 为 true 时播放）
let thinkingTimer: number | null = null;

function startThinkingAnimation() {
  if (thinkingTimer !== null) return;
  thinkingTimer = window.setInterval(() => {
    thinkingIndex.value = (thinkingIndex.value + 1) % thinkingMessages.length;
  }, 500);
}

function stopThinkingAnimation() {
  if (thinkingTimer === null) return;
  clearInterval(thinkingTimer);
  thinkingTimer = null;
  thinkingIndex.value = 0;
}

// 监听 isStreaming: 只要为 true 就播放动画，false 则停止并重置
watch(isStreaming, (val) => {
  if (val) startThinkingAnimation();
  else stopThinkingAnimation();
});

onUnmounted(() => {
  stopThinkingAnimation();
});

// 输入框状态枚举
enum InputState {
  IDLE = 'idle',
  THINKING = 'thinking',
  TOOLING = 'tooling',
  CONTINUE = 'continue',
  // 预留未来状态示例：
  // WAITING = 'waiting',      // 等待外部条件
  // DISABLED = 'disabled',    // 禁用状态
  // ERROR = 'error',          // 错误状态
  // RECORDING = 'recording'   // 语音录制状态
}

// 状态配置
const stateConfig = {
  [InputState.IDLE]: {
    placeholder: '和我聊天吧...',
    readonly: false,
    cssClass: '',
    cursor: 'text'
  },
  [InputState.THINKING]: {
    placeholder: () => thinkingMessages[thinkingIndex.value],
    readonly: true,
    cssClass: 'thinking',
    cursor: 'not-allowed'
  },
  [InputState.TOOLING]: {
    placeholder: () => toolingMessages[thinkingIndex.value],
    readonly: true,
    cssClass: 'tooling',
    cursor: 'not-allowed'
  },
  [InputState.CONTINUE]: {
    placeholder: '点击以继续...',
    readonly: true,
    cssClass: 'continue',
    cursor: 'pointer'
  }
  // 未来添加新状态的示例：
  // [InputState.WAITING]: {
  //   placeholder: '请稍等...',
  //   readonly: true,
  //   cssClass: 'waiting',
  //   cursor: 'wait'
  // }
};

// 状态计算逻辑
const currentState = computed(() => {
  if (isStreaming.value) return isTooling.value ? InputState.TOOLING : InputState.THINKING;
  if (conversation.responseItems.length > 0) return InputState.CONTINUE;
  return InputState.IDLE;
});

// 当前状态配置
const currentConfig = computed(() => stateConfig[currentState.value]);

// 动态 placeholder
const placeholder = computed(() => {
  const config = currentConfig.value;
  return typeof config.placeholder === 'function'
    ? config.placeholder()
    : config.placeholder;
});

// 状态变化监听器（为未来扩展预留）
watch(currentState, (newState: InputState, oldState: InputState) => {
  // 可以在这里添加状态变化时的副作用
  // 例如：播放声音、发送事件、记录日志等
  if (newState === InputState.THINKING && oldState === InputState.IDLE) {
    // 开始思考时的处理
  }
  if (newState === InputState.CONTINUE && oldState === InputState.THINKING) {
    // 从思考转为继续状态的处理
  }
  if (newState === InputState.IDLE) {
    // 返回空闲状态的处理
  }
}, { immediate: false });

async function sendMessage() {
  // 检查配置是否完整
  const aic = useAIConfigStore()
  const hasConfig = Boolean(aic.apiKey && aic.baseURL && aic.model)
  // 立即清空输入框，这样 placeholder 就能显示
  let userMessage = inputMessage.value.trim();
  inputMessage.value = '';

  if (!hasConfig) {
    conversation.currentMessage = '想聊天的话，请正确配置AI服务哦';
    return;
  }

  userMessage = defaultUserMessageFormatSpec.construct(userMessage);
  if (userMessage && currentState.value === InputState.IDLE) {
    const maidAdvice = await preProcessUserInput(userMessage);
    if (maidAdvice !== 'ignore') {
      userMessage += `\n<maidMessage>${maidAdvice}</maidMessage>`;
    }
    // 启动思考动画由 isStreaming watcher 统一管理（conversation.start() 会触发 isStreaming）
    const petResponse = await userStartChat(userMessage);

    if (!petResponse.success) {
      conversation.currentMessage = petResponse.error || '发生错误，请稍后再试。'
    }

    // 确保在完成后停止动画（watcher 也会处理，但这里作一次保险）
    stopThinkingAnimation();
  }
}

function preventSendWhenThinking(event: KeyboardEvent) {
  if (currentState.value !== InputState.IDLE) {
    event.preventDefault();
    event.stopPropagation();
  }
}

</script>

<style scoped>
.chat-input {
  position: absolute;
  width: 100%;
  height: auto;
  /* 避免继承父容器高度被拉长，实际高度由内联样式控制 */
  opacity: 0;
  /* 默认隐藏，依赖父容器 hover/focus 提升透明度 */
  padding: calc(6px * var(--input-scale, 1)) calc(10px * var(--input-scale, 1));
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: calc(10px * var(--input-scale, 1));
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  font-size: calc(12px * var(--input-scale, 1));
  color: #333;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
  /* 防止文本选中 */
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;

  /* 去除绝对定位的默认样式 */
  transform: translateX(0);
}

.chat-input::placeholder {
  color: rgba(100, 100, 100, 0.8);
  font-size: calc(11px * var(--input-scale, 1));
}

.chat-input:focus {
  border-color: rgba(100, 150, 255, 0.8);
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 2px 8px rgba(100, 150, 255, 0.2);
  transform: scale(1.02);
}

.chat-input:hover {
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.95);
}

/* 思考和继续状态的公共样式 */
.chat-input.thinking,
.chat-input.tooling,
.chat-input.continue,
.chat-input[readonly] {
  cursor: not-allowed;
  animation: state-breathing 2s ease-in-out infinite;
}

.chat-input.continue {
  cursor: pointer;
}

.chat-input.thinking::placeholder,
.chat-input.tooling::placeholder,
.chat-input.continue::placeholder,
.chat-input[readonly]::placeholder {
  font-style: italic;
  font-weight: 600;
  animation: text-breathing 2s ease-in-out infinite;
}

/* 思考状态特定样式 */
.chat-input.thinking,
.chat-input[readonly] {
  background: rgba(255, 248, 230, 0.95);
  border-color: rgba(255, 165, 0, 0.8);
  color: rgba(100, 100, 100, 0.8);
  box-shadow: 0 0 10px rgba(255, 165, 0, 0.3);
  --breathing-color: rgba(255, 165, 0, 0.6);
  --breathing-color-active: rgba(255, 165, 0, 1);
  --breathing-shadow: rgba(255, 165, 0, 0.2);
  --breathing-shadow-active: rgba(255, 165, 0, 0.5);
  --text-color: rgba(255, 140, 0, 0.9);
  --text-shadow: rgba(255, 165, 0, 0.5);
  --text-shadow-light: rgba(255, 165, 0, 0.3);
  --text-shadow-heavy: rgba(255, 165, 0, 0.7);
}

/* 工具使用状态特定样式（浅绿色） */
.chat-input.tooling {
  background: rgba(235, 249, 238, 0.95);
  border-color: rgba(120, 200, 160, 0.9);
  color: rgba(80, 120, 90, 0.9);
  box-shadow: 0 0 10px rgba(120, 200, 160, 0.3);
  --breathing-color: rgba(120, 200, 160, 0.6);
  --breathing-color-active: rgba(120, 200, 160, 1);
  --breathing-shadow: rgba(120, 200, 160, 0.2);
  --breathing-shadow-active: rgba(120, 200, 160, 0.5);
  --text-color: rgba(60, 160, 110, 0.95);
  --text-shadow: rgba(120, 200, 160, 0.5);
  --text-shadow-light: rgba(120, 200, 160, 0.3);
  --text-shadow-heavy: rgba(120, 200, 160, 0.7);
}

/* 继续播放状态特定样式 */
.chat-input.continue {
  background: rgba(230, 245, 255, 0.95);
  border-color: rgba(100, 150, 255, 0.8);
  color: rgba(70, 130, 180, 0.9);
  box-shadow: 0 0 10px rgba(100, 150, 255, 0.3);
  --breathing-color: rgba(100, 150, 255, 0.6);
  --breathing-color-active: rgba(100, 150, 255, 1);
  --breathing-shadow: rgba(100, 150, 255, 0.2);
  --breathing-shadow-active: rgba(100, 150, 255, 0.5);
  --text-color: rgba(70, 130, 180, 0.9);
  --text-shadow: rgba(100, 150, 255, 0.5);
  --text-shadow-light: rgba(100, 150, 255, 0.3);
  --text-shadow-heavy: rgba(100, 150, 255, 0.7);
}

.chat-input.thinking::placeholder,
.chat-input[readonly]::placeholder {
  color: var(--text-color);
  text-shadow: 0 0 5px var(--text-shadow);
}

.chat-input.continue::placeholder {
  color: var(--text-color);
  text-shadow: 0 0 5px var(--text-shadow);
}

/* 统一的呼吸动画效果 */
@keyframes state-breathing {

  0%,
  100% {
    opacity: 0.85;
    border-color: var(--breathing-color);
    box-shadow: 0 0 8px var(--breathing-shadow);
  }

  50% {
    opacity: 1;
    border-color: var(--breathing-color-active);
    box-shadow: 0 0 15px var(--breathing-shadow-active);
  }
}

/* 统一的文本呼吸动画 */
@keyframes text-breathing {

  0%,
  100% {
    opacity: 0.8;
    text-shadow: 0 0 3px var(--text-shadow-light);
  }

  50% {
    opacity: 1;
    text-shadow: 0 0 8px var(--text-shadow-heavy);
  }
}

/* Live2D 模式下的动画效果 */
.chat-input.thinking[data-avatar-type="live2d"],
.chat-input.tooling[data-avatar-type="live2d"],
.chat-input.continue[data-avatar-type="live2d"],
.chat-input[readonly][data-avatar-type="live2d"] {
  animation: live2d-state-breathing 2s ease-in-out infinite;
}

@keyframes live2d-state-breathing {

  0%,
  100% {
    opacity: 0.85;
    border-color: var(--breathing-color);
    box-shadow: 0 0 8px var(--breathing-shadow);
  }

  50% {
    opacity: 1;
    border-color: var(--breathing-color-active);
    box-shadow: 0 0 15px var(--breathing-shadow-active);
  }
}

/* 在 Live2D 模式下，所有状态都移除默认的居中 transform */
.chat-input.thinking[data-avatar-type="live2d"],
.chat-input.tooling[data-avatar-type="live2d"],
.chat-input.continue[data-avatar-type="live2d"],
.chat-input[readonly][data-avatar-type="live2d"],
.chat-input[data-avatar-type="live2d"]:focus {
  transform: translateX(0) scale(1);
}

.chat-input[data-avatar-type="live2d"]:focus {
  transform: translateX(0) scale(1.02);
}
</style>

<script setup lang="ts">
import { onMounted, watchEffect, onUnmounted, computed, defineAsyncComponent } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import Live2DAvatar from './Live2DAvatar.vue';
import Input from './Input.vue';
import DecorationsHost from './decorations/DecorationsHost.vue';
import { useAppearanceConfigStore } from '../../stores/configs/appearanceConfig.ts';
import { chatBubbleManager } from './chatBubbleManager';
import { createGlobalHandlersManager } from '../../services/events/globalHandlers.ts';
import { useVitsConfigStore } from '../../stores/configs/vitsConfig.ts';
import { startSbv2 } from '../../services/voice/sbv2Process.ts';
import { startNoInteractionWatcher, stopNoInteractionWatcher } from '../../services/interactions/noInteractionWatcher.ts';
import { useSessionStore } from '../../stores/session.ts';
import EventLog from './EventLog.vue';
import PomodoroMiniTimer from './PomodoroMiniTimer.vue';

// 编译期常量，Vite 构建时会直接替换成 true / false
const isDev = import.meta.env.DEV;
// 只在 dev 的时候定义 DevButton 组件
const DevButton = isDev
  ? defineAsyncComponent(() => import("./DevButton.vue"))
  : null;

const ac = useAppearanceConfigStore();
const borderClass = computed(() => (ac.live2dBorderType === 'circle' ? 'circle-border' : 'no-border'))
const ss = useSessionStore();
const window = getCurrentWebviewWindow();
const { startChatBubbleWatching, stopChatBubbleWatching } = chatBubbleManager();
const globalHandlersManager = createGlobalHandlersManager();
const vitsConfig = useVitsConfigStore();

onMounted(async () => {
  ss.currentSession = [];
  startPetSizeWatching();
  startChatBubbleWatching();
  globalHandlersManager.start();

  if (vitsConfig.autoStartSbv2) {
    startSbv2(vitsConfig.installPath);
  }

  startNoInteractionWatcher();

  // 跨屏拖动在 macOS/多显示器下可能触发窗口尺寸重置为默认 200×200
  // 这里监听窗口移动/缩放相关事件并强制按照配置尺寸恢复
  startWindowMovementListening();
});

onUnmounted(() => {
  stopPetSizeWatcher?.();
  stopChatBubbleWatching();
  globalHandlersManager.stop();
  stopNoInteractionWatcher();
  // 移除窗口事件监听，避免重复绑定
  stopWindowMovementListening?.();
});

let stopPetSizeWatcher: (() => void) | null = null;
let stopWindowMovementListening: (() => void) | null = null;

async function startWindowMovementListening() {
  const stops: Array<() => void> = []
  // 监听窗口被移动（包括跨屏）
  const stopMoved = await window.onMoved(async () => {
    await setWindowToSquare()
  })
  stops.push(stopMoved)
  // 尽可能监听缩放因子变化（不同屏幕 DPR 切换）
  const anyWin: any = window as unknown as any
  if (typeof anyWin.onScaleChanged === 'function') {
    const stopScale = await anyWin.onScaleChanged(async () => {
      await setWindowToSquare()
    })
    stops.push(stopScale)
  }
  // 兜底监听尺寸变化，确保内部画布跟随
  if (typeof window.onResized === 'function') {
    const stopResized = await (window as any).onResized(async () => {
      await setWindowToSquare()
    })
    stops.push(stopResized)
  }
  // 在组件卸载时清理监听器
  stopWindowMovementListening = () => stops.forEach((fn) => { try { fn() } catch { } })
  return
}

async function setWindowToSquare() {
  try {
    await window.setSize(new LogicalSize(ac.petSize, ac.petSize * 1.4));
  } catch (error) {
    console.error('设置窗口大小失败:', error)
  }
}

async function startPetSizeWatching() {
  await setWindowToSquare();

  if (!stopPetSizeWatcher) {
    stopPetSizeWatcher = watchEffect(async () => {
      await setWindowToSquare();
    });
  }
}
</script>

<template>
  <div class="main-wrapper" :style="{ opacity: ac.opacity }" @wheel.prevent
    @selectstart.prevent="!(ac.showDevTools ?? false)" @dragstart.prevent="!(ac.showDevTools ?? false)">
    <!-- 只有 dev 环境才渲染这个组件 -->
    <component v-if="DevButton" :is="DevButton" />
    <div class="live2d-area">
      <div :class="[borderClass, 'live2d-framer']">
        <DecorationsHost />
        <Live2DAvatar />
        <PomodoroMiniTimer />
      </div>
    </div>
    <div class="extra-area">
      <EventLog v-if="ac.showEventLog" class="log-layer" />
      <div class="input-slot">
        <Input class="input" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  overflow: hidden;
  overscroll-behavior: none;

  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

.live2d-area {
  width: 100%;
  flex: 10 0 0; /* 100% 基础高度对应 10 份 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.live2d-framer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1; /* 强制正方形，确保 50% border-radius 为圆 */
  box-sizing: border-box;
  border-radius: 10%;
}

.live2d-framer.circle-border {
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.live2d-framer.circle-border:hover {
  transform: scale(1.05);
  transform-origin: center center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.main-wrapper:hover .input,
.main-wrapper:focus-within .input {
  opacity: 0.95;
}

.main-wrapper:hover .button,
.main-wrapper:focus-within .button {
  opacity: 1;
}

.extra-area {
  flex: 4 0 0; /* 底部额外 40% 高度对应 4 份 */
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.input-slot {
  position: relative;
  flex: 0 0 50%; /* 占 bottom 50% 的上半，即整体窗口约 20% */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  box-sizing: border-box;
}

.log-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
}

.main-wrapper:hover .log-layer,
.main-wrapper:focus-within .log-layer {
  opacity: 0; /* 当输入框显示时隐藏日志 */
}
</style>

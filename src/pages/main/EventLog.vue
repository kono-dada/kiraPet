<template>
  <div class="log-wrapper">
    <TransitionGroup name="log-slide" tag="div" class="log-list">
      <div
        v-for="(item, index) in displayLogs"
        :key="item.id"
        class="log-item"
        :style="itemStyle(item, index)"
      >
        <span class="log-time">{{ item.time }}</span>
        <span class="log-text">{{ item.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEventLog, type LogItem, type LogColor } from './eventLogBus';
import { useAppearanceConfigStore } from '../../stores/configs/appearanceConfig';

const { logs } = useEventLog();
const ac = useAppearanceConfigStore();
const scale = computed(() => ac.petSize / 200);

// 预设颜色表
const colorMap: Record<LogColor, string> = {
  info: '#8ec5ff',
  success: '#8be48f',
  warning: '#ffd27f',
  error: '#ff9a9a',
  muted: '#d8d8d8'
};

// 根据事件在列表中的位置衰减透明度与模糊度（更平滑）
const itemStyle = (item: LogItem, index: number) => {
  // 以最多 5 条为主视图，衰减线性，尾部完全透明
  const decay = Math.min(index / 4, 1); // index:0..4
  const translate = index * 1; // 轻微下错位
  const color = colorMap[item.color] ?? colorMap.info;
  return {
    '--decay': decay,
    '--index-offset': translate,
    '--item-color': color,
    '--item-font': `${10 * scale.value}px`,
  } as Record<string, string | number>;
};

// 预留 computed 便于未来扩展（如按条件过滤）
const displayLogs = computed(() => logs.value);
</script>

<style scoped>
.log-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
  background: transparent; /* 背景完全透明 */
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.15) 80%, rgba(0, 0, 0, 0) 100%);
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.15) 80%, rgba(0, 0, 0, 0) 100%);
}

.log-list {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1px;
  align-items: stretch; /* 拉伸占满，避免左右不一致 */
}

.log-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  width: 100%;
  color: var(--item-color, rgba(255, 255, 255, 0.95));
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  white-space: normal;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  transform: translateY(0); /* 基准 transform，避免补间到 scale */
  flex: 0 0 auto; /* 禁止被压缩，避免满条数时被挤瘦 */
  min-height: 1.2em; /* 保证最小行高 */
  font-size: var(--item-font, 10px);
  line-height: 1.3;
  opacity: calc(1 - var(--decay, 0) * 0.35);
  /* filter: blur(calc(var(--decay, 0) * 0px)); */
  transform: translateY(calc(var(--index-offset, 0) * 1px));
}

.log-time {
  opacity: 0.7;
  font-weight: 700;
}

.log-text {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 新事件压入时的下挤动画 */
.log-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  filter: blur(2px);
}

.log-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
  filter: blur(3px);
}

.log-slide-enter-active,
.log-slide-leave-active,
.log-slide-move {
  transition:
    transform 280ms cubic-bezier(0.22, 0.68, 0.18, 1.02),
    opacity 280ms cubic-bezier(0.22, 0.68, 0.18, 1.02),
    filter 280ms cubic-bezier(0.22, 0.68, 0.18, 1.02);
  will-change: transform, opacity, filter;
  transform-origin: top center;
}

.log-slide-move {
  transition-property: transform;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>

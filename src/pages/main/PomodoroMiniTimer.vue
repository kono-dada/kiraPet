<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import pomodoro from '../../services/pomodoro'; // 假设路径不变

const remainingMs = ref(pomodoro.getRemainingMs());
const totalMs = ref(pomodoro.getDurationMs());
let ticker: ReturnType<typeof setInterval> | null = null;
let stopListen: (() => void) | null = null;

const progress = computed(() => {
  const total = totalMs.value || 1;
  const remain = Math.max(0, Math.min(total, remainingMs.value));
  return remain / total;
});

const isActive = computed(() => remainingMs.value > 0 && totalMs.value > 0);

// 计算火星发射器的旋转角度
// 360 * progress 对应当前的进度末端
const sparkRotation = computed(() => {
  return {
    transform: `rotate(${progress.value * 360}deg)`
  };
});

// 生成一组随机参数，用于粒子动画的差异化（位置、速度、透明度）
const particles = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  style: {
    '--d': `${Math.random() * 0.8}s`, // 随机延迟
    '--x': `${(Math.random() - 0.5) * 30}px`, // X轴随机偏移
    '--y': `${(Math.random() - 0.5) * 30}px`, // Y轴随机偏移
    '--s': `${0.6 + Math.random() * 1.0}`, // 随机大小
  }
}));

const tick = () => {
  remainingMs.value = pomodoro.getRemainingMs();
  totalMs.value = pomodoro.getDurationMs();
};

onMounted(() => {
  tick();
  ticker = setInterval(tick, 1000);
  stopListen = pomodoro.onChange(tick);
});

onUnmounted(() => {
  if (ticker) clearInterval(ticker);
  if (stopListen) stopListen();
});
</script>

<template>
  <div v-if="isActive" class="pomodoro-mini">
    <div class="ring">
      <svg viewBox="0 0 52 52">
        <defs>
          <linearGradient id="pomodoro-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f6d365" />
            <stop offset="50%" stop-color="#a18cd1" />
            <stop offset="100%" stop-color="#4dd0e1" />
          </linearGradient>
        </defs>
        <circle class="trail" cx="26" cy="26" r="20" />
        <circle
          class="progress"
          cx="26"
          cy="26"
          r="20"
          :stroke-dasharray="Math.PI * 40"
          :stroke-dashoffset="(1 - progress) * Math.PI * 40"
        />
      </svg>

      <div class="spark-wrapper" :style="sparkRotation">
        <div class="spark-emitter">
          <div 
            v-for="p in particles" 
            :key="p.id" 
            class="particle" 
            :style="p.style"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pomodoro-mini {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 25%;
  height: 25%;
  min-width: 36px;
  min-height: 36px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ring {
  position: relative;
  width: 80%;
  height: 80%;
  display: grid;
  place-items: center;
}

svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg); /* SVG 旋转了 -90 度 */
  overflow: visible; /* 允许光晕溢出 */
}

circle {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
}

.trail {
  stroke: rgba(255, 255, 255, 0.14);
}

.progress {
  stroke: url(#pomodoro-gradient);
  filter: drop-shadow(0 0 2px rgba(246, 211, 101, 0.5));
  transition: stroke-dashoffset 0.35s ease;
}

/* --- 新增样式的部分 --- */

/* 1. 旋转容器：覆盖在 SVG 之上，大小一致 */
.spark-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  /* 这里的旋转必须和 SVG 的起始位置对齐 */
  /* SVG 自身 rotate(-90deg)，所以这里的 0度 也是在 12点钟方向 */
  transform-origin: center;
  transition: transform 0.35s ease; 
}

/* 2. 发射源：定位在圆环的“轨道”上 */
/* 父容器是 100% (比如 36px)，半径大概是宽度的 40% 左右 (svg r=20, viewbox=52 -> 20/52 ≈ 38.5%) */
/* top: 0 对应圆的最上方，我们需要往下偏移一点点对齐 stroke 中心 */
.spark-emitter {
  position: absolute;
  left: 50%;
  top: 11.5%; /* (52-40)/2 / 52 ≈ 11.5%  根据 SVG viewbox 计算得出 */
  width: 0;
  height: 0;
  /* 增加一个主光晕，作为火星的核心 */
  box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.8),
              0 0 12px 4px rgba(161, 140, 209, 0.6);
}

/* 3. 单个粒子 */
.particle {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background-color: #fff; /* 核心是白色 */
  /* 利用 box-shadow 模拟你的渐变色调 */
  box-shadow: 0 0 4px #f6d365, 0 0 6px #4dd0e1;
  opacity: 0;
  animation: spark-burst 0.8s infinite linear;
  /* 应用 JS 传入的随机变量 */
  animation-delay: var(--d);
}

/* 粒子迸发动画 */
@keyframes spark-burst {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    /* 向随机方向移动并缩小 */
    transform: translate(var(--x), var(--y)) scale(0);
    opacity: 0;
  }
}
</style>
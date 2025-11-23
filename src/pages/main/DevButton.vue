<script setup lang="ts">
import pomodoro from 'services/pomodoro';
import { useAppearanceConfigStore } from '../../stores/configs/appearanceConfig';

const ac = useAppearanceConfigStore();

function handleClick() {
  if (pomodoro.isFocusing) {
    console.log('stop pomodoro from DevButton');
    pomodoro.stop(true);
  } else {
    console.log('start pomodoro from DevButton');
    pomodoro.start( 30 * 1000, '学习')
  }
}
</script>

<template>
  <button v-if="ac.showDevTools" class="dev-button" type="button" @click="handleClick">
    Dev
  </button>
</template>

<style scoped>
.dev-button {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 20;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.65);
  color: #fefefe;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: transform 120ms ease, opacity 120ms ease;
}

.dev-button:hover {
  transform: translateY(-1px) scale(1.02);
  opacity: 0.92;
}
</style>

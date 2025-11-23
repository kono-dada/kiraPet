<template>
  <v-layout class="settings-page bg-grey-lighten-5">
    <v-navigation-drawer permanent width="180">
      <v-list>
        <v-list-item class="px-4 pt-4 pb-3">
          <v-list-item-title class="text-h6 font-weight-bold">设置</v-list-item-title>
        </v-list-item>
      </v-list>
      <v-divider></v-divider>
      <v-list v-model:selected="selectedTab" nav color="primary" density="compact" class="pa-2">
        <v-list-item
          v-for="tab in availableTabs"
          :key="tab.id"
          :value="tab.id"
          :prepend-icon="iconMap[tab.icon]"
          :title="tab.name"
          @click="switchTab(tab.id)"
          rounded="lg"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main scrollable>
      <div class="main-header pa-5 bg-surface border-b">
        <h2 class="text-h5 font-weight-bold">{{ currentTab.name }}</h2>
      </div>

      <v-window v-model="currentTab.id" class="pa-3 pa-md-5">
        <v-window-item value="appearance" :transition="false"><AppearanceSettings /></v-window-item>
        <v-window-item value="ai" :transition="false"><AISettings /></v-window-item>
        <v-window-item value="vits" :transition="false"><VitsSettings /></v-window-item>
        <v-window-item value="about" :transition="false"><AboutSettings /></v-window-item>
      </v-window>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import AppearanceSettings from './settings/AppearanceSettings.vue'
import AISettings from './settings/AISettings.vue'
import VitsSettings from './settings/VitsSettings.vue'
import AboutSettings from './settings/AboutSettings.vue'

// 设置页标签配置，新增“调度”标签
const SETTINGS_TABS = [
  { id: 'appearance', name: '外观设置', icon: 'appearance' },
  { id: 'ai', name: 'AI设置', icon: 'ai' },
  { id: 'vits', name: '语音设置', icon: 'vits' },
  { id: 'about', name: '关于', icon: 'about' },
]
const DEFAULT_ACTIVE_TAB = 'appearance'

// 本地状态
const settingsState = ref({
  activeTab: DEFAULT_ACTIVE_TAB,
  isLoading: false,
})

// 当前 tab 与可用 tab
const currentTab = computed(() => SETTINGS_TABS.find(tab => tab.id === settingsState.value.activeTab) || SETTINGS_TABS[0])
const availableTabs = computed(() => SETTINGS_TABS)

// 切换标签页
function switchTab(tabId: string) {
  const tab = SETTINGS_TABS.find(t => t.id === tabId)
  if (tab) settingsState.value.activeTab = tabId
}

// 导航选择同步
const selectedTab = ref([currentTab.value.id])
watch(currentTab, newTab => {
  if (selectedTab.value[0] !== newTab.id) selectedTab.value = [newTab.id]
})

// 图标映射，新增 schedule 图标
const iconMap: Record<string, string> = {
  appearance: 'mdi-palette-swatch-outline',
  ai: 'mdi-brain',
  vits: 'mdi-volume-high',
  screenAnalysis: 'mdi-monitor-screenshot',
  schedule: 'mdi-clock-outline',
  xp: 'mdi-heart-multiple',
  about: 'mdi-information-outline',
}
</script>

<style scoped>
.settings-page { width: 100vw; height: 100vh; min-width: 800px; min-height: 600px; }
.v-main { height: 100vh; }
</style>
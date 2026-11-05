<script setup lang="ts">
import AppIcon from './ui/AppIcon.vue'

withDefaults(defineProps<{ label: string; value: string; icon?: string; tone?: 'success' | 'danger' }>(), {
  icon: 'check',
  tone: 'success',
})
</script>

<template>
  <div class="flex items-center gap-2">
    <AppIcon :name="icon" :class="tone === 'success' ? 'text-success' : 'text-danger'" />
    <span class="text-small text-fg-2">{{ label }}</span>
    <span class="flex-1" />
    <span class="text-data text-fg">{{ value }}</span>
  </div>
</template>

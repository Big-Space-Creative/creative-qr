<script setup lang="ts">
import { t } from '@/i18n'
import BaseToggle from './BaseToggle.vue'

const model = defineModel<boolean>({ default: false })
defineProps<{ title: string; description: string; fixed?: boolean }>()
</script>

<template>
  <div class="flex items-center gap-4 border-b border-line py-4">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p class="text-body-medium text-fg">{{ title }}</p>
      <p class="text-small text-fg-2">{{ description }}</p>
    </div>
    <span v-if="fixed" class="text-data whitespace-nowrap text-fg-2">{{ t('consent.always') }}</span>
    <BaseToggle v-else v-model="model" :aria-label="title" />
  </div>
</template>

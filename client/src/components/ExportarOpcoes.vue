<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/i18n'
import AppIcon from './ui/AppIcon.vue'
import BaseCheckbox from './ui/BaseCheckbox.vue'
import BaseRadio from './ui/BaseRadio.vue'

// Conteúdo do modal "Exportar projeto".
const format = defineModel<'json' | 'zip'>('format', { default: 'json' })
const withAppearance = defineModel<boolean>('withAppearance', { default: true })
const withScan = defineModel<boolean>('withScan', { default: true })
const props = defineProps<{ count: number }>()

// ponytail: nome de arquivo fixo; o design só mostra o .json, o .zip segue o mesmo padrão.
const fileName = computed(() => (format.value === 'json' ? 'creative-qr-projeto.json' : 'creative-qr-imagens.zip'))
</script>

<template>
  <div class="flex flex-col gap-4">
    <fieldset class="flex flex-col gap-1">
      <legend class="text-small mb-1 text-fg-2">{{ t('exportProject.formatLabel') }}</legend>
      <BaseRadio v-model="format" value="json" name="export-format">{{ t('exportProject.json') }}</BaseRadio>
      <BaseRadio v-model="format" value="zip" name="export-format">{{ t('exportProject.zip') }}</BaseRadio>
    </fieldset>
    <fieldset class="flex flex-col gap-1">
      <legend class="text-small mb-1 text-fg-2">{{ t('exportProject.include') }}</legend>
      <BaseCheckbox v-model="withAppearance">{{ t('exportProject.appearance') }}</BaseCheckbox>
      <BaseCheckbox v-model="withScan">{{ t('exportProject.scanResult') }}</BaseCheckbox>
    </fieldset>
    <div class="flex items-center gap-2 border-t border-line pt-4">
      <AppIcon name="file" class="text-fg-2" />
      <span class="text-data min-w-0 flex-1 truncate">{{ fileName }}</span>
      <span class="text-data text-fg-2 whitespace-nowrap">{{ props.count === 1 ? t('exportProject.count1') : t('exportProject.countN', { n: props.count }) }}</span>
    </div>
  </div>
</template>

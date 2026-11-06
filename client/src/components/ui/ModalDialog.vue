<script setup lang="ts">
import { ref, watch } from 'vue'
import { t } from '@/i18n'
import BaseButton from './BaseButton.vue'
import IconButton from './IconButton.vue'

const open = defineModel<boolean>('open', { default: false })
withDefaults(
  defineProps<{
    title: string
    description?: string
    confirmLabel?: string
    confirmIcon?: string
    cancelLabel?: string
    destructive?: boolean
  }>(),
  { confirmLabel: '', cancelLabel: '' },
)
defineEmits<{ confirm: []; cancel: [] }>()

const dialog = ref<HTMLDialogElement>()

watch(open, (v) => {
  if (v && !dialog.value?.open) dialog.value?.showModal()
  if (!v && dialog.value?.open) dialog.value.close()
})

// Clique no fundo (scrim) fecha, como em ModalOverlay.
function onBackdrop(e: MouseEvent) {
  if (e.target === dialog.value) open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[480px] max-w-[calc(100vw-32px)] rounded-md border border-line bg-surface p-0 text-fg backdrop:bg-scrim"
    :aria-label="title"
    @close="open = false"
    @click="onBackdrop"
  >
    <div class="flex flex-col gap-4 p-6">
      <div class="flex items-center gap-2">
        <h2 class="text-heading min-w-0 flex-1">{{ title }}</h2>
        <IconButton icon="x" :label="t('common.close')" @click="open = false" />
      </div>
      <p v-if="description" class="text-body text-fg-2">{{ description }}</p>
      <slot />
      <div class="flex justify-end gap-2 pt-2">
        <BaseButton variant="secondary" @click="$emit('cancel'); open = false">{{ cancelLabel || t('common.cancel') }}</BaseButton>
        <BaseButton :variant="destructive ? 'danger' : 'primary'" :icon="confirmIcon" @click="$emit('confirm')">
          {{ confirmLabel }}
        </BaseButton>
      </div>
    </div>
  </dialog>
</template>

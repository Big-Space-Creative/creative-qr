<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
import { t } from '@/i18n'
import BaseButton from './ui/BaseButton.vue'

const props = defineProps<{ open: boolean; step: number }>()
const emit = defineEmits<{ next: []; previous: []; close: [] }>()
const targets = ['type', 'content', 'appearance', 'download'] as const
const dialog = ref<HTMLDialogElement>()
const panel = ref<HTMLElement>()
const heading = ref<HTMLElement>()
const rect = ref({ left: 0, top: 0, right: 0, bottom: 0 })
const panelStyle = ref<CSSProperties>({ left: '16px', top: '16px' })
let target: HTMLElement | null = null
let restoreFocus: HTMLElement | null = null
let previousOverflow = ''
let observer: ResizeObserver | undefined
let revision = 0

const masks = computed<CSSProperties[]>(() => {
  const r = rect.value
  return [
    { inset: `0 0 auto 0`, height: `${r.top}px` },
    { top: `${r.top}px`, left: 0, width: `${r.left}px`, height: `${r.bottom - r.top}px` },
    { top: `${r.top}px`, left: `${r.right}px`, right: 0, height: `${r.bottom - r.top}px` },
    { top: `${r.bottom}px`, right: 0, bottom: 0, left: 0 },
  ]
})
const highlightStyle = computed<CSSProperties>(() => ({
  left: `${rect.value.left}px`,
  top: `${rect.value.top}px`,
  width: `${rect.value.right - rect.value.left}px`,
  height: `${rect.value.bottom - rect.value.top}px`,
}))

function position() {
  if (!props.open || !target || !panel.value) return
  const bounds = target.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(vw < 1024 ? 358 : 400, vw - 32)
  const height = panel.value.getBoundingClientRect().height
  const r = {
    left: Math.max(0, bounds.left - 8),
    right: Math.min(vw, bounds.right + 8),
    top: Math.max(8, bounds.top - 8),
    bottom: Math.min(vh - 8, bounds.bottom + 8),
  }
  let left = 16
  let top = 16
  if (vw >= 1024 && bounds.right + width + 32 <= vw - 16) {
    left = bounds.right + 32
    top = Math.max(16, Math.min(r.top + 8, vh - height - 16))
  } else if (vw >= 1024 && bounds.left - width - 32 >= 16) {
    left = bounds.left - width - 32
    top = Math.max(16, Math.min(r.top + 8, vh - height - 16))
  } else {
    left = (vw - width) / 2
    if (r.top >= height + 40) top = r.top - height - 24
    else {
      r.bottom = Math.min(r.bottom, Math.max(r.top + 24, vh - height - 40))
      top = Math.min(r.bottom + 24, vh - height - 16)
    }
  }
  rect.value = r
  panelStyle.value = { left: `${left}px`, top: `${Math.max(16, top)}px`, width: `${width}px` }
}

async function present() {
  const current = ++revision
  await nextTick()
  if (current !== revision || !props.open || !dialog.value) return
  if (!dialog.value.open) {
    restoreFocus =
      document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement
        : null
    previousOverflow = document.documentElement.style.overflow
    dialog.value.showModal()
    document.documentElement.style.overflow = 'hidden'
  }
  target = document.querySelector<HTMLElement>(`[data-tutorial="${targets[props.step]}"]`)
  if (!target) return
  const bounds = target.getBoundingClientRect()
  const height = panel.value?.getBoundingClientRect().height ?? 280
  const mobile = window.innerWidth < 1024
  if (
    getComputedStyle(target).position !== 'fixed' &&
    (mobile || bounds.top < 16 || bounds.bottom > window.innerHeight - 16)
  ) {
    const top = mobile
      ? Math.max(16, Math.min(80, window.innerHeight - bounds.height - height - 56))
      : 80
    window.scrollTo({ top: Math.max(0, bounds.top + window.scrollY - top), behavior: 'instant' })
  }
  position()
  heading.value?.focus({ preventScroll: true })
}

function dismiss() {
  revision++
  if (!dialog.value?.open) return
  dialog.value.close()
  document.documentElement.style.overflow = previousOverflow
  const fallback = [...document.querySelectorAll<HTMLElement>('[data-tutorial-trigger]')].find(
    (n) => n.getClientRects().length,
  )
  const destination =
    restoreFocus?.isConnected && restoreFocus.getClientRects().length ? restoreFocus : fallback
  destination?.focus()
}

onMounted(() => {
  watch(
    () => [props.open, props.step] as const,
    () => (props.open ? void present() : dismiss()),
    { immediate: true, flush: 'post' },
  )
  observer = new ResizeObserver(position)
  if (panel.value) observer.observe(panel.value)
  window.addEventListener('resize', position)
  window.addEventListener('scroll', position, { passive: true })
})
onBeforeUnmount(() => {
  dismiss()
  observer?.disconnect()
  window.removeEventListener('resize', position)
  window.removeEventListener('scroll', position)
})
</script>

<template>
  <dialog
    ref="dialog"
    class="tutorial-dialog fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-fg backdrop:bg-transparent"
    aria-labelledby="tutorial-heading"
    aria-describedby="tutorial-description"
    @cancel.prevent="emit('close')"
  >
    <div
      v-for="(mask, index) in masks"
      :key="index"
      class="pointer-events-none fixed bg-scrim"
      :style="mask"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none fixed rounded-sm border border-focus"
      :style="highlightStyle"
      aria-hidden="true"
    />
    <section
      ref="panel"
      class="fixed flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] flex-col gap-4 overflow-y-auto rounded-sm border border-line bg-surface p-6 lg:w-[400px]"
      :style="panelStyle"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-small" aria-live="polite">
          {{ t('tutorial.progress', { n: step + 1, total: 4 }) }}
        </p>
        <BaseButton variant="ghost" @click="emit('close')">{{ t('tutorial.skip') }}</BaseButton>
      </div>
      <h2 id="tutorial-heading" ref="heading" tabindex="-1" class="text-heading outline-none">
        {{ t(`tutorial.step${step + 1}Title`) }}
      </h2>
      <p id="tutorial-description" class="text-body text-fg-2">
        {{ t(`tutorial.step${step + 1}Text`) }}
      </p>
      <div class="flex gap-2 pt-2">
        <BaseButton v-if="step > 0" variant="secondary" @click="emit('previous')">{{
          t('tutorial.previous')
        }}</BaseButton>
        <BaseButton class="min-w-0 flex-1" @click="emit('next')">{{
          step === 3 ? t('tutorial.finish') : t('tutorial.next')
        }}</BaseButton>
      </div>
    </section>
  </dialog>
</template>

<style scoped>
.tutorial-dialog:not([open]) {
  display: none;
}
@media (max-width: 1023px) {
  .tutorial-dialog button {
    min-height: 48px;
  }
}
</style>

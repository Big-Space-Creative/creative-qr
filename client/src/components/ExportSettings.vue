<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '@/i18n'
import { DPIS, MAX_PX, MIN_PX, type ExportOpts } from '@/lib/exporter'
import AccordionRow from './AccordionRow.vue'
import BaseInput from './ui/BaseInput.vue'
import BaseSelect from './ui/BaseSelect.vue'
import BaseTab from './ui/BaseTab.vue'
import ChipGroup from './ui/ChipGroup.vue'
import ToggleRow from './ui/ToggleRow.vue'

// Opções de exportação (formato, tamanho, DPI, fundo). Fica logo abaixo do QR code.
const exp = defineModel<ExportOpts>('exp', { required: true })
const props = defineProps<{ aspect: number; exportPx: number }>()
const open = ref(false)

const summary = computed(() =>
  exp.value.format === 'svg' ? t('advanced.vector') : `${exp.value.format.toUpperCase()} · ${props.exportPx} px · ${exp.value.dpi} DPI`,
)

// --- exportar: largura e altura ligadas pela proporção do QR com moldura
const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')
const num = (s: string) => Number(s.trim().replace(',', '.'))
const wTxt = ref(fmt(exp.value.width))
const hTxt = ref(fmt(exp.value.width * props.aspect))

watch([() => exp.value.width, () => props.aspect], () => {
  if (num(wTxt.value) !== exp.value.width) wTxt.value = fmt(exp.value.width)
  const h = exp.value.width * props.aspect
  if (Math.abs(num(hTxt.value) - h) > 0.005) hTxt.value = fmt(h)
})
watch(wTxt, (v) => {
  const n = num(v)
  if (n > 0 && n !== exp.value.width) exp.value.width = n
})
watch(hTxt, (v) => {
  const n = num(v)
  if (n > 0 && props.aspect > 0 && Math.abs(n - exp.value.width * props.aspect) > 0.005) exp.value.width = n / props.aspect
})

function setUnit(u: 'px' | 'cm') {
  if (u === exp.value.unit) return
  exp.value.width = u === 'cm' ? Math.round((exp.value.width / exp.value.dpi) * 2.54 * 100) / 100 : Math.round((exp.value.width / 2.54) * exp.value.dpi)
  exp.value.unit = u
}

const dpi = computed({
  get: () => String(exp.value.dpi),
  set: (v) => (exp.value.dpi = Number(v)),
})
const dpiOptions = DPIS.map((d) => ({ value: String(d), label: String(d) }))
const clamped = computed(() => {
  const want = exp.value.unit === 'cm' ? (exp.value.width / 2.54) * exp.value.dpi : exp.value.width
  return want < MIN_PX || want > MAX_PX
})
const formats = [
  { value: 'png', label: 'PNG' },
  { value: 'svg', label: 'SVG' },
  { value: 'pdf', label: 'PDF' },
] as const
</script>

<template>
    <AccordionRow v-model:open="open" :title="t('advanced.export')" :value="summary">
      <div class="flex flex-col gap-4">
        <ChipGroup v-model="exp.format" :label="t('advanced.format')" :options="[...formats]" />
        <div class="flex items-end gap-2">
          <BaseInput v-model="wTxt" :label="t('advanced.width')" class="min-w-0 flex-1" />
          <BaseInput v-model="hTxt" :label="t('advanced.height')" class="min-w-0 flex-1" />
          <BaseTab :active="exp.unit === 'px'" @click="setUnit('px')">px</BaseTab>
          <BaseTab :active="exp.unit === 'cm'" @click="setUnit('cm')">cm</BaseTab>
        </div>
        <p class="text-small" :class="clamped ? 'text-danger' : 'text-fg-3'">
          {{ t('advanced.finalFile', { w: exportPx, h: Math.round(exportPx * aspect) }) }}{{ clamped ? t('advanced.limits', { min: MIN_PX, max: MAX_PX }) : '' }}
        </p>
        <BaseSelect v-model="dpi" :label="t('advanced.dpi')" :options="dpiOptions" />
        <ToggleRow v-model="exp.transparent">{{ t('advanced.transparent') }}</ToggleRow>
        <p v-if="exp.format === 'pdf' && exp.transparent" class="text-small text-fg-3">{{ t('advanced.pdfWhite') }}</p>
      </div>
    </AccordionRow>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { DPIS, MAX_PX, MIN_PX, type ExportOpts } from '@/lib/exporter'
import { EYE_SHAPES, FRAMES, MAX_CAPTION, MAX_LOGO, MIN_LOGO } from '@/lib/qr'
import type { Look } from '@/composables/useQrGenerator'
import AccordionRow from './AccordionRow.vue'
import BaseButton from './ui/BaseButton.vue'
import BaseInput from './ui/BaseInput.vue'
import BaseSelect from './ui/BaseSelect.vue'
import BaseSlider from './ui/BaseSlider.vue'
import BaseTab from './ui/BaseTab.vue'
import ChipGroup from './ui/ChipGroup.vue'
import ToggleRow from './ui/ToggleRow.vue'

// Seção "Avançado": olhos, logo, moldura e texto, exportar (tela 09 do Figma).
const look = defineModel<Look>('look', { required: true })
const exp = defineModel<ExportOpts>('exp', { required: true })
const props = defineProps<{ aspect: number; exportPx: number }>()
const emit = defineEmits<{ logoAdded: [] }>()

const open = reactive({ eyes: false, logo: false, frame: false, exp: false })

const eyeLabels: Record<(typeof EYE_SHAPES)[number], string> = { square: 'Quadrado', rounded: 'Arredondado', circle: 'Círculo' }
const frameLabels: Record<(typeof FRAMES)[number], string> = { none: 'Sem moldura', line: 'Linha', card: 'Cartão', bubble: 'Balão' }

const summary = computed(() => ({
  eyes: `${eyeLabels[look.value.eyeShape]} · ${look.value.eye.toUpperCase()}`,
  logo: look.value.logo ? `${look.value.logo.shape === 'circle' ? 'Círculo' : 'Quadrado'} · ${look.value.logo.size}% da área` : 'Nenhum',
  frame: `${frameLabels[look.value.frame.kind]}${look.value.frame.text.trim() ? ` · “${look.value.frame.text.trim()}”` : ''}`,
  exp: exp.value.format === 'svg' ? 'SVG · vetor' : `${exp.value.format.toUpperCase()} · ${props.exportPx} px · ${exp.value.dpi} DPI`,
}))

// --- logo: o arquivo é rasterizado em PNG pequeno; assim SVG de terceiros nunca entra no QR
const logoError = ref('')
const fileInput = ref<HTMLInputElement>()

function rasterize(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      for (const side of [256, 192, 128, 96]) {
        const c = document.createElement('canvas')
        c.width = c.height = side
        const w = img.naturalWidth || side
        const h = img.naturalHeight || side
        const k = Math.min(side / w, side / h)
        c.getContext('2d')!.drawImage(img, (side - w * k) / 2, (side - h * k) / 2, w * k, h * k)
        const href = c.toDataURL('image/png')
        if (href.length <= 100_000) return resolve(href)
      }
      reject(new Error('grande'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('leitura'))
    }
    img.src = url
  })
}

async function onLogo(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  logoError.value = ''
  if (!file.type.startsWith('image/') || file.size > 2_000_000) {
    logoError.value = 'Use uma imagem PNG ou SVG de até 2 MB.'
    return
  }
  try {
    const href = await rasterize(file)
    look.value.logo = { href, size: Math.min(12, MAX_LOGO), shape: 'circle' }
    emit('logoAdded')
  } catch {
    logoError.value = 'Não foi possível ler essa imagem.'
  }
}

const logoSize = computed({
  get: () => look.value.logo?.size ?? 12,
  set: (v) => look.value.logo && (look.value.logo.size = v),
})
const logoShape = computed({
  get: () => look.value.logo?.shape ?? 'circle',
  set: (v) => look.value.logo && (look.value.logo.shape = v),
})

// --- moldura e texto
const caption = computed({
  get: () => look.value.frame.text,
  set: (v) => (look.value.frame.text = v.slice(0, MAX_CAPTION)),
})

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
  <div>
    <AccordionRow v-model:open="open.eyes" title="Olhos do QR" :value="summary.eyes">
      <ChipGroup v-model="look.eyeShape" label="Formato dos olhos" :options="EYE_SHAPES.map((v) => ({ value: v, label: eyeLabels[v] }))" />
    </AccordionRow>

    <AccordionRow v-model:open="open.logo" title="Logo no centro" :value="summary.logo">
      <div class="flex flex-col gap-3">
        <input ref="fileInput" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" class="sr-only" aria-hidden="true" tabindex="-1" @change="onLogo" />
        <div class="flex flex-wrap items-center gap-2">
          <BaseButton variant="secondary" icon="plus" @click="fileInput?.click()">{{ look.logo ? 'Trocar logo' : 'Adicionar logo' }}</BaseButton>
          <span class="text-small text-fg-3">PNG ou SVG</span>
          <template v-if="look.logo">
            <img :src="look.logo.href" alt="Prévia da logo" class="size-10 rounded-sm border border-line bg-qr-paper object-contain" />
            <BaseButton variant="ghost" @click="look.logo = undefined">Remover</BaseButton>
          </template>
        </div>
        <p v-if="logoError" class="text-small text-danger" role="alert">{{ logoError }}</p>
        <template v-if="look.logo">
          <BaseSlider v-model="logoSize" label="Tamanho" :min="MIN_LOGO" :max="MAX_LOGO" :value-text="`${logoSize}% da área`" />
          <ChipGroup
            v-model="logoShape"
            label="Forma do logo"
            :options="[{ value: 'circle', label: 'Círculo' }, { value: 'square', label: 'Quadrado' }]"
          />
          <p class="text-small text-fg-3">A correção de erro sobe sozinha (Q ou H) conforme o tamanho da logo. O teste de leitura confirma se ainda lê.</p>
        </template>
      </div>
    </AccordionRow>

    <AccordionRow v-model:open="open.frame" title="Moldura e texto" :value="summary.frame">
      <div class="flex flex-col gap-4">
        <ChipGroup v-model="look.frame.kind" label="Moldura" :options="FRAMES.map((v) => ({ value: v, label: frameLabels[v] }))" />
        <BaseInput v-model="caption" label="Texto" placeholder="Escaneie aqui" />
        <ChipGroup
          v-model="look.frame.pos"
          label="Posição do texto"
          :options="[{ value: 'below', label: 'Abaixo' }, { value: 'above', label: 'Acima' }]"
        />
      </div>
    </AccordionRow>

    <AccordionRow v-model:open="open.exp" title="Exportar" :value="summary.exp">
      <div class="flex flex-col gap-4">
        <ChipGroup v-model="exp.format" label="Formato" :options="[...formats]" />
        <div class="flex items-end gap-2">
          <BaseInput v-model="wTxt" label="Largura" class="min-w-0 flex-1" />
          <BaseInput v-model="hTxt" label="Altura" class="min-w-0 flex-1" />
          <BaseTab :active="exp.unit === 'px'" @click="setUnit('px')">px</BaseTab>
          <BaseTab :active="exp.unit === 'cm'" @click="setUnit('cm')">cm</BaseTab>
        </div>
        <p class="text-small" :class="clamped ? 'text-danger' : 'text-fg-3'">
          Arquivo final: {{ exportPx }} × {{ Math.round(exportPx * aspect) }} px{{ clamped ? ` (limite de ${MIN_PX} a ${MAX_PX} px)` : '' }}
        </p>
        <BaseSelect v-model="dpi" label="Resolução (DPI)" :options="dpiOptions" />
        <ToggleRow v-model="exp.transparent">Fundo transparente no arquivo</ToggleRow>
        <p v-if="exp.format === 'pdf' && exp.transparent" class="text-small text-fg-3">O PDF sai sobre fundo branco.</p>
      </div>
    </AccordionRow>
  </div>
</template>

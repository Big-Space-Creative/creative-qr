<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { t } from '@/i18n'
import { EYE_SHAPES, FRAMES, GRAD_DIRS, MAX_CAPTION, MAX_LOGO, MAX_QUIET, MIN_LOGO, MIN_QUIET, MIN_SCALE } from '@/lib/qr'
import type { Look } from '@/composables/useQrGenerator'
import AccordionRow from './AccordionRow.vue'
import BaseButton from './ui/BaseButton.vue'
import ColorField from './ui/ColorField.vue'
import BaseInput from './ui/BaseInput.vue'
import BaseSlider from './ui/BaseSlider.vue'
import ChipGroup from './ui/ChipGroup.vue'
import ToggleRow from './ui/ToggleRow.vue'

// Seção "Avançado": olhos, logo, moldura e texto (tela 09 do Figma). A exportação ficou em ExportSettings.
const look = defineModel<Look>('look', { required: true })
const emit = defineEmits<{ logoAdded: [] }>()

const open = reactive({ eyes: false, modules: false, logo: false, frame: false })

const eyeLabel = (v: (typeof EYE_SHAPES)[number]) =>
  ({ square: t('advanced.eyeSquare'), rounded: t('advanced.eyeRounded'), circle: t('advanced.eyeCircle'), leaf: t('advanced.eyeLeaf') })[v]
const frameLabel = (v: (typeof FRAMES)[number]) =>
  ({ none: t('advanced.frameNone'), line: t('advanced.frameLine'), card: t('advanced.frameCard'), bubble: t('advanced.frameBubble') })[v]

// Cor final inicial do degradê: azul da marca, sempre distinta do tom padrão dos módulos.
const GRAD_DEFAULT_TO = '#04519e'
const gradLabel = (v: (typeof GRAD_DIRS)[number]) => ({ h: t('advanced.gradH'), v: t('advanced.gradV'), d: t('advanced.gradD') })[v]

// --- olhos: centro com cor própria (sem isso, segue a cor dos olhos)
const pupilOwn = computed({
  get: () => !!look.value.pupil,
  set: (v) => (look.value.pupil = v ? look.value.eye : undefined),
})
const pupilColor = computed({
  get: () => look.value.pupil ?? look.value.eye,
  set: (v) => (look.value.pupil = v),
})

// --- módulos: tamanho em %, degradê e margem
const scalePct = computed({
  get: () => Math.round(look.value.scale * 100),
  set: (v) => (look.value.scale = v / 100),
})
const gradOn = computed({
  get: () => !!look.value.grad,
  set: (v) => (look.value.grad = v ? { to: GRAD_DEFAULT_TO, dir: 'd' } : undefined),
})
const gradTo = computed({
  get: () => look.value.grad?.to ?? look.value.ink,
  set: (v) => look.value.grad && (look.value.grad.to = v),
})
const gradDir = computed({
  get: () => look.value.grad?.dir ?? 'h',
  set: (v) => look.value.grad && (look.value.grad.dir = v),
})

// --- moldura: cores próprias (sem isso, linha/balão usam a cor dos módulos)
const frameOwn = computed({
  get: () => !!look.value.frame.color || !!look.value.frame.textColor,
  set: (v) => {
    look.value.frame.color = v ? look.value.ink : undefined
    look.value.frame.textColor = v ? (look.value.frame.kind === 'bubble' ? look.value.paper : look.value.ink) : undefined
  },
})
const frameColor = computed({
  get: () => look.value.frame.color ?? look.value.ink,
  set: (v) => (look.value.frame.color = v),
})
const textColor = computed({
  get: () => look.value.frame.textColor ?? look.value.ink,
  set: (v) => (look.value.frame.textColor = v),
})

const summary = computed(() => ({
  eyes: `${eyeLabel(look.value.eyeShape)} · ${look.value.eye.toUpperCase()}`,
  modules: `${scalePct.value}% · ${t('advanced.quietShort', { n: look.value.quiet })}${look.value.grad ? ` · ${t('advanced.gradShort')}` : ''}`,
  logo: look.value.logo
    ? `${look.value.logo.shape === 'circle' ? t('advanced.logoCircle') : t('advanced.logoSquare')} · ${t('advanced.logoSizeValue', { n: look.value.logo.size })}`
    : t('advanced.logoNone'),
  frame: `${frameLabel(look.value.frame.kind)}${look.value.frame.text.trim() ? ` · “${look.value.frame.text.trim()}”` : ''}`,
}))

// --- logo: o arquivo é rasterizado em PNG pequeno; assim SVG de terceiros nunca entra no QR
const logoError = ref('') // chave de tradução
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
    logoError.value = 'advanced.logoErrFile'
    return
  }
  try {
    const href = await rasterize(file)
    look.value.logo = { href, size: Math.min(12, MAX_LOGO), shape: 'circle' }
    emit('logoAdded')
  } catch {
    logoError.value = 'advanced.logoErrRead'
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

</script>

<template>
  <div>
    <AccordionRow v-model:open="open.eyes" :title="t('advanced.eyes')" :value="summary.eyes">
      <div class="flex flex-col gap-4">
        <ChipGroup v-model="look.eyeShape" :label="t('advanced.eyesShape')" :options="EYE_SHAPES.map((v) => ({ value: v, label: eyeLabel(v) }))" />
        <ToggleRow v-model="pupilOwn">{{ t('advanced.pupilOwn') }}</ToggleRow>
        <ColorField v-if="pupilOwn" v-model="pupilColor" :label="t('advanced.pupilColor')" />
      </div>
    </AccordionRow>

    <AccordionRow v-model:open="open.modules" :title="t('advanced.modules')" :value="summary.modules">
      <div class="flex flex-col gap-4">
        <BaseSlider v-model="scalePct" :label="t('advanced.moduleSize')" :min="Math.round(MIN_SCALE * 100)" :max="100" :step="5" :value-text="`${scalePct}%`" />
        <ToggleRow v-model="gradOn">{{ t('advanced.gradient') }}</ToggleRow>
        <template v-if="gradOn">
          <ColorField v-model="gradTo" :label="t('advanced.gradEnd')" />
          <ChipGroup v-model="gradDir" :label="t('advanced.gradDir')" :options="GRAD_DIRS.map((v) => ({ value: v, label: gradLabel(v) }))" />
        </template>
        <BaseSlider v-model="look.quiet" :label="t('advanced.quiet')" :min="MIN_QUIET" :max="MAX_QUIET" />
        <p v-if="look.quiet < 4" class="text-small text-fg-3">{{ t('advanced.quietNote') }}</p>
      </div>
    </AccordionRow>

    <AccordionRow v-model:open="open.logo" :title="t('advanced.logo')" :value="summary.logo">
      <div class="flex flex-col gap-3">
        <input ref="fileInput" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" class="sr-only" aria-hidden="true" tabindex="-1" @change="onLogo" />
        <div class="flex flex-wrap items-center gap-2">
          <BaseButton variant="secondary" icon="plus" @click="fileInput?.click()">{{ look.logo ? t('advanced.logoChange') : t('advanced.logoAdd') }}</BaseButton>
          <span class="text-small text-fg-3">{{ t('advanced.logoFormats') }}</span>
          <template v-if="look.logo">
            <img :src="look.logo.href" :alt="t('advanced.logoPreview')" class="size-10 rounded-sm border border-line bg-qr-paper object-contain" />
            <BaseButton variant="ghost" @click="look.logo = undefined">{{ t('common.remove') }}</BaseButton>
          </template>
        </div>
        <p v-if="logoError" class="text-small text-danger" role="alert">{{ t(logoError) }}</p>
        <template v-if="look.logo">
          <BaseSlider v-model="logoSize" :label="t('advanced.logoSize')" :min="MIN_LOGO" :max="MAX_LOGO" :value-text="t('advanced.logoSizeValue', { n: logoSize })" />
          <ChipGroup
            v-model="logoShape"
            :label="t('advanced.logoShape')"
            :options="[{ value: 'circle', label: t('advanced.logoCircle') }, { value: 'square', label: t('advanced.logoSquare') }]"
          />
          <p class="text-small text-fg-3">{{ t('advanced.logoEccNote') }}</p>
        </template>
      </div>
    </AccordionRow>

    <AccordionRow v-model:open="open.frame" :title="t('advanced.frame')" :value="summary.frame">
      <div class="flex flex-col gap-4">
        <ChipGroup v-model="look.frame.kind" :label="t('advanced.frameKind')" :options="FRAMES.map((v) => ({ value: v, label: frameLabel(v) }))" />
        <BaseInput v-model="caption" :label="t('advanced.caption')" :placeholder="t('advanced.captionPh')" />
        <ChipGroup
          v-model="look.frame.pos"
          :label="t('advanced.captionPos')"
          :options="[{ value: 'below', label: t('advanced.below') }, { value: 'above', label: t('advanced.above') }]"
        />
        <ToggleRow v-model="frameOwn">{{ t('advanced.frameOwn') }}</ToggleRow>
        <div v-if="frameOwn" class="flex flex-wrap gap-x-8 gap-y-4">
          <ColorField v-model="frameColor" :label="t('advanced.frameColor')" />
          <ColorField v-model="textColor" :label="t('advanced.textColor')" />
        </div>
      </div>
    </AccordionRow>

  </div>
</template>

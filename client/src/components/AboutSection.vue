<script setup lang="ts">
import { buildMatrix, qrSvg, type QrStyle } from '@/lib/qr'
import { t } from '@/i18n'
import RecentCard from './RecentCard.vue'
import TextBlock from './TextBlock.vue'

// Amostras reais: o mesmo renderizador do gerador, sobre uma matriz de 21×21 módulos.
const matrix = buildMatrix('ex.co/1', 'M')
const INK = '#151412'
const BLUE = '#04519e'
const base = { paper: '#ffffff', frame: { kind: 'none', text: '', pos: 'below' } } as const
const specs: { id: string; name: string; meta: string; style: QrStyle }[] = [
  {
    id: 'square',
    name: 'about.sampleSquare',
    meta: 'about.sampleSquareMeta',
    style: { ...base, ink: INK, eye: INK, shape: 'square', eyeShape: 'square' },
  },
  {
    id: 'dots',
    name: 'about.sampleDots',
    meta: 'about.sampleDotsMeta',
    style: { ...base, ink: INK, eye: INK, shape: 'dots', eyeShape: 'square' },
  },
  {
    id: 'rounded',
    name: 'about.sampleRounded',
    meta: 'about.sampleRoundedMeta',
    style: { ...base, ink: INK, eye: INK, shape: 'rounded', eyeShape: 'rounded' },
  },
  {
    id: 'diamond',
    name: 'about.sampleDiamond',
    meta: 'about.sampleDiamondMeta',
    style: { ...base, ink: INK, eye: INK, shape: 'diamond', eyeShape: 'circle' },
  },
  {
    id: 'blue',
    name: 'about.sampleBlue',
    meta: 'about.sampleBlueMeta',
    style: { ...base, ink: BLUE, eye: BLUE, shape: 'rounded', eyeShape: 'rounded' },
  },
  {
    id: 'blueDots',
    name: 'about.sampleBlueDots',
    meta: 'about.sampleBlueDotsMeta',
    style: { ...base, ink: BLUE, eye: BLUE, shape: 'dots', eyeShape: 'circle' },
  },
].map((s) => ({ ...s, style: s.style as QrStyle }))
const svgs = Object.fromEntries(specs.map((s) => [s.id, qrSvg(matrix, s.style)]))
const col1 = [1, 2, 3]
const col2 = [4, 5, 6]
</script>

<template>
  <section
    id="sobre"
    aria-labelledby="sobre-title"
    class="border-t border-line px-4 pt-6 pb-12 md:px-10 xl:px-40"
  >
    <div class="flex flex-col gap-10">
      <div class="flex flex-col gap-2">
        <p class="text-body-medium">{{ t('about.section') }}</p>
        <h1 id="sobre-title" class="text-heading md:text-heading-lg">{{ t('about.title') }}</h1>
        <p class="text-body max-w-[720px] text-fg-2">{{ t('about.intro') }}</p>
      </div>

      <ul class="grid grid-cols-3 gap-4 md:grid-cols-6">
        <li v-for="s in specs" :key="s.id" class="min-w-0">
          <RecentCard :name="t(s.name)" :meta="t(s.meta)" wrap>
            <span class="block [&>svg]:size-full" aria-hidden="true" v-html="svgs[s.id]" />
          </RecentCard>
        </li>
      </ul>

      <div class="grid gap-8 md:grid-cols-2">
        <div class="flex flex-col gap-8">
          <TextBlock
            v-for="n in col1"
            :key="n"
            heading
            :title="t(`about.f${n}Title`)"
            :text="t(`about.f${n}Text`)"
          />
        </div>
        <div class="flex flex-col gap-8">
          <TextBlock
            v-for="n in col2"
            :key="n"
            heading
            :title="t(`about.f${n}Title`)"
            :text="t(`about.f${n}Text`)"
          />
        </div>
      </div>
    </div>
  </section>
</template>

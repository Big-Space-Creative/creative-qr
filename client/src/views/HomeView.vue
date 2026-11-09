<script setup lang="ts">
import { computed, ref } from 'vue'
import AdvancedOptions from '@/components/AdvancedOptions.vue'
import ExportSettings from '@/components/ExportSettings.vue'
import CheckRow from '@/components/CheckRow.vue'
import DestinoRow from '@/components/DestinoRow.vue'
import ExportarOpcoes from '@/components/ExportarOpcoes.vue'
import RecentCard from '@/components/RecentCard.vue'
import TypeFields from '@/components/TypeFields.vue'
import AlertBox from '@/components/ui/AlertBox.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseTab from '@/components/ui/BaseTab.vue'
import ColorField from '@/components/ui/ColorField.vue'
import ModalDialog from '@/components/ui/ModalDialog.vue'
import TypeOption from '@/components/ui/TypeOption.vue'
import { MIN_CONTRAST, useQrGenerator } from '@/composables/useQrGenerator'
import { t } from '@/i18n'
import { recentsAllowed } from '@/lib/consent'
import { DEFAULT_EXPORT, exportBlob, uniqueName, zipBlob } from '@/lib/exporter'
import { batchRows, labelFor, snapshot, type TypeId } from '@/lib/payloads'
import { buildMatrix, DEFAULT_STYLE, MAX_LOGO, qrSvg, type Ecc, type Shape } from '@/lib/qr'
import {
  addRecent,
  mergeRecents,
  normalizeRecent,
  recents,
  whenLabel,
  type Recent,
} from '@/lib/recents'

const types: { id: TypeId; icon: string }[] = [
  { id: 'url', icon: 'link' },
  { id: 'text', icon: 'text' },
  { id: 'wifi', icon: 'wifi' },
  { id: 'vcard', icon: 'user' },
  { id: 'whatsapp', icon: 'whatsapp' },
  { id: 'pix', icon: 'pix' },
  { id: 'email', icon: 'mail' },
  { id: 'geo', icon: 'pin' },
  { id: 'sms', icon: 'sms' },
  { id: 'tel', icon: 'phone' },
  { id: 'event', icon: 'calendar' },
  { id: 'batch', icon: 'list' },
]
const shapes: Shape[] = ['square', 'dots', 'rounded', 'diamond', 'leaf', 'vbar', 'hbar']
const eccs: { value: Ecc; label: string }[] = [
  { value: 'L', label: 'L · 7%' },
  { value: 'M', label: 'M · 15%' },
  { value: 'Q', label: 'Q · 25%' },
  { value: 'H', label: 'H · 30%' },
]

const g = useQrGenerator()
const { type, form, look, exp } = g

const busy = ref(false)
const progress = ref('')
const copied = ref(false)
const notice = ref('')

const isBatch = computed(() => type.value === 'batch')
const typeLabel = (id: string) => t(`types.${id}`)
const hasQr = computed(() => !!g.preview.value)
const dimmed = computed(() => hasQr.value && g.scan.value !== 'running' && !g.approved.value)

const hints: Partial<Record<TypeId, string>> = {
  url: 'preview.emptyUrl',
  text: 'preview.emptyText',
  batch: 'preview.emptyBatch',
}
const emptyHint = computed(() => t(hints[type.value] ?? 'preview.emptyDefault'))
const destino = computed(() => {
  const p = g.payload.value
  if (!p) return '–'
  return (type.value === 'url' ? p.replace(/^https?:\/\//, '') : (p.split(/\r?\n/)[0] ?? p)).slice(
    0,
    80,
  )
})
const ratio = computed(() => g.contrast.value.toFixed(1).replace('.', ','))
const minPrint = computed(() => `${g.minPrintCm.value.toFixed(1).replace('.', ',')} cm`)
const actionLabel = computed(() => {
  if (progress.value) return progress.value
  if (isBatch.value)
    return g.batchCount.value
      ? t('actions.downloadZipN', { n: g.batchCount.value })
      : t('actions.downloadZip')
  return t('actions.download', { fmt: exp.format.toUpperCase() })
})

// --- ações
function save(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function remember() {
  if (isBatch.value || !g.payload.value) return
  addRecent({
    name: labelFor(type.value, form, g.payload.value),
    type: type.value,
    fields: snapshot(type.value, form),
    payload: g.payload.value,
    style: g.style.value,
    ecc: look.ecc,
    scan: g.approved.value,
  })
}

const nextTick = () => new Promise<void>((r) => setTimeout(r))

async function download() {
  if (busy.value || !g.matrix.value) return
  busy.value = true
  notice.value = ''
  try {
    if (isBatch.value) return await downloadBatch()
    const name = `creative-qr-${(labelFor(type.value, form, g.payload.value) || 'qr').replace(/[^\p{L}\p{N}-]+/gu, '-')}.${exp.format}`
    save(await exportBlob(g.matrix.value, g.style.value, exp), name)
    remember()
  } finally {
    busy.value = false
    progress.value = ''
  }
}

async function downloadBatch() {
  const r = batchRows(form.batch)
  if ('error' in r) return
  const taken = new Set<string>()
  const files: { name: string; blob: Blob }[] = []
  let skipped = 0
  for (const [i, row] of r.rows.entries()) {
    progress.value = t('actions.generating', { i: i + 1, n: r.rows.length })
    await nextTick() // deixa a tela respirar entre um QR e outro
    try {
      const blob = await exportBlob(buildMatrix(row.content, look.ecc), g.style.value, exp)
      files.push({ name: uniqueName(row.name || `qr-${i + 1}`, taken, exp.format), blob })
    } catch {
      skipped++ // conteúdo grande demais para um QR
    }
  }
  if (!files.length) {
    notice.value = t('actions.noneFit')
    return
  }
  save(await zipBlob(files), 'creative-qr-batch.zip')
  if (skipped)
    notice.value = skipped === 1 ? t('actions.skipped1') : t('actions.skippedN', { n: skipped })
}

async function copy() {
  if (busy.value || !g.matrix.value || isBatch.value) return
  busy.value = true
  try {
    const blob = await exportBlob(g.matrix.value, g.style.value, { ...exp, format: 'png' })
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  } catch {
    // Safari/HTTP sem permissão de imagem: copia o conteúdo como texto.
    await navigator.clipboard?.writeText(g.payload.value)
  } finally {
    busy.value = false
  }
  remember()
  copied.value = true
  setTimeout(() => (copied.value = false), 1600)
}

// --- recentes
const thumb = (r: Recent) => {
  try {
    return qrSvg(buildMatrix(r.payload, r.ecc), r.style, { transparent: false })
  } catch {
    return '' // payload importado grande demais para um QR
  }
}

function openRecent(r: Recent) {
  g.load(r)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// --- exportar / importar projeto
const exportOpen = ref(false)
const exportFormat = ref<'json' | 'zip'>('json')
const withAppearance = ref(true)
const withScan = ref(true)
const importError = ref(false)
const fileInput = ref<HTMLInputElement>()

async function exportProject() {
  exportOpen.value = false
  if (exportFormat.value === 'zip') {
    const taken = new Set<string>()
    const files: { name: string; blob: Blob }[] = []
    for (const r of recents.value) {
      try {
        const blob = await exportBlob(buildMatrix(r.payload, r.ecc), r.style, { ...DEFAULT_EXPORT })
        files.push({ name: uniqueName(r.name || r.type, taken, 'png'), blob })
      } catch {
        // payload grande demais: fica de fora do ZIP
      }
    }
    if (files.length) save(await zipBlob(files), 'creative-qr-images.zip')
    return
  }
  const items = recents.value.map((r) => {
    const { style, ecc, scan, ...base } = r
    return {
      ...base,
      ...(withAppearance.value ? { style, ecc } : {}),
      ...(withScan.value ? { scan } : {}),
    }
  })
  save(
    new Blob([JSON.stringify({ app: 'creative-qr', version: 1, items }, null, 2)], {
      type: 'application/json',
    }),
    'creative-qr-projeto.json',
  )
}

async function importProject(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importError.value = false
  try {
    const data = JSON.parse(await file.text())
    const items = (Array.isArray(data?.items) ? data.items : [])
      // Sem aparência no arquivo, usa o estilo padrão. A validação real é do normalizeRecent.
      .map((i: unknown) => normalizeRecent({ ecc: 'M', style: DEFAULT_STYLE, ...(i as object) }))
      .filter((r: Recent | null): r is Recent => !!r)
    if (!items.length) throw new Error('vazio')
    mergeRecents(items)
  } catch {
    importError.value = true
  }
}
</script>

<template>
  <main
    id="generator-page"
    tabindex="-1"
    class="outline-none px-4 pt-6 pb-28 md:px-10 md:pt-12 md:pb-12 xl:px-40"
  >
    <div class="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8">
      <!-- Formulário -->
      <div class="flex flex-col gap-8 max-lg:contents">
        <h1 class="text-display text-[24px] leading-[30px] md:text-[40px] md:leading-[44px]">
          {{ t('page.title') }}
        </h1>

        <div class="flex flex-col gap-8 max-lg:contents">
          <section
            class="flex flex-col gap-6 border-t border-line pt-8 max-lg:order-1"
            data-tutorial="type"
          >
            <h2 class="text-heading">{{ t('sections.type') }}</h2>
            <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
              <TypeOption
                v-for="ty in types"
                :key="ty.id"
                :icon="ty.icon"
                :active="type === ty.id"
                @click="type = ty.id"
              >
                {{ typeLabel(ty.id) }}
              </TypeOption>
            </div>
          </section>

          <section
            class="flex flex-col gap-6 border-t border-line pt-8 max-lg:order-2"
            data-tutorial="content"
          >
            <h2 class="text-heading">{{ isBatch ? t('sections.csv') : t('sections.content') }}</h2>
            <TypeFields
              :form="form"
              :type="type"
              :error="g.error.value"
              @touch="g.touched.value = true"
            />
          </section>

          <section
            class="flex flex-col gap-6 border-t border-line pt-8 max-lg:order-4"
            data-tutorial="appearance"
          >
            <h2 class="text-heading">{{ t('sections.look') }}</h2>
            <div class="flex flex-col gap-2">
              <p class="text-small text-fg-2">{{ t('look.colors') }}</p>
              <div class="flex flex-wrap gap-x-8 gap-y-4">
                <ColorField v-model="look.ink" :label="t('look.modules')" />
                <ColorField v-model="look.eye" :label="t('look.eyes')" />
                <ColorField v-model="look.paper" :label="t('look.background')" />
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <p class="text-small text-fg-2">{{ t('look.shape') }}</p>
              <div class="flex flex-wrap gap-2">
                <BaseTab
                  v-for="s in shapes"
                  :key="s"
                  :active="look.shape === s"
                  :icon="`shape-${s}`"
                  @click="look.shape = s"
                  >{{ t(`look.${s}`) }}</BaseTab
                >
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <p class="text-small text-fg-2">{{ t('look.ecc') }}</p>
              <div class="flex flex-wrap gap-2">
                <BaseTab
                  v-for="e in eccs"
                  :key="e.value"
                  :active="look.ecc === e.value"
                  @click="look.ecc = e.value"
                  >{{ e.label }}</BaseTab
                >
              </div>
            </div>
          </section>

          <section class="flex flex-col gap-2 border-t border-line pt-8 max-lg:order-5">
            <h2 class="text-heading">{{ t('sections.advanced') }}</h2>
            <p class="text-small text-fg-2">{{ t('sections.advancedHint') }}</p>
            <div class="pt-2">
              <AdvancedOptions v-model:look="look" @logo-added="g.ensureEccForLogo()" />
            </div>
          </section>
        </div>
      </div>

      <!-- Prévia -->
      <div class="flex flex-col gap-6 max-lg:order-3 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto">
        <div
          v-if="hasQr"
          class="shrink-0 overflow-hidden rounded-[2px] transition-opacity [&>svg]:block [&>svg]:w-full"
          :class="{ 'opacity-50': dimmed }"
          role="img"
          :aria-label="t('preview.alt', { dest: destino })"
          v-html="g.preview.value"
        />
        <div
          v-else
          class="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[2px] border border-line bg-sunken p-6 text-center"
        >
          <AppIcon :name="g.tooBig.value ? 'alert' : 'link'" class="text-fg-3" />
          <p class="text-small text-fg-2">{{ g.tooBig.value ? t('preview.tooBig') : emptyHint }}</p>
        </div>

        <DestinoRow :label="t('preview.destination')" :value="destino" />

        <ExportSettings v-model:exp="exp" :aspect="g.aspect.value" :export-px="g.exportPx.value" />

        <section class="flex flex-col gap-3 border-t border-line pt-4">
          <div class="flex items-center gap-2">
            <AppIcon name="shield" class="text-fg-2" />
            <h2 class="text-body-medium">{{ t('scan.title') }}</h2>
            <span class="flex-1" />
            <span v-if="!hasQr" class="text-data text-fg-3">{{ t('scan.waiting') }}</span>
            <span v-else-if="g.scan.value === 'running'" class="text-data text-fg-3">{{
              t('scan.running')
            }}</span>
            <span v-else-if="g.approved.value" class="text-data text-success">{{
              t('scan.pass')
            }}</span>
            <span v-else class="text-data text-danger">{{ t('scan.fail') }}</span>
          </div>
          <p v-if="!hasQr" class="text-small text-fg-3">{{ t('scan.idleHint') }}</p>
          <template v-else>
            <CheckRow
              :label="t('scan.read')"
              :value="
                g.scan.value === 'ok'
                  ? t('scan.same')
                  : g.scan.value === 'running'
                    ? '…'
                    : t('scan.unread')
              "
              :icon="g.scan.value === 'fail' ? 'x' : 'check'"
              :tone="g.scan.value === 'fail' ? 'danger' : 'success'"
            />
            <CheckRow
              :label="t('scan.contrast')"
              :value="`${ratio} : 1${g.contrastOk.value ? '' : ` ${t('scan.contrastMin', { n: String(MIN_CONTRAST).replace('.', ',') })}`}`"
              :icon="g.contrastOk.value ? 'check' : 'x'"
              :tone="g.contrastOk.value ? 'success' : 'danger'"
            />
            <CheckRow :label="t('scan.minPrint')" :value="minPrint" />
            <CheckRow
              v-if="look.logo"
              :label="t('scan.logoCovers')"
              :value="t('scan.logoValue', { n: look.logo.size, max: MAX_LOGO })"
              :icon="g.logoOk.value ? 'check' : 'x'"
              :tone="g.logoOk.value ? 'success' : 'danger'"
            />
            <CheckRow
              :label="t('scan.density')"
              :value="t('scan.densityValue', { n: g.modules.value })"
            />
            <p v-if="!g.contrastOk.value || !g.logoOk.value" class="text-small text-fg-2">
              {{
                look.logo ? t('scan.hintContrastLogo', { max: MAX_LOGO }) : t('scan.hintContrast')
              }}
            </p>
            <p v-else-if="g.scan.value === 'fail' && look.logo" class="text-small text-fg-2">
              {{ t('scan.hintLogoCover') }}
            </p>
          </template>
        </section>

        <AlertBox
          v-if="notice"
          kind="info"
          :title="t('common.notice')"
          dismissible
          @dismiss="notice = ''"
          >{{ notice }}</AlertBox
        >

        <div
          data-tutorial="download"
          class="flex gap-2 lg:sticky lg:bottom-0 lg:bg-app lg:pt-2 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-20 max-lg:border-t max-lg:border-line max-lg:bg-app max-lg:p-4"
        >
          <BaseButton
            class="flex-1"
            icon="download"
            :disabled="!hasQr || !g.approved.value || busy"
            @click="download"
            >{{ actionLabel }}</BaseButton
          >
          <BaseButton
            variant="secondary"
            :disabled="!hasQr || !g.approved.value || busy || isBatch"
            @click="copy"
            >{{ copied ? t('actions.copied') : t('actions.copy') }}</BaseButton
          >
        </div>
      </div>
    </div>

    <!-- Recentes -->
    <section class="mt-12 flex flex-col gap-4 border-t border-line pt-6 md:mt-16">
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex flex-col gap-1">
          <h2 class="text-body-medium">{{ t('recents.title') }}</h2>
          <p class="text-small text-fg-2">
            {{ recentsAllowed ? t('recents.hint') : t('recents.hintOff') }}
          </p>
        </div>
        <span class="flex-1" />
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="sr-only"
          aria-hidden="true"
          tabindex="-1"
          @change="importProject"
        />
        <BaseButton variant="secondary" @click="fileInput?.click()">{{
          t('recents.import')
        }}</BaseButton>
        <BaseButton variant="secondary" :disabled="!recents.length" @click="exportOpen = true">{{
          t('recents.export')
        }}</BaseButton>
      </div>
      <AlertBox
        v-if="importError"
        kind="danger"
        :title="t('recents.importFailed')"
        dismissible
        @dismiss="importError = false"
      >
        {{ t('recents.importMsg') }}
      </AlertBox>
      <ul v-if="recents.length" class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <li v-for="r in recents" :key="r.id" class="min-w-0">
          <button
            type="button"
            class="focus-ring block w-full rounded-sm text-left"
            @click="openRecent(r)"
          >
            <RecentCard
              :name="r.name || typeLabel(r.type)"
              :meta="`${typeLabel(r.type)} · ${whenLabel(r.at)}`"
            >
              <span class="block [&>svg]:size-full" aria-hidden="true" v-html="thumb(r)" />
            </RecentCard>
          </button>
        </li>
      </ul>
      <p v-else class="text-small text-fg-3">{{ t('recents.empty') }}</p>
    </section>
  </main>

  <ModalDialog
    v-model:open="exportOpen"
    :title="t('exportProject.title')"
    :description="
      recents.length === 1
        ? t('exportProject.desc1')
        : t('exportProject.descN', { n: recents.length })
    "
    :confirm-label="t('exportProject.confirm')"
    confirm-icon="download"
    @confirm="exportProject"
  >
    <ExportarOpcoes
      v-model:format="exportFormat"
      v-model:with-appearance="withAppearance"
      v-model:with-scan="withScan"
      :count="recents.length"
    />
  </ModalDialog>
</template>

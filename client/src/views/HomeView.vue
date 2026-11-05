<script setup lang="ts">
import { computed, ref } from 'vue'
import AdvancedOptions from '@/components/AdvancedOptions.vue'
import CheckRow from '@/components/CheckRow.vue'
import DestinoRow from '@/components/DestinoRow.vue'
import ExportarOpcoes from '@/components/ExportarOpcoes.vue'
import RecentCard from '@/components/RecentCard.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import TopBar from '@/components/TopBar.vue'
import TypeFields from '@/components/TypeFields.vue'
import AlertBox from '@/components/ui/AlertBox.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseTab from '@/components/ui/BaseTab.vue'
import ColorField from '@/components/ui/ColorField.vue'
import ModalDialog from '@/components/ui/ModalDialog.vue'
import TypeOption from '@/components/ui/TypeOption.vue'
import { MIN_CONTRAST, useQrGenerator } from '@/composables/useQrGenerator'
import { DEFAULT_EXPORT, exportBlob, uniqueName, zipBlob } from '@/lib/exporter'
import { batchRows, labelFor, snapshot, type TypeId } from '@/lib/payloads'
import { buildMatrix, DEFAULT_STYLE, MAX_LOGO, qrSvg, type Ecc, type Shape } from '@/lib/qr'
import { addRecent, mergeRecents, normalizeRecent, recents, whenLabel, type Recent } from '@/lib/recents'

const types: { id: TypeId; label: string; icon: string }[] = [
  { id: 'url', label: 'URL', icon: 'link' },
  { id: 'text', label: 'Texto', icon: 'text' },
  { id: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
  { id: 'vcard', label: 'vCard', icon: 'user' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
  { id: 'pix', label: 'PIX', icon: 'pix' },
  { id: 'email', label: 'E-mail', icon: 'mail' },
  { id: 'geo', label: 'Local', icon: 'pin' },
  { id: 'sms', label: 'SMS', icon: 'sms' },
  { id: 'tel', label: 'Telefone', icon: 'phone' },
  { id: 'event', label: 'Calendário', icon: 'calendar' },
  { id: 'batch', label: 'Lote (CSV)', icon: 'list' },
]
const shapes: { value: Shape; label: string }[] = [
  { value: 'square', label: 'Quadrado' },
  { value: 'dots', label: 'Pontos' },
  { value: 'rounded', label: 'Arredondado' },
  { value: 'diamond', label: 'Losango' },
]
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
const typeLabel = (id: string) => types.find((t) => t.id === id)?.label ?? id
const hasQr = computed(() => !!g.preview.value)
const dimmed = computed(() => hasQr.value && g.scan.value !== 'running' && !g.approved.value)

const hints: Partial<Record<TypeId, string>> = {
  url: 'Preencha a URL de destino para gerar.',
  text: 'Escreva o texto para gerar.',
  batch: 'Escolha um arquivo CSV para gerar.',
}
const emptyHint = computed(() => hints[type.value] ?? 'Preencha os campos para gerar.')
const destino = computed(() => {
  const p = g.payload.value
  if (!p) return '–'
  return (type.value === 'url' ? p.replace(/^https?:\/\//, '') : (p.split(/\r?\n/)[0] ?? p)).slice(0, 80)
})
const ratio = computed(() => g.contrast.value.toFixed(1).replace('.', ','))
const minPrint = computed(() => `${g.minPrintCm.value.toFixed(1).replace('.', ',')} cm`)
const actionLabel = computed(() => {
  if (progress.value) return progress.value
  if (isBatch.value) return `Baixar ZIP${g.batchCount.value ? ` (${g.batchCount.value})` : ''}`
  return `Baixar ${exp.format.toUpperCase()}`
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
    progress.value = `Gerando ${i + 1}/${r.rows.length}`
    await nextTick() // deixa a tela respirar entre um QR e outro
    try {
      const blob = await exportBlob(buildMatrix(row.content, look.ecc), g.style.value, exp)
      files.push({ name: uniqueName(row.name || `qr-${i + 1}`, taken, exp.format), blob })
    } catch {
      skipped++ // conteúdo grande demais para um QR
    }
  }
  if (!files.length) {
    notice.value = 'Nenhuma linha coube em um QR code.'
    return
  }
  save(await zipBlob(files), 'creative-qr-lote.zip')
  if (skipped) notice.value = `${skipped} ${skipped === 1 ? 'linha não coube' : 'linhas não couberam'} em um QR code e ${skipped === 1 ? 'foi pulada' : 'foram puladas'}.`
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
const importError = ref('')
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
    if (files.length) save(await zipBlob(files), 'creative-qr-imagens.zip')
    return
  }
  const items = recents.value.map((r) => {
    const { style, ecc, scan, ...base } = r
    return { ...base, ...(withAppearance.value ? { style, ecc } : {}), ...(withScan.value ? { scan } : {}) }
  })
  save(
    new Blob([JSON.stringify({ app: 'creative-qr', version: 1, items }, null, 2)], { type: 'application/json' }),
    'creative-qr-projeto.json',
  )
}

async function importProject(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importError.value = ''
  try {
    const data = JSON.parse(await file.text())
    const items = (Array.isArray(data?.items) ? data.items : [])
      // Sem aparência no arquivo, usa o estilo padrão. A validação real é do normalizeRecent.
      .map((i: unknown) => normalizeRecent({ ecc: 'M', style: DEFAULT_STYLE, ...(i as object) }))
      .filter((r: Recent | null): r is Recent => !!r)
    if (!items.length) throw new Error('vazio')
    mergeRecents(items)
  } catch {
    importError.value = 'Não foi possível ler esse arquivo. Use um .json exportado pelo Creative QR.'
  }
}
</script>

<template>
  <TopBar />
  <main class="px-4 pt-6 pb-28 md:px-10 md:pt-12 md:pb-12 xl:px-40">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8">
      <!-- Formulário -->
      <div class="flex flex-col gap-8 max-lg:contents">
        <h1 class="text-display text-[24px] leading-[30px] md:text-[40px] md:leading-[44px]">Gerar QR code</h1>

        <div class="flex flex-col gap-6 max-lg:contents">
          <section class="flex flex-col gap-4 border-t border-line pt-6 max-lg:order-1">
            <h2 class="text-body-medium">Tipo</h2>
            <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
              <TypeOption v-for="t in types" :key="t.id" :icon="t.icon" :active="type === t.id" @click="type = t.id">
                {{ t.label }}
              </TypeOption>
            </div>
          </section>

          <section class="flex flex-col gap-4 border-t border-line pt-6 max-lg:order-2">
            <h2 class="text-body-medium">{{ isBatch ? 'Arquivo CSV' : 'Conteúdo' }}</h2>
            <TypeFields :form="form" :type="type" :error="g.error.value" @touch="g.touched.value = true" />
          </section>

          <section class="flex flex-col gap-4 border-t border-line pt-6 max-lg:order-4">
            <h2 class="text-body-medium">Aparência</h2>
            <div class="flex flex-col gap-2">
              <p class="text-small text-fg-2">Cores</p>
              <div class="flex flex-wrap gap-x-8 gap-y-4">
                <ColorField v-model="look.ink" label="Módulos" />
                <ColorField v-model="look.eye" label="Olhos" />
                <ColorField v-model="look.paper" label="Fundo" />
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <p class="text-small text-fg-2">Formato do miolo</p>
              <div class="flex flex-wrap gap-2">
                <BaseTab v-for="s in shapes" :key="s.value" :active="look.shape === s.value" @click="look.shape = s.value">{{ s.label }}</BaseTab>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <p class="text-small text-fg-2">Correção de erro</p>
              <div class="flex flex-wrap gap-2">
                <BaseTab v-for="e in eccs" :key="e.value" :active="look.ecc === e.value" @click="look.ecc = e.value">{{ e.label }}</BaseTab>
              </div>
            </div>
          </section>

          <section class="flex flex-col gap-2 border-t border-line pt-6 max-lg:order-5">
            <h2 class="text-body-medium">Avançado</h2>
            <p class="text-small text-fg-2">Tudo continua com valores padrão se você não abrir.</p>
            <div class="pt-2">
              <AdvancedOptions v-model:look="look" v-model:exp="exp" :aspect="g.aspect.value" :export-px="g.exportPx.value" @logo-added="g.ensureEccForLogo()" />
            </div>
          </section>
        </div>
      </div>

      <!-- Prévia -->
      <div class="flex flex-col gap-4 max-lg:order-3 lg:self-start">
        <div
          v-if="hasQr"
          class="overflow-hidden rounded-[2px] transition-opacity [&>svg]:block [&>svg]:w-full"
          :class="{ 'opacity-50': dimmed }"
          role="img"
          :aria-label="`QR code para ${destino}`"
          v-html="g.preview.value"
        />
        <div v-else class="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[2px] border border-line bg-sunken p-6 text-center">
          <AppIcon :name="g.tooBig.value ? 'alert' : 'link'" class="text-fg-3" />
          <p class="text-small text-fg-2">{{ g.tooBig.value ? 'Conteúdo grande demais para um QR code.' : emptyHint }}</p>
        </div>

        <DestinoRow :value="destino" />

        <section class="flex flex-col gap-3 border-t border-line pt-4">
          <div class="flex items-center gap-2">
            <AppIcon name="shield" class="text-fg-2" />
            <h2 class="text-body-medium">Teste de leitura</h2>
            <span class="flex-1" />
            <span v-if="!hasQr" class="text-data text-fg-3">Aguardando</span>
            <span v-else-if="g.scan.value === 'running'" class="text-data text-fg-3">Testando…</span>
            <span v-else-if="g.approved.value" class="text-data text-success">Aprovado</span>
            <span v-else class="text-data text-danger">Reprovado</span>
          </div>
          <p v-if="!hasQr" class="text-small text-fg-3">O teste roda assim que houver conteúdo.</p>
          <template v-else>
            <CheckRow
              label="Leitura do QR"
              :value="g.scan.value === 'ok' ? 'Conteúdo igual' : g.scan.value === 'running' ? '…' : 'Não leu'"
              :icon="g.scan.value === 'fail' ? 'x' : 'check'"
              :tone="g.scan.value === 'fail' ? 'danger' : 'success'"
            />
            <CheckRow
              label="Contraste"
              :value="`${ratio} : 1${g.contrastOk.value ? '' : ` (mín. ${String(MIN_CONTRAST).replace('.', ',')})`}`"
              :icon="g.contrastOk.value ? 'check' : 'x'"
              :tone="g.contrastOk.value ? 'success' : 'danger'"
            />
            <CheckRow label="Tamanho mínimo impresso" :value="minPrint" />
            <CheckRow
              v-if="look.logo"
              label="Logo cobre"
              :value="`${look.logo.size}% (limite ${MAX_LOGO}%)`"
              :icon="g.logoOk.value ? 'check' : 'x'"
              :tone="g.logoOk.value ? 'success' : 'danger'"
            />
            <CheckRow label="Densidade" :value="`${g.modules.value} × ${g.modules.value} módulos`" />
            <p v-if="!g.contrastOk.value || !g.logoOk.value" class="text-small text-fg-2">
              Aumente o contraste entre módulos e fundo{{ look.logo ? ` e reduza a logo para até ${MAX_LOGO}%` : '' }}.
            </p>
            <p v-else-if="g.scan.value === 'fail' && look.logo" class="text-small text-fg-2">
              A logo cobre demais e o QR não lê. Reduza o tamanho dela.
            </p>
          </template>
        </section>

        <AlertBox v-if="notice" kind="info" title="Aviso" dismissible @dismiss="notice = ''">{{ notice }}</AlertBox>

        <div
          class="flex gap-2 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-20 max-lg:border-t max-lg:border-line max-lg:bg-app max-lg:p-4"
        >
          <BaseButton class="flex-1" icon="download" :disabled="!hasQr || !g.approved.value || busy" @click="download">{{ actionLabel }}</BaseButton>
          <BaseButton variant="secondary" :disabled="!hasQr || !g.approved.value || busy || isBatch" @click="copy">{{ copied ? 'Copiado' : 'Copiar' }}</BaseButton>
        </div>
      </div>
    </div>

    <!-- Recentes -->
    <section class="mt-12 flex flex-col gap-4 border-t border-line pt-6 md:mt-16">
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex flex-col gap-1">
          <h2 class="text-body-medium">Recentes</h2>
          <p class="text-small text-fg-2">Ficam salvos só neste navegador.</p>
        </div>
        <span class="flex-1" />
        <input ref="fileInput" type="file" accept="application/json,.json" class="sr-only" aria-hidden="true" tabindex="-1" @change="importProject" />
        <BaseButton variant="secondary" @click="fileInput?.click()">Importar projeto</BaseButton>
        <BaseButton variant="secondary" :disabled="!recents.length" @click="exportOpen = true">Exportar projeto</BaseButton>
      </div>
      <AlertBox v-if="importError" kind="danger" title="Importação falhou" dismissible @dismiss="importError = ''">
        {{ importError }}
      </AlertBox>
      <ul v-if="recents.length" class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <li v-for="r in recents" :key="r.id" class="min-w-0">
          <button type="button" class="focus-ring block w-full rounded-sm text-left" @click="openRecent(r)">
            <RecentCard :name="r.name || typeLabel(r.type)" :meta="`${typeLabel(r.type)} · ${whenLabel(r.at)}`">
              <span class="block [&>svg]:size-full" aria-hidden="true" v-html="thumb(r)" />
            </RecentCard>
          </button>
        </li>
      </ul>
      <p v-else class="text-small text-fg-3">Os QR codes que você baixar ou copiar aparecem aqui.</p>
    </section>
  </main>
  <SiteFooter />

  <ModalDialog
    v-model:open="exportOpen"
    title="Exportar projeto"
    :description="`Salva ${recents.length === 1 ? 'o QR code' : `os ${recents.length} QR codes`} de Recentes em um arquivo. Eles ficam só neste navegador, então guarde uma cópia.`"
    confirm-label="Exportar"
    confirm-icon="download"
    @confirm="exportProject"
  >
    <ExportarOpcoes v-model:format="exportFormat" v-model:with-appearance="withAppearance" v-model:with-scan="withScan" :count="recents.length" />
  </ModalDialog>
</template>

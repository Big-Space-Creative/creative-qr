import { computed, reactive, ref, watch } from 'vue'
import { locale, t } from '@/i18n'
import { batchRows, buildPayload, emptyForm, restore, type Form, type TypeId } from '@/lib/payloads'
import {
  buildMatrix,
  contrastRatio,
  DEFAULT_FRAME,
  DEFAULT_STYLE,
  framedSvg,
  MAX_LOGO,
  qrSvg,
  scanSvg,
  type Ecc,
  type EyeShape,
  type Frame,
  type Gradient,
  type Logo,
  type QrStyle,
  type Shape,
} from '@/lib/qr'
import { DEFAULT_EXPORT, pixelsOf, type ExportOpts } from '@/lib/exporter'
import type { Recent } from '@/lib/recents'

// Regras do Figma (estado de erro): contraste mínimo 4,5 : 1 e logo até 20% da área.
export const MIN_CONTRAST = 4.5

export interface Look {
  ink: string
  eye: string
  paper: string
  shape: Shape
  eyeShape: EyeShape
  scale: number
  quiet: number
  pupil?: string
  grad?: Gradient
  ecc: Ecc
  logo?: Logo
  frame: Frame
}

/** Estado e regras da tela "Gerar": conteúdo -> payload -> QR -> teste de leitura. */
export function useQrGenerator() {
  const type = ref<TypeId>('url')
  const form = reactive<Form>(emptyForm())
  const look = reactive<Look>({
    ink: DEFAULT_STYLE.ink,
    eye: DEFAULT_STYLE.eye,
    paper: DEFAULT_STYLE.paper,
    shape: DEFAULT_STYLE.shape,
    eyeShape: DEFAULT_STYLE.eyeShape,
    scale: DEFAULT_STYLE.scale,
    quiet: DEFAULT_STYLE.quiet,
    ecc: 'M',
    frame: { ...DEFAULT_FRAME, text: t('preview.caption') },
  })
  const exp = reactive<ExportOpts>({ ...DEFAULT_EXPORT })
  const touched = ref(false) // erros só depois de o usuário sair de um campo

  // A legenda padrão acompanha o idioma, mas só enquanto o usuário não a tiver editado.
  const DEFAULT_CAPTIONS = ['Escaneie aqui', 'Scan me']
  watch(locale, () => {
    if (DEFAULT_CAPTIONS.includes(look.frame.text)) look.frame.text = t('preview.caption')
  })

  const built = computed(() => buildPayload(type.value, form))
  const payload = computed(() => (built.value && 'payload' in built.value ? built.value.payload : ''))
  const error = computed(() =>
    touched.value && built.value && 'error' in built.value ? t(built.value.error, built.value.params) : '',
  )

  const style = computed<QrStyle>(() => ({
    ink: look.ink,
    eye: look.eye,
    paper: look.paper,
    shape: look.shape,
    eyeShape: look.eyeShape,
    scale: look.scale,
    quiet: look.quiet,
    ...(look.pupil ? { pupil: look.pupil } : {}),
    ...(look.grad ? { grad: { ...look.grad } } : {}),
    ...(look.logo ? { logo: { ...look.logo } } : {}),
    frame: { ...look.frame },
  }))

  const matrix = computed(() => {
    if (!payload.value) return null
    try {
      return buildMatrix(payload.value, look.ecc)
    } catch {
      return null // conteúdo grande demais para a versão máxima do QR
    }
  })
  const tooBig = computed(() => !!payload.value && !matrix.value)
  const scanSvgText = computed(() => (matrix.value ? qrSvg(matrix.value, style.value) : ''))
  const preview = computed(() => (matrix.value ? framedSvg(matrix.value, style.value) : ''))
  const aspect = computed(() => {
    const v = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(preview.value)
    return v ? Number(v[2]) / Number(v[1]) : 1
  })

  // Todas as cores que desenham o QR (módulos, olhos, centro e fim do degradê) precisam contrastar com o fundo.
  const contrast = computed(() =>
    Math.min(...[look.ink, look.eye, look.pupil ?? look.eye, look.grad?.to ?? look.ink].map((c) => contrastRatio(c, look.paper))),
  )
  const contrastOk = computed(() => contrast.value >= MIN_CONTRAST)
  const logoOk = computed(() => !look.logo || look.logo.size <= MAX_LOGO)
  const modules = computed(() => matrix.value?.size ?? 0)
  // ponytail: estimativa de 1 mm por módulo; ajustar quando houver teste de impressão real.
  const minPrintCm = computed(() => modules.value / 10)

  // --- teste de leitura: decodifica o QR renderizado (sem moldura) e compara com o conteúdo
  const scan = ref<'idle' | 'running' | 'ok' | 'fail'>('idle')
  let token = 0
  watch(
    scanSvgText,
    async (s) => {
      const t = ++token
      if (!s) return void (scan.value = 'idle')
      scan.value = 'running'
      try {
        const read = await scanSvg(s)
        if (t === token) scan.value = read === payload.value ? 'ok' : 'fail'
      } catch {
        if (t === token) scan.value = 'fail'
      }
    },
    { immediate: true },
  )
  const approved = computed(() => scan.value === 'ok' && contrastOk.value && logoOk.value)

  const batch = computed(() => (type.value === 'batch' ? batchRows(form.batch) : null))
  const batchCount = computed(() => (batch.value && 'rows' in batch.value ? batch.value.rows.length : 0))

  // largura/altura em px do arquivo exportado
  const exportPx = computed(() => pixelsOf(exp))

  /** Logo cobre módulos: sobe a correção de erro (Q até 8% da área, H acima). Nunca desce. */
  const ECC_RANK: Ecc[] = ['L', 'M', 'Q', 'H']
  function ensureEccForLogo() {
    if (!look.logo) return
    const need: Ecc = look.logo.size > 8 ? 'H' : 'Q'
    if (ECC_RANK.indexOf(look.ecc) < ECC_RANK.indexOf(need)) look.ecc = need
  }
  watch(() => look.logo?.size, ensureEccForLogo)

  function load(r: Recent) {
    type.value = r.type
    Object.assign(form, emptyForm())
    restore(r.type, r.fields, form)
    if (!r.fields && r.type === 'url') form.url = r.payload
    if (!r.fields && r.type === 'text') form.text = r.payload
    look.ink = r.style.ink
    look.eye = r.style.eye
    look.paper = r.style.paper
    look.shape = r.style.shape
    look.eyeShape = r.style.eyeShape
    look.scale = r.style.scale
    look.quiet = r.style.quiet
    look.pupil = r.style.pupil
    look.grad = r.style.grad ? { ...r.style.grad } : undefined
    look.logo = r.style.logo ? { ...r.style.logo } : undefined
    look.frame = { ...r.style.frame }
    look.ecc = r.ecc
    touched.value = true
  }

  return {
    type, form, look, exp, touched,
    built, payload, error, style, matrix, tooBig, preview, aspect, scanSvgText,
    contrast, contrastOk, logoOk, modules, minPrintCm,
    scan, approved, batch, batchCount, exportPx,
    ensureEccForLogo, load,
  }
}

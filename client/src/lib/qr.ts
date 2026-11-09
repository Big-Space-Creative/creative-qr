import { isBlockedUrl } from './blocklist'
import jsQR from 'jsqr'
import { encode } from 'uqr'
import { zlibSync } from 'fflate'

export type Shape = 'square' | 'dots' | 'rounded' | 'diamond' | 'leaf' | 'vbar' | 'hbar'
export type EyeShape = 'square' | 'rounded' | 'circle' | 'leaf'
export type GradDir = 'h' | 'v' | 'd'
export type FrameKind = 'none' | 'line' | 'card' | 'bubble'
export type LogoShape = 'circle' | 'square'
export type Ecc = 'L' | 'M' | 'Q' | 'H'

export interface Logo {
  href: string // PNG em data URL (o import rasteriza, então SVG de terceiros nunca entra no QR)
  size: number // % da área do QR que a logo (com margem) ocupa
  shape: LogoShape
}
export interface Frame {
  kind: FrameKind
  text: string
  pos: 'below' | 'above'
  color?: string // linha e balão (padrão: cor dos módulos)
  textColor?: string // texto (padrão: cor dos módulos; no balão, a cor do fundo)
}
export interface Gradient {
  to: string // cor final; a inicial é a dos módulos
  dir: GradDir
}
export interface QrStyle {
  ink: string // módulos
  eye: string // olhos (quadrados de posição)
  paper: string // fundo
  shape: Shape
  eyeShape: EyeShape
  scale: number // tamanho de cada módulo (0,55 a 1); abaixo de 1 abre espaço entre eles
  quiet: number // margem em módulos (1 a 6)
  pupil?: string // centro dos olhos (padrão: cor dos olhos)
  grad?: Gradient // degradê nos módulos de dados
  logo?: Logo
  frame: Frame
}

export const SHAPES: readonly Shape[] = ['square', 'dots', 'rounded', 'diamond', 'leaf', 'vbar', 'hbar']
export const EYE_SHAPES: readonly EyeShape[] = ['square', 'rounded', 'circle', 'leaf']
export const GRAD_DIRS: readonly GradDir[] = ['h', 'v', 'd']
export const MIN_SCALE = 0.55
export const MIN_QUIET = 1
export const MAX_QUIET = 6
export const FRAMES: readonly FrameKind[] = ['none', 'line', 'card', 'bubble']
export const ECCS: readonly Ecc[] = ['L', 'M', 'Q', 'H']

export const MIN_LOGO = 4
export const MAX_LOGO = 20
export const MAX_CAPTION = 40
const LOGO_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/
const MAX_LOGO_CHARS = 120_000

export const isHex = (c: unknown): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)

export const DEFAULT_FRAME: Frame = { kind: 'card', text: 'Escaneie aqui', pos: 'below' }
export const DEFAULT_STYLE: QrStyle = {
  ink: '#151412',
  eye: '#151412',
  paper: '#ffffff',
  shape: 'square',
  eyeShape: 'square',
  scale: 1,
  quiet: 2,
  frame: DEFAULT_FRAME,
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback)

/**
 * Valida e completa um estilo vindo de fora (arquivo importado, localStorage, estado da tela).
 * O resultado vai para SVG em v-html, então só valores conhecidos passam. Cores inválidas => null.
 */
export function sanitizeStyle(x: unknown): QrStyle | null {
  const s = x as Partial<QrStyle> | null
  if (!s || typeof s !== 'object' || !isHex(s.ink) || !isHex(s.eye) || !isHex(s.paper)) return null
  const l = s.logo as Partial<Logo> | undefined
  const logo =
    l && typeof l.href === 'string' && l.href.length <= MAX_LOGO_CHARS && LOGO_RE.test(l.href) && Number.isFinite(l.size)
      ? { href: l.href, size: clamp(Number(l.size), MIN_LOGO, MAX_LOGO), shape: pick(['circle', 'square'] as const, l.shape, 'circle') }
      : undefined
  const f = s.frame as Partial<Frame> | undefined
  const frame: Frame = f && typeof f === 'object'
    ? {
        kind: pick(FRAMES, f.kind, DEFAULT_FRAME.kind),
        text: typeof f.text === 'string' ? f.text.slice(0, MAX_CAPTION) : '',
        pos: f.pos === 'above' ? 'above' : 'below',
        ...(isHex(f.color) ? { color: f.color } : {}),
        ...(isHex(f.textColor) ? { textColor: f.textColor } : {}),
      }
    : DEFAULT_FRAME
  const g = s.grad as Partial<Gradient> | undefined
  const grad = g && typeof g === 'object' && isHex(g.to) ? { to: g.to, dir: pick(GRAD_DIRS, g.dir, 'h') } : undefined
  const num = (v: unknown, lo: number, hi: number, d: number) => (Number.isFinite(v) ? Math.round(clamp(Number(v), lo, hi) * 100) / 100 : d)
  return {
    ink: s.ink,
    eye: s.eye,
    paper: s.paper,
    shape: pick(SHAPES, s.shape, 'square'),
    eyeShape: pick(EYE_SHAPES, s.eyeShape, 'square'),
    scale: num(s.scale, MIN_SCALE, 1, 1),
    quiet: Math.round(num(s.quiet, MIN_QUIET, MAX_QUIET, 2)),
    ...(isHex(s.pupil) ? { pupil: s.pupil } : {}),
    ...(grad ? { grad } : {}),
    ...(logo ? { logo } : {}),
    frame,
  }
}

/** Matriz do QR: `data` = módulo escuro; `types` = tipo de cada módulo (uqr: 0 dados, 2 posição, ...). */
export interface QrMatrix {
  data: boolean[][]
  types: number[][]
  size: number
}

const POSITION = 2 // olhos de localização, desenhados à parte
const DATA = 0

export function buildMatrix(text: string, ecc: Ecc): QrMatrix {
  const { data, types, size } = encode(text, { ecc, border: 0 })
  return { data, types, size }
}

/** Quadrado de lado `k` centrado no módulo (x, y); k < 1 abre espaço entre os módulos. */
const box = (x: number, y: number, k: number) => ({ x0: x + (1 - k) / 2, y0: y + (1 - k) / 2, w: k })

/** Folha: dois cantos opostos totalmente arredondados, os outros dois retos. */
const leaf = (x: number, y: number, w: number, r: number) =>
  `M${x + r} ${y}H${x + w}V${y + w - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + w}H${x}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}z`

function moduleEl(shape: Shape, x: number, y: number, k: number): string {
  const { x0, y0, w } = box(x, y, k)
  switch (shape) {
    case 'dots':
      return `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="${0.46 * k}"/>`
    case 'rounded':
      return `<rect x="${x0}" y="${y0}" width="${w}" height="${w}" rx="${0.34 * k}"/>`
    case 'leaf':
      return `<path d="${leaf(x0, y0, w, w * 0.5)}"/>`
    case 'diamond': {
      const h = 0.55 * k
      return `<path d="M${x + 0.5} ${y + 0.5 - h}L${x + 0.5 + h} ${y + 0.5}L${x + 0.5} ${y + 0.5 + h}L${x + 0.5 - h} ${y + 0.5}Z"/>`
    }
    default:
      return `<rect x="${x0}" y="${y0}" width="${w}" height="${w}"/>`
  }
}

/** Barras: módulos vizinhos na mesma coluna (ou linha) viram uma só pílula contínua. */
function barEls(cells: boolean[][], vertical: boolean, q: number, k: number): string {
  const n = cells.length
  let out = ''
  for (let a = 0; a < n; a++) {
    let b = 0
    while (b < n) {
      const on = vertical ? cells[b]?.[a] : cells[a]?.[b]
      if (!on) {
        b++
        continue
      }
      let e = b
      while (e + 1 < n && (vertical ? cells[e + 1]?.[a] : cells[a]?.[e + 1])) e++
      const len = e - b + 1 - (1 - k) // k < 1 deixa um respiro entre barras vizinhas
      const off = (1 - k) / 2
      out += vertical
        ? `<rect x="${a + q + off}" y="${b + q + off}" width="${k}" height="${len}" rx="${k / 2}"/>`
        : `<rect x="${b + q + off}" y="${a + q + off}" width="${len}" height="${k}" rx="${k / 2}"/>`
      b = e + 1
    }
  }
  return out
}

/** Retângulo arredondado como subcaminho (para anéis com fill-rule evenodd). */
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`
const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`

function eyeEl(shape: EyeShape, x: number, y: number, ring: string, pupil: string): string {
  const cx = x + 3.5
  const cy = y + 3.5
  if (shape === 'circle') {
    return `<path fill="${ring}" fill-rule="evenodd" d="${circ(cx, cy, 3.5)}${circ(cx, cy, 2.5)}"/><circle fill="${pupil}" cx="${cx}" cy="${cy}" r="1.5"/>`
  }
  if (shape === 'rounded') {
    return `<path fill="${ring}" fill-rule="evenodd" d="${rr(x, y, 7, 7, 2)}${rr(x + 1, y + 1, 5, 5, 1.2)}"/><rect fill="${pupil}" x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9"/>`
  }
  if (shape === 'leaf') {
    return `<path fill="${ring}" fill-rule="evenodd" d="${leaf(x, y, 7, 3)}${leaf(x + 1, y + 1, 5, 2)}"/><path fill="${pupil}" d="${leaf(x + 2, y + 2, 3, 1.2)}"/>`
  }
  return `<path fill="${ring}" fill-rule="evenodd" d="M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z"/><rect fill="${pupil}" x="${x + 2}" y="${y + 2}" width="3" height="3"/>`
}

/** Região central liberada para a logo, em módulos. `size` é a % da área do QR. */
function logoZone(n: number, logo: Logo, quiet: number) {
  const cx = quiet + n / 2
  const area = (logo.size / 100) * n * n
  if (logo.shape === 'circle') return { cx, r: Math.sqrt(area / Math.PI), half: 0 }
  return { cx, r: 0, half: Math.sqrt(area) / 2 }
}

export interface RenderOpts {
  transparent?: boolean // sem fundo (PNG/SVG exportados)
}

/** Conteúdo do QR em coordenadas de módulo (0..n+2*margem). */
function qrInner(m: QrMatrix, s: QrStyle, opts: RenderOpts = {}): string {
  const n = m.size
  const Q = s.quiet
  const total = n + Q * 2
  const zone = s.logo ? logoZone(n, s.logo, Q) : null
  const cleared = (c: number, r: number) => {
    if (!zone) return false
    const dx = c + Q + 0.5 - zone.cx
    const dy = r + Q + 0.5 - zone.cx
    return zone.r ? Math.hypot(dx, dy) <= zone.r : Math.abs(dx) <= zone.half && Math.abs(dy) <= zone.half
  }
  let shaped = ''
  let fixed = ''
  const bars = s.shape === 'vbar' || s.shape === 'hbar'
  const dataCells = m.data.map(() => [] as boolean[])
  m.data.forEach((row, r) =>
    row.forEach((on, c) => {
      const t = m.types[r]?.[c]
      if (!on || t === POSITION || cleared(c, r)) return
      if (t === DATA) {
        if (bars) (dataCells[r] as boolean[])[c] = true
        else shaped += moduleEl(s.shape, c + Q, r + Q, s.scale)
      } else fixed += moduleEl('square', c + Q, r + Q, 1) // alinhamento/temporização: sempre inteiros
    }),
  )
  if (bars) shaped = barEls(dataCells, s.shape === 'vbar', Q, s.scale)
  const eyes = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ]
    .map(([ox = 0, oy = 0]) => eyeEl(s.eyeShape, ox + Q, oy + Q, s.eye, s.pupil ?? s.eye))
    .join('')
  let logo = ''
  if (s.logo && zone) {
    if (zone.r) {
      const side = zone.r * Math.SQRT2 * 0.9 // quadrado inscrito: cabe no círculo sem recorte
      logo =
        `<circle cx="${zone.cx}" cy="${zone.cx}" r="${zone.r}" fill="${s.paper}"/>` +
        `<image href="${s.logo.href}" x="${zone.cx - side / 2}" y="${zone.cx - side / 2}" width="${side}" height="${side}" preserveAspectRatio="xMidYMid meet"/>`
    } else {
      const side = zone.half * 2
      logo =
        `<rect x="${zone.cx - zone.half}" y="${zone.cx - zone.half}" width="${side}" height="${side}" fill="${s.paper}"/>` +
        `<image href="${s.logo.href}" x="${zone.cx - side * 0.44}" y="${zone.cx - side * 0.44}" width="${side * 0.88}" height="${side * 0.88}" preserveAspectRatio="xMidYMid meet"/>`
    }
  }
  const crisp = s.shape === 'square' && s.scale === 1 ? ' shape-rendering="crispEdges"' : ''
  let defs = ''
  let fill = s.ink
  if (s.grad) {
    const id = `qg${s.ink.slice(1)}${s.grad.to.slice(1)}${s.grad.dir}`
    const [x2, y2] = { h: [total, 0], v: [0, total], d: [total, total] }[s.grad.dir]
    defs = `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${s.ink}"/><stop offset="1" stop-color="${s.grad.to}"/></linearGradient></defs>`
    fill = `url(#${id})`
  }
  return (
    defs +
    (opts.transparent ? '' : `<rect width="${total}" height="${total}" fill="${s.paper}"/>`) +
    `<g fill="${fill}"${crisp}>${shaped}</g><g fill="${fill}" shape-rendering="crispEdges">${fixed}</g>${eyes}${logo}`
  )
}

const wrap = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`

/**
 * SVG só do QR. A forma escolhida vale só para os módulos de dados; alinhamento, temporização e
 * formato ficam quadrados, porque decodificadores usam esses padrões para se orientar.
 */
export function qrSvg(m: QrMatrix, style: QrStyle, opts: RenderOpts = {}): string {
  const s = sanitizeStyle(style) ?? DEFAULT_STYLE
  const t = m.size + s.quiet * 2
  return wrap(t, t, qrInner(m, s, opts))
}

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** QR com moldura e texto (o que o usuário vê e exporta). */
export function framedSvg(m: QrMatrix, style: QrStyle, opts: RenderOpts = {}): string {
  const s = sanitizeStyle(style) ?? DEFAULT_STYLE
  const T = m.size + s.quiet * 2
  const inner = qrInner(m, s, opts)
  const { kind, pos } = s.frame
  const text = s.frame.text.trim()
  if (kind === 'none' && !text) return wrap(T, T, inner)

  const P = T * { none: 0.03, line: 0.05, card: 0.06, bubble: 0.05 }[kind]
  const C = text ? T * 0.085 : 0 // faixa do texto
  const G = text ? T * 0.02 : 0
  const W = T + 2 * P
  const H = T + 2 * P + C + G
  const qy = P + (pos === 'above' ? C + G : 0)
  const cy = pos === 'above' ? P + C / 2 : P + T + G + C / 2
  const fs = Math.min(C * 0.46, (T * 0.9) / (Math.max(text.length, 1) * 0.56))

  const frameInk = s.frame.color ?? s.ink
  const textInk = s.frame.textColor
  let body = opts.transparent ? '' : `<rect width="${W}" height="${H}" fill="${s.paper}"/>`
  if (kind === 'line') {
    const sw = T * 0.012
    body += `<rect x="${sw / 2}" y="${sw / 2}" width="${W - sw}" height="${H - sw}" rx="${T * 0.03}" fill="none" stroke="${frameInk}" stroke-width="${sw}"/>`
  }
  body += `<g transform="translate(${P} ${qy})">${inner}</g>`
  if (text) {
    const font = `font-family="Geist, system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="500" font-size="${fs}"`
    if (kind === 'bubble') {
      const pw = Math.min(W - P, text.length * fs * 0.56 + C * 0.8)
      const px = W / 2 - pw / 2
      const py = cy - C * 0.38
      const ph = C * 0.76
      const g = C * 0.16
      const tip = pos === 'above' ? `${W / 2 - g},${py + ph} ${W / 2 + g},${py + ph} ${W / 2},${py + ph + g}` : `${W / 2 - g},${py} ${W / 2 + g},${py} ${W / 2},${py - g}`
      body += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${ph / 2}" fill="${frameInk}"/><polygon points="${tip}" fill="${frameInk}"/>`
      body += `<text x="${W / 2}" y="${cy}" text-anchor="middle" dominant-baseline="central" ${font} fill="${textInk ?? s.paper}">${esc(text)}</text>`
    } else {
      body += `<text x="${W / 2}" y="${cy}" text-anchor="middle" dominant-baseline="central" ${font} fill="${textInk ?? s.ink}">${esc(text)}</text>`
    }
  }
  return wrap(W, H, body)
}

// --- rasterização, PNG com DPI, PDF e ZIP

export function svgAspect(svg: string): number {
  const v = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
  return v ? Number(v[2]) / Number(v[1]) : 1
}

function svgToCanvas(svg: string, wpx: number): Promise<HTMLCanvasElement> {
  const hpx = Math.max(1, Math.round(wpx * svgAspect(svg)))
  return new Promise((resolve, reject) => {
    const sized = svg.replace('<svg ', `<svg width="${wpx}" height="${hpx}" `)
    const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }))
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = wpx
      canvas.height = hpx
      canvas.getContext('2d')!.drawImage(img, 0, 0, wpx, hpx)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Falha ao renderizar o QR'))
    }
    img.src = url
  })
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] as number) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Grava a resolução (DPI) no PNG com um chunk pHYs logo após o IHDR. */
export function pngWithDpi(png: Uint8Array, dpi: number): Uint8Array {
  const ppm = Math.round(dpi / 0.0254)
  const chunk = new Uint8Array(21) // len(4) + 'pHYs'(4) + data(9) + crc(4)
  const v = new DataView(chunk.buffer)
  v.setUint32(0, 9)
  chunk.set([0x70, 0x48, 0x59, 0x73], 4)
  v.setUint32(8, ppm)
  v.setUint32(12, ppm)
  chunk[16] = 1 // unidade: metro
  v.setUint32(17, crc32(chunk.subarray(4, 17)))
  const at = 33 // 8 (assinatura) + 25 (IHDR)
  const out = new Uint8Array(png.length + chunk.length)
  out.set(png.subarray(0, at))
  out.set(chunk, at)
  out.set(png.subarray(at), at + chunk.length)
  return out
}

export async function pngBlob(svg: string, wpx: number, dpi = 300): Promise<Blob> {
  const canvas = await svgToCanvas(svg, wpx)
  const raw = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG vazio'))), 'image/png'))
  const bytes = pngWithDpi(new Uint8Array(await raw.arrayBuffer()), dpi)
  return new Blob([bytes as BlobPart], { type: 'image/png' })
}

/** PDF de uma página com a imagem do QR. widthPt = largura física em pontos (1/72"). */
export async function pdfBlob(svg: string, wpx: number, widthPt: number): Promise<Blob> {
  const canvas = await svgToCanvas(svg, wpx)
  const { width: w, height: h } = canvas
  const rgba = canvas.getContext('2d')!.getImageData(0, 0, w, h).data
  const rgb = new Uint8Array(w * h * 3)
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    const a = (rgba[i + 3] as number) / 255 // transparente sobre branco
    rgb[j] = Math.round((rgba[i] as number) * a + 255 * (1 - a))
    rgb[j + 1] = Math.round((rgba[i + 1] as number) * a + 255 * (1 - a))
    rgb[j + 2] = Math.round((rgba[i + 2] as number) * a + 255 * (1 - a))
  }
  const img = zlibSync(rgb)
  const hPt = (widthPt * h) / w
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let len = 0
  const push = (b: Uint8Array | string) => {
    const u = typeof b === 'string' ? enc.encode(b) : b
    parts.push(u)
    len += u.length
  }
  const obj = (n: number, body: string | Uint8Array[]) => {
    offsets[n] = len
    push(`${n} 0 obj\n`)
    if (typeof body === 'string') push(body)
    else body.forEach(push)
    push('\nendobj\n')
  }
  const fmt = (n: number) => n.toFixed(3)
  push('%PDF-1.4\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(widthPt)} ${fmt(hPt)}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>`)
  const content = `q ${fmt(widthPt)} 0 0 ${fmt(hPt)} 0 0 cm /Im0 Do Q`
  obj(4, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  obj(5, [
    enc.encode(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${img.length} >>\nstream\n`),
    img,
    enc.encode('\nendstream'),
  ])
  const xref = len
  push(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map((n) => `${String(offsets[n]).padStart(10, '0')} 00000 n \n`).join('')}`)
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}

/** Teste de leitura: decodifica o QR renderizado e devolve o texto lido (ou null). */
export async function scanSvg(svg: string): Promise<string | null> {
  const canvas = await svgToCanvas(svg, 600)
  const { data, width, height } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
  return jsQR(data, width, height)?.data ?? null
}

function luminance(hex: string): number {
  const v = hex.replace('#', '')
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razão de contraste WCAG entre duas cores #rrggbb. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** Aceita "site.com/x" (assume https). Devolve null se vazio. */
export function normalizeUrl(raw: string): { url: string } | { error: string } | null {
  const t = raw.trim()
  if (!t) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(withScheme)
    const okHost = u.hostname.includes('.') || u.hostname === 'localhost'
    if (!/^https?:$/.test(u.protocol) || !okHost) return { error: 'err.url' }
    if (isBlockedUrl(u.hostname)) return { error: 'err.blockedUrl' }
    return { url: u.toString() }
  } catch {
    return { error: 'err.url' }
  }
}

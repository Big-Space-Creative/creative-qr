import { zipSync } from 'fflate'
import { framedSvg, pdfBlob, pngBlob, svgAspect, type QrMatrix, type QrStyle } from './qr'

export type ExportFormat = 'png' | 'svg' | 'pdf'
export interface ExportOpts {
  format: ExportFormat
  width: number // na unidade escolhida
  unit: 'px' | 'cm'
  dpi: number
  transparent: boolean
}

export const DPIS = [72, 150, 300, 600] as const
export const MIN_PX = 64
export const MAX_PX = 8192 // limite seguro de canvas entre navegadores

export const DEFAULT_EXPORT: ExportOpts = { format: 'png', width: 1024, unit: 'px', dpi: 300, transparent: false }

/** Largura em pixels do arquivo, já dentro dos limites. */
export function pixelsOf(o: ExportOpts): number {
  const px = o.unit === 'cm' ? (o.width / 2.54) * o.dpi : o.width
  return Math.min(MAX_PX, Math.max(MIN_PX, Math.round(px || 0)))
}

export async function exportBlob(m: QrMatrix, style: QrStyle, o: ExportOpts): Promise<Blob> {
  const px = pixelsOf(o)
  // PDF não tem transparência útil: sai sobre branco.
  const svg = framedSvg(m, style, { transparent: o.transparent && o.format !== 'pdf' })
  if (o.format === 'svg') {
    const sized = svg.replace('<svg ', `<svg width="${px}" height="${Math.round(px * svgAspect(svg))}" `)
    return new Blob([sized], { type: 'image/svg+xml' })
  }
  if (o.format === 'pdf') return pdfBlob(svg, px, (px * 72) / o.dpi)
  return pngBlob(svg, px, o.dpi)
}

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

/** ZIP sem compressão extra (PNG/PDF já são comprimidos). */
export async function zipBlob(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const entries: Record<string, Uint8Array> = {}
  for (const f of files) entries[f.name] = new Uint8Array(await f.blob.arrayBuffer())
  return new Blob([zipSync(entries, { level: 0 }) as BlobPart], { type: 'application/zip' })
}

/** Nomes únicos: "mesa-01", "mesa-01-2", ... */
export function uniqueName(base: string, taken: Set<string>, ext: string): string {
  const stem = slug(base) || 'qr'
  let name = `${stem}.${ext}`
  for (let i = 2; taken.has(name); i++) name = `${stem}-${i}.${ext}`
  taken.add(name)
  return name
}

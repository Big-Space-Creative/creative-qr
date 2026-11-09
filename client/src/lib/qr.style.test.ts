import { describe, expect, it } from 'vitest'
import { buildMatrix, DEFAULT_STYLE, framedSvg, qrSvg, sanitizeStyle, SHAPES, EYE_SHAPES, type QrStyle } from './qr'

const m = buildMatrix('https://exemplo.com/promo', 'M')
const style = (over: Partial<QrStyle> = {}): QrStyle => ({ ...DEFAULT_STYLE, ...over })

describe('sanitizeStyle', () => {
  it('estilo antigo (sem os campos novos) ganha os padrões', () => {
    const old: Record<string, unknown> = { ...DEFAULT_STYLE }
    for (const k of ['scale', 'quiet', 'pupil', 'grad']) delete old[k]
    expect(sanitizeStyle(old)).toMatchObject({ scale: 1, quiet: 2 })
  })
  it('limita escala e margem e descarta cores inválidas', () => {
    const s = sanitizeStyle({ ...DEFAULT_STYLE, scale: 9, quiet: 99, pupil: 'red', grad: { to: '"><script>', dir: 'h' } })
    expect(s).toMatchObject({ scale: 1, quiet: 6 })
    expect(s).not.toHaveProperty('pupil')
    expect(s).not.toHaveProperty('grad')
    expect(sanitizeStyle({ ...DEFAULT_STYLE, scale: 0.1, quiet: 0 })).toMatchObject({ scale: 0.55, quiet: 1 })
  })
  it('cores da moldura inválidas são ignoradas', () => {
    const s = sanitizeStyle({ ...DEFAULT_STYLE, frame: { ...DEFAULT_STYLE.frame, color: 'url(x)', textColor: '#ff0000' } })
    expect(s?.frame).toEqual({ ...DEFAULT_STYLE.frame, textColor: '#ff0000' })
  })
})

describe('renderização', () => {
  it.each(SHAPES)('módulo %s gera SVG sem NaN, em tamanho cheio e reduzido', (shape) => {
    for (const scale of [1, 0.7]) {
      const svg = qrSvg(m, style({ shape, scale }))
      expect(svg).not.toMatch(/NaN|undefined/)
      expect(svg.length).toBeGreaterThan(500)
    }
  })
  it.each(EYE_SHAPES)('olhos %s com centro próprio', (eyeShape) => {
    const svg = qrSvg(m, style({ eyeShape, pupil: '#ff0000' }))
    expect(svg).toContain('fill="#ff0000"')
    expect(svg).not.toMatch(/NaN|undefined/)
  })
  it('barras juntam módulos vizinhos (menos elementos que módulos escuros)', () => {
    const dark = m.data.flat().filter(Boolean).length
    const bars = (qrSvg(m, style({ shape: 'vbar' })).match(/<rect /g) ?? []).length
    expect(bars).toBeLessThan(dark)
  })
  it('degradê usa defs e id só com caracteres seguros', () => {
    const svg = qrSvg(m, style({ ink: '#151412', grad: { to: '#04519e', dir: 'd' } }))
    expect(svg).toMatch(/<linearGradient id="qg[0-9a-f]+d"/)
    expect(svg).toContain('fill="url(#qg')
  })
  it('margem altera o viewBox', () => {
    const vb = (q: number) => /viewBox="0 0 ([\d.]+)/.exec(qrSvg(m, style({ quiet: q })))?.[1]
    expect(Number(vb(5)) - Number(vb(1))).toBe(8)
  })
  it('cores da moldura valem no balão', () => {
    const svg = framedSvg(m, style({ frame: { kind: 'bubble', text: 'Oi', pos: 'below', color: '#ff0000', textColor: '#00ff00' } }))
    expect(svg).toContain('fill="#ff0000"')
    expect(svg).toContain('fill="#00ff00"')
  })
})

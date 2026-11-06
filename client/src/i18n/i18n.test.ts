import { describe, expect, it } from 'vitest'
import en from './en'
import ptBR from './pt-BR'

type Dict = { [k: string]: string | Dict }
const flat = (d: Dict, p = ''): string[] =>
  Object.entries(d).flatMap(([k, v]) => (typeof v === 'string' ? [p + k] : flat(v, `${p}${k}.`)))
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const get = (d: Dict, path: string) => path.split('.').reduce<string | Dict | undefined>((c, k) => (typeof c === 'object' ? c[k] : undefined), d)

describe('dicionários', () => {
  it('en e pt-BR têm exatamente as mesmas chaves', () => {
    expect(flat(en as Dict).sort()).toEqual(flat(ptBR as Dict).sort())
  })
  it('os placeholders {x} são os mesmos nas duas línguas', () => {
    for (const k of flat(ptBR as Dict)) {
      expect(placeholders(get(en as Dict, k) as string), k).toBe(placeholders(get(ptBR as Dict, k) as string))
    }
  })
  it('nenhum texto está vazio', () => {
    for (const d of [ptBR, en]) for (const k of flat(d as Dict)) expect((get(d as Dict, k) as string).trim(), k).not.toBe('')
  })
  it('toda chave usada no código existe no dicionário', () => {
    const sources = import.meta.glob('../**/*.{vue,ts}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    const files = Object.keys(sources).filter((f) => !f.endsWith('.test.ts') && !f.includes('/i18n/'))
    const keys = new Set(flat(ptBR as Dict))
    const missing: string[] = []
    for (const f of files) {
      const src = sources[f] as string
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) if (!keys.has(m[1] as string)) missing.push(`${f}: ${m[1]}`)
      for (const m of src.matchAll(/(?:error|key|label|title):\s*'((?:err|nav|types|fields|advanced)\.[a-zA-Z0-9_.]+)'/g)) if (!keys.has(m[1] as string)) missing.push(`${f}: ${m[1]}`)
    }
    expect(missing).toEqual([])
  })
})

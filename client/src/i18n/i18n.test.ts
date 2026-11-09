import { afterEach, describe, expect, it, vi } from 'vitest'
import ptBR from './pt-BR'
import { csvTemplate, csvToRows, parseCsv } from '../lib/csv'

type Dict = { [k: string]: string | Dict }
const flat = (d: Dict, p = ''): string[] =>
  Object.entries(d).flatMap(([k, v]) => (typeof v === 'string' ? [p + k] : flat(v, `${p}${k}.`)))
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const get = (d: Dict, path: string) => path.split('.').reduce<string | Dict | undefined>((c, k) => (typeof c === 'object' ? c[k] : undefined), d)
const dictionaries = import.meta.glob<Dict>(['./*.ts', '!./index.ts', '!./*.test.ts'], { eager: true, import: 'default' })
const entries = Object.entries(dictionaries)

describe('dicionários', () => {
  for (const [path, dictionary] of entries) {
    it(`${path}: mesmas chaves, parâmetros e textos preenchidos`, () => {
      expect(flat(dictionary).sort()).toEqual(flat(ptBR as Dict).sort())
      for (const key of flat(ptBR as Dict)) {
        const value = get(dictionary, key) as string
        expect(value.trim(), key).not.toBe('')
        expect(placeholders(value), key).toBe(placeholders(get(ptBR as Dict, key) as string))
      }
    })
    it(`${path}: o modelo CSV pode ser importado sem ajustes`, () => {
      const template = csvTemplate(get(dictionary, 'fields.csvName') as string, get(dictionary, 'fields.csvContent') as string)
      expect(csvToRows(parseCsv(template), true)).toEqual({
        rows: [
          { name: 'table-01', content: 'https://example.com/t/01' },
          { name: 'table-02', content: 'https://example.com/t/02' },
        ],
      })
    })
  }
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

const LANG_KEY = 'creative-qr:lang'

async function fresh(languages: string[], saved?: string, blocked = false) {
  vi.resetModules()
  const storage = new Map(saved === undefined ? [] : [[LANG_KEY, saved]])
  vi.stubGlobal('navigator', { language: languages[0], languages })
  vi.stubGlobal('document', { documentElement: { lang: '' }, createElement: () => ({}) })
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => {
      if (blocked) throw new Error('Storage blocked')
      return storage.get(key) ?? null
    },
    setItem: (key: string, value: string) => {
      if (blocked) throw new Error('Storage blocked')
      storage.set(key, value)
    },
  })
  return { i18n: await import('./index'), storage }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.doUnmock('./es')
})

describe('seleção de idioma', () => {
  it('todos os dicionários estão disponíveis no seletor', async () => {
    const { i18n } = await fresh(['en'])
    expect(i18n.LOCALES.map((l) => l.id).sort()).toEqual(entries.map(([path]) => path.slice(2, -3)).sort())
  })

  it.each([
    ['pt-PT', 'pt-BR'], ['en-US', 'en'], ['es-MX', 'es'], ['fr-CA', 'fr'], ['de-AT', 'de'], ['DE-de', 'de'],
  ])('detecta %s como %s', async (browser, expected) => {
    const { i18n } = await fresh([browser])
    expect(i18n.locale.value).toBe(expected)
    expect(document.documentElement.lang).toBe(expected)
  })

  it('usa o primeiro idioma compatível na ordem de preferência', async () => {
    const { i18n } = await fresh(['ja-JP', 'fr-CA', 'es-MX'])
    expect(i18n.locale.value).toBe('fr')
  })

  it.each(['pt-BR', 'en', 'es', 'fr', 'de'])('escolha salva %s tem prioridade sobre o navegador', async (saved) => {
    const { i18n } = await fresh(['ja-JP', 'en-US'], saved)
    expect(i18n.locale.value).toBe(saved)
  })

  it('ignora escolha salva inválida e detecta o navegador', async () => {
    const { i18n } = await fresh(['de-DE'], 'invalid')
    expect(i18n.locale.value).toBe('de')
  })

  it('sem idioma compatível usa inglês', async () => {
    const { i18n } = await fresh(['ja-JP', 'zh-CN'])
    expect(i18n.locale.value).toBe('en')
  })

  it('sem languages usa language', async () => {
    await fresh([])
    vi.stubGlobal('navigator', { language: 'es-AR' })
    vi.resetModules()
    expect((await import('./index')).locale.value).toBe('es')
  })

  it.each([
    ['es', 'Generar código QR'], ['fr', 'Créer un code QR'], ['de', 'QR-Code erstellen'],
  ] as const)('troca para %s, traduz, salva e restaura após recarregar', async (id, title) => {
    const { i18n, storage } = await fresh(['en'])
    i18n.setLocale(id)
    expect(i18n.locale.value).toBe(id)
    expect(i18n.t('page.title')).toBe(title)
    expect(document.documentElement.lang).toBe(id)
    expect(storage.get(LANG_KEY)).toBe(id)
    expect(i18n.t('fields.counter', { n: 3, max: 10 })).toMatch(/^3 \/ 10 /)
    expect(i18n.t('unknown.key')).toBe('unknown.key')
    vi.resetModules()
    expect((await import('./index')).locale.value).toBe(id)
  })

  it('continua funcionando sem acesso ao armazenamento', async () => {
    const { i18n } = await fresh(['es-MX'], undefined, true)
    expect(i18n.locale.value).toBe('es')
    expect(() => i18n.setLocale('fr')).not.toThrow()
    expect(i18n.t('page.title')).toBe('Créer un code QR')
    expect(document.documentElement.lang).toBe('fr')
  })

  it('tradução ausente usa o texto-fonte em português', async () => {
    vi.doMock('./es', () => ({ default: {} }))
    const { i18n } = await fresh(['es'])
    expect(i18n.t('page.title')).toBe(ptBR.page.title)
    expect(i18n.t('actions.download', { fmt: 'PNG' })).toBe('Baixar PNG')
  })
})

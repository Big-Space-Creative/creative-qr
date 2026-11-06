import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_STYLE } from './qr'

const RECENTS = 'creative-qr:recentes:v1'
const CONSENT = 'creative-qr:consent'
const item = { name: 'a', type: 'url' as const, payload: 'https://a.com', style: DEFAULT_STYLE, ecc: 'M' as const }

function fakeStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial))
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }
}
// Módulos com estado: recarrega a cada teste, com um localStorage falso.
async function fresh(initial: Record<string, string> = {}) {
  vi.resetModules()
  const ls = fakeStorage(initial)
  vi.stubGlobal('localStorage', ls)
  return { ls, consent: await import('./consent'), recents: await import('./recents') }
}

describe('permissão de armazenamento', () => {
  it('sem escolha: Recentes vive só na memória e nada é gravado', async () => {
    const { ls, recents } = await fresh()
    recents.addRecent(item)
    expect(recents.recents.value).toHaveLength(1)
    expect(ls.m.has(RECENTS)).toBe(false)
  })

  it('sem escolha: não lê Recentes que já estavam no disco', async () => {
    const stored = JSON.stringify([{ ...item, id: 'x', at: 1, style: DEFAULT_STYLE }])
    const { recents } = await fresh({ [RECENTS]: stored })
    expect(recents.recents.value).toHaveLength(0)
  })

  it('com permissão: grava e relê', async () => {
    const { ls, consent, recents } = await fresh({ [CONSENT]: JSON.stringify({ v: 1, recents: true, at: 1 }) })
    expect(consent.recentsAllowed.value).toBe(true)
    recents.addRecent(item)
    expect(JSON.parse(ls.m.get(RECENTS) as string)).toHaveLength(1)
  })

  it('recusar apaga o que estava no disco', async () => {
    const { ls, consent } = await fresh({ [RECENTS]: '[]' })
    consent.setConsent(false)
    expect(ls.m.has(RECENTS)).toBe(false)
    expect(JSON.parse(ls.m.get(CONSENT) as string)).toMatchObject({ v: 1, recents: false })
  })

  it('permitir depois grava a lista da sessão', async () => {
    const { ls, consent, recents } = await fresh()
    recents.addRecent(item)
    consent.setConsent(true)
    await nextTick()
    expect(JSON.parse(ls.m.get(RECENTS) as string)).toHaveLength(1)
  })

  it('"Apagar Recentes agora" limpa memória e disco', async () => {
    const { ls, consent, recents } = await fresh({ [CONSENT]: JSON.stringify({ v: 1, recents: true, at: 1 }) })
    recents.addRecent(item)
    recents.clearRecents()
    expect(recents.recents.value).toHaveLength(0)
    expect(ls.m.has(RECENTS)).toBe(false)
    expect(consent.recentsAllowed.value).toBe(true)
  })

  it('consentimento corrompido é ignorado (volta a perguntar)', async () => {
    const { consent } = await fresh({ [CONSENT]: '{"v":9,"recents":"sim"}' })
    expect(consent.decided.value).toBe(false)
  })
})

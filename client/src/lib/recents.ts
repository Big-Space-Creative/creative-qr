import { ref, watch } from 'vue'
import { t, locale } from '@/i18n'
import { recentsAllowed, RECENTS_KEY } from './consent'
import { pickFields, TYPE_IDS, type TypeId } from './payloads'
import { ECCS, sanitizeStyle, type Ecc, type QrStyle } from './qr'

export interface Recent {
  id: string
  name: string
  type: TypeId
  fields?: Record<string, string | boolean> // campos do formulário, para reabrir o item
  payload: string
  style: QrStyle
  ecc: Ecc
  scan?: boolean
  at: number
}

const MAX = 6

function load(): Recent[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.map(normalizeRecent).filter((r): r is Recent => !!r).slice(0, MAX) : []
  } catch {
    return []
  }
}

/**
 * Valida um item vindo de fora (localStorage ou arquivo importado) e completa campos novos.
 * Devolve null se algo for inválido: o estilo vira SVG em v-html, então só valores conhecidos passam.
 */
export function normalizeRecent(x: unknown): Recent | null {
  const r = x as Partial<Recent> | null
  if (!r || typeof r !== 'object') return null
  const style = sanitizeStyle(r.style)
  if (
    !style ||
    typeof r.payload !== 'string' ||
    !r.payload ||
    r.payload.length > 2000 ||
    !TYPE_IDS.includes(r.type as TypeId) ||
    !ECCS.includes(r.ecc as Ecc)
  ) {
    return null
  }
  return {
    id: typeof r.id === 'string' ? r.id.slice(0, 64) : crypto.randomUUID(),
    name: typeof r.name === 'string' ? r.name.slice(0, 60) : '',
    type: r.type as TypeId,
    fields: pickFields(r.type as TypeId, r.fields),
    payload: r.payload,
    style,
    ecc: r.ecc as Ecc,
    scan: typeof r.scan === 'boolean' ? r.scan : undefined,
    at: Number.isFinite(r.at) ? Number(r.at) : Date.now(),
  }
}

// Sem permissão, nada é lido nem gravado: a lista vive só na memória desta sessão.
export const recents = ref<Recent[]>(recentsAllowed.value ? load() : [])

function persist() {
  if (!recentsAllowed.value) return
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.value))
  } catch {
    // ponytail: cota cheia ou modo privado — a lista vive só na sessão. Avisar o usuário se virar problema.
  }
}

/** Entra no topo; o mesmo conteúdo+estilo é movido em vez de duplicado. */
export function addRecent(item: Omit<Recent, 'id' | 'at'>) {
  const key = (r: Pick<Recent, 'payload' | 'style' | 'ecc'>) => JSON.stringify([r.payload, r.style, r.ecc])
  const rest = recents.value.filter((r) => key(r) !== key(item))
  recents.value = [{ ...item, id: crypto.randomUUID(), at: Date.now() }, ...rest].slice(0, MAX)
  persist()
}

export function mergeRecents(items: Recent[]) {
  const seen = new Set<string>()
  recents.value = [...items, ...recents.value]
    .filter((r) => {
      const k = JSON.stringify([r.payload, r.style, r.ecc])
      return seen.has(k) ? false : (seen.add(k), true)
    })
    .slice(0, MAX)
  persist()
}

export function whenLabel(at: number): string {
  const day = (v: number) => new Date(v).setHours(0, 0, 0, 0)
  const diff = Math.round((day(Date.now()) - day(at)) / 86_400_000)
  if (diff <= 0) return t('recents.today')
  if (diff === 1) return t('recents.yesterday')
  return new Date(at).toLocaleDateString(locale.value, { day: '2-digit', month: 'short' }).replace('.', '')
}

/** Apaga Recentes da memória e do disco. */
export function clearRecents() {
  recents.value = []
  try {
    localStorage.removeItem(RECENTS_KEY)
  } catch {
    // nada a fazer
  }
}

// Ao permitir depois, traz o que já estava salvo e grava a lista atual.
watch(recentsAllowed, (on) => {
  if (on) mergeRecents(load())
})

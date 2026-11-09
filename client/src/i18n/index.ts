import { ref } from 'vue'
import en from './en'
import ptBR from './pt-BR'
import es from './es'
import fr from './fr'
import de from './de'

export type Locale = keyof typeof dicts
export const LOCALES: { id: Locale; label: string; short: string }[] = [
  { id: 'pt-BR', label: 'Português (Brasil)', short: 'PT' },
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'es', label: 'Español', short: 'ES' },
  { id: 'fr', label: 'Français', short: 'FR' },
  { id: 'de', label: 'Deutsch', short: 'DE' },
]

type Dict = { [k: string]: string | Dict }
const dicts = { 'pt-BR': ptBR, en, es, fr, de }
export const LANG_KEY = 'creative-qr:lang' // categoria "necessário": guarda só a escolha do idioma

function initial(): Locale {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (LOCALES.some((l) => l.id === saved)) return saved as Locale
  } catch {
    // sem acesso ao localStorage: cai na detecção abaixo
  }
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const language of languages) {
    const base = language?.toLowerCase().split('-')[0]
    const match = LOCALES.find((l) => l.id.toLowerCase().split('-')[0] === base)
    if (match) return match.id
  }
  return 'en'
}

export const locale = ref<Locale>(initial())
if (typeof document !== 'undefined') document.documentElement.lang = locale.value

export function setLocale(l: Locale) {
  locale.value = l
  document.documentElement.lang = l
  try {
    localStorage.setItem(LANG_KEY, l)
  } catch {
    // modo privado/cota: o idioma vale só nesta sessão
  }
}

function lookup(dict: Dict, path: string): string | undefined {
  let cur: string | Dict | undefined = dict
  for (const part of path.split('.')) {
    if (typeof cur !== 'object' || cur === null) return undefined
    cur = cur[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

export type Params = Record<string, string | number>

/** Traduz `chave.com.pontos`. Lê `locale`, então o template reage à troca de idioma. */
export function t(key: string, params?: Params): string {
  const raw = lookup(dicts[locale.value], key) ?? lookup(dicts['pt-BR'], key) ?? key
  return params ? raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : raw
}

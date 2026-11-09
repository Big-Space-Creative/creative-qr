#!/usr/bin/env node
// Atualiza src/lib/blocklist.data.ts a partir de feeds públicos.
// Uso: pnpm blocklist:update [--porn] [--extra arquivo.txt]
//   --porn   inclui a lista porn-only do StevenBlack (~50 mil domínios; aumenta bem o bundle)
//   --extra  arquivo local com um host/URL por linha (sua lista própria)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../src/lib/blocklist.data.ts', import.meta.url))
const MAX_HOSTS = 100_000 // trava de segurança contra feed quebrado

const SOURCES = [
  { name: 'OpenPhish (phishing)', url: 'https://openphish.com/feed.txt' },
  ...(process.argv.includes('--porn')
    ? [{ name: 'StevenBlack porn-only', url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn-only/hosts' }]
    : []),
]

// Nunca bloquear, mesmo que um feed liste (sites invadidos, falso positivo).
// SHARED: plataformas de hospedagem. Subdomínios exatos podem entrar; a raiz nunca (bloquearia todos os usuários).
const SHARED = ['pages.dev', 'workers.dev', 'blogspot.com', 'weebly.com', 'github.io', 'netlify.app', 'vercel.app', 'wixsite.com', 'web.app', 'firebaseapp.com', 'herokuapp.com', 'r2.dev', 'sites.google.com', 'notion.site']
const SAFE = ['google.com', 'youtube.com', 'facebook.com', 'instagram.com', 'whatsapp.com', 'github.com', 'microsoft.com', 'apple.com', 'amazon.com', 'gov.br', 'wikipedia.org']
const onDomain = (h, d) => h === d || h.endsWith(`.${d}`)

/** Aceita URL, "host" ou linha de hosts file ("0.0.0.0 host"). Devolve o host ou null. */
function hostOf(line) {
  const t = line.split('#')[0].trim()
  if (!t) return null
  const token = t.split(/\s+/).pop()
  try {
    const h = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(token) ? token : `https://${token}`).hostname.toLowerCase().replace(/\.$/, '')
    if (!h.includes('.') || /^[\d.]+$/.test(h) || h === 'localhost') return null // IPs e hosts sem TLD ficam de fora
    return h
  } catch {
    return null
  }
}

const hosts = new Set()
const add = (name, text) => {
  let n = 0
  for (const line of text.split(/\r?\n/)) {
    const h = hostOf(line)
    if (h && !SHARED.includes(h) && !SAFE.some((d) => onDomain(h, d))) hosts.add(h) && n++
  }
  console.log(`${name}: ${n} hosts`)
}

for (const s of SOURCES) {
  const res = await fetch(s.url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`${s.name}: HTTP ${res.status}`) // falha = não grava nada
  add(s.name, await res.text())
}
const extra = process.argv.indexOf('--extra')
if (extra > 0) add('extra', readFileSync(process.argv[extra + 1], 'utf8'))

if (!hosts.size || hosts.size > MAX_HOSTS) throw new Error(`Total suspeito: ${hosts.size} hosts. Nada foi gravado.`)

const list = [...hosts].sort()
writeFileSync(
  OUT,
  `// GERADO por scripts/update-blocklist.mjs em ${new Date().toISOString().slice(0, 10)}. Não edite à mão.\n` +
    `export const BLOCKED_HOSTS: ReadonlySet<string> = new Set([\n${list.map((h) => `  '${h}',`).join('\n')}\n])\n`,
)
console.log(`Total: ${list.length} hosts -> src/lib/blocklist.data.ts`)

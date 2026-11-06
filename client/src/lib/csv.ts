import type { CsvRow } from './payloads'

export const MAX_ROWS = 500
export const MAX_CELL = 2000

/** Parser de CSV com aspas. Aceita vírgula ou ponto e vírgula (Excel pt-BR). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '')
  const firstLine = src.split(/\r?\n/, 1)[0] ?? ''
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === delim) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
    } else cell += c
  }
  if (cell || row.length) rows.push([...row, cell])
  return rows.filter((r) => r.some((c) => c.trim()))
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

/** Converte linhas do CSV em itens. Sem cabeçalho: [nome, conteudo] ou só [conteudo]. */
type Fail = { error: string; params?: Record<string, string | number> }
export function csvToRows(table: string[][], hasHeader: boolean): { rows: CsvRow[] } | Fail {
  if (!table.length) return { error: 'err.csvEmpty' }
  let nameIdx = -1
  let contentIdx = 0
  let body = table
  if (hasHeader) {
    const head = (table[0] ?? []).map(norm)
    contentIdx = head.findIndex((h) => h === 'conteudo' || h === 'content')
    nameIdx = head.findIndex((h) => h === 'nome' || h === 'name')
    if (contentIdx < 0) return { error: 'err.csvNoColumn' }
    body = table.slice(1)
  } else if ((table[0]?.length ?? 0) >= 2) {
    nameIdx = 0
    contentIdx = 1
  }
  const rows = body
    .map((r) => ({ name: (nameIdx >= 0 ? r[nameIdx] : '')?.trim() ?? '', content: r[contentIdx]?.trim() ?? '' }))
    .filter((r) => r.content)
  if (!rows.length) return { error: 'err.csvNoRows' }
  if (rows.length > MAX_ROWS) return { error: 'err.csvLimitRows', params: { n: MAX_ROWS } }
  if (rows.some((r) => r.content.length > MAX_CELL)) return { error: 'err.csvCellLong', params: { n: MAX_CELL } }
  return { rows }
}

/** Modelo para download; o cabeçalho vem no idioma da interface (nome,conteudo ou name,content). */
export const csvTemplate = (nameCol: string, contentCol: string) =>
  `${nameCol},${contentCol}\ntable-01,https://example.com/t/01\ntable-02,https://example.com/t/02\n`

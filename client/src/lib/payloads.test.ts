import { describe, expect, it } from 'vitest'
import { csvToRows, parseCsv } from './csv'
import { batchRows, buildPayload, crc16, emptyForm, pixPayload } from './payloads'

const ok = (r: ReturnType<typeof buildPayload>) => (r && 'payload' in r ? r.payload : `ERRO:${JSON.stringify(r)}`)

describe('crc16', () => {
  it('bate com o vetor padrão CRC-16/CCITT-FALSE', () => {
    expect(crc16('123456789')).toBe('29B1')
  })
  it('bate com o exemplo oficial do Manual do BR Code (Banco Central)', () => {
    const sample = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304'
    expect(crc16(sample)).toBe('1D3D')
  })
})

describe('pix', () => {
  const base = { key: 'marcos@exemplo.com', name: 'Marcos Macedo', city: 'Fortaleza', amount: '25,00', description: 'Doação', fixed: true }
  it('gera BR Code estático com CRC válido e valor fixo', () => {
    const p = ok(pixPayload(base))
    expect(p).toContain('br.gov.bcb.pix0118marcos@exemplo.com')
    expect(p).toContain('540525.00')
    expect(p).toContain('5913MARCOS MACEDO')
    expect(p).toContain('6009FORTALEZA')
    expect(p).toContain('0206DOACAO') // sem acento
    expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)))
  })
  it('sem valor fixo omite o campo 54', () => {
    expect(ok(pixPayload({ ...base, fixed: false }))).not.toContain('5405')
  })
  it('valida campos', () => {
    expect(pixPayload({ ...base, name: '' })).toEqual({ error: 'err.pixName', params: undefined })
    expect(pixPayload({ ...base, amount: 'abc' })).toMatchObject({ error: 'err.pixAmount' })
    expect(pixPayload({ ...base, amount: '' })).toEqual({ error: 'err.pixFixed', params: undefined })
  })
})

describe('outros tipos', () => {
  it('wifi escapa caracteres especiais', () => {
    const f = emptyForm()
    f.wifi = { ssid: 'Casa;5G', password: 'a:b,c"d', security: 'WPA', hidden: true }
    expect(ok(buildPayload('wifi', f))).toBe('WIFI:T:WPA;S:Casa\\;5G;P:a\\:b\\,c\\"d;H:true;;')
  })
  it('wifi sem senha não exige senha', () => {
    const f = emptyForm()
    f.wifi = { ssid: 'Aberta', password: '', security: 'nopass', hidden: false }
    expect(ok(buildPayload('wifi', f))).toBe('WIFI:T:nopass;S:Aberta;;')
  })
  it('email, sms, telefone e whatsapp', () => {
    const f = emptyForm()
    f.email = { to: 'a@b.com', subject: 'Olá mundo', message: 'Oi & tchau' }
    expect(ok(buildPayload('email', f))).toBe('mailto:a@b.com?subject=Ol%C3%A1%20mundo&body=Oi%20%26%20tchau')
    f.sms = { phone: '+55 (85) 99999-0000', message: 'Oi' }
    expect(ok(buildPayload('sms', f))).toBe('SMSTO:+5585999990000:Oi')
    f.tel.phone = '+55 85 99999-0000'
    expect(ok(buildPayload('tel', f))).toBe('tel:+5585999990000')
    f.whatsapp = { phone: '85 99999-0000', message: 'Olá! Quero saber mais.' }
    expect(ok(buildPayload('whatsapp', f))).toBe('https://wa.me/5585999990000?text=Ol%C3%A1!%20Quero%20saber%20mais.')
  })
  it('sms respeita 160 caracteres', () => {
    const f = emptyForm()
    f.sms = { phone: '+5585999990000', message: 'x'.repeat(161) }
    expect(buildPayload('sms', f)).toEqual({ error: 'err.limitChars', params: { n: 160 } })
  })
  it('local: coordenadas têm prioridade e são validadas', () => {
    const f = emptyForm()
    f.geo = { address: 'Av. Beira Mar', lat: '-3.7319', lng: '-38.5267', app: 'waze' }
    expect(ok(buildPayload('geo', f))).toBe('https://waze.com/ul?ll=-3.7319,-38.5267&navigate=yes')
    f.geo.lat = '95'
    expect(buildPayload('geo', f)).toMatchObject({ error: 'err.geoCoords' })
  })
  it('evento: hora, dia inteiro e fim antes do início', () => {
    const f = emptyForm()
    f.event = { title: 'Reunião, final', place: '', startDate: '22/10/2026', startTime: '14:00', endDate: '22/10/2026', endTime: '15:30', description: '', allDay: false }
    const p = ok(buildPayload('event', f))
    expect(p).toContain('SUMMARY:Reunião\\, final')
    expect(p).toContain('DTSTART:20261022T140000')
    expect(p).toContain('DTEND:20261022T153000')
    f.event.endTime = '13:00'
    expect(buildPayload('event', f)).toEqual({ error: 'err.eventOrder', params: undefined })
    f.event.allDay = true
    expect(ok(buildPayload('event', f))).toContain('DTEND;VALUE=DATE:20261023')
  })
  it('vcard exige nome ou empresa e valida e-mail', () => {
    const f = emptyForm()
    f.vcard.phone = '123'
    expect(buildPayload('vcard', f)).toEqual({ error: 'err.vcardName', params: undefined })
    f.vcard = { ...f.vcard, first: 'Marcos', last: 'Macedo', email: 'ruim' }
    expect(buildPayload('vcard', f)).toEqual({ error: 'err.email', params: undefined })
    f.vcard.email = 'm@e.com'
    expect(ok(buildPayload('vcard', f))).toContain('N:Macedo;Marcos;;;')
  })
  it('vazio devolve null', () => {
    for (const t of ['url', 'text', 'wifi', 'vcard', 'whatsapp', 'pix', 'email', 'geo', 'sms', 'tel', 'event', 'batch'] as const) {
      expect(buildPayload(t, emptyForm())).toBeNull()
    }
  })
})

describe('csv', () => {
  it('aceita cabeçalho em inglês (name,content)', () => {
    expect(csvToRows(parseCsv('name,content\na,https://x.com'), true)).toEqual({ rows: [{ name: 'a', content: 'https://x.com' }] })
  })
  it('lê aspas, vírgula, ponto e vírgula e BOM', () => {
    expect(parseCsv('\uFEFFnome;conteudo\nmesa-01;"https://a.com/?x=1,2"\n')).toEqual([
      ['nome', 'conteudo'],
      ['mesa-01', 'https://a.com/?x=1,2'],
    ])
  })
  it('usa o cabeçalho, ignora acento e valida coluna obrigatória', () => {
    expect(csvToRows(parseCsv('Nome,Conteúdo\na,https://x.com'), true)).toEqual({ rows: [{ name: 'a', content: 'https://x.com' }] })
    expect(csvToRows(parseCsv('nome,link\na,b'), true)).toEqual({ error: 'err.csvNoColumn' })
  })
  it('sem cabeçalho aceita [nome, conteudo] ou só [conteudo]', () => {
    expect(csvToRows(parseCsv('a,https://x.com'), false)).toEqual({ rows: [{ name: 'a', content: 'https://x.com' }] })
    expect(csvToRows(parseCsv('https://x.com\nhttps://y.com'), false)).toEqual({
      rows: [{ name: '', content: 'https://x.com' }, { name: '', content: 'https://y.com' }],
    })
  })
})

describe('lote', () => {
  it('a prévia usa a primeira linha e reage ao cabeçalho', () => {
    const f = emptyForm()
    f.batch.raw = 'nome,conteudo\nmesa-01,https://a.com\nmesa-02,https://b.com'
    expect(ok(buildPayload('batch', f))).toBe('https://a.com')
    expect('rows' in batchRows(f.batch) && batchRows(f.batch)).toMatchObject({ rows: [{ name: 'mesa-01' }, { name: 'mesa-02' }] })
    f.batch.header = false // agora "nome,conteudo" vira uma linha de dados
    expect(ok(buildPayload('batch', f))).toBe('conteudo')
  })
})

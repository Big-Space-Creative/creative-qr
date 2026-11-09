# client

Vue 3 + Vite + Tailwind CSS v4. Gerador de QR code que roda inteiro no navegador (sem servidor).

```sh
pnpm install
pnpm dev      # servidor de desenvolvimento
pnpm test     # vitest (lógica pura: payloads, CSV, PIX, i18n, consentimento)
pnpm lint
pnpm build    # type-check + build
```

## Estrutura

- `src/lib/` — QR (`qr.ts`), payloads dos 12 tipos (`payloads.ts`), CSV, exportação, Recentes, consentimento.
- `src/i18n/` — `pt-BR.ts` (fonte), `en.ts`, `es.ts`, `fr.ts` e `de.ts`. Os testes exigem as mesmas chaves e parâmetros em todos e que toda chave usada no código exista.
- `src/components/` e `src/components/ui/` — componentes do Figma (página Componentes).

## Idiomas

`t('chave.com.pontos', { n })` em qualquer componente. Para adicionar um idioma: crie o dicionário, registre em `src/i18n/index.ts` (`LOCALES` e `dicts`).

Português (Brasil), inglês, espanhol, francês e alemão. A escolha salva tem prioridade; sem ela, a detecção percorre os idiomas preferidos do navegador, incluindo variantes regionais (como `es-MX`, `fr-CA` e `de-AT`). Sem correspondência, usa inglês. Chaves ausentes têm fallback para português.

Os modelos CSV usam `nome,conteudo` em português e `name,content` nos demais idiomas, mantendo a compatibilidade com o importador. Datas de eventos continuam no formato `dd/mm/aaaa`; Pix continua em reais (R$).

## Navegação e tutorial

O gerador fica em `#/`, Sobre em `#/sobre` e Perguntas frequentes em `#/faq`. O formulário e a aparência permanecem na memória ao navegar. Sobre e FAQ não aparecem na rolagem do gerador.

O tutorial tem quatro passos, aparece na primeira visita ao gerador após a escolha de privacidade e pode ser reaberto por **Tutorial** no cabeçalho ou menu mobile. Concluir, pular ou sair com Esc registra que ele já foi visto. Sem acesso ao armazenamento, essa informação permanece apenas na sessão. O tutorial não preenche, apaga ou exporta dados do usuário.

## Privacidade e `localStorage`

Nada é enviado a servidores. O app guarda no navegador:

| Chave | O que é | Quando |
|---|---|---|
| `creative-qr:consent` | a escolha de privacidade | sempre (necessário) |
| `creative-qr:lang` | idioma | sempre (necessário) |
| `creative-qr:tutorial:v1` | tutorial já visto | ao concluir ou pular (necessário) |
| `creative-qr:recentes:v1` | QR codes recentes | só com permissão (Cookies) |

Sem permissão, Recentes vive só na memória da sessão. Há testes em `src/lib/consent.test.ts`.

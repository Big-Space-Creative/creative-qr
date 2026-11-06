# creative-qr

## Deploy com Docker / Portainer

Aplicação Vue/Vite estática, servida por Nginx sem root na porta interna `8080`.
Use um ambiente **Docker Standalone** no Portainer; este Compose faz build local e não é uma stack Swarm.

1. Acesse **Stacks → Add stack → Repository**.
2. Informe `https://github.com/Big-Space-Creative/creative-qr.git`, referência `refs/heads/main` e **Compose path** = `docker-compose.yml`.
3. Se o repositório for privado, habilite autenticação HTTPS com usuário GitHub e **Personal Access Token** com acesso de leitura ao repositório. Não inclua o token na URL ou nos arquivos.
4. Em variáveis de ambiente da stack, defina `HOST_PORT` (padrão: `8080`) e faça o deploy. Acesse `http://IP_DO_HOST:HOST_PORT`; a saúde é verificada em `/healthz`.

Para atualizar, use **Pull and redeploy** na stack ou configure um webhook de atualização do Git. Como a imagem é construída no host, confirme que a atualização reconstrói a imagem com o código novo.

Atrás de proxy reverso, remova `ports`, conecte `web` à rede externa do proxy (`networks: [proxy]`) e declare na raiz do Compose `networks: { proxy: { external: true } }`. A rede deve existir; configure o proxy para `web:8080` e termine HTTPS nele.

Localmente: `docker compose up -d --build`. Para encerrar: `docker compose down`.
O arquivo `.env.example` documenta `HOST_PORT`; no Portainer, defina a variável na própria stack.

O build usa Debian (glibc), pois o binário nativo usado pelo type-check não está disponível para musl/Alpine. O runtime usa Alpine, contendo apenas Nginx e os arquivos estáticos.

Referência: [stacks a partir de Git no Portainer](https://docs.portainer.io/user/docker/stacks/add).

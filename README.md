# creative-qr

## Deploy com Docker / Portainer (Swarm + Traefik)

App estático (Vue/Vite) servido por nginx sem root na porta `8080`. **Sem API e sem banco de dados.** A stack (`manager.yaml`) segue o padrão dos outros projetos: Docker Swarm + Traefik, rede externa `network_swarm_public`.

### 1. Imagem
O Swarm não faz build: a imagem precisa existir antes. No nó manager, na raiz do repositório:

```sh
docker build -t creative-qr:TAG .
```

(ou publique num registry que o Swarm consiga acessar.)

### 2. Stack no Portainer
**Stacks → Add stack → Repository**, em um ambiente Swarm:

- URL `https://github.com/Big-Space-Creative/creative-qr.git`, referência `refs/heads/main`, **Compose path** = `manager.yaml`.
- Repositório privado: autenticação HTTPS com usuário GitHub e Personal Access Token (somente leitura). Não coloque o token na URL.
- Variáveis (na própria stack, nunca no arquivo):

| Variável | Obrigatória | O que é |
|---|---|---|
| `APP_DOMAIN` | sim | domínio principal |
| `CQR_IMAGE` | não | imagem a executar (padrão `creative-qr:latest`), ex.: `creative-qr:TAG` |

Pré-requisitos do cluster: rede `network_swarm_public` e o resolver `letsencryptresolver` do Traefik. A saúde do container é verificada em `/healthz`.

### 3. Atualizar
Construa uma nova tag, altere `CQR_IMAGE` na stack e faça **Update the stack**.

### Local (sem Swarm)

```sh
docker build -t creative-qr:dev .
docker run --rm -p 8080:8080 creative-qr:dev   # http://localhost:8080
```

O build usa Debian (glibc), porque o binário nativo do type-check não existe para musl/Alpine. O runtime usa Alpine, só com nginx e os arquivos estáticos.

# AquaBila Sorteios 🎰

Aplicação web para realizar sorteios com uma roda animada e consultar os últimos resultados. Desenvolvida em **Next.js 16 (App Router), TypeScript, Tailwind CSS 4, componentes shadcn/ui, Motion** e **GitHub REST API**. Interface e documentação em português de Portugal; código em inglês.

A página `/` é pública. A página `/admin` é exclusiva do administrador. Não existe base de dados, registo de participantes, integração com pagamentos ou serviços de armazenamento pagos.

## 1. Limitações importantes da arquitetura

Antes de configurar o projeto, é importante compreender estes pontos:

- **O plano gratuito Vercel Hobby destina-se apenas a uso pessoal/não comercial.** Se este site servir a promoção comercial da loja AquaBila, a Vercel exige um plano Pro/Enterprise, segundo os seus termos. O software não necessita de serviços pagos, mas alojá-lo comercialmente na Vercel pode ter custos; em alternativa, podes alojar o Next.js num servidor próprio. Ver [Termos da Vercel](https://vercel.com/legal/terms) e [Diretrizes de utilização](https://vercel.com/docs/limits/fair-use-guidelines).
- **A Vercel não fornece um sistema de ficheiros persistente para as funções serverless.** Por isso, o ficheiro `draws.json` fica noutro repositório privado do GitHub e é atualizado pela REST API, através de commits.
- **O GitHub não é uma base de dados de baixa latência.** Um sorteio faz, normalmente, dois commits: um ao preparar e outro ao iniciar. A informação pública pode demorar alguns segundos a atualizar, conforme a cache e o polling. É adequado para um único administrador e sorteios pouco frequentes, não para tráfego em massa nem garantias de sincronização ao milissegundo.
- **Não existem sorteios simultâneos.** É gerado um resultado por sorteio. A gravação do estado `SPINNING`, do vencedor e da entrada do histórico acontece na mesma atualização do JSON. O estado `COMPLETED` é calculado a partir de `completedAt`, sem necessitar de uma função a correr depois de cinco segundos.
- **O bloqueio de tentativas de login é apenas uma proteção básica por instância.** Em funções serverless, diferentes instâncias não partilham memória; portanto, não existe um limite distribuído robusto sem um armazenamento partilhado adicional. Usar uma palavra-passe longa e limitar o acesso a `/admin` quando possível. Não se apresentam garantias falsas de proteção contra ataques distribuídos.
- **As sessões são assinadas, não guardadas numa base de dados.** O logout apaga o cookie do browser, mas não revoga um cookie já roubado antes de expirar (máximo de 8 horas). Rodar `SESSION_SECRET` invalida todas as sessões.
- **O repositório é privado, mas o histórico de commits mantém versões anteriores.** A aplicação deixa de mostrar resultados após 14 dias e limpa o JSON na próxima escrita; resultados antigos podem continuar nas versões anteriores do repositório.
- **Todos os visitantes veem o mesmo resultado**, mas podem ver a animação com alguns segundos de diferença devido à latência de rede. O contador na roda é apenas ilustrativo: o vencedor é gerado por `crypto.randomInt` exclusivamente no backend.

## 2. Preparar dois repositórios

Cria dois repositórios no GitHub:

1. `aquabila-sorteios` — código-fonte da aplicação (público ou privado, à tua escolha).
2. `aquabila-sorteios-data` — **obrigatoriamente privado**, com o ficheiro `draws.json` na branch `main`.

No repositório de dados, cria exatamente este conteúdo:

```json
{
  "currentDraw": null,
  "history": []
}
```

O exemplo está também em `data/draws.example.json`, apenas como referência. **Não coloques o ficheiro de produção no diretório `public/` nem no repositório da aplicação.**

## 3. Criar o token de acesso ao GitHub

1. No GitHub abre **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Define um nome como `aquabila-sorteios-vercel`, uma data de expiração e o proprietário correto.
3. Em **Repository access**, escolhe **Only select repositories** e seleciona **apenas** `aquabila-sorteios-data`.
4. Em **Repository permissions**, define **Contents: Read and write**. A permissão de leitura de metadados é normalmente atribuída automaticamente. Não concedas permissões para administrar repositórios ou alterar workflows.
5. Gera o token e guarda-o num gestor de palavras-passe. Nunca o partilhes numa mensagem, commit, screenshot ou ficheiro versionado.

O token pode expirar ou ser revogado; nesse caso, os sorteios deixam de conseguir ser lidos/atualizados até substituíres o segredo na Vercel.

## 4. Instalação local

Requisitos: **Node.js 22+**, npm e os dois repositórios configurados. Os testes incluídos utilizam a leitura de TypeScript disponibilizada pelo Node.js 22.

```bash
git clone https://github.com/TEU_UTILIZADOR/aquabila-sorteios.git
cd aquabila-sorteios
npm install
cp .env.example .env.local
```

Gera o hash da tua palavra-passe (mínimo 12 caracteres):

```bash
npm run hash:password -- "Uma-Palavra-Passe-Longa-E-Unica!"
```

Copia o resultado para `ADMIN_PASSWORD_HASH` no `.env.local`. O hash utiliza `scrypt` com salt aleatório; a palavra-passe em texto simples **nunca** precisa de ser guardada nas variáveis de ambiente.

Gera um segredo de sessão forte:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Preenche `.env.local`:

```dotenv
GITHUB_TOKEN=github_pat_...       # Substitui pelo token real, APENAS localmente.
GITHUB_OWNER=nome-do-proprietario
GITHUB_REPO=aquabila-sorteios-data
GITHUB_BRANCH=main
GITHUB_DATA_FILE=draws.json

ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=scrypt:...:...
SESSION_SECRET=segredo_gerado_com_o_comando
```

> **É seguro usar variáveis de ambiente?** Sim, quando configuradas no ambiente privado do servidor e nunca expostas no frontend, apesar de continuarem a exigir cuidado com acessos e logs. **Não** coloques os segredos em `.env.example`, no código, em GitHub Actions *variables* públicas, nem em ficheiros enviados para o Git. O `.gitignore` exclui `.env.local`. Se um token for acidentalmente exposto, revoga-o imediatamente e cria outro.

Executa a aplicação:

```bash
npm run dev
```

Acede a **http://localhost:3000** (público) e **http://localhost:3000/admin** (administração).

## 5. Publicar na Vercel (sem Vercel Blob)

1. Faz push **apenas do código** para `aquabila-sorteios`.
2. Em Vercel, escolhe **Add New → Project**, importa o repositório da aplicação e seleciona o framework **Next.js**.
3. Em **Project Settings → Environment Variables**, adiciona as mesmas variáveis definidas em `.env.local`, com os valores reais, para o ambiente **Production**. Se utilizares ambientes Preview, configura valores específicos para evitar que previews alterem os sorteios reais.
4. Confirma que nenhuma variável privada começa por `NEXT_PUBLIC_`.
5. Publica e valida `https://<dominio>/` e `https://<dominio>/admin`.
6. Faz login, prepara um sorteio, inicia-o e confirma o novo commit no **repositório privado dos dados**.

A **Vercel Environment Variables** é onde deves guardar `GITHUB_TOKEN` e `SESSION_SECRET`; não são variáveis de ambiente do repositório Git nem conteúdo de um `.env` enviado por commit. No caso de trocar o token ou o segredo, atualiza os valores na Vercel e faz redeploy.

O código não depende de serviços de armazenamento pagos. **Atenção:** a Vercel **não** permite utilizar o plano gratuito Hobby para fins comerciais. Para uma campanha promocional da loja, utiliza um plano comercial da Vercel ou alojamento próprio (Node.js, com `npm run build` e `npm run start`). Não é possível garantir alojamento comercial gratuito na Vercel.

## 6. Como funcionam os sorteios

### Administração

1. Em `/admin`, o administrador inicia sessão.
2. Preenche o nome, ticket inicial e ticket final, e clica em **Preparar Sorteio**.
3. O backend guarda o estado `WAITING` no `draws.json` do GitHub.
4. O administrador clica em **Iniciar Sorteio**. O backend valida a sessão e o identificador do sorteio.
5. `crypto.randomInt(minTicket, maxTicket + 1)` escolhe de forma criptograficamente segura e uniforme o vencedor, incluindo ambos os limites.
6. **Uma única gravação atómica do ficheiro** guarda o número vencedor, as datas UTC, o estado `SPINNING` e a entrada para o histórico.
7. A animação tem duração de 5 segundos; após `completedAt`, a API devolve o estado `COMPLETED` e revela o número vencedor.
8. O administrador pode preparar outro sorteio assim que o anterior terminar.


### Participantes

A página pública usa polling: a cada **1,5 segundos** quando está em espera, **700 ms** durante a animação e **6 segundos** em modo concluído/vazio. Os clientes recebem o timestamp de início e a hora do servidor, ajustam a roda ao tempo já passado e mostram o resultado quando o backend permite.

O contador mostrado durante a rotação **não é uma seleção real de vencedores**; é um efeito visual determinístico. A informação real é fornecida apenas pelo servidor no final do sorteio. O frontend não possui permissões para escolher, editar ou guardar resultados.


### Persistência e concorrência

As escritas usam a **GitHub Contents API** com o `sha` do ficheiro. Se outro pedido alterar o ficheiro entre a leitura e a escrita, ocorre conflito. O código volta a ler o ficheiro e **reavalia toda a operação** antes de tentar de novo. O endpoint de início recebe o `drawId`; repetir um pedido de início para esse mesmo sorteio devolve sempre o vencedor já guardado.

Se o GitHub confirmar um commit mas a resposta se perder por falha de rede, o administrador deve atualizar a página antes de voltar a tentar, para não criar involuntariamente outro sorteio. Não existe nenhum processo em segundo plano para finalizar a roda: a conclusão é inferida de `startedAt`/`completedAt`.

### Cache e limites do GitHub

As leituras públicas da GitHub REST API utilizam cache de dados de curta duração (**2 segundos**), com invalidação após as escritas, para reduzir o número de pedidos ao GitHub. O cliente continua a consultar a API da aplicação. As operações administrativas consultam sempre o estado fresco do GitHub.

O limite habitual de pedidos REST autenticados com um token pessoal é de **5 000 pedidos/hora**, sujeito às políticas e limites secundários do GitHub. Muitas visitas simultâneas podem aumentar os pedidos à API e consumir quotas da Vercel. Esta solução foi desenhada para pequenos sorteios, não para milhares de visitantes a pedir atualizações em cada segundo. Se o volume aumentar, será necessário rever a arquitetura.

## 7. API

| Endpoint | Acesso | Descrição |
|---|---|---|
| `GET /api/draw` | Público | Estado atual; vencedor oculto até conclusão. |
| `GET /api/draw/history` | Público | Resultados dos últimos 14 dias, do mais recente para o mais antigo. |
| `POST /api/admin/login` | Público | Inicia sessão com utilizador/palavra-passe. |
| `POST /api/admin/logout` | Admin | Termina a sessão no browser. |
| `POST /api/admin/draw/prepare` | Admin | Prepara o sorteio; inclui `id`, `name`, `minTicket`, `maxTicket`. |
| `POST /api/admin/draw/start` | Admin | Inicia o sorteio; inclui `drawId`. |

Todos os endpoints POST verificam `Origin` e `Sec-Fetch-Site` quando aplicável. As sessões utilizam cookies **HttpOnly**, **SameSite=Strict**, com **Secure** em produção. Os inputs são validados também no servidor.

## 8. Estrutura

```text
src/
  app/
    page.tsx                   # Página pública
    admin/page.tsx             # Administração com autenticação
    api/draw/                  # API pública e histórico
    api/admin/                 # Login, logout, preparar, iniciar
    globals.css                # Cores da marca e animações
  components/
    Brand.tsx
    draw/                      # Roda, resultado, histórico, polling
    admin/                     # Login e painel
    ui/                        # Componentes shadcn/ui
  lib/
    auth.ts                    # Scrypt, sessão, proteção básica login
    draw.ts                    # Regras, seleção, idempotência
    github.ts                  # GitHub Contents API e controlo de conflitos
  types/draw.ts
scripts/hash-password.mjs
data/draws.example.json
tests/draw.test.mjs
```

Os nomes de variáveis, funções, ficheiros e comentários do código estão em inglês. O conteúdo visível e o README estão em português de Portugal.

## 9. Comandos de desenvolvimento

```bash
npm run dev            # Servidor local
npm run typecheck      # Verificação de tipos
npm run lint           # ESLint
npm test               # Testes unitários das regras de negócio
npm run build          # Build de produção
npm run start          # Servidor de produção após o build
```

## 10. Perguntas frequentes / problemas

**"O armazenamento GitHub ainda não está configurado."** Verifica `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` no `.env.local` ou na Vercel.

**"draws.json não encontrado."** Confirma que o repositório é privado, que existe o ficheiro no caminho certo, que a branch é a correta e que o token está autorizado a aceder a esse repositório.

**"Não foi possível guardar o sorteio."** O token pode estar expirado, sem a permissão **Contents: Read and write**, ou o GitHub pode estar indisponível. Atualiza a página e verifica o repositório de dados antes de repetir.

**A roda parece começar a meio.** É normal quando o visitante entra depois do sorteio ter começado. A fase da animação é calculada com o timestamp do servidor.

**Um sorteio terminado ainda aparece com `SPINNING` no JSON.** É intencional: o campo é o estado persistido; o backend converte-o para `COMPLETED` quando chega `completedAt`. Evita um commit adicional e não exige uma tarefa agendada.

**Como alterar as cores?** As cores principais estão em `src/app/globals.css`, nas variáveis `--brand-*`. A paleta é provisória porque não foi possível verificar de forma fiável as cores oficiais do site.

**Porque não há botão para apagar resultados?** O histórico é imutável do ponto de vista da interface. Os resultados com mais de 14 dias deixam de aparecer automaticamente e são removidos do JSON durante a próxima operação de escrita.

## 11. Fontes técnicas

- [GitHub REST API — Repository contents](https://docs.github.com/en/rest/repos/contents)
- [Next.js — Fetch caching](https://nextjs.org/docs/app/api-reference/functions/fetch)
- [Next.js — Cache invalidation](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [Vercel — Environment variables](https://vercel.com/docs/environment-variables)
- [Motion for React](https://motion.dev/docs/react-installation)

---

AquaBila Sorteios — solução simples para um administrador, com resultados persistentes e visíveis após novos deployments.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Regras de Negócio (Respondly)

### Visão geral
- O Respondly conecta uma empresa (Business) ao **Google Business Profile** para **sincronizar reviews** e (quando habilitado) **responder automaticamente** seguindo regras configuradas.

### Conceitos principais
- **Business**: unidade “empresa” do usuário. Contém configuração de Google (account/location), automação (autoResponderEnabled) e assinatura (subscription).
- **Review**: review importada (Google ou mock) e armazenada com:
  - `status`: `pending | responded | failed | skipped`
  - `externalId`: identificador externo (no Google é o `name` da review, ex: `accounts/.../locations/.../reviews/...`)
  - `createdAtGoogle`: data do Google (quando existir)
- **ReviewRule**: regra que define quando e como responder:
  - `mode`: `auto | manual`
  - `minStars/maxStars`: faixa de rating para match
  - `responseType`: hoje o fluxo automático usa `template`
- **ReviewTemplate**: texto base para respostas, com variáveis (`{{customer_name}}`, `{{business_name}}`, etc).
- **Subscription**: estado de billing/Stripe:
  - `status` vem da Stripe (ex: `active`, `past_due`, `incomplete`, `canceled`)
  - cancelamento é feito como **cancelamento no fim do período** (`cancelAtPeriodEnd`, `cancelAt`)
  - `currentPeriodEnd` é usado como “Next renewal/Ends on”

### Conectar Google Business
- Conectar Google cria/atualiza `GoogleConnection` via OAuth (token/refresh token).
- Selecionar uma **account** + **location** salva no Business:
  - `googleAccountName`, `googleLocationId`, `googleLocationName`
  - e dispara um **sync inicial** de reviews.
- Desconectar remove a conexão Google do business, limpa campos de Google e desativa o auto responder.

Arquivos relevantes:
- OAuth connect/callback: `src/app/api/google/connect/route.ts`, `src/app/api/google/callback/route.ts`
- Selecionar location + sync inicial: `src/app/api/google/select-location/route.ts`
- Desconectar: `src/app/api/google/disconnect/route.ts`

### Sincronização de reviews
- A sincronização decide a fonte:
  - se o Business tem `googleLocationId` → `source = "google"`
  - caso contrário → `source = "mock"`
- Para cada review externa, é feito **upsert** usando a chave única:
  - `(businessId, source, externalId)` para não duplicar.
- No **primeiro sync** (`initialSyncCompleted = false`), o sistema marca:
  - `initialSyncCompleted = true`
  - `connectedAt = now`
  Isso serve para bloquear respostas automáticas em “histórico” anterior ao momento em que a empresa conectou.

Arquivos relevantes:
- Orquestração do sync: `src/lib/reviews/sync.ts`
- Provider Google (GET reviews + paginação): `src/lib/reviews/providers/google.ts`

### Resposta automática (Auto Responder)
- Só roda se `Business.autoResponderEnabled = true`.
- Só considera `Review.status = "pending"`.
- Regra aplicada:
  - seleciona a primeira `ReviewRule` em `mode="auto"` que dá match em `minStars/maxStars`
  - se não existir regra → a review é “skipped” (contabilizada como skipped)
- **Bloqueio de histórico**:
  - se `Business.connectedAt` existir, o sistema só tenta responder reviews com:
    - `createdAtGoogle >= connectedAt` (ou `createdAtGoogle = null` para mocks)
- Envio da resposta:
  - para reviews do Google (`source="google"`), publica no Google via endpoint v4 `/reply`
  - ao sucesso, marca `Review.status = "responded"` e salva `ReviewResponse.sentAt`
  - ao erro, marca `Review.status = "failed"` e grava `Review.lastError`

Arquivos relevantes:
- Engine de resposta: `src/lib/reviewEngine.ts`
- Reply no Google: `src/lib/reviews/providers/google.ts`

### Cronjob / Jobs
- Em produção, o “cron” é um **scheduler externo** (Vercel cron) que chama uma rota HTTP.
- A rota `POST/GET /api/jobs/cron`:
  - exige `CRON_SECRET` via header `x-cron-secret` ou query `?secret=...`
  - processa businesses com `autoResponderEnabled = true`
  - executa na sequência:
    1) `sync_reviews`
    2) `auto_responder`
  - usa um “lock” para evitar rodar o mesmo job em paralelo (janela de ~120s).
- Cada execução cria registros `JobRun` com status `running | success | failed`.

Arquivos relevantes:
- Cron endpoint: `src/app/api/jobs/cron/route.ts`
- Agendamento Vercel: `vercel.json`

### Billing (Stripe)
- Checkout:
  - cria/usa `stripeCustomerId`
  - inicia checkout session
  - marca a subscription local como `incomplete` antes do checkout (estado transitório)
- Confirmação e sincronização:
  - a atualização final vem do webhook Stripe e/ou do sync pós-checkout (com `session_id`)
  - garante preencher: `stripeSubscriptionId`, `status`, `currentPeriodEnd`, `cancelAtPeriodEnd/cancelAt`
- Cancelamento:
  - é feito como `cancel_at_period_end = true` (não cancela imediatamente)

Arquivos relevantes:
- Checkout: `src/app/api/billing/checkout/route.ts`
- Cancelamento: `src/app/api/billing/cancel/route.ts`
- Webhook: `src/app/api/stripe/webhook/route.ts`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

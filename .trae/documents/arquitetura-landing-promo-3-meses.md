## 1. Desenho Da Arquitetura
```mermaid
flowchart TD
  A["Frontend Next.js App Router"] --> B["Página /promo/3-meses-gratis"]
  B --> C["API /api/auth/register"]
  B --> D["next-auth signIn credentials"]
  B --> E["Página /start-trial"]
  E --> F["API /api/businesses"]
  E --> G["API /api/billing/checkout"]
  G --> H["Stripe Checkout"]
  C --> I["Prisma + Database"]
  F --> I
  G --> I
```

## 2. Descrição Da Tecnologia
- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- Autenticação: `next-auth`
- Backend: Route Handlers do App Router
- Banco e persistência: Prisma + PostgreSQL
- Pagamentos: Stripe Checkout com Trial Invite já existente
- Animações: `framer-motion`, alinhado à landing principal
- Ícones: `lucide-react`

## 3. Definição Das Rotas
| Rota | Propósito |
|-------|---------|
| `/` | Landing principal já existente |
| `/promo/3-meses-gratis` | Landing promocional da campanha |
| `/register` | Cadastro genérico do produto |
| `/login` | Login de usuários existentes |
| `/start-trial` | Fluxo de criação de business e início do trial |

## 4. Definição Das APIs
### 4.1 Registro
```ts
type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

type RegisterResponse = {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};
```

### 4.2 Início Do Trial
```ts
type StartTrialRouteState = {
  plan: "starter" | "pro";
  code: string;
};
```

### 4.3 Checkout
```ts
type CheckoutRequest = {
  plan: "starter" | "pro";
  inviteCode?: string;
};

type CheckoutResponse = {
  url: string;
};
```

## 5. Arquitetura De Implementação
```mermaid
flowchart TD
  A["page.tsx da landing promocional"] --> B["Hero promocional"]
  A --> C["Seções editoriais de valor"]
  A --> D["Card de cadastro"]
  D --> E["Registro via fetch"]
  D --> F["Login automático via signIn"]
  F --> G["Redirect para /start-trial?plan=...&code=..."]
```

## 6. Modelo De Dados
### 6.1 Modelo Utilizado
Não há novo modelo de banco para esta entrega. A landing reutiliza:
- `User`
- `Business`
- `Subscription`
- `TrialInvite`
- `TrialInviteRedemption`

### 6.2 Regras E Persistência
- O código promocional deve entrar via query string ou variável pública de ambiente
- O código promocional pode ser mantido temporariamente no `localStorage` para garantir continuidade do fluxo
- A página não grava dados próprios; ela apenas orquestra o fluxo existente

## 7. Diretrizes Técnicas De UI
- Reaproveitar o mesmo tema visual da landing principal: fundo escuro, brilho azul/verde, painéis translúcidos e tipografia forte
- Evitar aparência de página “isolada” ou genérica
- Reusar quando possível os mesmos padrões de CTA, espaçamento e ritmo visual das seções já existentes em `src/components/Landing`
- O card de cadastro deve parecer parte da mesma família visual do hero atual

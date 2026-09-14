# TrustVerse Frontend

Next.js 16 App Router UI for TrustVerse — zero-knowledge credential infrastructure with on-chain anchoring and AI forensics.

## Stack

- **Next.js 16** / React 19 / TypeScript
- **Tailwind CSS v4** (CSS-first config in `src/app/globals.css`)
- **shadcn/ui** (Radix Nova style, CSS variables)
- **next-themes** (dark / light / system)
- **sonner** toasts, **lucide-react** icons
- **ethers** v6 + **snarkjs** for wallet + ZK proving
- **Zustand** wallet store (`src/store/useWallet.ts`)

## Getting started

```bash
# from repo root (preferred — starts backend + frontend)
./scripts/dev.sh

# or frontend only
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Contract addresses and API URL come from `frontend/.env.local` (`NEXT_PUBLIC_*`).

## Design system (“Digital Trust”)

Tokens live in [`src/app/globals.css`](src/app/globals.css):

| Token group | Role |
|---|---|
| `--background` / `--foreground` / `--card` / `--muted` / `--border` | Cool-tinted neutrals (never pure `#000`) |
| `--primary` | Single “Trust Blue” accent for actions, links, focus |
| `--success` / `--warning` / `--destructive` | Semantic status only |
| `--font-sans` (Geist) / `--font-mono` (Geist Mono) | UI vs hashes / DIDs / addresses |

Themes: `:root` (light) and `.dark`. Toggle via `ThemeToggle` (`next-themes`, class strategy).

### Component folders

```
src/components/
  ui/            # shadcn primitives (button, card, tabs, dialog, …)
  brand/         # Logo
  layout/        # SiteHeader, SiteFooter, AppShell, ThemeToggle, WalletMenu, PageHeader
  data/          # HashChip, DataField, StatusBadge, QRPanel, StatCard
  feedback/      # EmptyState, ConfirmDialog
  credentials/   # CredentialCard
  proof/         # ProofStepper
  forensics/     # TrustScoreRing, ScoreBreakdown
  wallet/        # WalletGate
  marketing/     # Landing-only sections (ProofTrace, DemoRunner, …)
```

Domain components are presentational. Fetch / contract / snarkjs logic stays in route pages and `src/lib/contracts.ts`.

### Adding a shadcn component

```bash
cd frontend
npx shadcn@latest add <component>
```

Config: [`components.json`](components.json). Aliases: `@/components`, `@/components/ui`, `@/lib/utils`.

## Routes

| Path | Shell | Purpose |
|---|---|---|
| `/` | Marketing (`SiteHeader` + `SiteFooter`) | Product landing |
| `/issuer` | App shell | Register issuer, issue & revoke credentials |
| `/wallet` | App shell | Holder credentials + ZK proof responses |
| `/verifier` | App shell | ZK requests + AI forensics |
| `/verify` | App shell | Public credential hash lookup |

Route groups: `src/app/(marketing)/` and `src/app/(app)/` — URLs unchanged.

## Scripts

```bash
npm run dev      # next dev
npm run build    # production build
npm run lint     # eslint
```

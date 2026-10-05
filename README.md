# Congresso Aberto

A dark, editorial single-page app for following the Brazilian National Congress:
**PECs**, floor votes, agendas and the composition of the **Câmara dos Deputados**
and the **Senado Federal** — built from the official open-data APIs.

Visual language inspired by [seuimposto.com](https://seuimposto.com/): glass
surfaces, hairline borders, big serif figures, tabular numbers, restrained colour.

## Stack

- **React 19 + TypeScript + Vite**
- **Tailwind CSS v4** (design tokens in `src/index.css`)
- **shadcn-style UI primitives** built on **Radix UI** (`src/components/ui`)
- **TanStack Query** for caching, retries and background refresh
- **Recharts** for the distribution and historical charts

## Features

- **Visão geral** — live KPIs, recent floor votes from both houses, upcoming
  sessions, latest PECs, party composition and historical trends.
- **PECs** — Câmara **and** Senate propositions in one place, with house/year
  filters, full-text search and pagination.
- **Agenda & votações** — upcoming Câmara sessions with their **pauta**
  (agenda items), recent Câmara votes and recent Senate nominal votes.
- **Votação — página dedicada** (`#/votacao/<id>`) — each vote gets its own page
  with a **parliament hemicycle** (every seat is one vote, recolorable by vote or
  by party, hover for the member's name), vote distribution, how each party
  voted, and the full roll-call with names, party and state.
- **Deputados / Senadores** — search, party/state filters, bancada overview and
  per-member detail (profile, recent propositions or votes).
- **Atividades** — a unified activity feed (votes, propositions, sessions)
  filterable by kind.
- **Métricas** — party and state distributions for both houses, PEC status
  breakdown, vote outcomes and historical series (PECs per year, votes per month).

### Filtro "já votados"

Every list of legislative items can be narrowed to what has already been voted:

- **PECs** — `Todas / Já votadas / Ainda não votadas`, with a "Já votada" badge
  (Câmara via `/proposicoes/{id}/votacoes`; Senado via situation text).
- **Agenda** — sessions split into `Próximas / Já realizadas`, and each session's
  pauta can be filtered to `Já votados`.
- **Atividades** — a `Já votados` toggle keeps only votes and deliberated
  propositions.
- **Votação** — a `Já votados` toggle keeps only members with a recorded vote.

Detail sheets expose the legislative history:

- **PEC / proposição** — tramitação timeline, autoria and related votes (Câmara);
  situation and authorship (Senado).
- **Parlamentar** — profile plus recent authored propositions (deputy) or
  nominal votes (senator).

## Data sources

| Source | Base URL | Notes |
| --- | --- | --- |
| Câmara dos Deputados | `https://dadosabertos.camara.leg.br/api/v2` | Deputies (513), parties, propositions, tramitações, autores, votações + votos, eventos + pauta. Sends `X-Total-Count`, used for historical counts. |
| Senado Federal | `https://legis.senado.leg.br/dadosabertos` | Senators (81), senator votes, recent floor votes (`/votacao`) and propositions (`/processo`). |

Both APIs return `Access-Control-Allow-Origin: *`. The Câmara API rate-limits
bursts, so the adapter runs its requests through a small concurrency limiter and
the query client retries with backoff.

The API layer lives in `src/lib/api`:

- `camara.ts` / `senado.ts` — adapters that normalise the two very different
  payloads into the shared model in `src/lib/types.ts`.
- `http.ts` — fetch helpers, `X-Total-Count` parsing and the limiter.

## Project structure

```
src/
├── components/
│   ├── ui/         shadcn-style primitives (Radix based)
│   ├── layout/     app shell, sidebar, top bar
│   ├── shared/     cards, badges, charts, KPIs, feeds
│   └── detail/     proposition / member / vote sheets
├── hooks/          TanStack Query hooks + tiny hash router
├── lib/            api adapters, domain types, formatters, aggregates
└── pages/          one component per route
```

Navigation uses a dependency-free hash router (`src/hooks/useUi.ts`), so deep
links work (`#/pecs`, `#/agenda`, `#/votacao/camara-2611313-31`, …).

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint
```

No API keys or backend are required — the browser talks to the official APIs
directly.

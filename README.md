# Congresso Aberto

A dark, editorial single-page app for following the Brazilian National Congress:
**PECs**, floor votes, agendas and the composition of the **Câmara dos Deputados**
and the **Senado Federal** — built from the official open-data APIs.

Layout and visual language follow [seuimposto.com](https://seuimposto.com/)'s
HUD: a fixed top bar with a pill switcher, three glass columns around a central
Brazil map, Faustina serif figures and a timeline dock at the bottom.

## Stack

- **React 19 + TypeScript + Vite**
- **Tailwind CSS v4** (design tokens in `src/index.css`)
- **Radix UI** primitives (`src/components/ui`)
- **TanStack Query** for caching, retries and background refresh
- State outlines from the IBGE malhas API, pre-projected into `src/lib/geo/brazilShapes.ts`

## Views

- **Votações** (`#/votacoes/<id>`) — the latest nominal floor vote by default.
  Headline card with Sim × Não, quorum (3/5 for PEC, absolute majority for PLP),
  presence and absences; a map of % Sim per state or a hemicycle with every seat
  (absent members included); how each party voted and its leader's orientation;
  every vote of the same session; full roll-call; feed of both houses.
- **Câmara / Senado** — composition: left/centre/right bar, seats by party,
  map of the leading party per state (click a state to filter), bancadas and members.
- **PECs** — PECs voted on the Câmara floor in a year, PECs tabled per house and year.
- **Agenda** — upcoming and past Câmara events with their pauta.

Ctrl K searches deputies, senators and recent votes.

## How votes are read

- A Câmara vote id is `{idProposicao}-{seq}`: the prefix is the bill being voted,
  even when the description cites another numbering (e.g. the Senate's).
- Votes are grouped into **deliberações** (same bill, same day); the principal
  one is the nominal merit vote, ahead of destaques and requerimentos.
- `aprovacao` is null for destaques ("Mantido o texto") and the description is
  the source of truth for the result.
- Senate results come from `resultadoVotacao`, and its roll-call is inline;
  codes such as `AP`, `LS`, `MIS`, `P-NRV` become absent/present-without-vote.
- **PECs votadas em {ano}** count only 1st/2nd-round floor votes, matching
  plenary votes to PECs by id prefix within each 3-month API window.

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
│   ├── hud/        header, search, Brazil map, feed, timeline dock, grid
│   ├── shared/     hemicycle, avatars, badges, states
│   ├── detail/     proposition / member sheets
│   └── ui/         Radix-based primitives
├── views/          votacoes, casa (Câmara/Senado), pecs, agenda
├── hooks/          TanStack Query hooks + hash router
└── lib/            api adapters, vote semantics, breakdowns, geo shapes
```

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint
```

No API keys or backend are required — the browser talks to the official APIs
directly.

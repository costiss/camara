# Congresso Aberto

A dark, editorial single-page app for following the Brazilian National Congress:
floor votes, agendas and the composition of the **Câmara dos Deputados**
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
  The vote is the centre of the page: verdict, plain-language title, score,
  required majority, what was being decided, and how each party voted. A bar
  on top goes back to the list and steps to the next newer/older vote. The
  left column is the menu (steps of this vote, latest votes); the map and the
  hemicycle sit in a small corner card that expands into a dialog.
- **Para leigos** (on the vote and inspect pages, collapsed by default, `leigos=1`)
  — where the proposal stands today (e.g. "virou a Lei Complementar 237/2026,
  com vetos parciais", from the Câmara/Senado status), what voting Sim or Não
  meant in this step, why that many votes were needed, what happens next,
  themes, authors, the full text and a glossary of the terms on the page.
- **Inspecionar** (`#/inspecionar/<id>`) — everything about one vote: what was
  voted, every vote category, quorum, each leader's orientation, a party or
  state table (with how faithfully each party followed its orientation) and
  the roll-call with name, party, state and vote filters plus CSV export.
  Party names in the panel and in the table jump to that party's members.
- **Parlamentar** (`#/parlamentar/camara-<id>` or `senado-<código>`) — a
  deputy's or senator's page: profile, authored bills (Câmara), and how they
  voted in every nominal floor vote of the period. It shows turnout, how often
  they followed their party (the leader's orientation, or the majority of the
  party when there is none) and the government (Câmara only), and each vote
  with their position, what party and government asked for, and divergences.
  Every member name in the app links here. A second tab, **Propostas de
  autoria** (`aba=propostas`), lists every bill they authored or co-authored
  (Câmara and Senado): totals by year and type, status in plain words
  ("virou lei", "aguardando a escolha de um relator"), filters by type, year,
  status (Senado) and text, and a "Ver votação" button that opens the bill's
  main vote inside the app.
- **Lista** (`#/lista`) — every floor deliberation of both houses in a period
  (30/90 days or a year), faceted by result and bill type, with search and
  paging. A row opens the Votações panel on that vote.
- **Agenda** — upcoming and past Câmara events with their pauta.

Ctrl K searches deputies, senators and recent votes.

## URL parameters

Every filter lives in the hash query, so any screen can be linked as it is.
Defaults are left out of the URL.

| Route | Parameters |
| --- | --- |
| `#/votacoes/<id>` | `uf`, `modo=plenario`, `mapa=1` (map expanded), `nominal=0` (feed shows every vote), `chamada=1` (roll-call open), `voto` (`sim`, `nao`, …), `nome`, `data` (Senate session date) |
| `#/inspecionar/<id>` | `voto`, `partido`, `uf`, `nome`, `contra=1` (voted against the party), `ordem=partido\|uf\|voto`, `grupo=estado`, `secao=votos\|grupos` (scrolls to that section), `data` |
| `#/parlamentar/<id>` | `periodo=30d\|90d\|<ano>`, `merito=0` (include procedural votes), `filtro=partido\|governo\|ausencias`, `q`; with `aba=propostas`: `tipo`, `ano`, `fase`, `busca`, `pagina` |
| `#/lista` | `casa=camara\|senado`, `periodo=30d\|90d\|<ano>`, `tipo` (`PEC`, `PL`, …), `resultado=aprovada\|rejeitada\|outros`, `nominal=1`, `q`, `ordem=antigas`, `pagina` |
| `#/camara`, `#/senado` | `uf`, `partido`, `q` |
| `#/agenda` | `periodo=realizados`, `tipo=plenario\|comissoes` |

Example: `#/lista?casa=senado&periodo=2025&tipo=PEC&resultado=aprovada`.
Old links such as `#/pecs` are rewritten to their list equivalent.

## How votes are read

- Titles are written in everyday language from the official summary
  (`src/lib/linguagem.ts`): legal boilerplate such as "Altera a Lei nº …, para"
  or "Dispõe sobre" is dropped, extra credits read "Crédito extra de R$ 10
  bilhões para …", urgency requests name the bill they speed up. The code
  (`PLP 74/2026`) stays visible as secondary text next to the type in words,
  and the official text is one click away.
- Each vote is labelled by what it decided (texto principal, emenda, destaque,
  urgência, redação final…), with a one-line explanation.

- A Câmara vote id is `{idProposicao}-{seq}`: the prefix is the bill being voted,
  even when the description cites another numbering (e.g. the Senate's).
- Votes are grouped into **deliberações** (same bill, same day); the principal
  one is the nominal merit vote, ahead of destaques and requerimentos.
- `aprovacao` is null for destaques ("Mantido o texto") and the description is
  the source of truth for the result.
- Senate results come from `resultadoVotacao`, and its roll-call is inline;
  codes such as `AP`, `LS`, `MIS`, `P-NRV` become absent/present-without-vote.
- Party orientations come from the party's own leader or, failing that, its
  federation (`Fdr PT-PCdoB-PV`). Bloc names are abbreviated by the API
  (`Bl UniPpPsd...`) and are not resolved to parties.
- The Câmara API caps date ranges at 3 months, so longer periods are fetched
  in quarterly windows; the Senate takes the whole range in one request.

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
├── views/          votacoes, inspecao, lista, casa (Câmara/Senado), agenda
├── hooks/          TanStack Query hooks + hash router
└── lib/            api adapters, vote semantics, breakdowns, geo shapes
```

## Server (`server/`) and deployment

One small Go binary serves the built app and proxies the government APIs on
the same origin (`/api/camara/*`, `/api/senado/*`), so the app works on any
domain without CORS or a rebuild.

- **Shared cache** in memory, per path: a recorded roll-call or vote detail
  6 h, deputies 6 h, propositions 1 h, vote lists 5 min, events 10 min.
  Recently expired entries are served at once while a fresh copy is fetched
  in the background; when an API fails, the last good copy is served for up
  to 24 h. Size is capped (LRU, 256 MB by default).
- **Request coalescing**: concurrent identical requests become one upstream call.
- **Global rate limit per API** (token bucket + concurrency cap): Câmara
  5 req/s, Senado 2 req/s by default. A 429/503 with `Retry-After` pauses all
  calls to that API.
- **Per-visitor limit** (20 req/s, burst 120). The visitor's IP is resolved
  behind Cloudflare and a reverse proxy: `X-Forwarded-For` is walked only
  through trusted hops (private networks, Cloudflare ranges) and
  `CF-Connecting-IP` is used only when the request really came from a
  Cloudflare edge, so neither header can be forged by hitting the server directly.
- **Static app**: hashed `/assets/*` cached for a year, `index.html` revalidated,
  unknown paths fall back to `index.html`, no redirects (so nothing depends on
  the host name the reverse proxy forwards).

```bash
docker build -t camara .
docker run -p 8080:8080 camara        # app + /api on http://localhost:8080, /healthz for stats

npm run dev:api                       # local development: Go server on :8080
npm run dev                           # Vite on :5173, forwards /api to it
```

### Dokploy behind Cloudflare

1. Create an application from this repository with build type **Dockerfile**
   (`./Dockerfile`); the container listens on `8080` (or `$PORT`).
2. Add the domain in Dokploy pointing to container port `8080`; enable HTTPS.
3. In Cloudflare, proxy the DNS record (orange cloud) and use SSL mode
   **Full (strict)**.

No other setting is needed: Traefik's Docker network and Cloudflare's edges are
trusted by default. Run a single replica (the cache is in memory). Optionally,
a Cloudflare Cache Rule for `/api/*` that respects origin `Cache-Control`
moves repeated reads to Cloudflare's edge.

| Variable | Default |
| --- | --- |
| `PORT` / `PROXY_ADDR` | `8080` / `:$PORT` |
| `STATIC_DIR` | empty (the Docker image sets `/web`) |
| `PROXY_ALLOWED_ORIGINS` | empty: same origin only; list origins to open the API to other sites |
| `PROXY_TRUSTED_PROXIES` | private ranges (`10/8`, `172.16/12`, `192.168/16`, loopback, `fc00::/7`) |
| `PROXY_TRUST_CLOUDFLARE` | `true` |
| `PROXY_CACHE_MAX_MB` / `PROXY_STALE_MAX` | `256` / `24h` |
| `PROXY_QUEUE_TIMEOUT` / `PROXY_UPSTREAM_TIMEOUT` | `15s` / `20s` |
| `PROXY_CLIENT_RPS` / `PROXY_CLIENT_BURST` | `20` / `120` |
| `CAMARA_RPS` / `CAMARA_BURST` / `CAMARA_MAX_CONCURRENT` | `5` / `10` / `4` |
| `SENADO_RPS` / `SENADO_BURST` / `SENADO_MAX_CONCURRENT` | `2` / `4` / `2` |

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint
```

No API keys or backend are required — the browser talks to the official APIs
directly.

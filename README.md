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
  Headline card with Sim × Não, quorum (3/5 for PEC, absolute majority for PLP),
  presence and absences; a map of % Sim per state or a hemicycle with every seat
  (absent members included); how each party voted and its leader's orientation;
  every vote of the same session; full roll-call; feed of both houses.
- **Câmara / Senado** — composition: left/centre/right bar, seats by party,
  map of the leading party per state (click a state to filter), bancadas and members.
- **Inspecionar** (`#/inspecionar/<id>`) — everything about one vote: what was
  voted, every vote category, quorum, each leader's orientation, a party or
  state table (with how faithfully each party followed its orientation) and
  the roll-call with name, party, state and vote filters plus CSV export.
  Party names in the panel and in the table jump to that party's members.
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
| `#/votacoes/<id>` | `uf`, `modo=plenario`, `nominal=0` (feed shows every vote), `chamada=1` (roll-call open), `voto` (`sim`, `nao`, …), `nome`, `data` (Senate session date) |
| `#/inspecionar/<id>` | `voto`, `partido`, `uf`, `nome`, `contra=1` (voted against the party), `ordem=partido\|uf\|voto`, `grupo=estado`, `secao=votos\|grupos` (scrolls to that section), `data` |
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

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint
```

No API keys or backend are required — the browser talks to the official APIs
directly.

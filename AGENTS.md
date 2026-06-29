# create-bunigniter — Development Guide

Scaffold a new [Bunigniter](https://github.com/nexus-ts/bunigniter) project — Bun-native fullstack framework.

> **npm:** `create-bunigniter`
> **GitHub:** github.com/nexus-ts/create-bunigniter

---

## Repository Structure

```
src/
  index.ts              ← Single-file CLI (all template generators + scaffold logic)
.github/
  workflows/            ← CI configuration
README.md               ← Project documentation
package.json            ← Package metadata (bin: src/index.ts)
tsconfig.json           ← TypeScript config
.gitignore              ← Git ignore rules
```

> All scaffolding logic lives in a **single file**: `src/index.ts`. No sub-packages, no build step — run directly with Bun.

---

## Key Conventions (MUST FOLLOW)

1. **All template generators are functions in `src/index.ts`** — each returns a string of file contents
2. **No external dependencies** — CLI runs on Bun APIs only (no npm deps for the scaffolding tool itself)
3. **Template content is source of truth** — the generated project's files are declared inline, not read from disk
4. **Model after Bunigniter conventions** — the scaffolded project follows Bunigniter's controller/view/module structure
5. **Bun >= 1.3.0** — minimum Bun version checked at startup
6. **Docs in English** — README.md is the single documentation source

---

## Template Generators

Every function in `src/index.ts` that starts with a lowercase name generates a single file:

| Generator | Output File | Purpose |
|-----------|-------------|---------|
| `pkgJson(name)` | `package.json` | Dependencies + scripts (dev, seed, bi, repl, cf:*) |
| `tsCfg()` | `tsconfig.json` | JSX + Bundler resolution |
| `gitignore()` | `.gitignore` | Ignores node_modules, dist, *.db, .env |
| `envExample()` | `.env.example` | Environment variable template |
| `devEntry(name)` | `dev.ts` | Elysia server entry point |
| `configApp()` | `config/app.ts` | DB config, port, middleware, CORS |
| `seedScript()` | `db/seed.ts` | SQLite seeder with sample data |
| `routeIndex()` | `routes/index.ts` | GET / — redirect to /items |
| `routeWelcome()` | `routes/welcome.ts` | GET /welcome — Rendu template demo |
| `routeItems()` | `routes/items.ts` | Full CRUD controller (class-based) |
| `routeNewItem()` | `routes/items/new.ts` | GET /items/new — create form |
| `routeApi()` | `routes/api.ts` | GET|POST /api — handler-style + Zod |
| `routeSchedule()` | `routes/schedule.ts` | Scheduled tasks demo (every 10s) |
| `layoutHtml()` | `views/_layout.html` | Auto-layout wrapper (`<?= slot ?>`) |
| `welcomeView()` | `views/welcome.html` | Welcome page Rendu template |
| `itemsView()` | `views/items.html` | Items list + CRUD forms |
| `newItemView()` | `views/new-item.html` | Create form template |
| `wranglerToml(name)` | `wrangler.toml` | Cloudflare Workers config + D1 binding (edge only) |
| `workerEntry()` | `src/worker.ts` | Edge worker entry point (edge only) |
| `initSql()` | `db/init.sql` | D1 database init script (edge only) |

---

## Scaffold Output

### Default (Bun-only): 17 files

```
my-app/
├── config/app.ts           # DB, port, middleware, CORS
├── routes/
│   ├── index.ts            # GET  / — redirect to /items
│   ├── items.ts            # CRUD controller (class-based)
│   ├── items/new.ts        # GET  /items/new — create form
│   ├── welcome.ts          # GET  /welcome — Rendu template
│   ├── api.ts              # GET|POST /api — handler-style
│   └── schedule.ts         # GET  /schedule — cron demo
├── views/
│   ├── _layout.html        # Auto-layout wrapper
│   ├── welcome.html        # Rendu template (PHP-style)
│   ├── items.html          # Items list + CRUD forms
│   └── new-item.html       # Create form
├── db/seed.ts              # SQLite seeder w/ sample data
├── dev.ts                  # Entry point
├── package.json            # Scripts: dev, seed, bi, repl
├── tsconfig.json           # TypeScript config
├── .gitignore              # Git ignore rules
└── .env.example            # Environment variables
```

### With `--edge` flag: +3 additional files

```
my-app/
├── ... (all files above) ...
├── wrangler.toml           # Cloudflare Workers configuration + D1 binding
├── src/worker.ts           # Edge worker entry point (Elysia + D1 + inline HTML)
└── db/init.sql             # D1 database initialization script
```

---

## Scaffold Function: `scaffold(dir, projectName, useEdge)`

The `scaffold()` function at the bottom of `src/index.ts` orchestrates everything:

1. Creates subdirectory structure: `config`, `routes`, `routes/items`, `views`, `db`, `data` (+ `src` for edge)
2. Writes all root-level files: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `dev.ts`
3. Writes config files: `config/app.ts`
4. Writes database files: `db/seed.ts`
5. Writes route files: `routes/index.ts`, `routes/welcome.ts`, `routes/items.ts`, `routes/items/new.ts`, `routes/api.ts`, `routes/schedule.ts`
6. Writes view files: `views/_layout.html`, `views/welcome.html`, `views/items.html`, `views/new-item.html`
7. If `useEdge`: writes `wrangler.toml`, `src/worker.ts`, `db/init.sql`
8. Returns to `main()` for summary + dependency install prompt

---

## Main Flow

```
main()
  ├── handleArgs()          → Parse CLI args (projectName, useEdge, --help, --version)
  ├── checkBunVersion()     → Ensure Bun >= 1.3.0
  ├── prompt project name   → If not provided as arg
  ├── sanitize(name)        → Clean project name (lowercase, hyphens, no special chars)
  ├── scaffold(...)         → Generate all files
  ├── Install prompt        → Ask to run `bun install`
  └── Print next steps      → cd + seed + dev
```

---

## CLI Usage

```bash
bun create bunigniter                 # Interactive prompt
bun create bunigniter my-app          # With project name
bun create bunigniter my-app --edge   # With Cloudflare Workers support
npx create-bunigniter my-app          # npm alternative
```

## Options

| Flag | Description |
|------|-------------|
| `--help, -h` | Show help message |
| `--version, -V` | Show version |
| `--edge, -e` | Include Cloudflare Workers deployment files |

---

## Template Patterns

### Package.json Scripts

The generated `package.json` includes:

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run --watch dev.ts` | Dev server with HMR |
| `seed` | `bun run db/seed.ts` | Seed database |
| `bi` | `bun x bunigniter` | Bunigniter CLI |
| `repl` | `bun x bunigniter repl` | Interactive REPL |
| `cf:dev` | `wrangler dev src/worker.ts` | Local Workers dev (edge) |
| `cf:deploy` | `wrangler deploy src/worker.ts` | Deploy to Cloudflare (edge) |
| `cf:db:init` | `wrangler d1 execute ...` | Init D1 tables (edge) |

### Config (`config/app.ts`)

Generated config includes:

- Default PostgreSQL (port 5432), with commented-out SQLite, MySQL, and D1 options
- CORS origin from `CORS_ORIGIN` env var
- Debug mode via `DEBUG` env var
- Server port via `PORT` env var (default 3000)

### Controller (routes/items.ts)

Demonstrates CI-style class-based controller:

- `this.db.get()`, `.first()`, `.insert()`, `.update()`, `.delete()`
- `this.validate()` with string rules and validator instance
- `this.request.only()`, `.get()`, `.post()`, `.filled()`
- `this.view()`, `this.redirect()`, `this.json()`
- `this.session.flash()` for success/error messages

### API Handler (routes/api.ts)

Demonstrates void-style handler:

- `defineHandler` for simple GET responses
- `defineHandler.withValidator()` for Zod-validated POST

---

## Testing

```bash
bun run src/index.ts --help          # Verify CLI runs
bun run src/index.ts test-project    # Scaffold a test project
bun run src/index.ts test-project --edge  # Scaffold with edge support
```

No formal test suite yet — manual validation via scaffolding + inspection.

---

## CI

See `.github/workflows/` for CI configuration. The CI should:

- Verify `bun run src/index.ts --help` exits 0
- Verify `bun run src/index.ts test-project` scaffolds without error
- Verify the scaffolded project can `bun install` and `bun run dev`

---

## Related

| Repo | Description |
|------|-------------|
| [bunigniter](https://github.com/nexus-ts/bunigniter) | The framework this scaffolds — full docs, guides, skills |
| [nexus-ts](https://github.com/nexus-ts) | Organization |

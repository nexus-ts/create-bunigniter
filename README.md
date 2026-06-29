> **⚠️ Experimental** — This project is actively evolving. APIs may change before 1.0.

# create-bunigniter

[![npm](https://img.shields.io/npm/v/create-bunigniter)](https://www.npmjs.com/package/create-bunigniter)
[![CI](https://github.com/nexus-ts/create-bunigniter/actions/workflows/ci.yml/badge.svg)](https://github.com/nexus-ts/create-bunigniter/actions)

**Scaffold a [Bunigniter](https://github.com/nexus-ts/bunigniter) project in seconds.**

Bunigniter is a Bun-native fullstack framework — CodeIgniter's DX × Elysia v2 performance × Edge-ready.

```bash
bun create bunigniter@latest my-app
cd my-app
bun run seed
bun run dev
# → http://localhost:3000
```

---

## Why Bunigniter?

PHP developers (CodeIgniter, Laravel) moving to TypeScript hit a wall: NestJS over-engineers everything, Hono is too bare, AdonisJS is Node-only. **Bunigniter is the bridge.**

```ts
// routes/users.ts — file path = URL
export class Users extends Controller {
  async index()  { return this.json(await this.db.get('users')) }
  async show(id) { return this.json(await this.db.first('SELECT * FROM users WHERE id = ?', [id])) }
  async create() {
    const data = this.request.only(['name', 'email'])
    const v = this.validate(data, { name: 'required|min:2', email: 'required|email' })
    if (v.fails()) return this.badRequest(v.errors)
    await this.db.insert('users', { name: v.data.name, email: v.data.email })
    return this.json({ ok: true }, 201)
  }
}
```

---

## Usage

> ⚠️ **Always use `@latest`** — Bun caches `create-*` packages locally. Without `@latest`,
> you may install an older scaffold.

```bash
bun create bunigniter@latest my-app     # Recommended — always the latest
bunx create-bunigniter@latest my-app    # Same result
bun create bunigniter my-app            # Uses Bun cache (may be outdated)
```

`create-bunigniter` creates the project directory, installs `bunigniter`, then delegates scaffolding to Bunigniter's **`bi new`** interactive wizard.

### Interactive wizard (via `bi new`)

After installation, you'll be prompted to choose:

1. **Runtime** — `bun` (Bun-only) or `cloudflare` (Bun + Cloudflare Workers)
2. **Database** — `sqlite`, `postgresql`, `mysql`, or `none`
3. **OpenAPI docs** — yes / no
4. **Template** — `simple` (welcome page) or `todo` (coming soon)
5. **Install dependencies** — yes / no

> The `--edge` flag is **no longer needed** — runtime selection is now part of the interactive wizard.

---

## What you get

### Default (simple template, Bun + SQLite): 11 files

```
my-app/
├── config/app.ts           # DB port, middleware, CORS
├── routes/
│   ├── index.ts            # GET / — welcome page (Home controller)
│   └── api.ts              # GET /api — API handler
├── views/
│   ├── _layout.html        # Auto-layout wrapper
│   └── welcome.html        # Welcome page (Rendu template)
├── db/seed.ts              # SQLite seeder w/ sample data
├── dev.ts                  # Entry point
├── package.json            # Scripts: dev, seed, bi, repl
├── tsconfig.json           # TypeScript config
├── .gitignore              # Git ignore rules
└── .env.example            # Environment variables
```

### With Cloudflare runtime: +3 additional files

```
my-app/
├── ... (all files above) ...
├── wrangler.toml           # Cloudflare Workers configuration + D1 binding
├── src/worker.ts           # Edge worker entry point (Elysia + D1 + inline HTML)
└── db/init.sql             # D1 database initialization script
```

---

## What it demonstrates

| Feature | File | Example |
|---------|------|---------|
| Class-based controller | `routes/index.ts` | `this.view()`, `this.json()` |
| Handler-style routes | `routes/api.ts` | `defineHandler` for GET/POST |
| Rendu templates | `views/*.html` | `<?= variable ?>`, `<? for(...) { ?>` |
| Auto-layout | `views/_layout.html` | `<?= slot ?>` wraps all pages |
| SQLite | `db/seed.ts` | Zero-config, auto-created |
| Database seeder | `db/seed.ts` | `bun run seed` creates tables + sample data |
| Edge deployment | `src/worker.ts` | Elysia + D1 on Cloudflare Workers (if runtime=cloudflare) |
| D1 database | `db/init.sql` | SQLite-compatible serverless DB on Cloudflare |

---

## Quick Start

### Local Development (Bun)

```bash
cd my-app
bun run seed          # Seed database (3 sample items)
bun run dev           # Dev server at :3000
bun run bi repl       # Interactive REPL with db, cache, http
bun run bi list       # List all registered routes
```

### Cloudflare Workers Deployment (if runtime=cloudflare)

```bash
cd my-app
npx wrangler login                                          # Login to Cloudflare
npx wrangler d1 create my-app-db                            # Create D1 database
# → Copy the database_id into wrangler.toml

bun run cf:db:init                                          # Initialize D1 tables
bun run cf:dev                                              # Local dev at :8787
bun run cf:deploy                                           # Deploy to Cloudflare
```

---

## Requirements

- [Bun](https://bun.sh) >= 1.3.0
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (for Cloudflare deployment — installed automatically when runtime=cloudflare)

---

## Next Steps

| Feature | Guide |
|---------|-------|
| Database | Switch dialect in `config/app.ts` (postgres, mysql, d1) |
| Auth | Session/JWT — `import { jwt } from "bunigniter/helpers/jwt"` |
| WebSocket | `routes/ws.ts` — `ws.handle("/chat", { message(ws, data) })` |
| SSE | `import { sse } from "bunigniter/helpers/sse"` |
| HMVC | `modules/<name>/routes/` — modular sub-apps |
| OpenAPI | Auto-generated at `/openapi` with Scalar UI |
| CLI | `bun run bi make:controller`, `make:model`, etc. |
| Edge | `bun run bi build:edge` for Cloudflare Workers |
| Init existing project | `bun run bi init` — scaffold into current directory |

### Cloudflare Workers

| Topic | Guide |
|-------|-------|
| Deploy | `bun run cf:deploy` |
| D1 Console | `npx wrangler d1 execute my-app-db --command "SELECT * FROM items"` |
| Custom Domain | Add `routes = ["example.com/*"]` to `wrangler.toml` |
| Logs | `npx wrangler tail` for real-time logs |

Full documentation: [github.com/nexus-ts/bunigniter](https://github.com/nexus-ts/bunigniter)

---

## License

MIT

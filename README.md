# create-bunigniter

**Scaffold a new [Bunigniter](https://github.com/nexus-ts/bunigniter) project — Bun-native fullstack framework**
*CodeIgniter spirit × Elysia v2 performance × Edge-ready*

```bash
bun create bunigniter my-app
cd my-app
bun run seed
bun run dev
# → http://localhost:3000
```

---

## Why Bunigniter?

PHP developers (CodeIgniter, Laravel) moving to TypeScript face a wall: NestJS is over-engineered, Hono is too bare, AdonisJS is Node-only. **Bunigniter is the bridge.**

This CLI scaffolds a complete, working project — not just an empty shell. You get a CRUD controller, API handler, database seeder, and styled templates out of the box.

---

## Usage

```bash
# Interactive prompt
bun create bunigniter

# With project name
bun create bunigniter my-app

# Or via npx/bunx
npx create-bunigniter my-app
bun x create-bunigniter my-app
```

The CLI will:
1. Create the project directory
2. Scaffold 17 starter files
3. Prompt to run `bun install`

---

## What you get

```
my-app/
├── config/
│   └── app.ts              # DB, port, middleware, CORS config
├── routes/
│   ├── index.ts            # GET / — redirects to /items
│   ├── items.ts            # Items CRUD controller (class-based)
│   ├── items/
│   │   └── new.ts          # GET /items/new — new item form
│   ├── welcome.ts          # GET /welcome — Rendu template demo
│   ├── api.ts              # GET|POST /api — handler-style routes
│   └── schedule.ts         # GET /schedule — recurring task demo
├── views/
│   ├── _layout.html        # Auto-layout wrapper (wraps all pages)
│   ├── welcome.html        # PHP-style Rendu template
│   ├── items.html          # Items list with CRUD forms
│   └── new-item.html       # New item creation form
├── db/
│   └── seed.ts             # SQLite seeder with sample data
├── data/                   # SQLite database storage
├── dev.ts                  # Entry point (imports bunigniter)
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript config (JSX, Bundler resolution)
├── .gitignore              # Node/SQLite ignores
└── .env.example            # Environment variables template
```

---

## Quick Start

```bash
cd my-app
bun run seed          # Seed database with sample data
bun run dev           # Start dev server (port 3000)
```

Open http://localhost:3000 in your browser.

### Routes to explore

| URL | Route file | Description |
|-----|-----------|-------------|
| `/` | `routes/index.ts` | Redirects to `/items` |
| `/items` | `routes/items.ts` | Items list (CRUD: list, create) |
| `/items/new` | `routes/items/new.ts` | New item form |
| `/welcome` | `routes/welcome.ts` | Welcome page with Rendu template |
| `/api` | `routes/api.ts` | JSON API (GET + POST with Zod validation) |
| `/schedule` | `routes/schedule.ts` | Recurring task demo |

### Other commands

```bash
bun run start         # Start without hot reload
bun run bi            # Bunigniter CLI help
bun run bi repl       # Interactive console (db, cache, http)
bun run bi list       # List all registered routes
```

---

## Features demonstrated

### Controller (Class-based)

```ts
// routes/items.ts
import { Controller } from "bunigniter"

export class Items extends Controller {
  async index() {
    const result = await this.db.query("SELECT * FROM items ORDER BY created_at DESC")
    return this.view("items", { items: result.rows ?? [], total: result.rows.length })
  }

  async create() {
    const v = this.validate(this.body, { title: "required|min:1|max:500" })
    if (v.fails()) return this.badRequest(v.errors)
    await this.db.query("INSERT INTO items (title, content) VALUES (?, ?)", [v.data.title.trim(), this.request.post("content") ?? ""])
    return this.redirect("/items")
  }
}
```

### Handler-style (Void-style)

```ts
// routes/api.ts
import { defineHandler } from "bunigniter"
import { z } from "zod"

export const GET = defineHandler(async () => ({
  message: "Hello from Bunigniter!",
  timestamp: new Date().toISOString(),
}))

export const POST = defineHandler.withValidator({
  body: z.object({ name: z.string().min(1).max(100) }),
})(async (_, { body }) => ({
  received: { ...body, upperName: body.name.toUpperCase() },
}))
```

### Rendu Templates (PHP-style)

```html
<!-- views/_layout.html — auto-wraps all pages via <?= slot ?> -->
<!DOCTYPE html>
<html>
<body>
  <main><?= slot ?></main>
</body>
</html>

<!-- views/items.html -->
<h1>Items (<?= total ?? 0 ?>)</h1>
<? for (const item of items) { ?>
  <div class="card">
    <h3><?= item.title ?></h3>
  </div>
<? } ?>
```

### Input Validation

```ts
const v = this.validate(this.body, {
  title: "required|min:1|max:500",
})
if (v.fails()) return this.badRequest(v.errors)
```

### Request Input (CI-style)

```ts
this.request.input(key, default?)   // POST + GET merged
this.request.only(keys)              // mass-assignment protection
this.request.get(key, default?)      // query string only
this.request.post(key, default?)     // POST body only
```

### Scheduled Tasks

```ts
import { schedule } from "bunigniter/helpers/schedule"

schedule.every(10000, "demo-task").do(async () => {
  console.log("[schedule] Task executed at", new Date().toISOString())
})
```

---

## Project Structure Explained

| Path | Purpose |
|------|---------|
| `config/app.ts` | Single config file — edit DB dialect, port, middleware settings |
| `routes/*.ts` | Controllers & handlers — file path = URL path |
| `views/*.html` | Templates with auto-layout via `_layout.html` |
| `db/seed.ts` | Database seeder — creates tables and sample data |
| `dev.ts` | App entry point — imports `bunigniter` framework |

The file router maps `routes/items.ts` → `/items`, `routes/items/new.ts` → `/items/new`, etc.

---

## Requirements

- [Bun](https://bun.sh) >= 1.3.0

---

## Next Steps

After scaffolding, explore these Bunigniter capabilities:

| Feature | How to start |
|---------|-------------|
| **Database** | Edit `config/app.ts` to switch dialect (postgres, mysql, d1) |
| **Auth** | Add session/JWT: `import { jwt } from "bunigniter/helpers/jwt"` |
| **WebSocket** | Create `routes/ws.ts`: `ws.handle("/chat", { message(ws, data) { ... } })` |
| **SSE** | Use `import { sse } from "bunigniter/helpers/sse"` in a handler |
| **CLI commands** | `bun run bi make:controller`, `bun run bi make:model`, etc. |
| **HMVC modules** | Create `modules/<name>/routes/` for modular apps |
| **OpenAPI docs** | Auto-generated at `/openapi` with Scalar UI |
| **Edge deployment** | `bun run bi build:edge` for Cloudflare Workers |

### Learn more

- [Bunigniter GitHub](https://github.com/nexus-ts/bunigniter) — full source, examples, docs
- **Example apps**: Slack clone, Todo app, Hacker News, Blog CMS, Pet Store

---

## License

MIT

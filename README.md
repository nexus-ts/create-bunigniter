# create-bunigniter

Scaffold a new [Bunigniter](https://github.com/nexus-ts/bunigniter) project — Bun-native fullstack framework inspired by CodeIgniter.

## Usage

```bash
# Interactive prompt
bun create bunigniter

# With project name
bun create bunigniter my-app

# Or via npx/bunx
npx create-bunigniter my-app
```

## What you get

```
my-app/
├── config/
│   └── app.ts              # Application configuration
├── routes/
│   ├── index.ts            # Home (redirects to /items)
│   ├── items.ts            # Items CRUD controller
│   ├── welcome.ts          # Welcome page
│   ├── new.ts              # New item form
│   ├── api.ts              # API handler (void-style)
│   └── schedule.ts         # Scheduled tasks demo
├── views/
│   ├── _layout.html        # Auto-layout wrapper
│   ├── welcome.html        # Welcome page template
│   ├── items.html          # Items list template
│   └── new-item.html       # New item form template
├── db/
│   └── seed.ts             # Database seeder
├── data/                   # SQLite database directory
├── dev.ts                  # Entry point
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── .gitignore              # Git ignore rules
└── .env.example            # Environment variables
```

## Quick Start

```bash
cd my-app
bun run seed          # Seed the database
bun run dev           # Start dev server (port 3000)
```

Open http://localhost:3000 in your browser.

## Features demonstrated

- **File-based routing** — routes/items.ts → `GET /items`, `POST /items`, etc.
- **Controller class** — CRUD with `this.db`, `this.validate`, `this.view()`, `this.redirect()`
- **Handler (void-style) routes** — `routes/api.ts` with `defineHandler`
- **Rendu templates** — PHP-style `<?= expr ?>` in HTML views
- **Auto-layout** — `views/_layout.html` wraps all pages via `<?= slot ?>`
- **Input validation** — `this.validate()` with CodeIgniter-style string rules
- **SQLite database** — zero-config persistence with `db/seed.ts`
- **Scheduled tasks** — `routes/schedule.ts` demo

## Requirements

- [Bun](https://bun.sh) >= 1.3.0

## License

MIT

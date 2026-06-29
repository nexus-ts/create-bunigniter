#!/usr/bin/env bun
/**
 * create-bunigniter — Scaffold a new Bunigniter project.
 *
 * Usage:
 *   bun create bunigniter <project-name>
 *   bun create bunigniter <project-name> --edge
 *   bun x create-bunigniter <project-name>
 *   npx create-bunigniter <project-name>
 *
 * If <project-name> is omitted, prompts interactively.
 *
 * Options:
 *   --edge, -e    Include Cloudflare Workers deployment files
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chdir, cwd, exit, stdout } from "node:process"

// ─── Terminal Colors ────────────────────────────────────────

const C = (s: string) => `\x1b[36m${s}\x1b[0m` // cyan
const G = (s: string) => `\x1b[32m${s}\x1b[0m` // green
const Y = (s: string) => `\x1b[33m${s}\x1b[0m` // yellow
const R = (s: string) => `\x1b[31m${s}\x1b[0m` // red
const D = (s: string) => `\x1b[90m${s}\x1b[0m` // gray

// ─── Helpers ────────────────────────────────────────────────

function prompt(query: string): Promise<string> {
	stdout.write(query)
	return new Promise((resolve) => {
		const onData = (data: Buffer) => {
			process.stdin.removeListener("data", onData)
			process.stdin.pause()
			resolve(data.toString().trim())
		}
		process.stdin.resume()
		process.stdin.on("data", onData)
	})
}

function sanitize(name: string): string {
	return name
		.replace(/\s+/g, "-")
		.replace(/[^a-zA-Z0-9\-_.]/g, "")
		.toLowerCase()
}

function checkBunVersion(): boolean {
	const version = process.versions.bun
	if (!version) return false
	const parts = version.split(".").map(Number)
	return parts[0]! >= 1 && (parts[0]! > 1 || parts[1]! >= 3)
}

async function handleArgs(): Promise<{ projectName: string | null; useEdge: boolean }> {
	const args = process.argv.slice(2)
	let useEdge = false
	const positional: string[] = []

	for (const arg of args) {
		if (arg === "--help" || arg === "-h") {
			console.log()
			console.log(`  ${C("create-bunigniter")} — Scaffold a Bunigniter project`)
			console.log()
			console.log(`  ${D("Usage:")}`)
			console.log(`    bun create bunigniter ${C("<project-name>")}`)
			console.log(`    bun create bunigniter ${C("<project-name>")} ${D("--edge")}`)
			console.log(`    bun x create-bunigniter ${C("<project-name>")}`)
			console.log(`    npx create-bunigniter ${C("<project-name>")}`)
			console.log()
			console.log(`  ${D("Options:")}`)
			console.log(`    --help, -h        Show this help message`)
			console.log(`    --version, -V     Show version`)
			console.log(`    --edge, -e        Include Cloudflare Workers deployment files`)
			console.log()
			exit(0)
		}
		if (arg === "--version" || arg === "-V") {
			try {
				const text = await Bun.file(join(import.meta.dirname, "..", "package.json")).text()
				const { version } = JSON.parse(text)
				console.log(version)
			} catch {
				console.error("unknown")
			}
			exit(0)
		}
		if (arg === "--edge" || arg === "-e") {
			useEdge = true
			continue
		}
		if (!arg.startsWith("-")) {
			positional.push(arg)
		}
	}

	return { projectName: positional[0] ?? null, useEdge }
}

// ─── Template generators ────────────────────────────────────

function pkgJson(name: string) {
	return JSON.stringify(
		{
			name,
			version: "1.0.0",
			type: "module",
			private: true,
			scripts: {
				dev: "bun --hot run dev.ts",
				start: "bun run dev.ts",
				seed: "bun run db/seed.ts",
				bi: "bun run node_modules/bunigniter/dist/cli/index.ts",
				"bi:repl": "bun run node_modules/bunigniter/dist/cli/index.ts repl",
				"cf:dev": "wrangler dev",
				"cf:deploy": "wrangler deploy",
				"cf:db:create": "wrangler d1 create ${npm_package_name}-db",
				"cf:db:init": "wrangler d1 execute ${npm_package_name}-db --file=./db/init.sql",
			},
			dependencies: {
				bunigniter: "^0.4",
				"drizzle-orm": "^0.45",
				elysia: "^2.0.0-exp.12",
				"react": "^19",
				"react-dom": "^19",
				"typebox": "1.2.16",
				zod: "^4",
			},
			devDependencies: {
				wrangler: "^4",
			},
		},
		null,
		2,
	)
}

function tsCfg() {
	return JSON.stringify(
		{
			compilerOptions: {
				target: "ES2022",
				module: "ESNext",
				moduleResolution: "Bundler",
				lib: ["ESNext", "DOM"],
				types: ["bun-types"],
				resolveJsonModule: true,
				allowImportingTsExtensions: true,
				noEmit: true,
				strict: true,
				skipLibCheck: true,
				esModuleInterop: true,
				isolatedModules: true,
				jsx: "react-jsx",
				jsxImportSource: "react",
			},
			include: [
				"config/**/*.ts",
				"routes/**/*.ts",
				"db/**/*.ts",
				"views/**/*.ts",
				"views/**/*.tsx",
				"middleware/**/*.ts",
				"modules/**/*.ts",
				"src/**/*.ts",
				"dev.ts",
			],
		},
		null,
		2,
	)
}

function gitignore() {
	return [
		"node_modules/",
		"dist/",
		"*.db",
		".env",
		".env.local",
		".bi_repl_history",
		"*.db-shm",
		"*.db-wal",
		"*.db-journal",
		".test_uploads",
		".playwright-mcp/",
		"",
		"# Cloudflare / Wrangler",
		".wrangler/",
		"worker/",
	].join("\n") + "\n"
}

function envExample() {
	return [
		"# Bunigniter Environment Configuration",
		"# Copy this file to .env and customize.",
		"",
		"PORT=3000",
		"DB_DIALECT=bun-sqlite",
		"DB_FILENAME=data/app.db",
		"APP_KEY=",
		"DEBUG=false",
		"CORS_ORIGIN=*",
		"EDGE=false",
	].join("\n") + "\n"
}

function devEntry(projectName: string) {
	return [
		`/**`,
		` * ${projectName} — Entry point.`,
		` *`,
		` * Start:   bun run dev.ts`,
		` * Hot:     bun --hot run dev.ts`,
		` */`,
		`console.log("[app] Starting...")`,
		``,
		`// Let the framework handle everything from config/app.ts`,
		`import "bunigniter"`,
		``,
	].join("\n")
}

function configApp() {
	return [
		`/**`,
		` * Application configuration — CodeIgniter-style single config file.`,
		` *`,
		` * Edit this file to change database, port, and router settings.`,
		` */`,
		`import { env } from "bunigniter/helpers/env"`,
		``,
		`export default {`,
		`\tport: Number(process.env.PORT) || env("PORT", 3000),`,
		``,
		`\tdb: {`,
		`\t\tdialect: env("DB_DIALECT", "bun-sqlite") as`,
		`\t\t\t| "bun-sqlite"`,
		`\t\t\t| "postgres"`,
		`\t\t\t| "mysql"`,
		`\t\t\t| "sqlite"`,
		`\t\t\t| "d1",`,
		`\t\tconnection: {`,
		`\t\t\tfilename: env("DB_FILENAME", "data/app.db"),`,
		`\t\t\t// D1 binding — used when dialect is "d1" (Cloudflare Workers)`,
		`\t\t\t// binding: process.env.DB,`,
		`\t\t},`,
		`\t},`,
		``,
		`\t// Edge/Cloudflare config — used by src/worker.ts`,
		`\tedge: {`,
		`\t\tenabled: env("EDGE", "false") as unknown as boolean,`,
		`\t\td1Binding: "DB",`,
		`\t},`,
		``,
		`\trouter: {`,
		`\t\tprefix: env("ROUTER_PREFIX", ""),`,
		`\t\tdirectory: "routes",`,
		`\t},`,
		``,
		`\tview: {`,
		`\t\tdirectory: "views",`,
		`\t},`,
		``,
		`\tapp: {`,
		`\t\tkey: env("APP_KEY", ""),`,
		`\t\tdebug: env("DEBUG", false) as unknown as boolean,`,
		`\t},`,
		``,
		`\tmiddleware: {`,
		`\t\tcors: {`,
		`\t\t\torigin: env("CORS_ORIGIN", "*"),`,
		`\t\t\tcredentials: true,`,
		`\t\t},`,
		`\t\tlogger: {`,
		`\t\t\tenabled: env("DEBUG", false) as unknown as boolean,`,
		`\t\t\tshowQuery: true,`,
		`\t\t},`,
		`\t\tcsrf: {`,
		`\t\t\tsecret: env("APP_KEY", ""),`,
		`\t\t},`,
		`\t\tthrottle: {`,
		`\t\t\tmax: 100,`,
		`\t\t\twindow: 60000,`,
		`\t\t},`,
		`\t},`,
		`}`,
		``,
	].join("\n")
}

function seedScript() {
	return [
		`/**`,
		` * Database seed — creates tables and sample data.`,
		` *`,
		` * Run: bun run db/seed.ts`,
		` */`,
		`import { Database } from "bun:sqlite"`,
		`import { join } from "node:path"`,
		`import { mkdirSync, existsSync } from "node:fs"`,
		``,
		`const DATA_DIR = join(import.meta.dirname, "..", "data")`,
		`if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })`,
		``,
		`const dbPath = join(DATA_DIR, "app.db")`,
		`const db = new Database(dbPath)`,
		``,
		`db.run("PRAGMA journal_mode=WAL")`,
		``,
		"db.run(`",
		"  CREATE TABLE IF NOT EXISTS items (",
		"    id INTEGER PRIMARY KEY AUTOINCREMENT,",
		'    title TEXT NOT NULL,',
		"    content TEXT DEFAULT '',",
		"    created_at TEXT NOT NULL DEFAULT (datetime('now')),",
		"    updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
		"  )",
		'`)',
		``,
		`const existing = db.query("SELECT count(*) as count FROM items").get() as any`,
		`if (existing.count === 0) {`,
		`\tdb.run("INSERT INTO items (title, content) VALUES ('Welcome to Bunigniter', 'Your first item!')")`,
		`\tdb.run("INSERT INTO items (title, content) VALUES ('Build something great', 'Fullstack apps with Bun')")`,
		`\tdb.run("INSERT INTO items (title, content) VALUES ('Deploy to production', 'Edge-ready framework')")`,
		`\tconsole.log("[seed] 3 items created")`,
		"} else {",
		"\tconsole.log(`[seed] ${existing.count} items already exist`)",
		"}",
		``,
		`console.log("[seed] done")`,
		`db.close()`,
		``,
	].join("\n")
}

function routeIndex() {
	return [
		`/**`,
		` * Home — redirects to the items list.`,
		` */`,
		`import { Controller } from "bunigniter"`,
		``,
		`export class Home extends Controller {`,
		`\tasync index() {`,
		`\t\treturn this.redirect("/items")`,
		`\t}`,
		`}`,
		``,
	].join("\n")
}

function routeWelcome() {
	return [
		`/**`,
		` * Welcome page — Rendu template demo.`,
		` * Shows static demo if DB not seeded, live data after seed.`,
		` */`,
		`import { Controller } from "bunigniter"`,
		``,
		`const DEMO = [`,
		`\t{ id: 1, title: "Welcome to Bunigniter", content: "Edit routes/welcome.ts", created_at: "2026-01-01" },`,
		`\t{ id: 2, title: "File-based routing", content: "routes/items.ts -> /items", created_at: "2026-01-02" },`,
		`\t{ id: 3, title: "Rendu templates", content: "PHP-style in views/", created_at: "2026-01-03" },`,
		`]`,
		``,
		`export class Welcome extends Controller {`,
		`\tasync index() {`,
		`\t\tlet items = DEMO`,
		`\t\ttry {`,
		`\t\t\tconst r = await this.db.query("SELECT count(*) as c FROM items")`,
		`\t\t\tif (Number(r.rows[0]?.c) > 0) {`,
		`\t\t\t\tconst result = await this.db.query("SELECT * FROM items LIMIT 100")`,
		`\t\t\t\titems = result.rows as any[]`,
		`\t\t\t}`,
		`\t\t} catch {}`,
		``,
		`\t\treturn this.view("welcome", {`,
		`\t\t\ttitle: "Welcome to Bunigniter",`,
		`\t\t\titems,`,
		`\t\t})`,
		`\t}`,
		`}`,
		``,
	].join("\n")
}

function routeItems() {
	return [
		`/**`,
		` * Items Controller — full CRUD example.`,
		` *`,
		` * Routes:`,
		` *   GET    /          -> List items (HTML or JSON)`,
		` *   POST   /          -> Create item`,
		` *   PUT    /:id       -> Update item`,
		` *   DELETE /:id       -> Delete item`,
		` */`,
		`import { Controller } from "bunigniter"`,
		``,
		`interface Item {`,
		`\tid: number`,
		`\ttitle: string`,
		`\tcontent: string`,
		`\tcreated_at: string`,
		`\tupdated_at: string`,
		`}`,
		``,
		`const DEMO_ITEMS = [`,
		`\t{ id: 1, title: "Learn Bunigniter", content: "Start with the welcome page", created_at: "2026-01-01" },`,
		`\t{ id: 2, title: "Build an app", content: "Edit routes/ and views/", created_at: "2026-01-02" },`,
		`\t{ id: 3, title: "Deploy", content: "Run bi build:edge for Workers", created_at: "2026-01-03" },`,
		`]`,
		`export class Items extends Controller {`,
		`\t/**`,
		`\t * GET / - List all items. Shows demo data if DB not seeded, live data after \`bun run seed\`.`,
		`\t */`,
		`\tasync index() {`,
		`\t\tlet items = DEMO_ITEMS`,
		`\t\ttry {`,
		`\t\t\tconst r = await this.db.query<Item>("SELECT * FROM items ORDER BY created_at DESC")`,
		`\t\t\tif (r.rows && r.rows.length > 0) items = r.rows`,
		`\t\t} catch {}`,
		``,
		`\t\treturn this.view("items", {`,
		`\t\t\ttitle: "Items",`,
		`\t\t\titems,`,
		`\t\t\ttotal: items.length,`,
		`\t\t})`,
		`\t}`,
		``,
		`\t/**`,
		`\t * GET /:id - Show a single item.`,
		`\t */`,
		`\tasync show(id: number) {`,
		`\t\tconst item = await this.db.first<Item>(`,
		`\t\t\t"SELECT * FROM items WHERE id = ?",`,
		`\t\t\t[id],`,
		`\t\t)`,
		`\t\tif (!item) return this.notFound("Item not found")`,
		`\t\treturn this.json(item)`,
		`\t}`,
		``,
		`\t/**`,
		`\t * POST / - Create a new item.`,
		`\t */`,
		`\tasync create() {`,
		`\t\tconst v = this.validate(this.body, {`,
		`\t\t\ttitle: "required|min:1|max:500",`,
		`\t\t})`,
		`\t\tif (v.fails()) return this.badRequest(v.errors)`,
		``,
		`\t\tconst content = this.request.post("content") ?? ""`,
		``,
		`\t\tawait this.db.query(`,
		`\t\t\t"INSERT INTO items (title, content) VALUES (?, ?)",`,
		`\t\t\t[v.data.title.trim(), content],`,
		`\t\t)`,
		``,
		`\t\treturn this.redirect("/items")`,
		`\t}`,
		``,
		`\t/**`,
		`\t * PUT /:id - Update an item.`,
		`\t */`,
		`\tasync update(id: number) {`,
		`\t\tconst existing = await this.db.first<Item>(`,
		`\t\t\t"SELECT * FROM items WHERE id = ?",`,
		`\t\t\t[id],`,
		`\t\t)`,
		`\t\tif (!existing) return this.notFound("Item not found")`,
		``,
		`\t\tconst body = this.body`,
		`\t\tconst updates: string[] = []`,
		`\t\tconst params: unknown[] = []`,
		``,
		`\t\tif (body.title !== undefined) {`,
		`\t\t\tif (typeof body.title !== "string" || body.title.trim().length === 0) {`,
		`\t\t\t\treturn this.badRequest({ title: ["Title cannot be empty"] })`,
		`\t\t\t}`,
		`\t\t\tupdates.push("title = ?")`,
		`\t\t\tparams.push(body.title.trim())`,
		`\t\t}`,
		``,
		`\t\tif (body.content !== undefined) {`,
		`\t\t\tupdates.push("content = ?")`,
		`\t\t\tparams.push(body.content)`,
		`\t\t}`,
		``,
		`\t\tif (updates.length === 0) {`,
		`\t\t\treturn this.badRequest({ _: ["No fields to update"] })`,
		`\t\t}`,
		``,
		`\t\tupdates.push("updated_at = datetime('now')")`,
		`\t\tparams.push(id)`,
		``,
		`\t\tconst sql = \`UPDATE items SET \${updates.join(", ")} WHERE id = ?\``,
		`\t\tawait this.db.query(sql, params)`,
		``,
		`\t\treturn this.redirect("/items")`,
		`\t}`,
		``,
		`\t/**`,
		`\t * DELETE /:id - Delete an item.`,
		`\t */`,
		`\tasync destroy(id: number) {`,
		`\t\tconst existing = await this.db.first<Item>(`,
		`\t\t\t"SELECT * FROM items WHERE id = ?",`,
		`\t\t\t[id],`,
		`\t\t)`,
		`\t\tif (!existing) return this.notFound("Item not found")`,
		``,
		`\t\tawait this.db.query("DELETE FROM items WHERE id = ?", [id])`,
		`\t\treturn this.redirect("/items")`,
		`\t}`,
		`}`,
		``,
	].join("\n")
}

function routeNewItem() {
	return [
		`/**`,
		` * New Item — Rendu form template.`,
		` *`,
		` * GET /items/new -> renders views/new-item.html`,
		` */`,
		`import { Controller } from "bunigniter"`,
		``,
		`export class NewItem extends Controller {`,
		`\tasync index() {`,
		`\t\treturn this.view("new-item", {`,
		`\t\t\ttitle: "New Item",`,
		`\t\t})`,
		`\t}`,
		`}`,
		``,
	].join("\n")
}

function routeApi() {
	return [
		`/**`,
		` * API Example — handler-style routes (void-style).`,
		` *`,
		` * Routes at: GET /api, POST /api`,
		` */`,
		`import { defineHandler } from "bunigniter"`,
		`import { z } from "zod"`,
		``,
		`/**`,
		` * GET /api - Simple greeting.`,
		` */`,
		`export const GET = defineHandler(async () => ({`,
		`\tmessage: "Hello from Bunigniter!",`,
		`\ttimestamp: new Date().toISOString(),`,
		`}))`,
		``,
		`/**`,
		` * POST /api - Echo back the request body (validated).`,
		` */`,
		`export const POST = defineHandler.withValidator({`,
		`\tbody: z.object({`,
		`\t\tname: z.string().min(1).max(100),`,
		`\t\tage: z.number().int().positive().optional(),`,
		`\t}),`,
		`})(async (_, { body }) => ({`,
		`\treceived: { ...body, upperName: body.name.toUpperCase() },`,
		`}))`,
		``,
	].join("\n")
}

function routeSchedule() {
	return [
		`/**`,
		` * Scheduled tasks example.`,
		` *`,
		` * GET /schedule - Shows or triggers scheduled tasks.`,
		` */`,
		`import { Controller } from "bunigniter"`,
		`import { schedule } from "bunigniter/helpers/schedule"`,
		``,
		`export class Schedule extends Controller {`,
		`\tasync index() {`,
		`\t\t// Schedule a task that runs every 10 seconds`,
		`\t\tschedule.every(10000, "demo-task").do(async () => {`,
		`\t\t\tconsole.log("[schedule] Task executed at", new Date().toISOString())`,
		`\t\t})`,
		``,
		`\t\treturn this.json({`,
		`\t\t\tmessage: "Scheduled a task that runs every 10 seconds. Check your console.",`,
		`\t\t\tscheduledAt: new Date().toISOString(),`,
		`\t\t})`,
		`\t}`,
		`}`,
		``,
	].join("\n")
}

function layoutHtml() {
	return [
		`<!DOCTYPE html>`,
		`<html lang="en">`,
		`<head>`,
		`  <meta charset="UTF-8">`,
		`  <meta name="viewport" content="width=device-width, initial-scale=1.0">`,
		`  <title><?= title ?? "Bunigniter" ?></title>`,
		`  <style>`,
		`    * { margin: 0; padding: 0; box-sizing: border-box; }`,
		`    body {`,
		`      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`,
		`      background: #0f0f23;`,
		`      color: #e0e0e0;`,
		`      min-height: 100vh;`,
		`    }`,
		`    .container { max-width: 780px; margin: 0 auto; padding: 40px 20px; }`,
		`    .nav {`,
		`      display: flex;`,
		`      gap: 16px;`,
		`      margin-bottom: 32px;`,
		`      padding-bottom: 16px;`,
		`      border-bottom: 1px solid #333;`,
		`      align-items: center;`,
		`    }`,
		`    .nav a { color: #70a1ff; text-decoration: none; font-size: 14px; }`,
		`    .nav a:hover { color: #e94560; }`,
		`    .nav .brand { color: #e94560; font-weight: bold; font-size: 18px; margin-right: auto; }`,
		`    .footer {`,
		`      margin-top: 40px;`,
		`      padding-top: 20px;`,
		`      border-top: 1px solid #333;`,
		`      text-align: center;`,
		`      color: #666;`,
		`      font-size: 12px;`,
		`    }`,
		`    h1 { color: #e94560; margin-bottom: 16px; }`,
		`    .card {`,
		`      background: #1a1a3e;`,
		`      border-radius: 8px;`,
		`      padding: 16px 20px;`,
		`      margin-bottom: 12px;`,
		`    }`,
		`    .card:hover { background: #2a2a5e; }`,
		`    .btn {`,
		`      display: inline-block;`,
		`      padding: 8px 18px;`,
		`      border-radius: 6px;`,
		`      text-decoration: none;`,
		`      font-size: 14px;`,
		`      border: none;`,
		`      cursor: pointer;`,
		`    }`,
		`    .btn-primary { background: #e94560; color: #fff; }`,
		`    .btn-secondary { background: #1a1a3e; color: #70a1ff; border: 1px solid #333; }`,
		`    input[type="text"], textarea {`,
		`      width: 100%;`,
		`      padding: 10px 14px;`,
		`      border-radius: 8px;`,
		`      border: 1px solid #333;`,
		`      background: #1a1a3e;`,
		`      color: #fff;`,
		`      font-size: 14px;`,
		`      margin-bottom: 12px;`,
		`    }`,
		`    textarea { min-height: 100px; resize: vertical; }`,
		`    label { display: block; color: #aaa; font-size: 13px; margin-bottom: 4px; }`,
		`  </style>`,
		`</head>`,
		`<body>`,
		`  <div class="container">`,
		`    <nav class="nav">`,
		`      <span class="brand">🚀 Bunigniter</span>`,
		`      <a href="/">Home</a>`,
		`      <a href="/items">Items</a>`,
		`      <a href="/api">API</a>`,
		`    </nav>`,
		`    <main>`,
		`      <?= slot ?>`,
		`    </main>`,
		`    <div class="footer">`,
		`      <p>Powered by Bun + Elysia + Bunigniter | MIT License</p>`,
		`    </div>`,
		`  </div>`,
		`</body>`,
		`</html>`,
		``,
	].join("\n")
}

function welcomeView() {
	return [
		`<div style="text-align: center; padding: 40px 0;">`,
		`  <h1 style="font-size: 48px; margin-bottom: 16px;">🚀 Bunigniter</h1>`,
		`  <p style="font-size: 18px; color: #888; margin-bottom: 24px;">`,
		`    Your new project is ready!`,
		`  </p>`,
		`  <p style="color: #aaa; margin-bottom: 8px;">`,
		`    This page uses <strong>Rendu</strong> &mdash; PHP-style templates.`,
		`  </p>`,
		`  <p style="color: #aaa; margin-bottom: 32px;">`,
		`    Try editing <code>routes/welcome.ts</code> or <code>views/welcome.html</code>.`,
		`  </p>`,
		``,
		`  <? if (items !== null && items !== undefined) { ?>`,
		`    <div style="display: inline-block; background: #1a1a3e; border-radius: 8px; padding: 20px 40px; margin-bottom: 24px;">`,
		`      <p style="font-size: 36px; font-weight: bold; color: #70a1ff;"><?= items.length ?></p>`,
		`      <p style="color: #888;">items in database</p>`,
		`    </div>`,
		`  <? } ?>`,
		``,
		`  <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">`,
		`    <a href="/items" class="btn btn-primary">📋 View Items</a>`,
		`    <a href="/api" class="btn btn-secondary">🔌 API Demo</a>`,
		`  </div>`,
		``,
		`  <div style="margin-top: 40px; color: #555; font-size: 13px; line-height: 1.8;">`,
		`    <p>⚡ Quick commands:</p>`,
		`    <p><code>bun run dev</code> — Start dev server</p>`,
		`    <p><code>bun run seed</code> — Seed database</p>`,
		`    <p><code>bun run bi repl</code> — Interactive REPL</p>`,
		`  </div>`,
		`</div>`,
  ].join("\n")
}

function itemsView() {
  return [
    `<div>`,
    `  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">`,
    `    <h1>📋 Items (<?= total ?? 0 ?>)</h1>`,
    `    <a href="/items/new" class="btn btn-primary">+ New Item</a>`,
    `  </div>`,
    ``,
    `  <? if (items && items.length > 0) { ?>`,
    `    <? for (const item of items) { ?>`,
    `      <div class="card">`,
    `        <div style="display: flex; justify-content: space-between; align-items: flex-start;">`,
    `          <div>`,
    `            <h3 style="color: #fff; margin-bottom: 4px;"><?= item.title ?></h3>`,
    `            <? if (item.content) { ?>`,
    `              <p style="color: #888; font-size: 13px;"><?= item.content ?></p>`,
    `            <? } ?>`,
    `            <p style="color: #555; font-size: 11px; margin-top: 4px;">`,
    `              Created: <?= item.created_at ?>`,
    `            </p>`,
    `          </div>`,
    `          <form action="/items/<?= item.id ?>" method="POST" style="display: inline;">`,
    `            <input type="hidden" name="_method" value="DELETE" />`,
    `            <button type="submit" style="background: none; border: none; color: #666; cursor: pointer; font-size: 18px;">✕</button>`,
    `          </form>`,
    `        </div>`,
    `      </div>`,
    `    <? } ?>`,
    `  <? } else { ?>`,
    `    <div style="text-align: center; padding: 60px 0; color: #666;">`,
    `      <p style="font-size: 48px; margin-bottom: 16px;">📭</p>`,
    `      <p>No items yet. Create your first one!</p>`,
    `      <p style="margin-top: 16px;">`,
    `        <a href="/items/new" class="btn btn-primary">+ Create Item</a>`,
    `      </p>`,
    `      <p style="margin-top: 24px; font-size: 12px;">`,
    `        Or run <code>bun run seed</code> to seed sample data.`,
    `      </p>`,
    `    </div>`,
    `  <? } ?>`,
    `</div>`,
    ``,
  ].join("\n")
}

function newItemView() {
  return [
    `<div>`,
    `  <h1>✏️ New Item</h1>`,
    `  <p style="color: #888; margin-bottom: 24px;">Fill in the form below to create a new item.</p>`,
    ``,
    `  <form action="/items" method="POST" style="max-width: 500px;">`,
    `    <div>`,
    `      <label for="title">Title *</label>`,
    `      <input type="text" name="title" id="title" placeholder="What's this item about?" required />`,
    `    </div>`,
    `    <div>`,
    `      <label for="content">Content</label>`,
    `      <textarea name="content" id="content" placeholder="Optional description..."></textarea>`,
    `    </div>`,
    `    <div style="display: flex; gap: 12px;">`,
    `      <button type="submit" class="btn btn-primary">Save</button>`,
    `      <a href="/items" class="btn btn-secondary">Cancel</a>`,
    `    </div>`,
    `  </form>`,
    `</div>`,
    ``,
  ].join("\n")
}

// ─── Cloudflare Workers template generators ─────────────────

function wranglerToml(projectName: string) {
  return [
    `# Cloudflare Workers configuration`,
    `# https://developers.cloudflare.com/workers/wrangler/configuration/`,
    ``,
    `name = "${projectName}"`,
    `main = "src/worker.ts"`,
    `compatibility_date = "2026-06-01"`,
    `compatibility_flags = ["nodejs_compat"]`,
    ``,
    `# D1 Database binding`,
    `[[d1_databases]]`,
    `binding = "DB"`,
    `database_name = "${projectName}-db"`,
    `database_id = ""`,
    `preview_database_id = ""`,
    ``,
    `# Environment variables`,
    `[vars]`,
    `DEBUG = "false"`,
    `CORS_ORIGIN = "*"`,
    `ROUTER_PREFIX = ""`,
    ``,
    `# Logging`,
    `[observability]`,
    `enabled = true`,
  ].join("\n") + "\n"
}

function workerEntry() {
  return [
    `/**`,
    ` * Cloudflare Worker entry point — Edge deployment.`,
    ` *`,
    ` * Uses Elysia directly (edge-compatible, no node:fs dependency).`,
    ` * Database uses D1 binding via Cloudflare's D1.`,
    ` * Views are rendered inline (pre-compiled, no filesystem).`,
    ` *`,
    ` * Setup:`,
    ` *   1. wrangler d1 create <project-name>-db`,
    ` *   2. Update wrangler.toml with the database_id`,
    ` *   3. wrangler deploy`,
    ` *`,
    ` * Dev:`,
    ` *   wrangler dev`,
    ` */`,
    `import { Elysia } from "elysia"`,
    ``,
    `// ─── Cloudflare Workers types (inline) ───────────────────`,
    ``,
    `declare class D1Database {`,
    `  prepare(sql: string): D1PreparedStatement`,
    `}`,
    `declare class D1PreparedStatement {`,
    `  bind(...params: unknown[]): D1PreparedStatement`,
    `  run(): Promise<D1Result>`,
    `}`,
    `interface D1Result {`,
    `  results?: any[]`,
    `  meta?: { changes?: number; last_row_id?: number }`,
    `}`,
    ``,
    `interface Env {`,
    `  DB: D1Database`,
    `  CORS_ORIGIN?: string`,
    `}`,
    ``,
    `// ─── Database helpers ───────────────────────────────────`,
    ``,
    `async function query<T = any>(db: D1Database, sql: string, params: unknown[] = []): Promise<{ rows: T[]; affectedRows: number }> {`,
    `  const stmt = db.prepare(sql)`,
    `  if (params.length > 0) stmt.bind(...params)`,
    `  const result = await stmt.run()`,
    `  return { rows: (result as any)?.results ?? [], affectedRows: result.meta?.changes ?? 0 }`,
    `}`,
    ``,
    `async function first<T = any>(db: D1Database, sql: string, params: unknown[] = []): Promise<T | null> {`,
    `  const r = await query<T>(db, sql, params)`,
    `  return r.rows[0] ?? null`,
    `}`,
    ``,
    `// ─── Response helpers ───────────────────────────────────`,
    ``,
    `function json(data: unknown, status = 200): Response {`,
    `  return new Response(JSON.stringify(data), {`,
    `    status,`,
    `    headers: { "content-type": "application/json" },`,
    `  })`,
    `}`,
    ``,
    `function redirect(url: string, status: 301 | 302 = 302): Response {`,
    `  return new Response(null, { status, headers: { location: url } })`,
    `}`,
    ``,
    `function escapeHtml(s: unknown): string {`,
    `  return String(s ?? "")`,
    `    .replace(/&/g, "&amp;")`,
    `    .replace(/</g, "&lt;")`,
    `    .replace(/>/g, "&gt;")`,
    `    .replace(/"/g, "&quot;")`,
    `    .replace(/'/g, "&#39;")`,
    `}`,
    ``,
    `// ─── App entry ─────────────────────────────────────────`,
    ``,
    `export default {`,
    `  async fetch(request: Request, env: Env): Promise<Response> {`,
    `    // CORS preflight`,
    `    if (request.method === "OPTIONS") {`,
    `      return new Response(null, {`,
    `        headers: {`,
    `          "Access-Control-Allow-Origin": env.CORS_ORIGIN ?? "*",`,
    `          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",`,
    `          "Access-Control-Allow-Headers": "Content-Type, Authorization",`,
    `        },`,
    `      })`,
    `    }`,
    ``,
    `    const app = new Elysia()`,
    ``,
    `    // GET / — Welcome`,
    `    app.get("/", async () => {`,
    `      let items = [`,
    `        { id: 1, title: "Welcome to Bunigniter", content: "Edit the worker", created_at: "2026-01-01" },`,
    `        { id: 2, title: "Edge-ready", content: "Running on Cloudflare Workers", created_at: "2026-01-02" },`,
    `        { id: 3, title: "D1 Database", content: "SQLite-compatible serverless DB", created_at: "2026-01-03" },`,
    `      ]`,
    `      try {`,
    `        const r = await query<{ c: number }>(env.DB, "SELECT count(*) as c FROM items")`,
    `        if (Number(r.rows[0]?.c) > 0) {`,
    `          const result = await query(env.DB, "SELECT * FROM items LIMIT 100")`,
    `          items = result.rows`,
    `        }`,
    `      } catch { /* DB not seeded yet — use demo */ }`,
    `      return renderPage("welcome", { title: "Welcome", items })`,
    `    })`,
    ``,
    `    // GET /items — List`,
    `    app.get("/items", async () => {`,
    `      let items: any[] = [`,
    `        { id: 1, title: "Sample Item", content: "Demo data", created_at: "2026-01-01" },`,
    `      ]`,
    `      try {`,
    `        const r = await query(env.DB, "SELECT * FROM items ORDER BY created_at DESC")`,
    `        if (r.rows.length > 0) items = r.rows`,
    `      } catch { /* DB not seeded */ }`,
    `      return renderPage("items", { title: "Items", items, total: items.length })`,
    `    })`,
    ``,
    `    // GET /items/new — Create form`,
    `    app.get("/items/new", () => renderPage("new-item", { title: "New Item" }))`,
    ``,
    `    // POST /items — Create`,
    `    app.post("/items", async (ctx) => {`,
    `      const body = ctx.body as Record<string, any>`,
    `      const title = body?.title?.trim()`,
    `      if (!title) return json({ error: "Title is required" }, 400)`,
    `      await query(env.DB, "INSERT INTO items (title, content) VALUES (?, ?)", [title, body?.content ?? ""])`,
    `      return redirect("/items")`,
    `    })`,
    ``,
    `    // PUT /items/:id — Update`,
    `    app.put("/items/:id", async (ctx) => {`,
    `      const id = Number(ctx.params?.id)`,
    `      if (!id) return json({ error: "Invalid ID" }, 400)`,
    `      const existing = await first<{ id: number }>(env.DB, "SELECT id FROM items WHERE id = ?", [id])`,
    `      if (!existing) return new Response("Not Found", { status: 404 })`,
    `      const body = ctx.body as Record<string, any>`,
    `      const updates: string[] = []; const params: unknown[] = []`,
    `      if (body.title !== undefined) { updates.push("title = ?"); params.push(body.title.trim()) }`,
    `      if (body.content !== undefined) { updates.push("content = ?"); params.push(body.content) }`,
    `      if (updates.length === 0) return redirect("/items")`,
    `      updates.push("updated_at = datetime('now')"); params.push(id)`,
    `      await query(env.DB, \`UPDATE items SET \${updates.join(", ")} WHERE id = ?\`, params)`,
    `      return redirect("/items")`,
    `    })`,
    ``,
    `    // DELETE /items/:id — Delete`,
    `    app.delete("/items/:id", async (ctx) => {`,
    `      const id = Number(ctx.params?.id)`,
    `      if (!id) return json({ error: "Invalid ID" }, 400)`,
    `      await query(env.DB, "DELETE FROM items WHERE id = ?", [id])`,
    `      return redirect("/items")`,
    `    })`,
    ``,
    `    // POST /items/:id — _method override`,
    `    app.post("/items/:id", async (ctx) => {`,
    `      const m = (ctx.body as any)?._method?.toUpperCase()`,
    `      if (m === "PUT") return await app.fetch(new Request(ctx.request, { method: "PUT", body: ctx.request.body }))`,
    `      if (m === "DELETE") return await app.fetch(new Request(ctx.request, { method: "DELETE" }))`,
    `      return new Response("Method Not Allowed", { status: 405 })`,
    `    })`,
    ``,
    `    // GET /api — Greeting`,
    `    app.get("/api", () => json({ message: "Hello from Bunigniter on Cloudflare!", timestamp: new Date().toISOString() }))`,
    ``,
    `    // POST /api — Echo`,
    `    app.post("/api", async (ctx) => {`,
    `      const body = ctx.body as Record<string, any>`,
    `      if (!body?.name || typeof body.name !== "string" || body.name.length < 1 || body.name.length > 100) {`,
    `        return json({ error: "name is required (1-100 chars)" }, 400)`,
    `      }`,
    `      return json({ received: { ...body, upperName: body.name.toUpperCase() } })`,
    `    })`,
    ``,
    `    // GET /health`,
    `    app.get("/health", () => json({ status: "ok", runtime: "cloudflare", timestamp: new Date().toISOString() }))`,
    ``,
    `    return app.fetch(request)`,
    `  },`,
    `}`,
    ``,
    `// ─── Inline HTML rendering ──────────────────────────────`,
    ``,
    `const LAYOUT = \`<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8">`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    `  <title>{{TITLE}}</title>`,
    `  <style>`,
    `    * { margin: 0; padding: 0; box-sizing: border-box; }`,
    `    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f0f23; color: #e0e0e0; min-height: 100vh; }`,
    `    .container { max-width: 780px; margin: 0 auto; padding: 40px 20px; }`,
    `    .nav { display: flex; gap: 16px; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid #333; align-items: center; }`,
    `    .nav a { color: #70a1ff; text-decoration: none; font-size: 14px; }`,
    `    .nav a:hover { color: #e94560; }`,
    `    .nav .brand { color: #e94560; font-weight: bold; font-size: 18px; margin-right: auto; }`,
    `    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; text-align: center; color: #666; font-size: 12px; }`,
    `    h1 { color: #e94560; margin-bottom: 16px; }`,
    `    .card { background: #1a1a3e; border-radius: 8px; padding: 16px 20px; margin-bottom: 12px; }`,
    `    .card:hover { background: #2a2a5e; }`,
    `    .btn { display: inline-block; padding: 8px 18px; border-radius: 6px; text-decoration: none; font-size: 14px; border: none; cursor: pointer; }`,
    `    .btn-primary { background: #e94560; color: #fff; }`,
    `    .btn-secondary { background: #1a1a3e; color: #70a1ff; border: 1px solid #333; }`,
    `    input[type="text"], textarea { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #333; background: #1a1a3e; color: #fff; font-size: 14px; margin-bottom: 12px; }`,
    `    textarea { min-height: 100px; resize: vertical; }`,
    `    label { display: block; color: #aaa; font-size: 13px; margin-bottom: 4px; }`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="container">`,
    `    <nav class="nav">`,
    `      <span class="brand">🚀 Bunigniter</span>`,
    `      <a href="/">Home</a>`,
    `      <a href="/items">Items</a>`,
    `      <a href="/api">API</a>`,
    `    </nav>`,
    `    <main>`,
    `{{SLOT}}`,
    `    </main>`,
    `    <div class="footer">`,
    `      <p>Powered by Bunigniter + Cloudflare Workers | MIT License</p>`,
    `    </div>`,
    `  </div>`,
    `</body>`,
    `</html>\``,
    ``,
    `function wrap(title: string, content: string): string {`,
    `  return LAYOUT.replace("{{TITLE}}", escapeHtml(title)).replace("{{SLOT}}", content)`,
    `}`,
    ``,
    `function renderPage(view: string, props: Record<string, any>): Response {`,
    `  const t = (props.title as string) ?? "Bunigniter"`,
    `  const items = props.items as any[] | undefined`,
    `  let content = ""`,
    `  if (view === "welcome") {`,
    `    content = items !== undefined`,
    `      ? \`<div style="text-align:center;padding:40px 0"><h1 style="font-size:48px;margin-bottom:16px;">🚀 Bunigniter</h1><p style="font-size:18px;color:#888;margin-bottom:24px;">Deployed on Cloudflare Workers!</p><div style="display:inline-block;background:#1a1a3e;border-radius:8px;padding:20px 40px;margin-bottom:24px"><p style="font-size:36px;font-weight:bold;color:#70a1ff">\${items.length}</p><p style="color:#888;">items</p></div><div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap"><a href="/items" class="btn btn-primary">📋 View Items</a><a href="/api" class="btn btn-secondary">🔌 API Demo</a></div></div>\``,
    `      : \`<div style="text-align:center;padding:40px 0"><h1 style="font-size:48px;margin-bottom:16px;">🚀 Bunigniter</h1><p style="font-size:18px;color:#888;margin-bottom:24px;">Deployed on Cloudflare Workers!</p><a href="/items" class="btn btn-primary">📋 View Items</a></div>\``,
    `  } else if (view === "items") {`,
    `    const cards = (items?.length ?? 0) > 0`,
    `      ? items!.map((i: any) => \`<div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h3 style="color:#fff;margin-bottom:4px">\${escapeHtml(i.title)}</h3>\${i.content ? \`<p style="color:#888;font-size:13px">\${escapeHtml(i.content)}</p>\` : ""}<p style="color:#555;font-size:11px;margin-top:4px">Created: \${escapeHtml(i.created_at)}</p></div><form action="/items/\${i.id}" method="POST" style="display:inline"><input type="hidden" name="_method" value="DELETE"/><button type="submit" style="background:none;border:none;color:#666;cursor:pointer;font-size:18px">✕</button></form></div></div>\`).join("\\n")`,
    `      : \`<div style="text-align:center;padding:60px 0;color:#666"><p style="font-size:48px;margin-bottom:16px">📭</p><p>No items yet.</p></div>\``,
    `    content = \`<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px"><h1>📋 Items (\${props.total ?? items?.length ?? 0})</h1><a href="/items/new" class="btn btn-primary">+ New Item</a></div>\${cards}</div>\``,
    `  } else if (view === "new-item") {`,
    `    content = \`<div><h1>✏️ New Item</h1><p style="color:#888;margin-bottom:24px">Fill in the form below.</p><form action="/items" method="POST" style="max-width:500px"><div><label for="title">Title *</label><input type="text" name="title" id="title" placeholder="What's this about?" required/></div><div><label for="content">Content</label><textarea name="content" id="content" placeholder="Optional description..."></textarea></div><div style="display:flex;gap:12px"><button type="submit" class="btn btn-primary">Save</button><a href="/items" class="btn btn-secondary">Cancel</a></div></form></div>\``,
    `  }`,
    `  return new Response(wrap(t, content), { headers: { "content-type": "text/html; charset=utf-8" } })`,
    `}`,
    ``,
  ].join("\n")
}

function initSql() {
  return [
    `-- D1 Database initialization script`,
    `-- Run: wrangler d1 execute <project-name>-db --file=./db/init.sql`,
    ``,
    `CREATE TABLE IF NOT EXISTS items (`,
    `    id INTEGER PRIMARY KEY AUTOINCREMENT,`,
    `    title TEXT NOT NULL,`,
    `    content TEXT DEFAULT '',`,
    `    created_at TEXT NOT NULL DEFAULT (datetime('now')),`,
    `    updated_at TEXT NOT NULL DEFAULT (datetime('now'))`,
    `);`,
    ``,
    `INSERT INTO items (title, content) VALUES ('Welcome to Bunigniter', 'Deployed on Cloudflare Workers!');`,
    `INSERT INTO items (title, content) VALUES ('Edge-ready', 'Running on Cloudflare Workers via D1');`,
    `INSERT INTO items (title, content) VALUES ('D1 Database', 'SQLite-compatible serverless database');`,
  ].join("\n") + "\n"
}

// ─── Scaffold ───────────────────────────────────────────────

function scaffold(dir: string, projectName: string, useEdge: boolean) {
  const subdirs = ["config", "routes", "routes/items", "views", "db", "data"]
  if (useEdge) subdirs.push("src")
  for (const sub of subdirs) {
    mkdirSync(join(dir, sub), { recursive: true })
  }

  // Root files
  writeFileSync(join(dir, "package.json"), pkgJson(projectName))
  writeFileSync(join(dir, "tsconfig.json"), tsCfg())
  writeFileSync(join(dir, ".gitignore"), gitignore())
  writeFileSync(join(dir, ".env.example"), envExample())
  writeFileSync(join(dir, "dev.ts"), devEntry(projectName))

  // Config
  writeFileSync(join(dir, "config", "app.ts"), configApp())

  // Database
  writeFileSync(join(dir, "db", "seed.ts"), seedScript())

  // Routes
  writeFileSync(join(dir, "routes", "index.ts"), routeIndex())
  writeFileSync(join(dir, "routes", "welcome.ts"), routeWelcome())
  writeFileSync(join(dir, "routes", "items.ts"), routeItems())
  writeFileSync(join(dir, "routes", "items", "new.ts"), routeNewItem())
  writeFileSync(join(dir, "routes", "api.ts"), routeApi())
  writeFileSync(join(dir, "routes", "schedule.ts"), routeSchedule())

  // Views
  writeFileSync(join(dir, "views", "_layout.html"), layoutHtml())
  writeFileSync(join(dir, "views", "welcome.html"), welcomeView())
  writeFileSync(join(dir, "views", "items.html"), itemsView())
  writeFileSync(join(dir, "views", "new-item.html"), newItemView())

  // Cloudflare Workers files (optional)
  if (useEdge) {
    writeFileSync(join(dir, "wrangler.toml"), wranglerToml(projectName))
    writeFileSync(join(dir, "src", "worker.ts"), workerEntry())
    writeFileSync(join(dir, "db", "init.sql"), initSql())
  }
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  // Handle flags
  const { projectName: name, useEdge } = await handleArgs()
  let projectName = name
  if (projectName === null) return // help or version was shown

  console.log()
  const edgeTag = useEdge ? ` ${D("(with Cloudflare Workers)")}` : ""
  console.log(`  ${G("◇")}  ${C("create-bunigniter")} — Scaffold a Bunigniter project${edgeTag}`)
  console.log()

  // Check Bun version
  if (!checkBunVersion()) {
    console.log(`  ${R("✗")}  Bun >=1.3.0 is required (current: ${process.versions.bun ?? "unknown"})`)
    console.log(`     Install: ${C("curl -fsSL https://bun.sh/install | bash")}`)
    exit(1)
  }
  console.log(`  ${G("✓")}  Bun ${process.versions.bun}`)
  if (useEdge) console.log(`  ${G("✓")}  Cloudflare Workers files`)

  // Get project name (CLI arg or prompt)
  if (!projectName) {
    projectName = await prompt(`  ${Y("?")}  Project name: `)
  }

  projectName = sanitize(projectName ?? "")
  if (!projectName) {
    console.log(`  ${R("✗")}  Project name is required`)
    exit(1)
  }

  // Destination
  const dest = join(cwd(), projectName)
  if (existsSync(dest)) {
    console.log(`  ${R("✗")}  Directory "${projectName}" already exists`)
    exit(1)
  }

  // Scaffold
  console.log()
  console.log(`  ${D("Scaffolding in")} ${dest}`)
  scaffold(dest, projectName, useEdge)
  console.log(`  ${G("✓")}  Project "${projectName}" created`)

  // Summary
  console.log()
  console.log(`  ${D("Files:")}`)
  console.log(`    config/app.ts        — Application configuration`)
  console.log(`    routes/index.ts      — Home (redirects to /items)`)
  console.log(`    routes/items.ts      — Items CRUD controller`)
  console.log(`    routes/welcome.ts    — Welcome page`)
  console.log(`    routes/api.ts        — API handler (void-style)`)
  console.log(`    routes/items/new.ts  — New item form`)
  console.log(`    routes/schedule.ts   — Scheduled tasks demo`)
  console.log(`    views/_layout.html   — Auto-layout wrapper`)
  console.log(`    views/welcome.html   — Welcome page template`)
  console.log(`    views/items.html     — Items list template`)
  console.log(`    views/new-item.html  — New item form template`)
  console.log(`    db/seed.ts           — Database seeder`)
  console.log(`    dev.ts               — Entry point`)
  console.log(`    package.json         — Dependencies & scripts`)
  console.log(`    tsconfig.json        — TypeScript config`)
  console.log(`    .gitignore           — Git ignore rules`)
  console.log(`    .env.example         — Environment variables`)
  if (useEdge) {
    console.log(`  ${C("── Cloudflare Workers ──")}`)
    console.log(`    wrangler.toml        — Workers configuration`)
    console.log(`    src/worker.ts        — Worker entry point`)
    console.log(`    db/init.sql          — D1 initialization script`)
  }
  console.log()

  // Install dependencies prompt
  const installChoice = await prompt(`  ${Y("?")}  Run ${C("bun install")} now? ${D("(Y/n)")} `)
  let installFailed = false

  if (installChoice.toLowerCase() !== "n") {
    console.log()
    console.log(`  ${D("Installing dependencies...")}`)
    chdir(dest)

    const proc = Bun.spawnSync(["bun", "install"], {
      stdout: "inherit",
      stderr: "inherit",
    })

    if (proc.exitCode === 0) {
      console.log(`  ${G("✓")}  Dependencies installed`)
    } else {
      installFailed = true
      console.log(`  ${Y("!")}  "bun install" exited with code ${proc.exitCode}`)
    }
  } else {
    installFailed = true
  }

  // Done
  console.log()
  console.log(`  ${G("■")}  ${projectName} is ready!`)
  console.log()
  console.log(`  ${D("Next steps:")}`)
  console.log(`    cd ${projectName}`)
  if (installFailed) {
    console.log(`    bun install         ${D("# Install dependencies")}`)
    console.log(`    bun run seed         ${D("# Create database & seed data")}`)
    console.log(`    bun run dev          ${D("# After bun install, start dev server")}`)
  } else {
    console.log(`    bun run seed         ${D("# Create database & seed data")}`)
    console.log(`    bun run dev          ${D("# Start dev server at :3000")}`)
  }
  console.log(`    DEBUG=true bun run dev ${D("# Enable debug toolbar")}`)

  if (useEdge) {
    console.log()
    console.log(`  ${C("── Cloudflare Workers ──")}`)
    console.log(`    wrangler d1 create ${projectName}-db  ${D("# Create D1 database")}`)
    console.log(`    # Update wrangler.toml with the database_id`)
    console.log(`    bun run cf:dev                      ${D("# Local Workers dev")}`)
    console.log(`    bun run cf:db:init                  ${D("# Initialize D1 tables")}`)
    console.log(`    bun run cf:deploy                   ${D("# Deploy to Cloudflare")}`)
  }

  console.log()
  console.log(`  ${D("Open http://localhost:3000 in your browser.")}`)
  console.log()
}

main().catch((err) => {
  console.error(`  ${R("✗")}  ${err.message}`)
  exit(1)
})

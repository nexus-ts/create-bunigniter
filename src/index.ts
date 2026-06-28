#!/usr/bin/env bun
/**
 * create-bunigniter — Scaffold a new Bunigniter project.
 *
 * Usage:
 *   bun create bunigniter <project-name>
 *   bun x create-bunigniter <project-name>
 *   npx create-bunigniter <project-name>
 *
 * If <project-name> is omitted, prompts interactively.
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

async function handleArgs(): Promise<string | null> {
	const args = process.argv.slice(2)
	for (const arg of args) {
		if (arg === "--help" || arg === "-h") {
			console.log()
			console.log(`  ${C("create-bunigniter")} — Scaffold a Bunigniter project`)
			console.log()
			console.log(`  ${D("Usage:")}`)
			console.log(`    bun create bunigniter ${C("<project-name>")}`)
			console.log(`    bun x create-bunigniter ${C("<project-name>")}`)
			console.log(`    npx create-bunigniter ${C("<project-name>")}`)
			console.log()
			console.log(`  ${D("Options:")}`)
			console.log(`    --help, -h    Show this help message`)
			console.log(`    --version, -V Show version`)
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
	}
	// First non-flag arg is project name
	for (const arg of args) {
		if (!arg.startsWith("-")) return arg
	}
	return null
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
				bi: "bun run bi",
				"bi:repl": "bun run bi repl",
			},
			dependencies: {
				bunigniter: "^0.4",
				"drizzle-orm": "^0.45",
				"react": "^19",
				"react-dom": "^19",
				"typebox": "1.2.16",
				zod: "^4",
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
		`\t\t},`,
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
		` *`,
		` * GET /welcome -> renders views/welcome.html`,
		` */`,
		`import { Controller } from "bunigniter"`,
		``,
		`export class Welcome extends Controller {`,
		`\tasync index() {`,
		`\t\tlet items: any[] = []`,
		`\t\ttry {`,
		`\t\t\tconst result = await this.db.query("SELECT * FROM items LIMIT 100")`,
		`\t\t\titems = result.rows as any[]`,
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
		`export class Items extends Controller {`,
		`\t/**`,
		`\t * GET / - List all items.`,
		`\t */`,
		`\tasync index() {`,
		`\t\tconst result = await this.db.query<Item>(`,
		`\t\t\t"SELECT * FROM items ORDER BY created_at DESC",`,
		`\t\t)`,
		`\t\tconst items = result.rows ?? []`,
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
		`      <a href="/api/hello">API</a>`,
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
		`    <a href="/api/hello" class="btn btn-secondary">🔌 API Demo</a>`,
		`  </div>`,
		``,
		`  <div style="margin-top: 40px; color: #555; font-size: 13px; line-height: 1.8;">`,
		`    <p>⚡ Quick commands:</p>`,
		`    <p><code>bun run dev</code> — Start dev server</p>`,
		`    <p><code>bun run seed</code> — Seed database</p>`,
		`    <p><code>bun run bi repl</code> — Interactive REPL</p>`,
		`  </div>`,
		`</div>`,
		``,
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

// ─── Scaffold ───────────────────────────────────────────────

function scaffold(dir: string, projectName: string) {
	const subdirs = ["config", "routes", "routes/items", "views", "db", "data"]
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
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
	// Handle flags first (before any output)
	let projectName = await handleArgs()
	if (projectName === null) {
		// help or version was shown, exit was called in handleArgs
		return
	}

	console.log()
	console.log(`  ${G("◇")}  ${C("create-bunigniter")} — Scaffold a Bunigniter project`)
	console.log()

	// Check Bun version
	if (!checkBunVersion()) {
		console.log(`  ${R("✗")}  Bun >=1.3.0 is required (current: ${process.versions.bun ?? "unknown"})`)
		console.log(`     Install: ${C("curl -fsSL https://bun.sh/install | bash")}`)
		exit(1)
	}
	console.log(`  ${G("✓")}  Bun ${process.versions.bun}`)

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
	scaffold(dest, projectName)
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
		console.log(`    bun install         ${D("# Install dependencies first")}`)
	}
	console.log(`    bun run seed         ${D("# Create database & seed data")}`)
	console.log(`    bun run dev          ${D("# Start dev server at :3000")}`)
	console.log()
	console.log(`  ${D("Open http://localhost:3000 in your browser.")}`)
	console.log()
}

main().catch((err) => {
	console.error(`  ${R("✗")}  ${err.message}`)
	exit(1)
})

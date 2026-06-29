#!/usr/bin/env bun
/**
 * create-bunigniter — Scaffold a new Bunigniter project.
 *
 * This is a thin wrapper around `bunigniter`'s `bi new` command.
 * All scaffolding logic and templates live in bunigniter itself.
 *
 * Usage:
 *   bun create bunigniter@latest my-app
 *   bunx create-bunigniter@latest my-app
 *
 * The wrapper:
 *   1. Creates the project directory
 *   2. Writes package.json with bunigniter dependency
 *   3. Runs `bun install` to install bunigniter
 *   4. Delegates interactive scaffolding to `bun run bi new`
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { cwd, exit, stdout } from "node:process"

// ─── Terminal Colors ────────────────────────────────────────

const C = (s: string) => `\x1b[36m${s}\x1b[0m`
const G = (s: string) => `\x1b[32m${s}\x1b[0m`
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`
const R = (s: string) => `\x1b[31m${s}\x1b[0m`
const D = (s: string) => `\x1b[90m${s}\x1b[0m`

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

function minPkgJson(name: string): string {
	return JSON.stringify(
		{
			name,
			version: "1.0.0",
			type: "module",
			private: true,
			scripts: {
				dev: "bun --hot run dev.ts",
				start: "bun run dev.ts",
				bi: "bun run node_modules/bunigniter/dist/cli/index.ts",
				"bi:repl": "bun run node_modules/bunigniter/dist/cli/index.ts repl",
				"bi:new": "bun run node_modules/bunigniter/dist/cli/index.ts new",
			},
			dependencies: {
				bunigniter: "^0.4",
				elysia: "^2.0.0-exp.12",
			},
		},
		null,
		2,
	)
}

// ─── Args ────────────────────────────────────────────────────

async function handleArgs(): Promise<string | null> {
	const args = process.argv.slice(2)

	for (const arg of args) {
		if (arg === "--help" || arg === "-h") {
			console.log(`\n  ${C("create-bunigniter")} — Scaffold a Bunigniter project\n`)
			console.log(`  ${D("Usage:")}`)
			console.log(`    bun create bunigniter@latest ${C("<project-name>")}`)
			console.log(`    bunx create-bunigniter@latest ${C("<project-name>")}`)
			console.log()
			console.log(`  ${D("Options:")}`)
			console.log(`    --help, -h        Show this help`)
			console.log(`    --version, -V     Show version`)
			console.log()
			exit(0)
		}
		if (arg === "--version" || arg === "-V") {
			try {
				const text = await Bun.file(join(import.meta.dirname, "..", "package.json")).text()
				console.log(JSON.parse(text).version)
			} catch {
				console.error("unknown")
			}
			exit(0)
		}
	}

	const positional = args.filter((a) => !a.startsWith("-"))
	return positional[0] ?? null
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
	let projectName = await handleArgs()
	if (projectName === null) return

	console.log()
	console.log(`  ${G("◇")}  ${C("create-bunigniter")} — Scaffold a Bunigniter project`)
	console.log()

	// Check Bun version
	if (!checkBunVersion()) {
		console.log(`  ${R("✗")}  Bun >=1.3.0 required (current: ${process.versions.bun ?? "unknown"})`)
		console.log(`     Install: ${C("curl -fsSL https://bun.sh/install | bash")}`)
		exit(1)
	}
	console.log(`  ${G("✓")}  Bun ${process.versions.bun}`)

	// Get project name
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

	// Create directory + minimal package.json
	mkdirSync(dest, { recursive: true })
	writeFileSync(join(dest, "package.json"), minPkgJson(projectName))
	console.log(`  ${G("✓")}  Project directory created`)
	console.log(`  ${D("    ${dest}")}`)

	// Install bunigniter
	console.log()
	console.log(`  ${D("Installing bunigniter...")}`)
	process.chdir(dest)

	const installProc = Bun.spawnSync(["bun", "install"], {
		stdout: "inherit",
		stderr: "inherit",
	})

	if (installProc.exitCode !== 0) {
		console.log(`  ${Y("!")}  "bun install" exited with code ${installProc.exitCode}`)
		console.log(`  ${D("Run 'bun install' manually, then continue.")}`)
	}

	// Delegate to bi new
	console.log()
	console.log(`  ${G("◇")}  Launching interactive scaffold: ${C("bun run bi new")}`)
	console.log()

	const scaffoldProc = Bun.spawnSync(["bun", "run", "bi", "new"], {
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
	})

	if (scaffoldProc.exitCode !== 0) {
		console.log(`  ${R("✗")}  Scaffold exited with code ${scaffoldProc.exitCode}`)
		console.log(`  ${D("The project directory remains at:")} ${dest}`)
		exit(scaffoldProc.exitCode)
	}
}

main().catch((err) => {
	console.error(`  ${R("✗")}  ${err.message}`)
	exit(1)
})

# create-bunigniter — Development Guide

Scaffold a new [Bunigniter](https://github.com/nexus-ts/bunigniter) project — Bun-native fullstack framework.

> **npm:** `create-bunigniter`
> **GitHub:** github.com/nexus-ts/create-bunigniter

---

## Architecture

`create-bunigniter` is a **thin wrapper** around `bunigniter`'s own `bi new` CLI command.

All scaffolding logic (templates, prompts, file generation) lives in the `bunigniter` package at `src/cli/scaffold.ts`.

### Flow

```
bun create bunigniter@latest my-app
  → create-bunigniter 실행
  → 1. Project directory 생성
  → 2. 최소 package.json 작성 (bunigniter 의존성)
  → 3. bun install 실행
  → 4. bun run bi new 로 위임 (stdin 상속)
  → 5. bunigniter의 scaffold.ts가 인터랙티브 프롬프트 + 파일 생성
```

### Why?

- **Single source of truth**: 모든 템플릿은 `bunigniter/src/cli/scaffold.ts`에 있음
- **버전 동기화**: create-bunigniter와 bunigniter의 버전 불일치 문제 해결
- **유지보수 간소화**: create-bunigniter는 ~190줄, bunigniter의 `bi new`가 모든 로직 담당

---

## Repository Structure

```
src/
  index.ts              ← Thin wrapper (~190 lines)
                          - Creates project directory
                          - Writes minimal package.json
                          - Runs bun install
                          - Delegates to `bun run bi new`
```

---

## Key Conventions (MUST FOLLOW)

1. **Thin wrapper only** — 모든 템플릿과 스캐폴드 로직은 `bunigniter`에 위임
2. **No external dependencies** — Bun APIs only (no npm deps)
3. **Bun >= 1.3.0** — minimum version check

---

## CLI Usage

```bash
bun create bunigniter@latest my-app     # 권장 — 최신 버전 보장
bunx create-bunigniter@latest my-app    # 동일
bun create bunigniter my-app             # Bun 캐시 사용 가능
```

## Options

| Flag | Description |
|------|-------------|
| `--help, -h` | Show help message |
| `--version, -V` | Show version |

> `--edge` 플래그는 더 이상 사용하지 않습니다. `bi new`의 인터랙티브 프롬프트에서 Runtime을 선택하세요.

---

## Template Generators

템플릿 생성기는 `bunigniter` 패키지의 `src/cli/scaffold.ts`에 있습니다:

| Generator (in bunigniter) | Purpose |
|---------------------------|---------|
| `genPkgJson()` | package.json (scripts, deps, devDeps) |
| `genTsCfg()` | tsconfig.json |
| `genGitignore()` | .gitignore |
| `genEnvExample()` | .env.example |
| `genDevEntry()` | dev.ts |
| `genConfigApp()` | config/app.ts |
| `genSeedScript()` | db/seed.ts (skipped if database=none) |
| `genRouteIndex()` | routes/index.ts (Home controller) |
| `genRouteApi()` | routes/api.ts (with/without OpenAPI) |
| `genLayoutHtml()` | views/_layout.html |
| `genWelcomeView()` | views/welcome.html |
| `genWranglerToml()` | wrangler.toml (Cloudflare only) |
| `genWorkerEntry()` | src/worker.ts (Cloudflare only) |
| `genInitSql()` | db/init.sql (Cloudflare only) |
| `mergePackageJson()` | Merge existing package.json (init mode) |

---

## Scaffold Output (by `bi new --yes` defaults)

```
my-app/
├── config/app.ts           # DB config (:memory: by default)
├── routes/
│   ├── index.ts            # GET / — welcome page
│   └── api.ts              # GET /api — handler-style
├── views/
│   ├── _layout.html        # Auto-layout wrapper
│   └── welcome.html        # Welcome page template
├── dev.ts                  # Entry point
├── package.json            # Scripts: dev, seed, bi, repl
├── tsconfig.json           # TypeScript config
├── .gitignore              # Git ignore rules
└── .env.example            # Environment variables
```

With `Runtime: cloudflare`: + wrangler.toml, src/worker.ts, db/init.sql
With `Database: sqlite`: + db/seed.ts

---

## Related

| Repo | Description |
|------|-------------|
| [bunigniter](https://github.com/nexus-ts/bunigniter) | The framework — all templates in `src/cli/scaffold.ts` |
| [nexus-ts](https://github.com/nexus-ts) | Organization |

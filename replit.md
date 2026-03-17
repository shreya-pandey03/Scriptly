# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Real-time**: Socket.IO (WebSockets)
- **Auth**: JWT (bcryptjs + jsonwebtoken)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (+ Socket.IO)
│   └── book-notes/         # React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## App: Book Notes Organizer

A full-stack app where users can sign up, log in, create books, add chapter notes, highlight quotes, and search. Multiple users can edit notes simultaneously with real-time "user is editing" indicators.

### Features

- **Auth**: JWT-based register/login. Token stored in `localStorage` as `auth-token`
- **Books**: Create, list, view, update, delete books with colored covers
- **Notes**: Per-chapter notes with inline editing, sorted by chapter number
- **Quotes**: Highlighted quote cards with color-coded left borders
- **Search**: Global search across all notes and quotes
- **Real-time**: Socket.IO — `editing:start`/`editing:stop` events show who is editing

### Frontend Routes

- `/` — Books list (home, requires auth)
- `/books/:bookId` — Book detail with Notes + Quotes tabs
- `/search` — Global search
- `/login` — Login page
- `/register` — Register page

### API Routes

All routes under `/api`:
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /books`, `POST /books`, `GET /books/:id`, `PATCH /books/:id`, `DELETE /books/:id`
- `GET /books/:bookId/notes`, `POST /books/:bookId/notes`, `PATCH /books/:bookId/notes/:noteId`, `DELETE /books/:bookId/notes/:noteId`
- `GET /books/:bookId/quotes`, `POST /books/:bookId/quotes`, `PATCH /books/:bookId/quotes/:quoteId`, `DELETE /books/:bookId/quotes/:quoteId`
- `GET /search?q=term`

### Socket.IO

- Path: `/api/socket.io`
- Auth: token in handshake auth object
- Events: `editing:start { noteId, username }`, `editing:stop { noteId }`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## DB Schema

Tables: `users`, `books`, `notes`, `quotes`

Development: `pnpm --filter @workspace/db run push`

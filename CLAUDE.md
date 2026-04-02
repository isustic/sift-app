# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sift Analytics** is a desktop data analysis application built with **Tauri v2** (Rust backend) + **Next.js 16** (React frontend). It imports XLSX files into a local SQLite database, then provides pivot tables, trends, formulas, blends, and a multi-step report builder with chart export.

## Commands

```bash
# Frontend dev server (Next.js on port 3000)
npm run dev

# Build the Next.js static export (outputs to /out)
npm run build

# Run Tauri dev mode (starts both frontend + Rust backend with hot reload)
npm run tauri:dev

# Build production Tauri app (native installer)
npm run tauri:build

# Lint
npm run lint
```

There are no automated tests configured. The CI `test.yml` is a placeholder.

## Architecture

### Two-Layer System

- **Frontend** (`app/`, `components/`, `lib/`) — Next.js 16 with App Router, React 19, Tailwind CSS 4, shadcn/ui (new-york style). Static export (`output: "export"` in next.config.ts) — no server-side rendering.
- **Backend** (`src-tauri/`) — Tauri v2 with Rust. Exposes commands to the frontend via `invoke()`. Uses `rusqlite` (bundled SQLite) for all data storage, `calamine` for XLSX parsing, and `rust_xlsxwriter` for export.

### Frontend-Backend Communication

All frontend-to-Rust calls go through `lib/tauri.ts` wrappers (`safeInvoke`, `safeOpen`, `safeListen`). These dynamically import Tauri APIs so the app can also run in a browser (with reduced functionality). The frontend calls `safeInvoke<T>("command_name", { args })` which maps to `#[tauri::command]` functions registered in `src-tauri/src/lib.rs`.

### Database

- Single SQLite file (`app.db`) in the Tauri app data directory.
- Schema defined in `src-tauri/src/db/mod.rs` — tables: `datasets`, `columns`, `report_templates`, `analytics_events`, `query_history`, `favorites`, `subgroups`, `calculated_fields`, `blend_configs`.
- Each imported XLSX becomes its own dynamically-created table with typed columns (TEXT/INTEGER/REAL).
- Column name sanitization uses a whitelist approach (`sanitize_col_name` in `src-tauri/src/db/schema.rs`).
- SQL injection prevention: all user-provided column names are validated against the `columns` metadata table before use (see security docs in `src-tauri/src/commands/queries.rs`).

### Rust Commands

Registered in `src-tauri/src/lib.rs` under `invoke_handler`. Key command modules in `src-tauri/src/commands/`:

| Module | Purpose |
|--------|---------|
| `ingest` | Import XLSX files into SQLite |
| `data` | List/get/search rows, manage datasets |
| `report` | Run multi-step report queries (SimpleQuery schema) |
| `pivot` | Pivot table queries |
| `trends` | Time-series trend analysis |
| `formula` | Custom formula fields (save/test/list/delete) |
| `blend` | Cross-dataset data blending |
| `export` | Export reports to XLSX |
| `epp` | EPP-specific agent reports |
| `subgroups` | Subgroup CRUD + Excel import |
| `templates` | Save/load/delete report templates |
| `analytics` | Usage tracking and query history |
| `updater` | Self-update via Tauri updater plugin |

### Routing (App Router)

| Route | Page |
|-------|------|
| `/` | Home — shows Welcome or Returning dashboard based on datasets |
| `/upload` | XLSX file upload with data table preview |
| `/analysis` | Analysis hub (layout with sub-routes) |
| `/analysis/formula` | Formula builder with autocomplete |
| `/analysis/pivot` | Drag-and-drop pivot table builder |
| `/analysis/trends` | Trend analysis with sparkline charts |
| `/analysis/blend` | Cross-dataset blending |
| `/report` | 7-step report builder (columns → group → calc → filter → sort → results → charts) |
| `/epp` | EPP agent reporting |
| `/subgroups` | Subgroup management |
| `/istoric` | Query history |
| `/settings` | App settings |

### UI System

- **Design theme**: "Botanical Luxe" — dark/light theme with champagne gold accents.
- **Fonts**: Cormorant Garamond (display), Manrope (body), IBM Plex Mono (data).
- **Component library**: shadcn/ui with Radix primitives. Components in `components/ui/`.
- **Path alias**: `@/*` maps to project root.
- **Drag and drop**: `@dnd-kit` for sortable/draggable elements.
- **Charts**: Recharts for data visualization.
- **Animations**: Framer Motion.

### Auto-Update

The app uses `tauri-plugin-updater` configured to check GitHub Releases. Version is synchronized across `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.

### Release Pipeline

GitHub Actions (`release.yml`) builds for Windows, macOS (Apple Silicon), and Linux on tag push (`v*`). Uses `tauri-apps/tauri-action` to produce platform installers.

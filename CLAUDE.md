# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A chronic disease management product prototype ("慢病管家") with two frontends sharing one mock data source:

1. **WeChat Mini Program** (patient-facing) — root of the repo, standard WXML/JS/WXSS structure
2. **Doctor PC SPA** (`apps/doctor-pc/`) — zero-dependency vanilla JS browser app

There is no build step, no bundler, and no test suite. Both apps are prototype-quality UI skeletons backed entirely by mock data.

## Running the Apps

**Doctor PC app** (run from repo root):
```bash
cd apps/doctor-pc && npm run dev
# Opens: http://127.0.0.1:8765/apps/doctor-pc/
```
The `package.json` script runs `python3 -m http.server 8765 -d ../..` from `apps/doctor-pc/`, serving the entire repo root so the shared mock import resolves correctly.

**WeChat Mini Program**: Open in WeChat Developer Tools. AppID: `wx4d48ffd3a3a4ba1e`.

## Architecture

### Shared Mock Data
`apps/shared/mock/health-data.js` is the single source of truth for all prototype data — 4 patients, 3 alerts, 4 management plans, 4 follow-ups. Both apps import from here. The shape of this file defines the data contract between the two frontends.

### Doctor PC SPA (`apps/doctor-pc/`)
- **No framework, no bundler** — pure ES modules loaded directly in the browser
- `src/main.js` is the entire app: state, rendering, event handling, and constants in one file (~1500+ lines)
- State is held in module-level `let` variables (`currentView`, `selectedPatientId`, `patientFilter`, etc.) and persisted to `localStorage` via `src/store.js`
- Rendering is done by a single `render()` function that replaces `innerHTML` — no virtual DOM, no diffing
- `src/store.js` wraps `localStorage` with key `digital-twin-doctor-pc-mock-v2`; `loadState()` falls back to a clone of `seedHealthData` on first load
- `sanitizeStateText()` in main.js handles broken surrogate pairs from localStorage serialization of Chinese text

Key constants in `main.js` that drive business logic:
- `PLAN_ACTION_RULES` — which actions are valid per plan status
- `MODULE_DEPENDENCY_RULES` — conditional plan module unlock rules
- `REQUIRED_PLAN_MODULES` — the 6 mandatory vs 4 optional plan modules
- `PLAN_MODULE_META` — display metadata for each module

### WeChat Mini Program (root)
- Standard WeChat structure: `app.js` / `app.json` / `app.wxss` + `pages/` + `custom-tab-bar/`
- No npm dependencies, no framework
- Health metric data stored in `wx.getStorageSync('healthMetricRecords')`, managed by `utils/record-store.js`
- Device binding state stored in `wx.getStorageSync('boundHardwareDevices')`
- Screening result stored in `wx.getStorageSync('screeningResult')`, drives `userStage` on the home page

Device pages use two integration paths:
- `bluetooth`: ZG-M11A/B (sleep radar), ZG-P11H/G (oxygen ring) → `pages/device/bluetooth/`
- `huawei`: all other devices → `pages/device/huawei-auth/` (static demo only in MVP)

The custom tab bar (`custom-tab-bar/`) requires each page's `onShow` to call `setTabBarSelected(n)` manually.

### Docs
`docs/` contains product specs that drive implementation. Key files:
- `docs/慢病管理小程序PRD.md` — main product PRD, patient state machine, risk scoring model, API draft
- `docs/医生PC端PRD.md` — doctor PC product goals and permission model
- `docs/spec/医生PC端-管理方案SPEC.md` — interaction spec for plan management (the most detailed implementation guide)
- `docs/风险筛查模块PRD.md` — 4-step screening questionnaire and scoring rules
- `docs/记录指标模块PRD.md` — metric recording page structure and device entry points
- `docs/智能硬件设备模块PRD.md` — device module scope; real Bluetooth/Huawei OAuth are explicitly out of MVP scope

## Key Product Constraints
- The system provides risk hints only; all diagnoses and prescription decisions require doctor confirmation (medical safety boundary)
- Disease tags have two layers: system-generated "risk tags" vs doctor-confirmed "disease tags" — never conflate them
- Doctor-patient binding requires patient QR scan + explicit consent; no silent binding
- Plan workflow: draft → modules edited → saved → patient preview → confirm publish → pending patient acknowledgement → active

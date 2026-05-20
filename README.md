# Copilot Usage Dashboard

Interactive GitHub Copilot usage dashboard for manager-facing adoption, engagement, model, editor, language, and user-level analytics.

## Run Locally

```bash
npm install
npm run dev
```

The app runs at `http://127.0.0.1:5173/`.

`npm run dev` starts:

- Vite frontend on port `5173`
- Local TypeScript API proxy on port `8787`

## GitHub API Setup

Copy `.env.example` to `.env` or edit the existing local `.env`:

```bash
GITHUB_TOKEN=
GITHUB_COPILOT_SCOPE=organization
GITHUB_ORG=
GITHUB_ENTERPRISE=
PORT=8787
```

Use `GITHUB_COPILOT_SCOPE=organization` with `GITHUB_ORG`, or `GITHUB_COPILOT_SCOPE=enterprise` with `GITHUB_ENTERPRISE`.

The backend calls GitHub's current Copilot usage metrics report endpoints with `X-GitHub-Api-Version: 2026-03-10`, downloads the signed JSON report files, and normalizes them for the dashboard.

Do not put GitHub tokens in `VITE_` variables. Those are exposed to browser code.

## Verification

```bash
npm run build
npm run lint
```

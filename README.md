
  # Design Front End

  This is a code bundle for Design Front End. The original project is available at https://www.figma.com/design/JU2I0C6RZmd9ugmIlwRUFP/Design-Front-End.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

## Backend

This repo also includes a local-first NestJS backend for the worship presentation system.

### Commands

- `npm run backend:dev` - start the API/WebSocket backend on port `3001`
- `npm run backend:build` - compile backend TypeScript to `server/dist`
- `npm run backend:start` - run the compiled backend
- `npm run backend:test` - run focused backend service tests

### Core API areas

- `GET /health`
- `POST /songs`, `GET /songs?q=...`
- `GET /scripture/verse?book=John&chapter=3&verse=16`
- `POST /presentation/preview`
- `POST /presentation/go-live`
- `POST /presentation/clear-live`
- `POST /service-flow/items`
- `POST /ai/transcriptions`

Realtime Socket.io events include `preview_updated`, `live_updated`,
`presentation_state_updated`, `service_flow_updated`, `transcription_update`,
and `scripture_detected`.

SQLite data is stored in `data/worship.sqlite` by default. Set `WORSHIP_DB_PATH`
to override the location for tests or packaged Electron builds.

## Multi-display output (projectors / TVs)

The operator UI is only the **control** screen. Congregation displays use a separate
**output** page that follows `presentation.live` over Socket.io.

### URLs

| Screen | URL |
|--------|-----|
| Control (this machine) | `http://localhost:5173/` |
| Output (each projector/TV) | `http://<main-pc-ip>:5173/output` |

Optional query params:

- `?display=1` — label in the output bar (for your own reference; same live feed)
- `?api=http://<main-pc-ip>:3001` — required when the output device is **not** the same PC as the backend (defaults to `localhost`)

### Setup (4 identical displays)

1. On the **main PC**, run `npm run backend:dev` and `npm run dev` (Vite exposes the LAN IP in the terminal).
2. Note your LAN IP (e.g. `192.168.1.42`) from the Vite `Network:` line.
3. On each display (or each monitor via a browser window):
   - Open `http://192.168.1.42:5173/output?api=http://192.168.1.42:3001`
   - Drag the window to the correct monitor and use **Fullscreen** (or F11 / double-click).
4. On the control app, use **Preview** then **Go Live** — all output pages update together.

### Live streaming (OBS)

Output pages are for **in-room projection**. For YouTube/Facebook, capture the output
window or use OBS **Browser Source** pointed at the same `/output` URL.

### Future: Electron

A desktop build could auto-open one frameless window per monitor. That is not implemented
yet; browser fullscreen per display is the supported approach today.
  

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
  
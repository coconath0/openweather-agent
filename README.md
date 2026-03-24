# OpenWeather Agent

A conversational weather assistant that lets you ask about current conditions and forecasts for any city in natural language. It combines a React chat UI, a LangChain-powered agent backend, and an MCP weather data server into a three-service architecture.

![Stack: React · FastAPI · LangChain · Gemini · OpenWeather](https://img.shields.io/badge/stack-React%20%7C%20FastAPI%20%7C%20LangChain%20%7C%20Gemini%20%7C%20OpenWeather-blue)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://openweather-agent.vercel.app/)
[![Frontend on Vercel](https://img.shields.io/badge/frontend-Vercel-black?logo=vercel)](https://openweather-agent.vercel.app/)
[![Backend on Fly.io](https://img.shields.io/badge/backend-Fly.io-purple?logo=fly.io)](https://fly.io)

---

## Live Demo

**[https://openweather-agent.vercel.app/](https://openweather-agent.vercel.app/)**

Try asking:
- *"What's the weather like in Tokyo right now?"*
- *"Should I bring an umbrella in London this weekend?"*
- *"Give me a 5-day forecast for New York."*

> **Note:** The backend services (MCP Server and Agent Backend) are hosted on Fly.io with `auto_stop_machines` enabled. The **first request after a period of inactivity may take 5–10 seconds** due to a cold start. Subsequent requests are fast.

---

## Table of Contents

- [Live Demo](#live-demo)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
  - [Frontend — Vercel](#frontend--vercel)
  - [MCP Server — Fly.io](#mcp-server--flyio)
  - [Agent Backend — Fly.io](#agent-backend--flyio)
- [Docker Quick Start](#docker-quick-start)
- [Local Development Setup](#local-development-setup)
  - [Prerequisites](#prerequisites)
  - [1. MCP Server](#1-mcp-server)
  - [2. Agent Backend](#2-agent-backend)
  - [3. Frontend](#3-frontend)
- [How the Code Works](#how-the-code-works)
  - [MCP Server](#mcp-server)
  - [Agent Backend](#agent-backend)
  - [Frontend](#frontend)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Design Decisions & Trade-offs](#design-decisions--trade-offs)
- [Common Development Tasks](#common-development-tasks)
- [Known Limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)

---

## Architecture

The app is split into **three independent services** that communicate over HTTP. Each one is started separately and can be restarted/modified without touching the others.

```
┌──────────────────┐         ┌──────────────────┐         ┌───────────────────┐
│    Frontend       │  POST   │  Agent Backend    │  GET    │   MCP Server      │
│    React / Vite   │────────▶│  FastAPI +        │────────▶│   FastAPI +       │
│    :5173          │◀────────│  LangChain Agent  │◀────────│   OpenWeather API │
│                   │  JSON   │  :8001            │  JSON   │   :8000           │
└────────┬──────────┘         └────────┬──────────┘         └───────────────────┘
         │                             │
         │  GET (weather panel)        ▼
         │  ────────────────▶  ┌──────────────┐
         │                     │ Google Gemini │
         └─────────────────▶   │ (gemini-2.5- │
           (also fetches       │  flash)       │
            MCP directly       └──────────────┘
            for the side
            panel)
```

**Production URLs:**

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | https://openweather-agent.vercel.app |
| Agent Backend | Fly.io | https://openweather-agent-backend.fly.dev |
| MCP Server | Fly.io | https://openweather-mcp-server.fly.dev |

**There are two data paths in the frontend:**

1. **Chat path** — User message → `POST /chat` to Agent Backend → agent calls MCP Server tools → natural language response back.
2. **Weather panel path** — After the agent responds, the frontend **also** calls the MCP Server directly (`GET /current-weather`, `GET /forecast`) to populate the side panel with structured weather data. This is independent of the chat — it's a regex-based city extraction from the most recent user message, not from the agent's response.

---

## Project Structure

```
openweather-agent/
├── README.md
├── docker-compose.yml              # One-command startup for all services
├── .dockerignore                   # Root-level Docker ignore
│
├── mcp-server/                     # Service 1: weather data proxy
│   ├── main.py                     # Single-file FastAPI app
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── requirements.txt
│   └── .env                        # OPENWEATHER_API_KEY (you create this)
│
├── agent-backend/                  # Service 2: LangChain chat agent
│   ├── main.py                     # Single-file FastAPI app
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── requirements.txt
│   └── .env                        # GOOGLE_API_KEY, MCP_SERVER_URL (you create this)
│
└── frontend/                       # Service 3: React chat UI
    ├── Dockerfile
    ├── .dockerignore
    ├── package.json                # React 19, Vite 7
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx                # Vite entry point (renders <App />)
        ├── App.jsx                 # All components live here (single-file)
        ├── App.css                 # Animations (typing dots, fade-in) & scrollbar styles
        └── index.css               # Global reset, dark/light base styles
```

> **Note:** Both Python services are single-file apps (`main.py`). The frontend has all its React components in `App.jsx` — there are no separate component files.

---
<!---
## Deployment

The app is deployed across two platforms. The frontend is a static Vite build on Vercel; the two Python services run as Docker containers on Fly.io.

### Frontend — Vercel

The `frontend/` directory is deployed directly to Vercel. The `vercel.json` at the repo root configures the build.

**Steps to redeploy:**

1. Push changes to the `main` branch — Vercel auto-deploys on push.
2. Or trigger a manual deploy from the Vercel dashboard.

**Environment variables required in Vercel dashboard:**

| Variable | Value |
|----------|-------|
| `VITE_AGENT_URL` | `https://openweather-agent-backend.fly.dev` |
| `VITE_MCP_URL` | `https://openweather-mcp-server.fly.dev` |

> If you fork this repo, update these variables in your own Vercel project settings to point at your Fly.io apps.

### MCP Server — Fly.io

App name: `openweather-mcp-server` · Region: `iad` (Ashburn, VA) · 256 MB RAM

```bash
cd mcp-server
fly deploy
```

**Secrets required** (set once with `fly secrets set`):

```bash
fly secrets set OPENWEATHER_API_KEY=your_key_here --app openweather-mcp-server
fly secrets set CORS_ORIGINS=https://openweather-agent.vercel.app --app openweather-mcp-server
```

### Agent Backend — Fly.io

App name: `openweather-agent-backend` · Region: `iad` (Ashburn, VA) · 512 MB RAM

```bash
cd agent-backend
fly deploy
```

**Secrets required:**

```bash
fly secrets set GOOGLE_API_KEY=your_key_here --app openweather-agent-backend
fly secrets set MCP_SERVER_URL=https://openweather-mcp-server.fly.dev --app openweather-agent-backend
fly secrets set CORS_ORIGINS=https://openweather-agent.vercel.app --app openweather-agent-backend
```

> **Cold starts:** Both Fly.io apps have `auto_stop_machines = 'stop'` and `min_machines_running = 0`, which means they shut down after inactivity and restart on the next request. Expect a 5–10 second delay on the first request after idle. This is normal behavior on the free tier.

---
-->
## Docker Quick Start

The fastest way to run all three services with a single command.

**1. Create your `.env` files** (still required — Docker reads them at runtime):

`mcp-server/.env`:
```env
OPENWEATHER_API_KEY=your_key_here
```

`agent-backend/.env`:
```env
MCP_SERVER_URL=http://127.0.0.1:8000
GOOGLE_API_KEY=your_key_here
```

**2. Build and start everything:**

```bash
docker compose up --build
```

This starts all three services:
- **MCP Server** → http://localhost:8000
- **Agent Backend** → http://localhost:8001
- **Frontend** → http://localhost:5173

Open **http://localhost:5173** and start chatting.

> **Note:** Docker Compose overrides `MCP_SERVER_URL` to `http://mcp-server:8000` for container-to-container networking. The value in your `.env` file is used only for local development outside Docker.

To stop all services:

```bash
docker compose down
```

---

## Local Development Setup

Alternatively, you can run each service manually for development (hot-reload, debugger access, etc.). Start them in separate terminals, in order.

### Prerequisites

| Requirement            | Minimum Version | Notes                            |
|------------------------|-----------------|----------------------------------|
| Python                 | 3.11+           | Both backend services (local dev only) |
| Node.js                | 20+             | Frontend dev server (local dev only) |
| Docker                 | 20+             | For Docker Quick Start (optional) |
| OpenWeather API key    | —               | Free tier works                  |
| Google Gemini API key  | —               | Free tier: 15 req/min, 1M tokens/day |

Get your API keys:
- **OpenWeather**: https://openweathermap.org/api_keys (sign up for free)
- **Google Gemini**: https://aistudio.google.com/apikey (free tier is sufficient for local dev)

### 1. MCP Server

```bash
cd mcp-server
pip install -r requirements.txt
```

Create `mcp-server/.env`:

```env
OPENWEATHER_API_KEY=your_key_here
```

```bash
uvicorn main:app --reload --port 8000
```

Verify: `curl http://127.0.0.1:8000/health` → `{"status":"ok"}`

### 2. Agent Backend

```bash
cd agent-backend
pip install -r requirements.txt
```

Create `agent-backend/.env`:

```env
MCP_SERVER_URL=http://127.0.0.1:8000
GOOGLE_API_KEY=your_key_here
```

```bash
uvicorn main:app --reload --port 8001
```

Verify: `curl http://127.0.0.1:8001/health` → `{"status":"ok"}`

> **Tip:** You can also start from the repo root with `uvicorn main:app --reload --port 8001 --app-dir agent-backend`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** and start chatting.

**Production build:**

```bash
npm run build    # outputs to frontend/dist/
npm run preview  # serves the production build locally
```

---

## How the Code Works

This section walks through each service so you know where to make changes.

### MCP Server

**File:** `mcp-server/main.py` — a FastAPI app that proxies the [OpenWeather API](https://openweathermap.org/api).

**Endpoints:**

| Endpoint | What it does |
|----------|-------------|
| `GET /health` | Returns `{"status": "ok"}` |
| `GET /current-weather?city=<name>` | Geocodes city → fetches current weather → returns normalized JSON |
| `GET /forecast?city=<name>&days=<1-5>` | Geocodes city → fetches 5-day/3-hour forecast → groups by date → returns daily summaries |

**Key implementation details:**

- Uses `httpx.AsyncClient` for non-blocking HTTP calls.
- All weather data is returned in **metric units** (°C, km/h). Wind speed comes from OpenWeather in m/s and is converted to km/h (`speed * 3.6`).
- Geocoding uses the OpenWeather Geocoding API (`/geo/1.0/direct`) to convert city names to lat/lon before fetching weather.
- The 3-hour forecast intervals are grouped by date. High/low temps per day are computed from all `temp`, `temp_min`, and `temp_max` values in that day's intervals.
- Error handling covers: invalid API key (503), city not found (404), upstream API failures (502). The server checks for both HTTP-level errors and OpenWeather's "200 with error body" pattern (`{"cod": 401, "message": "..."}`).
- CORS is configured for `http://localhost:5173` (the frontend).

### Agent Backend

**File:** `agent-backend/main.py` — a FastAPI app wrapping a LangChain agent.

**Key pieces:**

| Concept | Detail |
|---------|--------|
| **LLM** | `ChatGoogleGenerativeAI(model="gemini-2.5-flash")` from `langchain-google-genai` |
| **Tools** | `get_current_weather(city)` and `get_forecast(city, days)` — both use `requests.get()` to call the MCP Server |
| **Agent construction** | `build_agent_executor()` tries the classic `AgentExecutor` + `create_openai_tools_agent` import first. If that fails (depends on your LangChain version), it falls back to `create_agent` from the v1 graph API. |
| **Lazy init** | `get_agent_executor()` initializes the agent on the first request, not at import time. This lets uvicorn start even if `GOOGLE_API_KEY` isn't set yet. |
| **System prompt** | Tells the agent to always use its tools for real data, mention the city name, and give practical advice. |
| **Error handling** | Catches quota/rate-limit errors (checking for `insufficient_quota`, `RateLimitError`, `429`, `ResourceExhausted`, `RATE_LIMIT_EXCEEDED` in the error string) and returns 503. Everything else returns 500. |

**If you need to change the LLM model**, edit the `model=` parameter in `build_agent_executor()`. If you want to switch to a different provider entirely, you'd replace `ChatGoogleGenerativeAI` with the appropriate LangChain chat model class and update the environment variable accordingly.

**If you need to add a new tool**, create a new `@tool`-decorated function that calls the MCP server (or any other data source) and add it to the `tools` list.

### Frontend

**File:** `frontend/src/App.jsx` — all React components and logic in a single file.

**Components (defined in order in the file):**

| Component | Purpose |
|-----------|---------|
| `extractCityFromMessages(messages)` | Helper function. Regex-based city extraction from the last user message. Looks for patterns like "in Tokyo", "for London". Only matches words starting with uppercase. |
| `getWeatherEmoji(description)` | Helper function. Maps weather description keywords to emoji (thunder → ⛈️, rain → 🌧️, etc.). |
| `themes` object | Color palettes for dark and light mode. Each key maps to a CSS value used in inline styles. |
| `TypingDots` | Three animated bouncing dots shown while waiting for the agent response. |
| `AgentAvatar` | Small gradient circle with ☀️ icon, shown next to agent messages. |
| `ThemeToggle` | Sun/moon button in the header to switch dark ↔ light. |
| `MessageBubble` | Single chat message. User bubbles are blue/right-aligned, agent bubbles are themed/left-aligned with an avatar. |
| `WeatherPanel` | Right-side panel showing structured weather data: city name, temperature, emoji, humidity, wind speed, and 5-day forecast. Has a **°C / °F toggle** — conversion is done client-side (`c * 9/5 + 32`). |
| `App` | Root component. Manages all state, three `useEffect` hooks, and render layout. |

**State in `App`:**

| State | Type | Purpose |
|-------|------|---------|
| `messages` | `Array<{role, content}>` | Chat history |
| `input` | `string` | Current input field value |
| `sending` | `boolean` | True while waiting for agent response |
| `dark` | `boolean` | Dark mode toggle (default: `true`) |
| `weatherData` | `object \| null` | Structured weather data for the side panel |
| `weatherLoading` | `boolean` | True while fetching weather for the panel |

**`useEffect` hooks:**

1. **Theme sync** — Sets `data-theme` attribute on `<body>` when `dark` changes. This drives CSS variables in `index.css`.
2. **Auto-scroll** — Scrolls to the bottom of the chat when `messages` or `sending` changes.
3. **Weather panel fetch** — Triggers when `messages` changes. If the last message is from the agent (and it's not the initial greeting), it extracts a city name from the user's last message via regex, then fetches `/current-weather` and `/forecast` from the MCP server directly (port 8000). The data is combined into the `weatherData` state object.

**Styling approach:** All component styles are inline (no CSS modules, no styled-components). Global animations and scrollbar styles are in `App.css`. Dark/light base styles are in `index.css` using `body[data-theme]` selectors.

---

## API Reference

### MCP Server (port 8000)

| Method | Endpoint | Query Params | Description |
|--------|----------|-------------|-------------|
| GET | `/health` | — | Health check |
| GET | `/current-weather` | `city` (required) | Current weather for a city |
| GET | `/forecast` | `city` (required), `days` (1–5, default 1) | Daily forecast |

**`GET /current-weather?city=London`**

```json
{
  "city": "London",
  "temperature_celsius": 12.9,
  "description": "overcast clouds",
  "humidity": 72,
  "wind_speed_kmh": 18.5
}
```

**`GET /forecast?city=Austin&days=3`**

```json
{
  "city": "Austin",
  "forecast": [
    {
      "date": "2026-03-07",
      "high_temp_celsius": 25.8,
      "low_temp_celsius": 16.7,
      "description": "scattered clouds"
    }
  ]
}
```

### Agent Backend (port 8001)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/chat` | `{"message": "..."}` | Send message to the agent |

**`POST /chat`**

```bash
curl -X POST http://127.0.0.1:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather like in Austin right now?"}'
```

```json
{
  "response": "Right now in Austin, it's 24°C with clear skies and a gentle breeze at 13 km/h. Great weather for a walk or outdoor dining!"
}
```

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 503 | API quota/rate limit exceeded |
| 500 | Agent execution failed |

---

## Environment Variables

Each service reads from its own `.env` file. These files are **not committed to git** — you must create them locally. In production, these are set as secrets/environment variables on the hosting platform.

| Variable | File / Service | Required | Description |
|----------|---------------|----------|-------------|
| `OPENWEATHER_API_KEY` | `mcp-server/.env` | Yes | From openweathermap.org |
| `GOOGLE_API_KEY` | `agent-backend/.env` | Yes | From aistudio.google.com |
| `MCP_SERVER_URL` | `agent-backend/.env` | Yes | URL of the MCP server. Local: `http://127.0.0.1:8000`. Production: `https://openweather-mcp-server.fly.dev` |
| `CORS_ORIGINS` | Both backends | No | Comma-separated list of allowed origins. Defaults to `http://localhost:5173`. Production: `https://openweather-agent.vercel.app` |
| `VITE_AGENT_URL` | `frontend/.env` | No | Agent backend URL for production builds. Defaults to `http://localhost:8001` if unset. |
| `VITE_MCP_URL` | `frontend/.env` | No | MCP server URL for production builds. Defaults to `http://localhost:8000` if unset. |

---

## Design Decisions & Trade-offs

These are worth knowing if you're modifying the codebase:

- **Single-file components.** All frontend React components live in `App.jsx`. This was intentional for simplicity at the current scale. If the frontend grows, consider splitting into `components/` and `hooks/` directories.

- **Inline styles.** The frontend uses inline `style={{}}` objects instead of CSS modules or a library. The `themes` object provides a central color palette. This keeps the component count low but makes responsive design harder. A migration to CSS modules or Tailwind would be straightforward.

- **Metric units as the source of truth.** The MCP server always returns Celsius and km/h. The °C/°F toggle in the frontend converts client-side. If you need to add more unit options (e.g., m/s for wind), add the toggle logic in the `WeatherPanel` component — no backend changes needed.

- **Dual data path.** The chat response comes through the agent backend, but the weather panel fetches directly from the MCP server. This means the panel data and the chat answer could theoretically be for different cities if the regex fails. This trade-off was made to keep the agent response format simple (plain text).

- **LangChain version compatibility.** The `build_agent_executor()` function has a try/except around `create_openai_tools_agent` to handle different LangChain versions. If you pin `langchain` to a specific version, you can simplify this to just one code path.

- **Lazy agent initialization.** The agent is created on the first request, not at startup. This means the first chat message will be slower (model loading + first API call). But it lets uvicorn start cleanly even if the API key isn't configured yet, which is better for dev ergonomics.

- **No conversation memory.** Each `/chat` call is stateless — the agent doesn't remember previous messages. The frontend holds the visible chat history, but only the latest message is sent to the backend. Adding memory would require passing the full conversation history in the request body and feeding it into the LangChain prompt.

---

## Common Development Tasks

### Changing the LLM model

Edit `agent-backend/main.py` → `build_agent_executor()` → change the `model=` parameter in `ChatGoogleGenerativeAI(...)`.

### Adding a new weather tool

1. Add a new endpoint to `mcp-server/main.py` (e.g., `GET /air-quality`).
2. Add a new `@tool`-decorated function in `agent-backend/main.py` that calls that endpoint.
3. Add it to the `tools` list.
4. The agent will automatically use it when relevant based on the tool's docstring.

### Changing the CORS origin

Both `mcp-server/main.py` and `agent-backend/main.py` have `CORSMiddleware` with `allow_origins=["http://localhost:5173"]`. If you change the frontend port or deploy to a different domain, update both.

### Adding a new frontend component

Everything is in `frontend/src/App.jsx`. Add new components above the `App()` function, following the existing pattern of inline styles + the `theme` object for colors.

### Modifying the system prompt

Edit the `SYSTEM_PROMPT` string in `agent-backend/main.py`. This controls the agent's personality and behavior. Changes take effect on the next request (no restart needed with `--reload`).

### Redeploying after a code change

- **Frontend** — push to `main`; Vercel auto-deploys.
- **MCP Server** — `cd mcp-server && fly deploy`
- **Agent Backend** — `cd agent-backend && fly deploy`

### Updating a production secret (e.g. rotating the API key)

```bash
fly secrets set OPENWEATHER_API_KEY=new_key_here --app openweather-mcp-server
fly secrets set GOOGLE_API_KEY=new_key_here --app openweather-agent-backend
```

Fly.io automatically restarts the machine after a secret update.

---

## Known Limitations

- **No conversation memory** — each message to the agent is independent. The agent can't reference earlier messages in the conversation.
- **No auth** — all API endpoints are publicly accessible. Fine for a demo, but you'd want rate-limiting or token auth before any sensitive use.
- **Gemini free tier rate limits** — 15 requests per minute. Under heavy use you'll hit 503 errors. The frontend handles this gracefully with a user-friendly message.
- **Fly.io cold starts** — both backend services use `auto_stop_machines` with `min_machines_running = 0`. After a period of inactivity the machines spin down. The first request after idle will take 5–10 seconds to cold-start. Subsequent requests are fast.
- **No tests** — there are currently no unit or integration tests for any of the three services.

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `503` from MCP server | `OPENWEATHER_API_KEY` missing or invalid | Check `mcp-server/.env` (local) or Fly.io secrets (production). Verify the key at openweathermap.org. New keys can take a few hours to activate. |
| `503` from agent backend | Gemini quota exceeded or bad key | Check `agent-backend/.env` (local) or Fly.io secrets (production). Verify at aistudio.google.com. Wait a minute if you hit rate limits. |
| `404` from `/current-weather` or `/forecast` | City name not recognized | Check spelling. Use the English name of the city. |
| Frontend shows "temporarily unavailable" | Backend returned 503 | Same as the 503 fixes above. |
| CORS errors in browser console | Origin not allowed | Locally: both backends allow `http://localhost:5173` only. In production: set `CORS_ORIGINS=https://openweather-agent.vercel.app` as a secret on both Fly.io apps. |
| First request on production is very slow (5–10 s) | Fly.io cold start | Expected. Machines are stopped when idle and restart on demand. The delay only happens after inactivity. |
| `fly deploy` fails | Not logged in or wrong project | Run `fly auth login` and confirm the app name in `fly.toml` matches your Fly.io app. |
| Vercel deploy doesn't pick up env changes | Cached build | Trigger a redeploy from the Vercel dashboard after updating environment variables. |
| `Could not import module "main"` | Running uvicorn from wrong directory | `cd` into the service folder first, or use `--app-dir`. |
| Weather panel doesn't populate | City regex didn't match | Try phrasing like "What's the weather in London?" (capitalized city name after "in/for/at"). |
| First chat message is slow (local) | Lazy agent initialization | Expected. The LLM and agent are built on the first request. Subsequent messages are faster. |
| Docker build fails with network errors | No internet during build | Ensure Docker has network access. On corporate networks, configure Docker's DNS settings. |
| `docker compose up` exits immediately | Missing `.env` files or bad API keys | Create both `.env` files before running. Check logs with `docker compose logs <service-name>`. |
| Port already in use with Docker | Another process on 8000/8001/5173 | Stop the other process, or change port mappings in `docker-compose.yml` (e.g., `"9000:8000"`). |

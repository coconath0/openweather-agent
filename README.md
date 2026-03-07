# OpenWeather Agent

A conversational weather assistant that lets you ask about current conditions and forecasts for any city in natural language. It combines a React chat UI, a LangChain-powered agent backend, and an MCP weather data server into a three-service architecture.

![Stack: React · FastAPI · LangChain · Gemini · OpenWeather](https://img.shields.io/badge/stack-React%20%7C%20FastAPI%20%7C%20LangChain%20%7C%20Gemini%20%7C%20OpenWeather-blue)

---

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. MCP Server](#1-mcp-server-mcp-server)
  - [2. Agent Backend](#2-agent-backend-agent-backend)
  - [3. Frontend](#3-frontend-frontend)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌──────────────┐        ┌──────────────────┐        ┌───────────────────┐
│   Frontend   │  POST  │  Agent Backend   │  GET   │    MCP Server     │
│  React/Vite  │───────▶│  FastAPI +       │───────▶│  FastAPI +        │
│  :5173       │◀───────│  LangChain Agent │◀───────│  OpenWeather API  │
│              │  JSON  │  :8001           │  JSON  │  :8000            │
└──────────────┘        └──────────────────┘        └───────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Google       │
                        │  Gemini API  │
                        │  (gemini-2.0-│
                        │   flash)     │
                        └──────────────┘
```

**Data flow:**

1. The user types a weather question in the **Frontend** chat UI.
2. The **Frontend** sends a `POST /chat` request to the **Agent Backend**.
3. The **Agent Backend** runs a LangChain agent (Gemini 2.0 Flash) that decides which tool to call.
4. The agent's tools (`get_current_weather`, `get_forecast`) make HTTP requests to the **MCP Server**.
5. The **MCP Server** calls the OpenWeather API (geocoding → weather/forecast), normalizes the data, and returns JSON.
6. The agent receives the weather data, composes a natural-language answer, and sends it back to the frontend.

---

## Project Structure

```
openweather-agent/
├── README.md
├── mcp-server/                 # Weather data service
│   ├── main.py                 # FastAPI app – wraps OpenWeather API
│   ├── requirements.txt        # Python dependencies (fastapi, uvicorn, httpx, python-dotenv)
│   └── .env                    # OPENWEATHER_API_KEY (you create this)
├── agent-backend/              # Chat agent service
│   ├── main.py                 # FastAPI app – LangChain agent + /chat endpoint
│   ├── requirements.txt        # Python dependencies (langchain, langchain-google-genai, fastapi, …)
│   └── .env                    # MCP_SERVER_URL, GOOGLE_API_KEY (you create this)
└── frontend/                   # Chat UI
    ├── package.json            # React 19, Vite 7
    ├── src/
    │   ├── main.jsx            # Vite entry point
    │   ├── App.jsx             # Chat interface (components, send logic, error handling)
    │   ├── App.css             # Animations & interactive styles
    │   └── index.css           # Global reset & base styles
    └── …
```

---

## How It Works

### MCP Server (`mcp-server/main.py`)

A lightweight FastAPI service that acts as a proxy to the [OpenWeather API](https://openweathermap.org/api). It provides two main endpoints:

- **`GET /current-weather?city=<name>`** — Geocodes the city name, fetches current conditions, and returns a simplified JSON object with temperature (°F), description, humidity, and wind speed.
- **`GET /forecast?city=<name>&days=<1-5>`** — Geocodes the city, fetches the 5-day/3-hour forecast, groups data by date, and returns daily high/low temperatures (°F) with descriptions.

Both endpoints use `httpx.AsyncClient` for non-blocking HTTP calls and include error handling for invalid API keys, unknown cities, and upstream API failures.

### Agent Backend (`agent-backend/main.py`)

A FastAPI service that wraps a **LangChain agent** powered by **Google Gemini 2.0 Flash** (free tier). Key components:

- **Tools** — Two LangChain `@tool`-decorated functions:
  - `get_current_weather(city)` — calls the MCP server's `/current-weather` endpoint.
  - `get_forecast(city, days)` — calls the MCP server's `/forecast` endpoint.
- **Agent** — Built with `create_openai_tools_agent` + `AgentExecutor` (classic LangChain) or falls back to `create_agent` (LangChain v1 graph API) depending on your installed version. The agent is initialized lazily on the first request so the server can start without an API key set.
- **System prompt** — Instructs the agent to always use its tools for real data, mention the city name, be conversational, and give practical advice (activities, clothing suggestions).
- **`POST /chat`** — Accepts `{"message": "..."}`, runs the agent, and returns `{"response": "..."}`. Returns `503` if the API quota is exceeded.

### Frontend (`frontend/`)

A **React 19 + Vite 7** single-page chat application (JavaScript, not TypeScript). Features:

- Clean chat bubble UI with user messages on the right (blue) and agent messages on the left (gray) with an avatar.
- Animated typing indicator (three bouncing dots) while waiting for a response.
- Auto-scroll to the latest message.
- Graceful error handling — detects quota/rate-limit errors and shows a user-friendly message instead of a raw error.
- CORS-configured to talk to the agent backend at `http://localhost:8001`.

---

## Prerequisites

| Requirement            | Minimum Version | Purpose                          |
|------------------------|-----------------|----------------------------------|
| Python                 | 3.11+           | MCP server & agent backend       |
| Node.js                | 18+             | Frontend dev server & build      |
| OpenWeather API key    | —               | Weather data (free tier works)   |
| Google Gemini API key  | —               | Gemini 2.0 Flash agent (free tier) |

Get your API keys:
- **OpenWeather**: https://openweathermap.org/api_keys (sign up for free)
- **Google Gemini**: https://aistudio.google.com/apikey (free tier: 15 req/min, 1M tokens/day)

---

## Getting Started

All three services must be running for the app to work. Start them in order:

### 1. MCP Server (`mcp-server`)

```bash
cd mcp-server
pip install -r requirements.txt
```

Create a `.env` file in the `mcp-server/` directory:

```env
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

Start the server on port **8000**:

```bash
uvicorn main:app --reload --port 8000
```

Verify it's running:

```bash
curl http://127.0.0.1:8000/health
# → {"status":"ok"}
```

### 2. Agent Backend (`agent-backend`)

```bash
cd agent-backend
pip install -r requirements.txt
```

Create a `.env` file in the `agent-backend/` directory:

```env
MCP_SERVER_URL=http://127.0.0.1:8000
GOOGLE_API_KEY=your_gemini_api_key_here
```

Start the server on port **8001**:

```bash
uvicorn main:app --reload --port 8001
```

> **Tip:** If you prefer running from the repo root:
> ```bash
> uvicorn main:app --reload --port 8001 --app-dir agent-backend
> ```

Verify it's running:

```bash
curl http://127.0.0.1:8001/health
# → {"status":"ok"}
```

### 3. Frontend (`frontend`)

```bash
cd frontend
npm install
```

Start the dev server (default port **5173**):

```bash
npm run dev
```

Open **http://localhost:5173** in your browser and start chatting!

To build for production:

```bash
npm run build
npm run preview
```

---

## API Reference

### MCP Server (port 8000)

| Method | Endpoint                     | Description                         | Example                                      |
|--------|------------------------------|-------------------------------------|----------------------------------------------|
| GET    | `/health`                    | Health check                        | `curl http://127.0.0.1:8000/health`          |
| GET    | `/current-weather?city=`     | Current weather for a city          | `curl "http://127.0.0.1:8000/current-weather?city=London"` |
| GET    | `/forecast?city=&days=`      | Daily forecast (1–5 days)           | `curl "http://127.0.0.1:8000/forecast?city=Austin&days=3"` |

**Current weather response:**

```json
{
  "city": "London",
  "temperature_fahrenheit": 55.4,
  "description": "overcast clouds",
  "humidity": 72,
  "wind_speed_mph": 11.5
}
```

**Forecast response:**

```json
{
  "city": "Austin",
  "daily": [
    {
      "date": "2026-03-07",
      "high_temp_fahrenheit": 78.5,
      "low_temp_fahrenheit": 62.1,
      "description": "scattered clouds"
    }
  ]
}
```

### Agent Backend (port 8001)

| Method | Endpoint   | Body                          | Description                     |
|--------|------------|-------------------------------|---------------------------------|
| GET    | `/health`  | —                             | Health check                    |
| POST   | `/chat`    | `{"message": "your question"}`| Send a message to the agent     |

**Chat example:**

```bash
curl -X POST http://127.0.0.1:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather like in Austin right now?"}'
```

**Response:**

```json
{
  "response": "Right now in Austin, it's 75°F with clear skies and a gentle breeze at 8 mph. Great weather for a walk or outdoor dining!"
}
```

**Error responses:**

| Status | Meaning                              |
|--------|--------------------------------------|
| 503    | API quota/rate limit exceeded         |
| 500    | Agent execution failed               |

---

## Environment Variables

| Variable              | Service         | Required | Description                                    |
|-----------------------|-----------------|----------|------------------------------------------------|
| `OPENWEATHER_API_KEY` | mcp-server      | Yes      | API key from openweathermap.org                |
| `GOOGLE_API_KEY`      | agent-backend   | Yes      | API key from aistudio.google.com               |
| `MCP_SERVER_URL`      | agent-backend   | Yes      | URL of the MCP server (e.g. `http://127.0.0.1:8000`) |

---

## Troubleshooting

| Problem                                    | Cause                                          | Fix                                                                                      |
|--------------------------------------------|-------------------------------------------------|------------------------------------------------------------------------------------------|
| `503` from MCP server                      | Missing or invalid `OPENWEATHER_API_KEY`        | Check your `.env` file and ensure the key is active at openweathermap.org                |
| `503` from agent backend                   | Gemini quota exceeded or invalid key            | Verify your `GOOGLE_API_KEY` at aistudio.google.com                                      |
| `404` from `/current-weather` or `/forecast` | City name not found by OpenWeather geocoding   | Double-check the city spelling                                                            |
| Frontend shows "temporarily unavailable"   | Backend returned 503 (quota issue)              | Same as the 503 fix above — check your Gemini API key                                     |
| CORS errors in browser console             | Frontend URL doesn't match backend CORS config  | Backend allows `http://localhost:5173` — make sure the frontend runs on that port         |
| `Could not import module "main"`           | Running uvicorn from the wrong directory        | `cd` into the service folder first, or use `--app-dir`                                    |

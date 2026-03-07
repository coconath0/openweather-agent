# openweather-agent

OpenWeather-powered weather assistant with three parts:

- `mcp-server/`: FastAPI weather data service (OpenWeather wrapper)
- `agent-backend/`: FastAPI chat backend with a LangChain weather agent
- `frontend/`: React + Vite UI

## Architecture

1. Frontend sends user messages to `agent-backend` (`POST /chat`).
2. Agent backend uses LangChain tools to call the MCP server for real weather data.
3. MCP server calls OpenWeather APIs and returns normalized weather JSON.

## Prerequisites

- Python 3.11+
- Node.js 18+
- OpenWeather API key from https://openweathermap.org/api_keys
- OpenAI API key with available quota

## 1. MCP Server Setup (`mcp-server`)

Install dependencies:

```bash
cd mcp-server
pip install -r requirements.txt
```

Configure environment:

```bash
cp .env.example .env
```

Set in `.env`:

```env
OPENWEATHER_API_KEY=your_openweather_api_key
```

Run on port `8000`:

```bash
python -m uvicorn main:app --reload --port 8000
```

MCP endpoints:

- `GET /health`
- `GET /current-weather?city=London`
- `GET /forecast?city=Austin&days=3`

## 2. Agent Backend Setup (`agent-backend`)

Install dependencies:

```bash
cd agent-backend
pip install -r requirements.txt
```

Create `agent-backend/.env` and set:

```env
MCP_SERVER_URL=http://127.0.0.1:8000
OPENAI_API_KEY=your_openai_api_key
```

Run on port `8001`:

```bash
python -m uvicorn main:app --reload --port 8001
```

If running from repo root, use:

```bash
uvicorn main:app --reload --port 8001 --app-dir agent-backend
```

Agent backend endpoints:

- `GET /health`
- `POST /chat`

Example chat request:

```bash
curl -X POST http://127.0.0.1:8001/chat \
	-H "Content-Type: application/json" \
	-d '{"message":"What is the weather like in Austin right now?"}'
```

Example response:

```json
{"response":"..."}
```

## 3. Frontend Setup (`frontend`)

Install dependencies:

```bash
cd frontend
npm install
```

Run dev server (default port `5173`):

```bash
npm run dev
```

Build production assets:

```bash
npm run build
```

## Local Run Order

Start services in this order:

1. `mcp-server` on `http://127.0.0.1:8000`
2. `agent-backend` on `http://127.0.0.1:8001`
3. `frontend` on `http://localhost:5173`

## Notes

- Backend CORS currently allows `http://localhost:5173`.
- If OpenAI quota is exceeded, `/chat` returns `503` with a quota/rate-limit message.

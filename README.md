# openweather-agent

OpenWeather-powered agent project, built in phases.

---

## Phase 1 — MCP Server (Part 1)

Phase 1 delivers the **MCP Server**: a FastAPI app that wraps the OpenWeatherMap API and exposes weather endpoints. This is the foundation other phases will use.

### Setup

```bash
cd mcp-server
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set your `OPENWEATHER_API_KEY` (get one at [openweathermap.org](https://openweathermap.org/api_keys)).

### Run

```bash
python -m uvicorn main:app --reload --port 8000
```

Server runs at [http://localhost:8000](http://localhost:8000).

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check. Returns `{"status": "ok"}`. |
| GET | `/current-weather?city=` | Current weather for a city. Returns city name, temperature (°F), description, humidity, wind speed. |
| GET | `/forecast?city=&days=` | Daily forecast. `days` is optional (1–5, default 1). Returns date, high/low temp (°F), and description per day. |

### Examples

- Health: [http://localhost:8000/health](http://localhost:8000/health)
- Current weather: [http://localhost:8000/current-weather?city=London](http://localhost:8000/current-weather?city=London)
- Forecast: [http://localhost:8000/forecast?city=Austin&days=3](http://localhost:8000/forecast?city=Austin&days=3)

---

*Phase 2 and beyond will be documented here as they’re added.*

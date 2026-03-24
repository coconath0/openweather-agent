"""MCP Server - FastAPI app."""

import os
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx

load_dotenv()
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEO_URL = "https://api.openweathermap.org/geo/1.0/direct"
WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/current-weather")
async def current_weather(
    city: str = Query(..., description="City name"),
):
    """
    Get current weather for a city.
    Returns: city name, temperature (°C), description, humidity, wind speed.
    """
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key or not api_key.strip():
        raise HTTPException(
            status_code=503,
            detail="OPENWEATHER_API_KEY is not set. Add it to your .env file.",
        )
    api_key = api_key.strip()

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Resolve city name to coordinates
        geo = await client.get(
            GEO_URL,
            params={"q": city.strip(), "limit": 1, "appid": api_key},
        )
        if geo.status_code == 401:
            raise HTTPException(
                status_code=503,
                detail="Invalid OpenWeather API key. Check OPENWEATHER_API_KEY in .env and ensure the key is active at openweathermap.org.",
            )
        if geo.status_code != 200:
            try:
                err_body = geo.json()
            except Exception:
                err_body = geo.text or str(geo.status_code)
            raise HTTPException(
                status_code=502,
                detail=f"Geocoding error ({geo.status_code}): {err_body}",
            )
        locations = geo.json()
        # OpenWeatherMap sometimes returns 200 with {"cod": 401, "message": "..."}
        if isinstance(locations, dict) and locations.get("cod") != 200:
            msg = locations.get("message", "Unknown API error")
            if locations.get("cod") == 401:
                raise HTTPException(
                    status_code=503,
                    detail=f"Invalid OpenWeather API key: {msg}",
                )
            raise HTTPException(status_code=502, detail=f"Geocoding API: {msg}")
        if not isinstance(locations, list):
            locations = []
        if not locations:
            raise HTTPException(
                status_code=404,
                detail=f"City not found: {city.strip()!r}. Check the name and try again.",
            )
        lat = locations[0]["lat"]
        lon = locations[0]["lon"]
        name = locations[0].get("name", city.strip())

        # Fetch current weather (metric = Celsius, wind in m/s)
        weather = await client.get(
            WEATHER_URL,
            params={
                "lat": lat,
                "lon": lon,
                "appid": api_key,
                "units": "metric",
            },
        )
        if weather.status_code == 401:
            raise HTTPException(
                status_code=503,
                detail="Invalid OpenWeather API key. Check OPENWEATHER_API_KEY in .env and ensure the key is active at openweathermap.org.",
            )
        if weather.status_code != 200:
            try:
                err_body = weather.json()
            except Exception:
                err_body = weather.text or str(weather.status_code)
            raise HTTPException(
                status_code=502,
                detail=f"Weather API error ({weather.status_code}): {err_body}",
            )
        data = weather.json()
        # OpenWeatherMap can return 200 with {"cod": 401, "message": "..."}
        if isinstance(data, dict) and data.get("cod") is not None and data.get("cod") != 200:
            msg = data.get("message", "Unknown API error")
            if data.get("cod") == 401:
                raise HTTPException(
                    status_code=503,
                    detail=f"Invalid OpenWeather API key: {msg}",
                )
            raise HTTPException(status_code=502, detail=f"Weather API: {msg}")

    main = data.get("main", {})
    wind = data.get("wind", {})
    weather_list = data.get("weather") or []
    description = weather_list[0].get("description", "") if weather_list else ""

    return {
        "city": name,
        "temperature_celsius": main.get("temp"),
        "description": description,
        "humidity": main.get("humidity"),
        "wind_speed_kmh": round(wind.get("speed", 0) * 3.6, 1),
    }


@app.get("/forecast")
async def forecast(
    city: str = Query(..., description="City name"),
    days: int = Query(1, ge=1, le=5, description="Number of days (1–5)"),
):
    """
    Get weather forecast for a city.
    Returns daily summary: date, high temp (°C), low temp (°C), description.
    """
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key or not api_key.strip():
        raise HTTPException(
            status_code=503,
            detail="OPENWEATHER_API_KEY is not set. Add it to your .env file.",
        )
    api_key = api_key.strip()

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Resolve city name to coordinates
        geo = await client.get(
            GEO_URL,
            params={"q": city.strip(), "limit": 1, "appid": api_key},
        )
        if geo.status_code == 401:
            raise HTTPException(
                status_code=503,
                detail="Invalid OpenWeather API key. Check OPENWEATHER_API_KEY in .env and ensure the key is active at openweathermap.org.",
            )
        if geo.status_code != 200:
            try:
                err_body = geo.json()
            except Exception:
                err_body = geo.text or str(geo.status_code)
            raise HTTPException(
                status_code=502,
                detail=f"Geocoding error ({geo.status_code}): {err_body}",
            )
        locations = geo.json()
        if isinstance(locations, dict) and locations.get("cod") != 200:
            msg = locations.get("message", "Unknown API error")
            if locations.get("cod") == 401:
                raise HTTPException(
                    status_code=503,
                    detail=f"Invalid OpenWeather API key: {msg}",
                )
            raise HTTPException(status_code=502, detail=f"Geocoding API: {msg}")
        if not isinstance(locations, list):
            locations = []
        if not locations:
            raise HTTPException(
                status_code=404,
                detail=f"City not found: {city.strip()!r}. Check the name and try again.",
            )
        lat = locations[0]["lat"]
        lon = locations[0]["lon"]

        # Fetch 5-day forecast (metric = Celsius)
        forecast_resp = await client.get(
            FORECAST_URL,
            params={
                "lat": lat,
                "lon": lon,
                "appid": api_key,
                "units": "metric",
            },
        )
        if forecast_resp.status_code == 401:
            raise HTTPException(
                status_code=503,
                detail="Invalid OpenWeather API key. Check OPENWEATHER_API_KEY in .env and ensure the key is active at openweathermap.org.",
            )
        if forecast_resp.status_code != 200:
            try:
                err_body = forecast_resp.json()
            except Exception:
                err_body = forecast_resp.text or str(forecast_resp.status_code)
            raise HTTPException(
                status_code=502,
                detail=f"Forecast API error ({forecast_resp.status_code}): {err_body}",
            )
        forecast_data = forecast_resp.json()
        if isinstance(forecast_data, dict) and forecast_data.get("cod") is not None and forecast_data.get("cod") != "200" and forecast_data.get("cod") != 200:
            msg = forecast_data.get("message", "Unknown API error")
            if forecast_data.get("cod") == 401:
                raise HTTPException(
                    status_code=503,
                    detail=f"Invalid OpenWeather API key: {msg}",
                )
            raise HTTPException(status_code=502, detail=f"Forecast API: {msg}")

    # Group 3-hour intervals by date and build daily summary
    items = forecast_data.get("list") or []
    by_date: dict[str, list[dict]] = {}
    for entry in items:
        dt = entry.get("dt")
        if not dt:
            continue
        date_key = datetime.utcfromtimestamp(dt).strftime("%Y-%m-%d")
        if date_key not in by_date:
            by_date[date_key] = []
        main = entry.get("main", {})
        weather_list = entry.get("weather") or []
        desc = weather_list[0].get("description", "") if weather_list else ""
        by_date[date_key].append({
            "temp": main.get("temp"),
            "temp_min": main.get("temp_min"),
            "temp_max": main.get("temp_max"),
            "description": desc,
        })

    daily = []
    for date_key in sorted(by_date.keys())[:days]:
        entries = by_date[date_key]
        temps = []
        for e in entries:
            t = e.get("temp")
            tmin = e.get("temp_min")
            tmax = e.get("temp_max")
            if t is not None:
                temps.append(t)
            if tmin is not None:
                temps.append(tmin)
            if tmax is not None:
                temps.append(tmax)
        high = max(temps) if temps else None
        low = min(temps) if temps else None
        description = entries[0].get("description", "") if entries else ""
        daily.append({
            "date": date_key,
            "high_temp_celsius": high,
            "low_temp_celsius": low,
            "description": description,
        })

    return {"city": city.strip(), "forecast": daily}

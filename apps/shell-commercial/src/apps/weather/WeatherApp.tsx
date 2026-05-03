import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  Wind,
  Droplets,
  Eye,
  Gauge,
  Thermometer,
  MapPin,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Navigation,
  AlertCircle,
  Loader,
  RefreshCw,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────────────── */

type Condition =
  | "sunny"
  | "partly-cloudy"
  | "cloudy"
  | "light-rain"
  | "rainy"
  | "thunderstorm"
  | "foggy";

type LocationStatus =
  | "prompt" // permission not yet asked
  | "requesting" // geolocation in progress
  | "loading" // fetching weather API
  | "granted" // live data ready
  | "denied" // permission denied
  | "unavailable" // API not supported
  | "error"; // network/API error

interface HourlyPoint {
  time: string;
  condition: Condition;
  temp: number;
  precip: number;
}

interface DailyPoint {
  day: string;
  condition: Condition;
  high: number;
  low: number;
  precip: number;
}

interface WeatherData {
  city: string;
  state: string;
  isLive: boolean;
  temp: number;
  feelsLike: number;
  condition: Condition;
  conditionLabel: string;
  high: number;
  low: number;
  humidity: number;
  wind: number;
  windDir: string;
  uvIndex: number;
  visibility: number;
  pressure: number;
  dewPoint: number;
  aqi: number;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
}

/* ─── Open-Meteo response shape (partial) ────────────────────────────────── */

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    surface_pressure: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
    visibility: number[];
    dew_point_2m: number[];
    uv_index: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    uv_index_max: number[];
  };
}

/* ─── Condition config ─────────────────────────────────────────────────────── */

const CONDITION_CONFIG: Record<
  Condition,
  { icon: typeof Sun; color: string; bg: string; glow: string }
> = {
  sunny: {
    icon: Sun,
    color: "#fbbf24",
    bg: "linear-gradient(160deg, #92400e 0%, #b45309 20%, #7c3aed 55%, #0f172a 100%)",
    glow: "rgba(251,191,36,0.3)",
  },
  "partly-cloudy": {
    icon: CloudSun,
    color: "#60a5fa",
    bg: "linear-gradient(160deg, #0c4a6e 0%, #075985 25%, #1e3a5f 55%, #0f172a 100%)",
    glow: "rgba(96,165,250,0.25)",
  },
  cloudy: {
    icon: Cloud,
    color: "#94a3b8",
    bg: "linear-gradient(160deg, #1e293b 0%, #334155 25%, #1e293b 60%, #0f172a 100%)",
    glow: "rgba(148,163,184,0.2)",
  },
  "light-rain": {
    icon: CloudDrizzle,
    color: "#38bdf8",
    bg: "linear-gradient(160deg, #0c4a6e 0%, #0e7490 25%, #164e63 55%, #0f172a 100%)",
    glow: "rgba(56,189,248,0.25)",
  },
  rainy: {
    icon: CloudRain,
    color: "#3b82f6",
    bg: "linear-gradient(160deg, #1e3a5f 0%, #1d4ed8 20%, #1e40af 50%, #0f172a 100%)",
    glow: "rgba(59,130,246,0.25)",
  },
  thunderstorm: {
    icon: CloudLightning,
    color: "#a78bfa",
    bg: "linear-gradient(160deg, #1e1b4b 0%, #312e81 30%, #1e1b4b 60%, #0a0a1a 100%)",
    glow: "rgba(167,139,250,0.3)",
  },
  foggy: {
    icon: CloudFog,
    color: "#cbd5e1",
    bg: "linear-gradient(160deg, #334155 0%, #475569 30%, #334155 60%, #1e293b 100%)",
    glow: "rgba(203,213,225,0.2)",
  },
};

const DAY_LABELS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* ─── API helpers ─────────────────────────────────────────────────────────── */

function wmoToCondition(code: number): Condition {
  if (code === 0) return "sunny";
  if (code <= 2) return "partly-cloudy";
  if (code === 3) return "cloudy";
  if (code <= 48) return "foggy";
  if (code <= 55) return "light-rain";
  if (code <= 82) return "rainy";
  if (code <= 99) return "thunderstorm";
  return "partly-cloudy";
}

function wmoToLabel(code: number): string {
  if (code === 0) return "Céu limpo";
  if (code === 1) return "Principalmente limpo";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code <= 48) return "Névoa";
  if (code <= 55) return "Garoa";
  if (code <= 65) return "Chuva";
  if (code <= 75) return "Neve";
  if (code <= 82) return "Chuvas";
  if (code <= 99) return "Trovoada";
  return "Variado";
}

function degToCompass(deg: number): string {
  const dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8] ?? "N";
}

function parseOpenMeteo(
  raw: OpenMeteoResponse,
  city: string,
  state: string,
): WeatherData {
  const c = raw.current;
  const h = raw.hourly;
  const d = raw.daily;

  // Find current hour index in the hourly array
  const nowPrefix = new Date().toISOString().slice(0, 14).replace("T", "T"); // "2025-05-02T13"
  let startIdx = h.time.findIndex((t) => t >= nowPrefix.slice(0, 13));
  if (startIdx < 0) startIdx = 0;

  const hourly: HourlyPoint[] = Array.from({ length: 24 }, (_, i) => {
    const idx = startIdx + i;
    const t = h.time[idx] ?? "";
    const hour = new Date(t + ":00").getHours();
    return {
      time: i === 0 ? "Agora" : `${hour}h`,
      condition: wmoToCondition(h.weather_code[idx] ?? 0),
      temp: Math.round(h.temperature_2m[idx] ?? c.temperature_2m),
      precip: h.precipitation_probability[idx] ?? 0,
    };
  });

  const daily: DailyPoint[] = d.time.slice(0, 10).map((t, i) => {
    const date = new Date(t + "T12:00:00");
    return {
      day: i === 0 ? "Hoje" : (DAY_LABELS_PT[date.getDay()] ?? "?"),
      condition: wmoToCondition(d.weather_code[i] ?? 0),
      high: Math.round(d.temperature_2m_max[i] ?? c.temperature_2m),
      low: Math.round(d.temperature_2m_min[i] ?? c.temperature_2m),
      precip: d.precipitation_probability_max[i] ?? 0,
    };
  });

  const uvIndex = Math.round(h.uv_index[startIdx] ?? d.uv_index_max[0] ?? 0);
  const visibility = Math.round((h.visibility[startIdx] ?? 10000) / 1000);
  const dewPoint = Math.round(h.dew_point_2m[startIdx] ?? c.temperature_2m - 4);

  return {
    city,
    state,
    isLive: true,
    temp: Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    condition: wmoToCondition(c.weather_code),
    conditionLabel: wmoToLabel(c.weather_code),
    high: Math.round(d.temperature_2m_max[0] ?? c.temperature_2m),
    low: Math.round(d.temperature_2m_min[0] ?? c.temperature_2m),
    humidity: Math.round(c.relative_humidity_2m),
    wind: Math.round(c.wind_speed_10m),
    windDir: degToCompass(c.wind_direction_10m),
    uvIndex,
    visibility,
    pressure: Math.round(c.surface_pressure),
    dewPoint,
    aqi: 40, // Open-Meteo free tier doesn't include AQI
    hourly,
    daily,
  };
}

async function fetchWeatherApi(
  lat: number,
  lon: number,
): Promise<OpenMeteoResponse> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure",
    hourly:
      "temperature_2m,precipitation_probability,weather_code,visibility,dew_point_2m,uv_index",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
    timezone: "auto",
    forecast_days: "10",
    wind_speed_unit: "kmh",
  });

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
  );
  if (!res.ok) throw new Error("weather_api_error");
  return res.json() as Promise<OpenMeteoResponse>;
}

async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<{ city: string; state: string }> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt-BR`,
    { headers: { "Accept-Language": "pt-BR" } },
  );
  if (!res.ok) throw new Error("geocode_error");
  const data = (await res.json()) as {
    address?: {
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      state?: string;
      state_code?: string;
    };
    name?: string;
  };
  const addr = data.address ?? {};
  const city =
    addr.city ??
    addr.town ??
    addr.village ??
    addr.municipality ??
    data.name ??
    "Localização atual";
  const state = addr.state_code ?? addr.state ?? "";
  return { city, state };
}

/* ─── Mock cities fallback ────────────────────────────────────────────────── */

const MOCK_CITIES: WeatherData[] = [
  {
    city: "São Paulo",
    state: "SP",
    isLive: false,
    temp: 24,
    feelsLike: 26,
    condition: "partly-cloudy",
    conditionLabel: "Parcialmente nublado",
    high: 27,
    low: 18,
    humidity: 72,
    wind: 14,
    windDir: "NE",
    uvIndex: 5,
    visibility: 10,
    pressure: 1013,
    dewPoint: 18,
    aqi: 42,
    hourly: [
      { time: "Agora", condition: "partly-cloudy", temp: 24, precip: 10 },
      { time: "14h", condition: "partly-cloudy", temp: 25, precip: 8 },
      { time: "15h", condition: "cloudy", temp: 25, precip: 18 },
      { time: "16h", condition: "light-rain", temp: 23, precip: 45 },
      { time: "17h", condition: "rainy", temp: 21, precip: 72 },
      { time: "18h", condition: "rainy", temp: 20, precip: 68 },
      { time: "19h", condition: "light-rain", temp: 20, precip: 35 },
      { time: "20h", condition: "cloudy", temp: 19, precip: 20 },
      { time: "21h", condition: "cloudy", temp: 19, precip: 12 },
      { time: "22h", condition: "partly-cloudy", temp: 19, precip: 5 },
      { time: "23h", condition: "partly-cloudy", temp: 19, precip: 4 },
      { time: "00h", condition: "partly-cloudy", temp: 18, precip: 3 },
      { time: "01h", condition: "partly-cloudy", temp: 18, precip: 2 },
      { time: "02h", condition: "cloudy", temp: 18, precip: 5 },
      { time: "03h", condition: "cloudy", temp: 18, precip: 8 },
      { time: "04h", condition: "cloudy", temp: 18, precip: 6 },
      { time: "05h", condition: "partly-cloudy", temp: 18, precip: 4 },
      { time: "06h", condition: "sunny", temp: 19, precip: 2 },
      { time: "07h", condition: "sunny", temp: 20, precip: 0 },
      { time: "08h", condition: "sunny", temp: 22, precip: 0 },
      { time: "09h", condition: "sunny", temp: 23, precip: 0 },
      { time: "10h", condition: "partly-cloudy", temp: 25, precip: 5 },
      { time: "11h", condition: "partly-cloudy", temp: 26, precip: 8 },
      { time: "12h", condition: "partly-cloudy", temp: 27, precip: 12 },
    ],
    daily: [
      {
        day: "Hoje",
        condition: "partly-cloudy",
        high: 27,
        low: 18,
        precip: 45,
      },
      { day: "Seg", condition: "rainy", high: 22, low: 17, precip: 80 },
      { day: "Ter", condition: "light-rain", high: 23, low: 17, precip: 55 },
      { day: "Qua", condition: "cloudy", high: 25, low: 18, precip: 20 },
      { day: "Qui", condition: "partly-cloudy", high: 27, low: 19, precip: 10 },
      { day: "Sex", condition: "sunny", high: 29, low: 20, precip: 5 },
      { day: "Sáb", condition: "sunny", high: 30, low: 20, precip: 0 },
      { day: "Dom", condition: "partly-cloudy", high: 28, low: 19, precip: 15 },
      { day: "Seg", condition: "thunderstorm", high: 23, low: 17, precip: 90 },
      { day: "Ter", condition: "rainy", high: 21, low: 16, precip: 75 },
    ],
  },
  {
    city: "Rio de Janeiro",
    state: "RJ",
    isLive: false,
    temp: 31,
    feelsLike: 36,
    condition: "sunny",
    conditionLabel: "Ensolarado",
    high: 34,
    low: 25,
    humidity: 78,
    wind: 18,
    windDir: "SE",
    uvIndex: 10,
    visibility: 12,
    pressure: 1010,
    dewPoint: 25,
    aqi: 35,
    hourly: [
      { time: "Agora", condition: "sunny", temp: 31, precip: 0 },
      { time: "14h", condition: "sunny", temp: 33, precip: 0 },
      { time: "15h", condition: "sunny", temp: 34, precip: 2 },
      { time: "16h", condition: "partly-cloudy", temp: 33, precip: 8 },
      { time: "17h", condition: "partly-cloudy", temp: 31, precip: 12 },
      { time: "18h", condition: "cloudy", temp: 29, precip: 25 },
      { time: "19h", condition: "light-rain", temp: 27, precip: 40 },
      { time: "20h", condition: "rainy", temp: 26, precip: 65 },
      { time: "21h", condition: "light-rain", temp: 25, precip: 38 },
      { time: "22h", condition: "cloudy", temp: 25, precip: 15 },
      { time: "23h", condition: "partly-cloudy", temp: 25, precip: 5 },
      { time: "00h", condition: "partly-cloudy", temp: 25, precip: 3 },
      { time: "01h", condition: "partly-cloudy", temp: 25, precip: 2 },
      { time: "02h", condition: "partly-cloudy", temp: 25, precip: 2 },
      { time: "03h", condition: "sunny", temp: 25, precip: 0 },
      { time: "04h", condition: "sunny", temp: 25, precip: 0 },
      { time: "05h", condition: "sunny", temp: 26, precip: 0 },
      { time: "06h", condition: "sunny", temp: 27, precip: 0 },
      { time: "07h", condition: "sunny", temp: 28, precip: 0 },
      { time: "08h", condition: "sunny", temp: 30, precip: 0 },
      { time: "09h", condition: "sunny", temp: 32, precip: 2 },
      { time: "10h", condition: "sunny", temp: 33, precip: 3 },
      { time: "11h", condition: "partly-cloudy", temp: 34, precip: 5 },
      { time: "12h", condition: "partly-cloudy", temp: 34, precip: 8 },
    ],
    daily: [
      { day: "Hoje", condition: "sunny", high: 34, low: 25, precip: 10 },
      { day: "Seg", condition: "partly-cloudy", high: 33, low: 25, precip: 20 },
      { day: "Ter", condition: "thunderstorm", high: 28, low: 24, precip: 85 },
      { day: "Qua", condition: "rainy", high: 27, low: 23, precip: 70 },
      { day: "Qui", condition: "partly-cloudy", high: 31, low: 24, precip: 15 },
      { day: "Sex", condition: "sunny", high: 34, low: 25, precip: 5 },
      { day: "Sáb", condition: "sunny", high: 35, low: 25, precip: 0 },
      { day: "Dom", condition: "sunny", high: 35, low: 25, precip: 2 },
      { day: "Seg", condition: "partly-cloudy", high: 33, low: 25, precip: 18 },
      { day: "Ter", condition: "cloudy", high: 30, low: 24, precip: 35 },
    ],
  },
  {
    city: "Brasília",
    state: "DF",
    isLive: false,
    temp: 22,
    feelsLike: 20,
    condition: "cloudy",
    conditionLabel: "Nublado",
    high: 26,
    low: 15,
    humidity: 55,
    wind: 22,
    windDir: "N",
    uvIndex: 3,
    visibility: 8,
    pressure: 1018,
    dewPoint: 12,
    aqi: 28,
    hourly: [
      { time: "Agora", condition: "cloudy", temp: 22, precip: 15 },
      { time: "14h", condition: "cloudy", temp: 23, precip: 18 },
      { time: "15h", condition: "light-rain", temp: 22, precip: 38 },
      { time: "16h", condition: "rainy", temp: 20, precip: 60 },
      { time: "17h", condition: "thunderstorm", temp: 18, precip: 88 },
      { time: "18h", condition: "rainy", temp: 17, precip: 72 },
      { time: "19h", condition: "light-rain", temp: 17, precip: 42 },
      { time: "20h", condition: "cloudy", temp: 16, precip: 20 },
      { time: "21h", condition: "partly-cloudy", temp: 16, precip: 8 },
      { time: "22h", condition: "partly-cloudy", temp: 15, precip: 5 },
      { time: "23h", condition: "partly-cloudy", temp: 15, precip: 3 },
      { time: "00h", condition: "partly-cloudy", temp: 15, precip: 2 },
      { time: "01h", condition: "partly-cloudy", temp: 15, precip: 2 },
      { time: "02h", condition: "sunny", temp: 15, precip: 0 },
      { time: "03h", condition: "sunny", temp: 15, precip: 0 },
      { time: "04h", condition: "sunny", temp: 15, precip: 0 },
      { time: "05h", condition: "sunny", temp: 15, precip: 0 },
      { time: "06h", condition: "sunny", temp: 16, precip: 0 },
      { time: "07h", condition: "sunny", temp: 18, precip: 0 },
      { time: "08h", condition: "sunny", temp: 20, precip: 0 },
      { time: "09h", condition: "partly-cloudy", temp: 22, precip: 5 },
      { time: "10h", condition: "partly-cloudy", temp: 24, precip: 8 },
      { time: "11h", condition: "cloudy", temp: 25, precip: 15 },
      { time: "12h", condition: "cloudy", temp: 26, precip: 18 },
    ],
    daily: [
      { day: "Hoje", condition: "cloudy", high: 26, low: 15, precip: 60 },
      { day: "Seg", condition: "sunny", high: 28, low: 14, precip: 5 },
      { day: "Ter", condition: "sunny", high: 29, low: 14, precip: 0 },
      { day: "Qua", condition: "partly-cloudy", high: 27, low: 15, precip: 12 },
      { day: "Qui", condition: "partly-cloudy", high: 26, low: 15, precip: 20 },
      { day: "Sex", condition: "cloudy", high: 24, low: 14, precip: 35 },
      { day: "Sáb", condition: "rainy", high: 22, low: 14, precip: 70 },
      { day: "Dom", condition: "thunderstorm", high: 20, low: 13, precip: 90 },
      { day: "Seg", condition: "light-rain", high: 23, low: 14, precip: 45 },
      { day: "Ter", condition: "partly-cloudy", high: 26, low: 14, precip: 15 },
    ],
  },
  {
    city: "Curitiba",
    state: "PR",
    isLive: false,
    temp: 14,
    feelsLike: 11,
    condition: "rainy",
    conditionLabel: "Chuva",
    high: 16,
    low: 10,
    humidity: 88,
    wind: 28,
    windDir: "SW",
    uvIndex: 1,
    visibility: 5,
    pressure: 1008,
    dewPoint: 12,
    aqi: 18,
    hourly: [
      { time: "Agora", condition: "rainy", temp: 14, precip: 82 },
      { time: "14h", condition: "rainy", temp: 14, precip: 78 },
      { time: "15h", condition: "thunderstorm", temp: 13, precip: 92 },
      { time: "16h", condition: "thunderstorm", temp: 12, precip: 95 },
      { time: "17h", condition: "rainy", temp: 11, precip: 80 },
      { time: "18h", condition: "light-rain", temp: 11, precip: 55 },
      { time: "19h", condition: "light-rain", temp: 10, precip: 40 },
      { time: "20h", condition: "cloudy", temp: 10, precip: 22 },
      { time: "21h", condition: "cloudy", temp: 10, precip: 15 },
      { time: "22h", condition: "partly-cloudy", temp: 10, precip: 8 },
      { time: "23h", condition: "partly-cloudy", temp: 10, precip: 5 },
      { time: "00h", condition: "partly-cloudy", temp: 10, precip: 4 },
      { time: "01h", condition: "partly-cloudy", temp: 10, precip: 3 },
      { time: "02h", condition: "cloudy", temp: 10, precip: 5 },
      { time: "03h", condition: "cloudy", temp: 10, precip: 8 },
      { time: "04h", condition: "light-rain", temp: 10, precip: 28 },
      { time: "05h", condition: "rainy", temp: 11, precip: 55 },
      { time: "06h", condition: "rainy", temp: 11, precip: 60 },
      { time: "07h", condition: "light-rain", temp: 12, precip: 38 },
      { time: "08h", condition: "cloudy", temp: 13, precip: 18 },
      { time: "09h", condition: "partly-cloudy", temp: 14, precip: 10 },
      { time: "10h", condition: "partly-cloudy", temp: 15, precip: 8 },
      { time: "11h", condition: "partly-cloudy", temp: 16, precip: 10 },
      { time: "12h", condition: "cloudy", temp: 16, precip: 20 },
    ],
    daily: [
      { day: "Hoje", condition: "rainy", high: 16, low: 10, precip: 88 },
      { day: "Seg", condition: "cloudy", high: 15, low: 9, precip: 30 },
      { day: "Ter", condition: "partly-cloudy", high: 17, low: 9, precip: 15 },
      { day: "Qua", condition: "sunny", high: 20, low: 10, precip: 5 },
      { day: "Qui", condition: "sunny", high: 22, low: 11, precip: 0 },
      { day: "Sex", condition: "partly-cloudy", high: 21, low: 11, precip: 10 },
      { day: "Sáb", condition: "cloudy", high: 18, low: 10, precip: 25 },
      { day: "Dom", condition: "light-rain", high: 16, low: 10, precip: 50 },
      { day: "Seg", condition: "rainy", high: 14, low: 9, precip: 75 },
      { day: "Ter", condition: "cloudy", high: 16, low: 9, precip: 30 },
    ],
  },
];

/* ─── Label helpers ────────────────────────────────────────────────────────── */

function uvLabel(uv: number): { label: string; color: string } {
  if (uv <= 2) return { label: "Baixo", color: "#34d399" };
  if (uv <= 5) return { label: "Moderado", color: "#fbbf24" };
  if (uv <= 7) return { label: "Alto", color: "#f97316" };
  if (uv <= 10) return { label: "Muito alto", color: "#ef4444" };
  return { label: "Extremo", color: "#a855f7" };
}

function aqiLabel(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Boa", color: "#34d399" };
  if (aqi <= 100) return { label: "Moderada", color: "#fbbf24" };
  if (aqi <= 150) return { label: "Insalubre", color: "#f97316" };
  return { label: "Perigosa", color: "#ef4444" };
}

/* ─── Primitive UI components ─────────────────────────────────────────────── */

function ConditionIcon({
  condition,
  size,
  style,
}: {
  condition: Condition;
  size: number;
  style?: React.CSSProperties;
}) {
  const cfg = CONDITION_CONFIG[condition];
  const Icon = cfg.icon;
  return (
    <Icon
      size={size}
      style={{ color: cfg.color, ...style }}
      strokeWidth={1.4}
    />
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.28)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.45)",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </p>
  );
}

/* ─── Hourly Forecast ─────────────────────────────────────────────────────── */

function HourlyForecast({ hourly }: { hourly: HourlyPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const minTemp = Math.min(...hourly.map((h) => h.temp));
  const maxTemp = Math.max(...hourly.map((h) => h.temp));

  function scroll(dir: -1 | 1) {
    ref.current?.scrollBy({ left: 200 * dir, behavior: "smooth" });
  }

  return (
    <Card style={{ padding: "16px 0 0" }}>
      <div style={{ padding: "0 16px 10px" }}>
        <CardLabel>
          <CloudSun size={11} />
          Previsão hora a hora
        </CardLabel>
      </div>
      <div style={{ position: "relative" }}>
        <div
          ref={ref}
          style={{
            display: "flex",
            overflowX: "auto",
            scrollbarWidth: "none",
            scrollSnapType: "x mandatory",
          }}
        >
          {hourly.map((h, i) => {
            const barH =
              maxTemp === minTemp
                ? 50
                : Math.round(
                    20 + (80 * (h.temp - minTemp)) / (maxTemp - minTemp),
                  );
            const isNow = i === 0;
            const cfg = CONDITION_CONFIG[h.condition];
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 12px 14px",
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  borderRight:
                    i < hourly.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                  background: isNow ? "rgba(255,255,255,0.04)" : "transparent",
                  minWidth: 60,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isNow ? 700 : 400,
                    color: isNow
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.45)",
                  }}
                >
                  {h.time}
                </span>
                <ConditionIcon condition={h.condition} size={18} />
                {h.precip > 0 ? (
                  <span
                    style={{ fontSize: 10, color: "#60a5fa", fontWeight: 600 }}
                  >
                    {h.precip}%
                  </span>
                ) : (
                  <span style={{ fontSize: 10, opacity: 0 }}>–</span>
                )}
                <div
                  style={{
                    width: 3,
                    height: 40,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.08)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${barH}%`,
                      borderRadius: 2,
                      background: `linear-gradient(to top, ${cfg.color}cc, ${cfg.color}55)`,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isNow ? 700 : 500,
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  {h.temp}°
                </span>
              </div>
            );
          })}
        </div>
        {([-1, 1] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => scroll(dir)}
            aria-label={dir === -1 ? "Anterior" : "Próximo"}
            style={{
              position: "absolute",
              [dir === -1 ? "left" : "right"]: 6,
              top: "45%",
              transform: "translateY(-50%)",
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
            }}
          >
            {dir === -1 ? (
              <ChevronLeft size={13} strokeWidth={2} />
            ) : (
              <ChevronRight size={13} strokeWidth={2} />
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ─── 10-Day Forecast ─────────────────────────────────────────────────────── */

function DailyForecast({ daily }: { daily: DailyPoint[] }) {
  const absMin = Math.min(...daily.map((d) => d.low));
  const absMax = Math.max(...daily.map((d) => d.high));
  const range = absMax - absMin || 1;

  return (
    <Card style={{ padding: "16px 0 0" }}>
      <div style={{ padding: "0 18px 10px" }}>
        <CardLabel>
          <CloudSun size={11} />
          Previsão 10 dias
        </CardLabel>
      </div>
      {daily.map((d, i) => {
        const barLeft = ((d.low - absMin) / range) * 100;
        const barWidth = ((d.high - d.low) / range) * 100;
        const cfg = CONDITION_CONFIG[d.condition];
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "52px 24px 32px 1fr 28px 28px",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
              background: i === 0 ? "rgba(255,255,255,0.03)" : "transparent",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: i === 0 ? 700 : 400,
                color:
                  i === 0 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
              }}
            >
              {d.day}
            </span>
            <ConditionIcon condition={d.condition} size={18} />
            {d.precip > 0 ? (
              <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600 }}>
                {d.precip}%
              </span>
            ) : (
              <span />
            )}
            <div
              style={{
                height: 5,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 3,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: `${barLeft}%`,
                  width: `${barWidth}%`,
                  top: 0,
                  bottom: 0,
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.4)",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {d.low}°
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {d.high}°
            </span>
          </div>
        );
      })}
    </Card>
  );
}

/* ─── Detail Card ─────────────────────────────────────────────────────────── */

function DetailCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  gauge,
}: {
  icon: typeof Sun;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  gauge?: number;
}) {
  return (
    <Card style={{ padding: "16px 18px 18px" }}>
      <CardLabel>
        <Icon size={11} />
        {label}
      </CardLabel>
      <p
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: accent ?? "rgba(255,255,255,0.92)",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {gauge !== undefined && (
        <div
          style={{
            height: 4,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 2,
            margin: "10px 0 6px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${gauge}%`,
              borderRadius: 2,
              background: accent
                ? `linear-gradient(90deg, ${accent}66, ${accent})`
                : "linear-gradient(90deg, #60a5fa66, #60a5fa)",
            }}
          />
        </div>
      )}
      {sub !== undefined && (
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.45)",
            marginTop: gauge !== undefined ? 0 : 6,
          }}
        >
          {sub}
        </p>
      )}
    </Card>
  );
}

/* ─── City Search overlay ──────────────────────────────────────────────────── */

function CitySearch({
  onSelect,
  onDetect,
  onClose,
  locationStatus,
}: {
  onSelect: (city: WeatherData) => void;
  onDetect: () => void;
  onClose: () => void;
  locationStatus: LocationStatus;
}) {
  const [query, setQuery] = useState("");
  const results = MOCK_CITIES.filter(
    (c) =>
      query === "" ||
      c.city.toLowerCase().includes(query.toLowerCase()) ||
      c.state.toLowerCase().includes(query.toLowerCase()),
  );

  const isDetecting =
    locationStatus === "requesting" || locationStatus === "loading";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        background: "rgba(6,9,18,0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        display: "flex",
        flexDirection: "column",
        padding: "24px",
        gap: 14,
      }}
    >
      {/* Search input + close */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255,255,255,0.4)",
              pointerEvents: "none",
            }}
            strokeWidth={1.8}
          />
          <input
            autoFocus
            type="search"
            placeholder="Buscar cidade…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "11px 12px 11px 38px",
              fontSize: 15,
              color: "rgba(255,255,255,0.9)",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            }}
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Detect location button */}
      {locationStatus !== "denied" && locationStatus !== "unavailable" && (
        <button
          type="button"
          onClick={onDetect}
          disabled={isDetecting}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.28)",
            borderRadius: 14,
            cursor: isDetecting ? "default" : "pointer",
            textAlign: "left",
            transition: "background 120ms",
            opacity: isDetecting ? 0.8 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isDetecting)
              e.currentTarget.style.background = "rgba(99,102,241,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(99,102,241,0.12)";
          }}
        >
          {isDetecting ? (
            <Loader
              size={20}
              style={{ color: "#818cf8", animation: "spin 1s linear infinite" }}
            />
          ) : (
            <Navigation
              size={20}
              style={{ color: "#818cf8" }}
              strokeWidth={1.8}
            />
          )}
          <div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {isDetecting
                ? "Detectando localização…"
                : "Usar minha localização"}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.45)",
                marginTop: 1,
              }}
            >
              {isDetecting
                ? "Buscando dados meteorológicos reais"
                : "Clima em tempo real para sua posição atual"}
            </p>
          </div>
        </button>
      )}

      {locationStatus === "denied" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.22)",
            borderRadius: 12,
          }}
        >
          <AlertCircle size={16} style={{ color: "#f87171", flexShrink: 0 }} />
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.5,
            }}
          >
            Acesso à localização bloqueado. Habilite nas configurações do
            navegador para usar dados em tempo real.
          </p>
        </div>
      )}

      {/* Cities list */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          overflowY: "auto",
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
            padding: "4px 0",
          }}
        >
          Cidades
        </p>
        {results.map((city) => {
          const cfg = CONDITION_CONFIG[city.condition];
          return (
            <button
              key={city.city}
              type="button"
              onClick={() => {
                onSelect(city);
                onClose();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 120ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
            >
              <ConditionIcon condition={city.condition} size={28} />
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.92)",
                  }}
                >
                  {city.city}, {city.state}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    marginTop: 2,
                  }}
                >
                  {city.conditionLabel}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: cfg.color,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {city.temp}°
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.35)",
                    marginTop: 2,
                  }}
                >
                  {city.high}° / {city.low}°
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Location permission prompt ─────────────────────────────────────────── */

function LocationPrompt({
  onDetect,
  onSkip,
  status,
}: {
  onDetect: () => void;
  onSkip: () => void;
  status: LocationStatus;
}) {
  const isRequesting = status === "requesting" || status === "loading";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "32px 24px",
        gap: 20,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 24,
          background: "rgba(99,102,241,0.14)",
          border: "1px solid rgba(99,102,241,0.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 40px rgba(99,102,241,0.2)",
        }}
      >
        {isRequesting ? (
          <Loader
            size={38}
            style={{ color: "#818cf8", animation: "spin 1s linear infinite" }}
          />
        ) : (
          <Navigation
            size={38}
            style={{ color: "#818cf8" }}
            strokeWidth={1.4}
          />
        )}
      </div>

      <div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            letterSpacing: "-0.03em",
            marginBottom: 8,
          }}
        >
          {isRequesting ? "Detectando localização…" : "Clima em tempo real"}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            maxWidth: 320,
          }}
        >
          {isRequesting
            ? "Buscando sua posição e dados meteorológicos atuais."
            : "Permita o acesso à localização para ver o clima real da sua cidade, com previsão hora a hora e 10 dias."}
        </p>
      </div>

      {!isRequesting && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: "100%",
            maxWidth: 300,
          }}
        >
          <button
            type="button"
            onClick={onDetect}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "13px 20px",
              background: "rgba(99,102,241,0.88)",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              color: "#ffffff",
              cursor: "pointer",
              transition: "background 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#6366f1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(99,102,241,0.88)";
            }}
          >
            <Navigation size={16} strokeWidth={2} />
            Permitir localização
          </button>

          <button
            type="button"
            onClick={onSkip}
            style={{
              padding: "11px 20px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.55)",
              cursor: "pointer",
              transition: "background 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.10)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
          >
            Escolher cidade manualmente
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────── */

export function WeatherApp() {
  const [status, setStatus] = useState<LocationStatus>("prompt");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [now] = useState(new Date());

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      if (MOCK_CITIES[0]) setWeather(MOCK_CITIES[0]);
      setShowPrompt(false);
      return;
    }

    setStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus("loading");
        try {
          const [weatherRaw, geoData] = await Promise.all([
            fetchWeatherApi(pos.coords.latitude, pos.coords.longitude),
            reverseGeocode(pos.coords.latitude, pos.coords.longitude),
          ]);
          const parsed = parseOpenMeteo(
            weatherRaw,
            geoData.city,
            geoData.state,
          );
          setWeather(parsed);
          setStatus("granted");
          setShowPrompt(false);
          setShowSearch(false);
        } catch {
          setStatus("error");
          if (MOCK_CITIES[0]) setWeather(MOCK_CITIES[0]);
          setShowPrompt(false);
        }
      },
      (err) => {
        setStatus(err.code === 1 ? "denied" : "error");
        if (MOCK_CITIES[0]) setWeather(MOCK_CITIES[0]);
        setShowPrompt(false);
      },
      { timeout: 15000, maximumAge: 60000 },
    );
  }, []);

  // Auto-detect if permission was previously granted
  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      if (MOCK_CITIES[0]) setWeather(MOCK_CITIES[0]);
      setShowPrompt(false);
      return;
    }

    if (!navigator.permissions) {
      // Safari fallback — show prompt
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (result.state === "granted") {
          detectLocation();
        } else if (result.state === "denied") {
          setStatus("denied");
          if (MOCK_CITIES[0]) setWeather(MOCK_CITIES[0]);
          setShowPrompt(false);
        }
        // "prompt" → keep showing LocationPrompt
      })
      .catch(() => {
        // navigator.permissions not supported
      });
  }, [detectLocation]);

  const cfg = weather
    ? CONDITION_CONFIG[weather.condition]
    : CONDITION_CONFIG["partly-cloudy"];

  const uv = uvLabel(weather?.uvIndex ?? 0);
  const aqi = aqiLabel(weather?.aqi ?? 0);

  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeStr = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isLoading = status === "requesting" || status === "loading";

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: cfg.bg,
        transition: "background 800ms ease",
      }}
    >
      {/* Atmospheric glow orbs */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 65%)`,
          pointerEvents: "none",
          transition: "background 800ms ease",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -60,
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Location permission prompt */}
      {showPrompt && !isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 15,
            background: "rgba(6,9,18,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <LocationPrompt
            onDetect={detectLocation}
            onSkip={() => {
              if (MOCK_CITIES[0]) setWeather(MOCK_CITIES[0]);
              setShowPrompt(false);
            }}
            status={status}
          />
        </div>
      )}

      {/* Loading overlay while detecting */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 15,
            background: "rgba(6,9,18,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <LocationPrompt
            onDetect={detectLocation}
            onSkip={() => {
              if (MOCK_CITIES[0]) setWeather(MOCK_CITIES[0]);
              setShowPrompt(false);
            }}
            status={status}
          />
        </div>
      )}

      {/* City search overlay */}
      {showSearch && (
        <CitySearch
          onSelect={(city) => {
            setWeather(city);
            setStatus("denied"); // treat manual as "no live data"
          }}
          onDetect={detectLocation}
          onClose={() => setShowSearch(false)}
          locationStatus={status}
        />
      )}

      {/* Main scrollable content */}
      {weather !== null && (
        <div
          style={{
            position: "relative",
            height: "100%",
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          <div
            style={{
              maxWidth: 680,
              margin: "0 auto",
              padding: "24px 20px 160px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(0,0,0,0.25)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 999,
                  padding: "6px 14px 6px 10px",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,0,0,0.38)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0,0,0,0.25)";
                }}
              >
                {weather.isLive ? (
                  <Navigation
                    size={13}
                    style={{ color: "#818cf8" }}
                    strokeWidth={2}
                  />
                ) : (
                  <MapPin
                    size={13}
                    style={{ color: cfg.color }}
                    strokeWidth={2}
                  />
                )}
                {weather.city}
                {weather.state !== "" && `, ${weather.state}`}
                <ChevronRight
                  size={13}
                  style={{ opacity: 0.5 }}
                  strokeWidth={2}
                />
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                {/* Live indicator */}
                {weather.isLive && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 10px",
                      background: "rgba(0,0,0,0.25)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      borderRadius: 999,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#818cf8",
                        boxShadow: "0 0 6px #818cf8",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#a5b4fc",
                        letterSpacing: "0.04em",
                      }}
                    >
                      AO VIVO
                    </span>
                  </div>
                )}

                {/* Refresh (live only) */}
                {weather.isLive && (
                  <button
                    type="button"
                    onClick={detectLocation}
                    title="Atualizar"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.25)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,255,255,0.6)",
                      cursor: "pointer",
                    }}
                  >
                    <RefreshCw size={14} strokeWidth={1.8} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.25)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                  }}
                >
                  <Search size={15} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* Hero */}
            <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    filter: `drop-shadow(0 0 24px ${cfg.glow})`,
                  }}
                >
                  <ConditionIcon condition={weather.condition} size={72} />
                </div>
              </div>

              <p
                style={{
                  fontSize: 96,
                  fontWeight: 200,
                  color: "rgba(255,255,255,0.97)",
                  letterSpacing: "-0.06em",
                  lineHeight: 1,
                  fontFamily: "var(--font-display)",
                }}
              >
                {weather.temp}°
              </p>

              <p
                style={{
                  fontSize: 18,
                  color: "rgba(255,255,255,0.75)",
                  marginTop: 6,
                }}
              >
                {weather.conditionLabel}
              </p>

              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.45)",
                  marginTop: 4,
                  textTransform: "capitalize",
                }}
              >
                {dateStr} · {timeStr}
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 16,
                  marginTop: 10,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 14,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <ArrowUp
                    size={13}
                    strokeWidth={2.5}
                    style={{ color: "#f87171" }}
                  />
                  {weather.high}°
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 14,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <ArrowDown
                    size={13}
                    strokeWidth={2.5}
                    style={{ color: "#60a5fa" }}
                  />
                  {weather.low}°
                </span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }}>
                  Sensação {weather.feelsLike}°
                </span>
              </div>
            </div>

            <HourlyForecast hourly={weather.hourly} />
            <DailyForecast daily={weather.daily} />

            {/* Detail grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <DetailCard
                icon={Droplets}
                label="Umidade"
                value={`${weather.humidity}%`}
                gauge={weather.humidity}
                sub={
                  weather.humidity > 75
                    ? "Umidade elevada"
                    : weather.humidity > 50
                      ? "Umidade moderada"
                      : "Umidade baixa"
                }
                accent="#60a5fa"
              />
              <DetailCard
                icon={Wind}
                label="Vento"
                value={`${weather.wind} km/h`}
                sub={`Direção ${weather.windDir}`}
              />
              <DetailCard
                icon={Sun}
                label="Índice UV"
                value={`${weather.uvIndex}`}
                gauge={Math.min(weather.uvIndex * 8.33, 100)}
                sub={uv.label}
                accent={uv.color}
              />
              <DetailCard
                icon={Thermometer}
                label="Sensação"
                value={`${weather.feelsLike}°`}
                sub={
                  weather.feelsLike > weather.temp
                    ? `${weather.feelsLike - weather.temp}° acima do real`
                    : weather.feelsLike < weather.temp
                      ? `${weather.temp - weather.feelsLike}° abaixo do real`
                      : "Igual à temperatura real"
                }
              />
              <DetailCard
                icon={Eye}
                label="Visibilidade"
                value={`${weather.visibility} km`}
                gauge={Math.min(weather.visibility * 8.33, 100)}
                sub={
                  weather.visibility >= 10
                    ? "Ótima"
                    : weather.visibility >= 5
                      ? "Boa"
                      : "Reduzida"
                }
              />
              <DetailCard
                icon={Gauge}
                label="Pressão"
                value={`${weather.pressure}`}
                sub="hPa · nível do mar"
              />
              <DetailCard
                icon={Droplets}
                label="Ponto de orvalho"
                value={`${weather.dewPoint}°`}
                sub={
                  weather.dewPoint >= 24
                    ? "Muito úmido"
                    : weather.dewPoint >= 18
                      ? "Úmido"
                      : "Confortável"
                }
                accent="#38bdf8"
              />
              <DetailCard
                icon={CloudSun}
                label="Qualidade do ar"
                value={`${weather.aqi}`}
                gauge={Math.min(weather.aqi, 100)}
                sub={aqi.label}
                accent={aqi.color}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

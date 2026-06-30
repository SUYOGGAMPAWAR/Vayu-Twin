# agents/pipeline.py
# LangGraph 7-agent pipeline for AQI + HCHO analysis over India
# Agents: satellite_loader → cpcb_loader → era5_loader → hotspot_detection
#         → fire_correlation → aqi_prediction → alert_generator

from __future__ import annotations

import json
import math
import os
import random
import sys
from typing import Any, Dict, List, TypedDict

import numpy as np
from langgraph.graph import END, StateGraph

# ═══════════════════════════════════════════════════════════════════════
# STATE SCHEMA
# ═══════════════════════════════════════════════════════════════════════

class PipelineState(TypedDict):
    satellite_data:        Dict[str, Any]   # {hcho, fire, no2, metadata}
    cpcb_data:             List[Dict]        # ground station records
    era5_data:              List[Dict]       # meteorological records
    hotspots:              List[Dict]        # HCHO hotspot points
    aqi_predictions:       List[Dict]        # per-city AQI
    fire_hcho_correlation: Dict[str, Any]   # correlation analysis
    alerts:                List[Dict]        # generated alerts
    summary:               Dict[str, Any]   # final pipeline summary
    status:                str


# ═══════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════

def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    """Great-circle distance in km."""
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def _load_json(path: str):
    with open(path) as f:
        return json.load(f)


# ═══════════════════════════════════════════════════════════════════════
# AGENT 1 — Satellite Data Loader
# ═══════════════════════════════════════════════════════════════════════

def satellite_loader_agent(state: PipelineState) -> dict:
    print("\n🛰️  [Agent 1] Satellite Data Loader")
    print("   " + "─" * 36)

    data_path = "data/satellite_data.json"
    if os.path.exists(data_path):
        data = _load_json(data_path)
        source = data.get("metadata", {}).get("source", "file")
        print(f"   Loaded from {data_path}")
    else:
        print("   ⚠️  No file found → generating mock satellite data inline")
        random.seed(42)
        hotspot_coords = [
            (30.9, 75.8, 2.5),
            (29.1, 76.3, 2.2),
            (28.6, 77.2, 2.0),
            (26.8, 80.9, 1.8),
            (25.5, 85.1, 1.6),
            (22.5, 88.3, 1.4),
            (19.0, 72.8, 1.2),
        ]
        hcho = []
        for lat, lon, base in hotspot_coords:
            for _ in range(8):
                hcho.append({
                    "lat": round(lat + random.uniform(-0.8, 0.8), 4),
                    "lon": round(lon + random.uniform(-0.8, 0.8), 4),
                    "hcho_value": round(base + random.uniform(-0.3, 0.6), 6),
                    "unit": "mol/m²",
                    "source": "mock",
                })
        for _ in range(30):
            hcho.append({
                "lat": round(random.uniform(10, 32), 4),
                "lon": round(random.uniform(70, 95), 4),
                "hcho_value": round(random.uniform(0.3, 1.0), 6),
                "unit": "mol/m²",
                "source": "mock",
            })
        fire = []
        for lat, lon in [(30.9, 75.8), (29.1, 76.3), (28.6, 77.2)]:
            for _ in range(5):
                fire.append({
                    "lat": round(lat + random.uniform(-0.5, 0.5), 4),
                    "lon": round(lon + random.uniform(-0.5, 0.5), 4),
                    "fire_intensity": random.randint(7, 9),
                    "source": "mock",
                })
        data = {"hcho": hcho, "fire": fire, "no2": [], "metadata": {"source": "inline_mock"}}
        source = "inline_mock"

    print(f"   HCHO points : {len(data.get('hcho', []))}")
    print(f"   Fire points : {len(data.get('fire', []))}")
    print(f"   NO2 points  : {len(data.get('no2', []))}")
    print(f"   Source      : {source}")
    return {"satellite_data": data, "status": "satellite_loaded"}


# ═══════════════════════════════════════════════════════════════════════
# AGENT 2 — CPCB Ground Data Loader
# ═══════════════════════════════════════════════════════════════════════

def cpcb_loader_agent(state: PipelineState) -> dict:
    print("\n🌍 [Agent 2] CPCB Ground Data Loader")
    print("   " + "─" * 36)

    data_path = "data/cpcb_data.json"
    if os.path.exists(data_path):
        data = _load_json(data_path)
        print(f"   Loaded {len(data)} stations from {data_path}")
    else:
        print("   ⚠️  No file found → using inline mock CPCB data")
        profiles = {
            "Delhi": (280, "Poor"), "Lucknow": (315, "Very Poor"),
            "Patna": (265, "Poor"), "Mumbai": (140, "Moderate"),
            "Pune": (98, "Satisfactory"), "Kolkata": (210, "Poor"),
            "Chennai": (88, "Satisfactory"), "Bangalore": (75, "Satisfactory"),
            "Hyderabad": (120, "Moderate"),
        }
        coords = {
            "Delhi": (28.61, 77.20), "Lucknow": (26.85, 80.95),
            "Patna": (25.59, 85.13), "Mumbai": (19.07, 72.88),
            "Pune": (18.52, 73.86), "Kolkata": (22.57, 88.36),
            "Chennai": (13.08, 80.27), "Bangalore": (12.97, 77.59),
            "Hyderabad": (17.39, 78.49),
        }
        data = [
            {
                "city": city,
                "lat": coords[city][0],
                "lon": coords[city][1],
                "aqi": aqi,
                "pm25": round(aqi * 0.55, 1),
                "pm10": round(aqi * 0.85, 1),
                "category": cat,
                "source": "mock",
            }
            for city, (aqi, cat) in profiles.items()
        ]

    print(f"   Stations loaded: {len(data)}")
    return {"cpcb_data": data, "status": "cpcb_loaded"}


# ═══════════════════════════════════════════════════════════════════════
# AGENT 2.5 — ERA5 Meteorological Loader
# ═══════════════════════════════════════════════════════════════════════

def era5_loader_agent(state: PipelineState) -> dict:
    print("\n🌦️  [Agent 2.5] ERA5 Meteorological Loader")
    print("   " + "─" * 36)

    data_path = "data/era5_data.json"
    if os.path.exists(data_path):
        data = _load_json(data_path)
        print(f"   Loaded {len(data)} city met records")
    else:
        print("   ⚠️  No ERA5 file found — skipping met context")
        data = []

    return {"era5_data": data, "status": "era5_loaded"}


# ═══════════════════════════════════════════════════════════════════════
# AGENT 3 — HCHO Hotspot Detection
# ═══════════════════════════════════════════════════════════════════════

def hotspot_detection_agent(state: PipelineState) -> dict:
    print("\n🔴 [Agent 3] HCHO Hotspot Detection")
    print("   " + "─" * 36)

    hcho_points = state["satellite_data"].get("hcho", [])
    if not hcho_points:
        print("   No HCHO data available")
        return {"hotspots": [], "status": "no_hcho"}

    values = np.array([p["hcho_value"] for p in hcho_points])
    mean_v = float(np.mean(values))
    std_v  = float(np.std(values))
    threshold = mean_v + 1.5 * std_v

    print(f"   Points   : {len(hcho_points)}")
    print(f"   Mean     : {mean_v:.4f} mol/m²")
    print(f"   Std Dev  : {std_v:.4f}")
    print(f"   Threshold: {threshold:.4f} (mean + 1.5σ)")

    hotspots = []
    for p in hcho_points:
        if p["hcho_value"] > threshold:
            if p["hcho_value"] > threshold + std_v:
                severity = "Critical"
            elif p["hcho_value"] > threshold + 0.5 * std_v:
                severity = "High"
            else:
                severity = "Elevated"

            hotspots.append({
                **p,
                "severity":   severity,
                "threshold":  round(threshold, 6),
                "z_score":    round((p["hcho_value"] - mean_v) / std_v, 2),
            })

    hotspots.sort(key=lambda x: x["hcho_value"], reverse=True)
    print(f"   Hotspots detected: {len(hotspots)}")
    for h in hotspots[:5]:
        print(f"     [{h['severity']:8}] ({h['lat']}, {h['lon']}) = {h['hcho_value']:.4f}")

    return {"hotspots": hotspots, "status": "hotspots_done"}


# ═══════════════════════════════════════════════════════════════════════
# AGENT 4 — Fire ↔ HCHO Correlation
# ═══════════════════════════════════════════════════════════════════════

def fire_correlation_agent(state: PipelineState) -> dict:
    print("\n🔥 [Agent 4] Fire–HCHO Correlation Analysis")
    print("   " + "─" * 36)

    fire_points = state["satellite_data"].get("fire", [])
    hotspots    = state["hotspots"]

    PROXIMITY_KM = 100

    correlated = []
    for hotspot in hotspots:
        nearest_fire = None
        min_dist = float("inf")
        for fire in fire_points:
            dist = _haversine_km(
                hotspot["lat"], hotspot["lon"],
                fire["lat"],   fire["lon"]
            )
            if dist < min_dist:
                min_dist, nearest_fire = dist, fire

        if min_dist <= PROXIMITY_KM and nearest_fire:
            correlated.append({
                "hotspot_lat":     hotspot["lat"],
                "hotspot_lon":     hotspot["lon"],
                "hcho_value":      hotspot["hcho_value"],
                "severity":        hotspot["severity"],
                "fire_lat":        nearest_fire["lat"],
                "fire_lon":        nearest_fire["lon"],
                "fire_intensity":  nearest_fire["fire_intensity"],
                "distance_km":     round(min_dist, 1),
                "fire_linked":     True,
            })

    fire_pct = round(len(correlated) / max(len(hotspots), 1) * 100, 1)

    correlation = {
        "total_hotspots":    len(hotspots),
        "fire_linked":       len(correlated),
        "non_fire_linked":   len(hotspots) - len(correlated),
        "fire_percentage":   fire_pct,
        "proximity_km_used": PROXIMITY_KM,
        "correlated_points": correlated,
        "interpretation": (
            "Strong fire-emission coupling" if fire_pct > 60
            else "Moderate fire contribution" if fire_pct > 30
            else "Industrial/urban HCHO sources dominant"
        ),
    }

    print(f"   Fire points   : {len(fire_points)}")
    print(f"   Hotspots      : {len(hotspots)}")
    print(f"   Fire-linked   : {len(correlated)} ({fire_pct}%)")
    print(f"   Interpretation: {correlation['interpretation']}")

    return {"fire_hcho_correlation": correlation, "status": "correlation_done"}


# ═══════════════════════════════════════════════════════════════════════
# AGENT 5 — AQI Prediction / Enrichment (now with ERA5 wind/temp context)
# ═══════════════════════════════════════════════════════════════════════

def aqi_prediction_agent(state: PipelineState) -> dict:
    print("\n🧠 [Agent 5] AQI Prediction & Enrichment")
    print("   " + "─" * 36)

    stations  = state["cpcb_data"]
    hotspots  = state["hotspots"]
    era5_data = state.get("era5_data", [])

    predictions = []
    for s in stations:
        nearby_hcho = None
        min_dist = float("inf")
        for h in hotspots:
            d = _haversine_km(s["lat"], s["lon"], h["lat"], h["lon"])
            if d < min_dist:
                min_dist, nearby_hcho = d, h

        base_aqi = s["aqi"]
        sat_boost = 0
        if nearby_hcho and min_dist < 150:
            sat_boost = round(nearby_hcho["hcho_value"] * 20, 1)

        predicted_aqi = min(int(base_aqi + sat_boost), 500)

        def category(aqi):
            if aqi <= 50:   return "Good"
            if aqi <= 100:  return "Satisfactory"
            if aqi <= 200:  return "Moderate"
            if aqi <= 300:  return "Poor"
            if aqi <= 400:  return "Very Poor"
            return "Severe"

        # Match ERA5 meteorological data for this city
        era5_match = next((e for e in era5_data if e.get("city") == s["city"]), None)
        wind_speed = None
        temp_c = None
        if era5_match:
            if era5_match.get("wind_u") is not None and era5_match.get("wind_v") is not None:
                wind_speed = round((era5_match["wind_u"]**2 + era5_match["wind_v"]**2) ** 0.5, 2)
            if era5_match.get("temp_k") is not None:
                temp_c = round(era5_match["temp_k"] - 273.15, 1)

        predictions.append({
            "city":          s["city"],
            "lat":           s["lat"],
            "lon":           s["lon"],
            "ground_aqi":    base_aqi,
            "satellite_boost": sat_boost,
            "predicted_aqi": predicted_aqi,
            "category":      category(predicted_aqi),
            "nearest_hotspot_km": round(min_dist, 1) if nearby_hcho else None,
            "wind_speed_ms": wind_speed,
            "temp_celsius":  temp_c,
        })

    predictions.sort(key=lambda x: x["predicted_aqi"], reverse=True)

    print(f"   Cities processed: {len(predictions)}")
    for p in predictions[:5]:
        boost_str = f" (+{p['satellite_boost']})" if p["satellite_boost"] else ""
        wind_str = f" wind={p['wind_speed_ms']}m/s" if p["wind_speed_ms"] is not None else ""
        print(f"     {p['city']:12} AQI={p['predicted_aqi']}{boost_str} [{p['category']}]{wind_str}")

    return {"aqi_predictions": predictions, "status": "aqi_done"}


# ═══════════════════════════════════════════════════════════════════════
# AGENT 6 — Alert Generator
# ═══════════════════════════════════════════════════════════════════════

def alert_agent(state: PipelineState) -> dict:
    print("\n🚨 [Agent 6] Alert Generator")
    print("   " + "─" * 36)

    alerts = []

    for h in state["hotspots"]:
        if h["severity"] in ("Critical", "High"):
            alerts.append({
                "id":       f"HCHO-{len(alerts)+1:03}",
                "type":     "HCHO_HOTSPOT",
                "severity": h["severity"],
                "lat":      h["lat"],
                "lon":      h["lon"],
                "value":    h["hcho_value"],
                "unit":     "mol/m²",
                "z_score":  h.get("z_score"),
                "message":  (
                    f"HCHO hotspot detected: {h['hcho_value']:.4f} mol/m² "
                    f"(z={h.get('z_score', '?')}) at ({h['lat']}, {h['lon']})"
                ),
                "action":   "Investigate emission source. Notify district authority.",
            })

    for p in state["aqi_predictions"]:
        wind_note = ""
        if p.get("wind_speed_ms") is not None:
            if p["wind_speed_ms"] < 2:
                wind_note = f" Low wind ({p['wind_speed_ms']} m/s) — pollutant dispersion poor."
            else:
                wind_note = f" Wind {p['wind_speed_ms']} m/s."

        if p["category"] in ("Very Poor", "Severe"):
            alerts.append({
                "id":       f"AQI-{len(alerts)+1:03}",
                "type":     "AQI_CRITICAL",
                "severity": "High" if p["category"] == "Very Poor" else "Critical",
                "city":     p["city"],
                "lat":      p["lat"],
                "lon":      p["lon"],
                "aqi":      p["predicted_aqi"],
                "category": p["category"],
                "message":  (
                    f"{p['city']}: AQI={p['predicted_aqi']} ({p['category']}).{wind_note}"
                ),
                "action":   "Issue public health advisory. Restrict outdoor activity.",
            })
        elif p["category"] == "Poor":
            alerts.append({
                "id":       f"AQI-{len(alerts)+1:03}",
                "type":     "AQI_POOR",
                "severity": "Medium",
                "city":     p["city"],
                "lat":      p["lat"],
                "lon":      p["lon"],
                "aqi":      p["predicted_aqi"],
                "category": p["category"],
                "message":  f"{p['city']}: AQI={p['predicted_aqi']} ({p['category']}).{wind_note}",
                "action":   "Advisory for sensitive groups.",
            })

    corr = state["fire_hcho_correlation"]
    if corr.get("fire_percentage", 0) > 50:
        alerts.append({
            "id":       f"FIRE-{len(alerts)+1:03}",
            "type":     "FIRE_HCHO_COUPLING",
            "severity": "High",
            "message":  (
                f"{corr['fire_percentage']}% of HCHO hotspots are fire-linked. "
                f"{corr['interpretation']}"
            ),
            "fire_linked_count": corr["fire_linked"],
            "action": "Enforce stubble burning ban. Deploy field teams.",
        })

    severity_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 99))

    summary = {
        "total_hcho_points":   len(state["satellite_data"].get("hcho", [])),
        "total_fire_points":   len(state["satellite_data"].get("fire", [])),
        "era5_cities":         len(state.get("era5_data", [])),
        "hotspots_detected":   len(state["hotspots"]),
        "cities_analysed":     len(state["aqi_predictions"]),
        "alerts_generated":    len(alerts),
        "fire_hcho_pct":       corr.get("fire_percentage"),
        "worst_city":          (
            state["aqi_predictions"][0]["city"]
            if state["aqi_predictions"] else None
        ),
        "worst_aqi":           (
            state["aqi_predictions"][0]["predicted_aqi"]
            if state["aqi_predictions"] else None
        ),
    }

    print(f"   Alerts generated: {len(alerts)}")
    for a in alerts:
        print(f"     [{a['severity']:8}] {a['type']} — {a['message'][:60]}")

    return {"alerts": alerts, "summary": summary, "status": "complete"}


# ═══════════════════════════════════════════════════════════════════════
# BUILD GRAPH
# ═══════════════════════════════════════════════════════════════════════

def build_pipeline():
    wf = StateGraph(PipelineState)

    wf.add_node("satellite",   satellite_loader_agent)
    wf.add_node("cpcb",        cpcb_loader_agent)
    wf.add_node("era5",        era5_loader_agent)
    wf.add_node("hotspot",     hotspot_detection_agent)
    wf.add_node("correlation", fire_correlation_agent)
    wf.add_node("aqi",         aqi_prediction_agent)
    wf.add_node("alert",       alert_agent)

    wf.set_entry_point("satellite")
    wf.add_edge("satellite",   "cpcb")
    wf.add_edge("cpcb",        "era5")
    wf.add_edge("era5",        "hotspot")
    wf.add_edge("hotspot",     "correlation")
    wf.add_edge("correlation", "aqi")
    wf.add_edge("aqi",         "alert")
    wf.add_edge("alert",        END)

    return wf.compile()


# ═══════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🚀 AQI + HCHO Detection Pipeline — Starting")
    print("=" * 50)

    pipeline = build_pipeline()
    result = pipeline.invoke({
        "satellite_data":        {},
        "cpcb_data":             [],
        "era5_data":             [],
        "hotspots":              [],
        "aqi_predictions":       [],
        "fire_hcho_correlation": {},
        "alerts":                [],
        "summary":               {},
        "status":                "starting",
    })

    print("\n" + "=" * 50)
    print("✅ PIPELINE COMPLETE\n")
    s = result["summary"]
    print(f"  HCHO points    : {s['total_hcho_points']}")
    print(f"  Fire points    : {s['total_fire_points']}")
    print(f"  ERA5 cities    : {s['era5_cities']}")
    print(f"  Hotspots       : {s['hotspots_detected']}")
    print(f"  Cities         : {s['cities_analysed']}")
    print(f"  Alerts         : {s['alerts_generated']}")
    print(f"  Fire-HCHO link : {s['fire_hcho_pct']}%")
    print(f"  Worst city     : {s['worst_city']} (AQI {s['worst_aqi']})")

    os.makedirs("data", exist_ok=True)
    with open("data/pipeline_results.json", "w") as f:
        json.dump(
            {k: v for k, v in result.items() if k != "satellite_data"},
            f, indent=2
        )
    print("\n📁 Results saved → data/pipeline_results.json")
# api/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys, os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.pipeline import build_pipeline

app = FastAPI(title="AQI & HCHO Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = build_pipeline()
latest_result = {}


@app.on_event("startup")
def run_on_startup():
    global latest_result
    latest_result = pipeline.invoke({
        "satellite_data": {}, "cpcb_data": [], "era5_data": [],
        "hotspots": [], "aqi_predictions": [],
        "fire_hcho_correlation": {},
        "alerts": [], "summary": {}, "status": "starting"
    })
    print(f"✅ Pipeline ran on startup — {len(latest_result.get('alerts', []))} alerts")


@app.get("/")
def root():
    return {"status": "running"}


@app.post("/run")
def run_pipeline():
    global latest_result
    latest_result = pipeline.invoke({
        "satellite_data": {}, "cpcb_data": [], "era5_data": [],
        "hotspots": [], "aqi_predictions": [],
        "fire_hcho_correlation": {},
        "alerts": [], "summary": {}, "status": "starting"
    })
    return {"message": "Pipeline complete", "alerts": len(latest_result["alerts"])}


@app.get("/hotspots")
def get_hotspots():
    return latest_result.get("hotspots", [])


@app.get("/aqi")
def get_aqi():
    return latest_result.get("aqi_predictions", [])


@app.get("/alerts")
def get_alerts():
    return latest_result.get("alerts", [])


@app.get("/correlation")
def get_correlation():
    return latest_result.get("fire_hcho_correlation", {})


@app.get("/summary")
def get_summary():
    return latest_result.get("summary", {})
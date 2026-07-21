from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import threading
import time
import json
import os

app = FastAPI()

# Allow your React frontend to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def run_pipeline():
    """Runs the data crunching pipeline every hour in the background."""
    while True:
        print("Executing ML Pipeline...")
        # Runs your existing pipeline script exactly as the CronJob did
        os.system("python pipeline.py")
        time.sleep(3600)  # Wait 1 hour before running again

@app.on_event("startup")
def startup_event():
    """Starts the background worker as soon as the API boots up."""
    thread = threading.Thread(target=run_pipeline, daemon=True)
    thread.start()

@app.get("/data")
def get_data():
    """Serves the data.json file created by the pipeline to your React map."""
    if os.path.exists("data.json"):
        with open("data.json", "r") as f:
            return json.load(f)
    # If the pipeline hasn't finished its first run yet, return a safe fallback
    return []

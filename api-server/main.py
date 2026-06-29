# api-server/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"])

@app.get("/data")
def get_data():
    try:
        with open('/shared/data.json', 'r') as f:
            return json.load(f)
    except:
        return {"error": "Data not ready yet"}
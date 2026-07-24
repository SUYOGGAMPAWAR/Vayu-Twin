import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vayu-backend")

app = FastAPI(
    title="VayuTwin Backend API",
    description="Backend API serving AI-predicted HCHO AQI hotspot records from Supabase.",
    version="1.0.0"
)

# Enable CORS for React frontend cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Supabase credentials from Render environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("SUPABASE_URL or SUPABASE_KEY missing from environment variables.")


@app.get("/")
def read_root():
    """Root route confirming API operational status."""
    return {
        "status": "online",
        "service": "VayuTwin API Backend",
        "endpoints": {
            "data": "/data",
            "docs": "/docs"
        }
    }


@app.get("/data")
def get_city_data():
    """Returns all current city records stored in Supabase."""
    if not supabase:
        raise HTTPException(
            status_code=500, 
            detail="Supabase client is not initialized. Please verify SUPABASE_URL and SUPABASE_KEY in Render."
        )
    
    try:
        response = supabase.table("city_records").select("*").execute()
        return response.data
    except Exception as e:
        logger.error(f"Error querying city_records from Supabase: {e}")
        raise HTTPException(status_code=500, detail=str(e))

import os
import logging
import requests
import joblib
import pandas as pd
from supabase import create_client, Client

# Configure Logging to match your previous terminal output
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://wgjhlozrllqhdqaogcbx.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnamhsb3pybGxxaGRxYW9nY2J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDg2OTI1NiwiZXhwIjoyMTAwNDQ1MjU2fQ.CvSvNuPHZU1iWxplhGQMntKlwsZvyi_2um3xzQEZsXk")

def get_risk_level(aqi):
    """Categorize AQI into standard risk levels."""
    if aqi <= 50: return "Good"
    elif aqi <= 100: return "Moderate"
    elif aqi <= 150: return "Unhealthy for Sensitive Groups"
    elif aqi <= 200: return "Unhealthy"
    elif aqi <= 300: return "Very Unhealthy"
    else: return "Hazardous"

def main():
    logger.info("Initiating VayuTwin Dynamic CronJob...")

    # 1. Initialize Supabase Client
    if not SUPABASE_URL or not SUPABASE_KEY or SUPABASE_KEY == "YOUR_SUPABASE_KEY":
        logger.error("Supabase credentials missing! Export SUPABASE_URL and SUPABASE_KEY.")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Successfully connected to Supabase client.")

    # 2. Load ML Model
    logger.info("Loading Random Forest HCHO-to-AQI model...")
    try:
        # Update this path if your model file is named differently
        model = joblib.load("model.pkl") 
    except FileNotFoundError:
        logger.warning("model.pkl not found! Using a fallback dummy model for demonstration.")
        model = None

    # 3. Fetch Target Cities
    logger.info("Fetching target cities dynamically from Supabase `target_cities` table...")
    try:
        cities_response = supabase.table("target_cities").select("city,lat,lng").execute()
        target_cities = cities_response.data
        if not target_cities:
            logger.error("No cities found in `target_cities` table.")
            return
        logger.info(f"Loaded {len(target_cities)} monitoring locations dynamically from DB.")
    except Exception as e:
        logger.error(f"Failed to fetch cities: {e}")
        return

    # 4. Process Telemetry for Each City
    logger.info(f"Connecting to Open-Meteo telemetry for {len(target_cities)} target locations...")
    
    records_to_insert = []
    
    print("\n--- LIVE PREDICTED HOTSPOTS ---")
    
    for city_data in target_cities:
        city_name = city_data["city"]
        lat = city_data["lat"]
        lng = city_data["lng"]

        try:
            # A. Fetch Weather Telemetry
            weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m"
            w_res = requests.get(weather_url).json()
            temp_c = w_res.get("current", {}).get("temperature_2m", 25.0)
            humidity = w_res.get("current", {}).get("relative_humidity_2m", 50.0)

            # B. Fetch Real-World AQI (New Addition)
            aqi_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lng}&current=european_aqi"
            aqi_res = requests.get(aqi_url).json()
            real_aqi = aqi_res.get("current", {}).get("european_aqi", 50)

            # C. Extract/Calculate HCHO VCD 
            # (Replace this placeholder logic with your actual GEE/Copernicus extraction if needed)
            vcd_mol_m2 = 0.000142 + (temp_c * 0.000001) 

            # D. Model Inference
            if model:
                # Format features as your model expects (e.g., a DataFrame)
                features = pd.DataFrame([[temp_c, humidity, vcd_mol_m2]], columns=["temp_c", "humidity", "vcd_mol_m2"])
                predicted_aqi = int(model.predict(features)[0])
            else:
                # Fallback calculation if model.pkl is missing
                predicted_aqi = int((temp_c * 0.5) + (humidity * 0.1) + 5)

            risk_level = get_risk_level(predicted_aqi)

            logger.info(f"Pulled live data for {city_name}: Temp {temp_c}°C")
            print(f"[{risk_level}] {city_name}: AI AQI {predicted_aqi} | Real AQI {real_aqi} (Temp: {temp_c}°C)")

            # E. Append to Supabase Payload
            records_to_insert.append({
                "city": city_name,
                "lat": lat,
                "lng": lng,
                "temp_c": temp_c,
                "humidity": humidity,
                "vcd_mol_m2": round(vcd_mol_m2, 6),
                "predicted_aqi": predicted_aqi,
                "original_aqi": real_aqi,
                "risk_level": risk_level
            })

        except Exception as e:
            logger.error(f"Error processing {city_name}: {e}")
            
    print("-------------------------------\n")

    # 5. Upsert into Supabase
    logger.info(f"Upserting {len(records_to_insert)} city predictions into Supabase `city_records`...")
    try:
        # Note: We use upsert with on_conflict='city' so it updates existing rows instead of crashing
        response = supabase.table("city_records").upsert(
            records_to_insert, 
            on_conflict="city"
        ).execute()
        
        logger.info("Pipeline execution complete! Written to database.")
    except Exception as e:
        logger.error(f"Error saving predictions to Supabase: {e}")

if __name__ == "__main__":
    main()

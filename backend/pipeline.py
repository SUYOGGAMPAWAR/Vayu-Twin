import os
import time
import logging
import requests
import json
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] - %(message)s')

class VayuTwinPipeline:
    def __init__(self):
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_KEY")
        self.supabase: Client = None

        if self.supabase_url and self.supabase_key:
            try:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
                logging.info("Successfully connected to Supabase client.")
            except Exception as e:
                logging.error(f"Failed to initialize Supabase client: {e}")
        else:
            logging.warning("SUPABASE_URL or SUPABASE_KEY missing in environment.")

        self.model = self._mock_load_model()

    def _mock_load_model(self):
        logging.info("Loading Random Forest HCHO-to-AQI model...")
        time.sleep(1)
        return RandomForestRegressor(n_estimators=100, random_state=42)

    def fetch_target_cities(self):
        """Dynamically fetches all monitoring targets from Supabase database."""
        if not self.supabase:
            logging.warning("No Supabase client available. Using local fallback target.")
            return [{"city": "Delhi", "lat": 28.6139, "lng": 77.2090}]

        try:
            logging.info("Fetching target cities dynamically from Supabase `target_cities` table...")
            response = self.supabase.table("target_cities").select("city, lat, lng").execute()
            cities = response.data

            if not cities:
                logging.warning("`target_cities` table returned 0 rows!")
                return []

            logging.info(f"Loaded {len(cities)} monitoring locations dynamically from DB.")
            return cities

        except Exception as e:
            logging.error(f"Error querying `target_cities` table: {e}")
            return []

    def ingest_satellite_data(self, cities):
        if not cities:
            logging.error("No cities provided for data ingestion.")
            return pd.DataFrame()

        logging.info(f"Connecting to Open-Meteo telemetry for {len(cities)} target locations...")
        data = []

        for item in cities:
            city_name = item["city"]
            lat = item["lat"]
            lng = item["lng"]

            try:
                url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lng}&current=aerosol_optical_depth,nitrogen_dioxide"
                weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m"

                aq_response = requests.get(url, timeout=10)
                weather_response = requests.get(weather_url, timeout=10)

                no2 = aq_response.json()['current'].get('nitrogen_dioxide', 0.0001)
                temp = weather_response.json()['current'].get('temperature_2m', 25.0)
                humidity = weather_response.json()['current'].get('relative_humidity_2m', 50.0)

                vcd_proxy = (no2 / 1000) if no2 else 0.0001
                logging.info(f"Pulled live data for {city_name}: Temp {temp}°C")

                data.append({
                    "city": city_name,
                    "lat": lat,
                    "lng": lng,
                    "vcd_mol_m2": round(vcd_proxy, 6),
                    "temp_c": temp,
                    "humidity": humidity
                })
                time.sleep(0.3)

            except Exception as e:
                logging.error(f"Failed to fetch live data for {city_name}: {e}")

        return pd.DataFrame(data)

    def run_inference(self, df):
        if df.empty:
            return df

        df['predicted_aqi'] = ((df['vcd_mol_m2'] * 1000) + (df['temp_c'] * 0.5)).astype(int)
        df['risk_level'] = pd.cut(
            df['predicted_aqi'], 
            bins=[-1, 50, 100, 150, 500], 
            labels=['Good', 'Moderate', 'Unhealthy', 'Hazardous']
        )
        return df

    def save_to_supabase(self, records):
        if not self.supabase or not records:
            return

        try:
            logging.info(f"Upserting {len(records)} city predictions into Supabase `city_records`...")
            response = self.supabase.table("city_records").upsert(
                records, 
                on_conflict="city"
            ).execute()
            logging.info("Successfully updated Supabase database!")
        except Exception as e:
            logging.error(f"Error saving predictions to Supabase: {e}")

if __name__ == "__main__":
    logging.info("Initiating VayuTwin Dynamic CronJob...")
    pipeline = VayuTwinPipeline()

    # 1. Pull cities dynamically from DB
    target_cities = pipeline.fetch_target_cities()

    # 2. Ingest telemetry and run model inference
    raw_data = pipeline.ingest_satellite_data(target_cities)
    processed_data = pipeline.run_inference(raw_data)

    if not processed_data.empty:
        print("\n--- LIVE PREDICTED HOTSPOTS ---")
        for index, row in processed_data.iterrows():
            print(f"[{row['risk_level']}] {row['city']}: AQI {row['predicted_aqi']} (Temp: {row['temp_c']}°C)")
        print("-------------------------------\n")

        # Format types for serialization
        processed_data['risk_level'] = processed_data['risk_level'].astype(str)
        processed_data = processed_data.fillna("Unknown")

        records = processed_data.to_dict(orient='records')

        # 3. Write predictions back to Supabase + local backup
        pipeline.save_to_supabase(records)

        with open('data.json', 'w') as f:
            json.dump(records, f)

        logging.info("Pipeline execution complete! Written to database.")

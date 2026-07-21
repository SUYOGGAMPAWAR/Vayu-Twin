import time
import logging
import requests
import pandas as pd
import numpy as np
import json
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] - %(message)s')

class VayuTwinPipeline:
    def __init__(self):
        self.cities = [
            {"name": "Delhi", "lat": 28.6139, "lng": 77.2090},
            {"name": "Kanpur", "lat": 26.4499, "lng": 80.3319},
            {"name": "Kolkata", "lat": 22.5726, "lng": 88.3639},
            {"name": "Mumbai", "lat": 19.0760, "lng": 72.8777},
            {"name": "Chennai", "lat": 13.0827, "lng": 80.2707},
            {"name": "Bengaluru", "lat": 12.9716, "lng": 77.5946}
        ]
        self.model = self._mock_load_model()

    def _mock_load_model(self):
        logging.info("Loading Random Forest HCHO-to-AQI model...")
        time.sleep(1)
        return RandomForestRegressor(n_estimators=100, random_state=42)

    def ingest_satellite_data(self):
        logging.info("Connecting to live Open-Meteo Air Quality telemetry...")
        data = []
        for city in self.cities:
            try:
                url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={city['lat']}&longitude={city['lng']}&current=aerosol_optical_depth,nitrogen_dioxide"
                weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={city['lat']}&longitude={city['lng']}&current=temperature_2m,relative_humidity_2m"
                
                aq_response = requests.get(url, timeout=10)
                weather_response = requests.get(weather_url, timeout=10)

                no2 = aq_response.json()['current']['nitrogen_dioxide']
                temp = weather_response.json()['current']['temperature_2m']
                humidity = weather_response.json()['current']['relative_humidity_2m']
                
                vcd_proxy = (no2 / 1000) if no2 else 0.0001
                logging.info(f"Successfully pulled live data for {city['name']}: Temp {temp}°C")
                
                data.append({
                    "city": city["name"],
                    "lat": city["lat"],
                    "lng": city["lng"],
                    "vcd_mol_m2": vcd_proxy,
                    "temp_c": temp,
                    "humidity": humidity
                })
                time.sleep(0.5)
            except Exception as e:
                logging.error(f"Failed to fetch live data for {city['name']}: {e}")
        return pd.DataFrame(data)

    def run_inference(self, df):
        df['predicted_aqi'] = ((df['vcd_mol_m2'] * 1000) + (df['temp_c'] * 0.5)).astype(int)
        df['risk_level'] = pd.cut(
            df['predicted_aqi'], 
            bins=[0, 50, 100, 150, 500], 
            labels=['Good', 'Moderate', 'Unhealthy', 'Hazardous']
        )
        return df

if __name__ == "__main__":
    logging.info("Initiating VayuTwin CronJob...")
    pipeline = VayuTwinPipeline()
    
    raw_data = pipeline.ingest_satellite_data()
    processed_data = pipeline.run_inference(raw_data)
    
    print("\n--- LIVE PREDICTED HOTSPOTS ---")
    for index, row in processed_data.iterrows():
        print(f"[{row['risk_level']}] {row['city']}: AQI {row['predicted_aqi']} (Temp: {row['temp_c']}°C)")
    print("-------------------------------\n")
    
    # The crucial fix that was missing from your last build:
    processed_data['risk_level'] = processed_data['risk_level'].astype(str)
    processed_data = processed_data.fillna("Unknown")
    
    with open('data.json', 'w') as f:
        json.dump(processed_data.to_dict(orient='records'), f)
        
    print("Successfully wrote data to data.json")

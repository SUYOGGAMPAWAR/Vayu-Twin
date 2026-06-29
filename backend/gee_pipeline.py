import ee
import json
import datetime

def initialize_earth_engine():
    """Authenticates and initializes the Google Earth Engine API."""
    try:
        print("Initializing Earth Engine...")
        ee.Initialize()
        print("Earth Engine Initialized Successfully.")
    except Exception as e:
        print("Earth Engine authentication required.")
        ee.Authenticate()
        ee.Initialize()

def fetch_satellite_data(date_str):
    """Fetches Sentinel-5P TROPOMI HCHO data for a specific date over India."""
    print(f"Fetching Sentinel-5P HCHO data for {date_str}...")
    
    # Define the geographical bounding box for India
    india_bounds = ee.Geometry.Rectangle([68.1, 6.7, 97.4, 35.5])
    start_date = ee.Date(date_str)
    end_date = start_date.advance(1, 'day')
    
    # Query the Sentinel-5P dataset for Formaldehyde (HCHO)
    collection = (ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_HCHO')
                  .select('tropospheric_HCHO_column_number_density')
                  .filterDate(start_date, end_date)
                  .filterBounds(india_bounds))
    
    daily_mean_image = collection.mean().clip(india_bounds)
    
    # Sample Major Indian Cities
    cities = {
        "Delhi": ee.Geometry.Point([77.2090, 28.6139]),
        "Mumbai": ee.Geometry.Point([72.8777, 19.0760]),
        "Kolkata": ee.Geometry.Point([88.3639, 22.5726]),
        "Chennai": ee.Geometry.Point([80.2707, 13.0827]),
        "Bengaluru": ee.Geometry.Point([77.5946, 12.9716]),
        "Kanpur": ee.Geometry.Point([80.3319, 26.4499])
    }
    
    extracted_data = []
    
    for city, point in cities.items():
        vcd_value = daily_mean_image.reduceRegion(
            reducer=ee.Reducer.first(),
            geometry=point,
            scale=1113.2,
        ).getInfo()
        
        hcho_density = vcd_value.get('tropospheric_HCHO_column_number_density', 0)
        if hcho_density is None:
            hcho_density = 0.0
            
        extracted_data.append({
            "city": city,
            "coordinates": point.coordinates().getInfo(),
            "vcd_value": hcho_density
        })
        
    return extracted_data

def run_ml_inference(raw_data):
    """Simulates the ML model converting Satellite VCD to Surface AQI."""
    print("Running ML Inference (VCD -> Surface AQI)...")
    processed_features = []
    
    for item in raw_data:
        # Dummy conversion for MVP (Replace with your actual Random Forest later)
        simulated_surface_aqi = int(item["vcd_value"] * 1000000) 
        
        risk = "Low"
        if simulated_surface_aqi > 150: risk = "High"
        elif simulated_surface_aqi > 100: risk = "Moderate"
        
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": item["coordinates"]
            },
            "properties": {
                "city": item["city"],
                "vcd_raw": item["vcd_value"],
                "surface_aqi_hcho": simulated_surface_aqi,
                "risk_level": risk,
                "timestamp": datetime.datetime.now().isoformat()
            }
        }
        processed_features.append(feature)
        
    return processed_features

def export_to_geojson(features, filename="hcho_hotspots.geojson"):
    """Exports predictions to GeoJSON."""
    print(f"Exporting data to {filename}...")
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    with open(filename, 'w') as f:
        json.dump(geojson, f, indent=4)
    print("Pipeline Execution Complete!")

if __name__ == "__main__":
    target_date = (datetime.datetime.now() - datetime.timedelta(days=2)).strftime('%Y-%m-%d')
    initialize_earth_engine()
    raw_satellite_data = fetch_satellite_data(target_date)
    final_predictions = run_ml_inference(raw_satellite_data)
    export_to_geojson(final_predictions)
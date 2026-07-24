import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// --- 1. Helper Component for Smooth Map Zooming ---
function FlyToCity({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      // flyTo([lat, lng], zoomLevel, options)
      map.flyTo([center.lat, center.lng], 10, {
        duration: 1.5,
      });
    }
  }, [center, map]);

  return null;
}

export default function VayuTwinDashboard() {
  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);

  // --- 2. Fetch Live Data from your Render Backend ---
  useEffect(() => {
    fetch('https://vayu-twin-backend.onrender.com/data')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Sort cities by AQI (highest first) for the sidebar
          const sortedData = data.sort((a, b) => b.predicted_aqi - a.predicted_aqi);
          setCities(sortedData);
        }
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  // --- 3. Filter & Calculate Metrics ---
  const filteredCities = cities.filter((city) =>
    city.city.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Assuming AQI > 50 is "Critical" for your HCHO metric context
  const criticalHotspots = cities.filter((city) => city.predicted_aqi > 50).length;

  return (
    <div className="flex h-screen bg-[#0a0f1c] text-slate-300 font-sans">
      
      {/* LEFT NAVIGATION SIDEBAR */}
      <div className="w-64 bg-[#0a0f1c] border-r border-slate-800 p-6 flex flex-col">
        <h1 className="text-2xl font-bold text-blue-500 mb-10">VayuTwin</h1>
        <nav className="flex flex-col gap-2">
          <button className="bg-blue-600 text-white text-left px-4 py-3 rounded-md font-medium transition">
            Live Hotspots
          </button>
          <button className="text-slate-400 text-left px-4 py-3 rounded-md font-medium hover:bg-slate-800/50 transition">
            MLOps Pipeline
          </button>
        </nav>
      </div>

      {/* MAIN DASHBOARD CONTENT */}
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        
        {/* Header section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">HCHO Surface Concentration</h2>
          <p className="text-slate-400">AI-Predicted AQI derived from Sentinel-5P VCD Satellite Data</p>
        </div>

        {/* Critical Hotspots Card */}
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-6 mb-8 w-1/3 shadow-sm">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Critical Hotspots</h3>
          <p className="text-4xl font-bold text-red-500">{criticalHotspots}</p>
        </div>

        {/* Map & List Container */}
        <div className="flex gap-6 h-[500px]">
          
          {/* MAP CARD */}
          <div className="flex-[2] bg-[#111827] border border-slate-800 rounded-lg p-4 flex flex-col shadow-sm relative z-0">
            <h3 className="text-sm font-semibold text-white mb-4">Live HCHO Heatmap (India)</h3>
            <div className="flex-1 rounded-md overflow-hidden rounded border border-slate-800">
              <MapContainer
                center={[22.5937, 78.9629]} // Center of India
                zoom={4.5}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                
                <FlyToCity center={selectedCity} />

                {cities.map((c) => (
                  <CircleMarker
                    key={c.city}
                    center={[c.lat, c.lng]}
                    radius={c.predicted_aqi > 50 ? 12 : 8}
                    pathOptions={{
                      color: c.predicted_aqi > 50 ? '#ef4444' : '#3b82f6',
                      fillColor: c.predicted_aqi > 50 ? '#ef4444' : '#3b82f6',
                      fillOpacity: 0.6,
                      weight: 2
                    }}
                  >
                    <Popup className="text-slate-900 font-sans">
                      <div className="font-bold text-base mb-1">{c.city}</div>
                      <div className="text-sm"><strong>AQI:</strong> {c.predicted_aqi}</div>
                      <div className="text-sm"><strong>HCHO VCD:</strong> {c.vcd_mol_m2} mol/m²</div>
                      <div className="text-sm"><strong>Temp:</strong> {c.temp_c}°C</div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* HIGHEST RISK ZONES SIDEBAR */}
          <div className="flex-1 bg-[#111827] border border-slate-800 rounded-lg p-4 flex flex-col shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-4">Highest Risk Zones</h3>
            
            <input
              type="text"
              placeholder="Search city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b] border border-slate-700 text-slate-200 rounded-md px-3 py-2 mb-4 focus:outline-none focus:border-blue-500 transition-colors"
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {filteredCities.length === 0 ? (
                <p className="text-slate-500 text-sm">No cities found.</p>
              ) : (
                filteredCities.map((city) => (
                  <div
                    key={city.city}
                    onClick={() => setSelectedCity({ lat: city.lat, lng: city.lng })}
                    className={`p-3 rounded-md cursor-pointer transition-colors border ${
                      selectedCity?.lat === city.lat
                        ? 'bg-[#1e293b] border-blue-500/50'
                        : 'bg-[#0a0f1c]/50 border-transparent hover:bg-[#1e293b]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-slate-200">{city.city}</span>
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${
                        city.predicted_aqi > 50 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        AQI {city.predicted_aqi}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-500">
                        {city.vcd_mol_m2} mol/m²
                      </p>
                      <p className="text-xs text-slate-500">
                        {city.temp_c}°C
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

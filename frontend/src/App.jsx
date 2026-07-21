import MLOpsPipeline from './MLOpsPipeline';
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function App() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // NEW: State to manage which tab is currently active
  const [activeTab, setActiveTab] = useState("Live Hotspots");

  // 1. Fetch live data
  useEffect(() => {
    fetch('https://vayu-twin-backend.onrender.com/data')
      .then(res => res.json())
      .then(json => {
        setData(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("API error:", err);
        setData([]); 
        setLoading(false);
      });
  }, []);

  // 2. Universal Search Filter (Controls both the list AND the map)
  const filteredData = (Array.isArray(data) ? data : []).filter(item => 
    item && item.city && item.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 p-6 border-r border-slate-800">
        <h1 className="text-2xl font-bold mb-10 text-blue-500">VayuTwin</h1>
        <nav className="space-y-4 cursor-pointer">
          {/* Dynamic Sidebar Buttons */}
          <div 
            onClick={() => setActiveTab("Live Hotspots")}
            className={`p-3 rounded transition-colors duration-200 ${activeTab === "Live Hotspots" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
          >
            Live Hotspots
          </div>
          <div 
            onClick={() => setActiveTab("MLOps Pipeline")}
            className={`p-3 rounded transition-colors duration-200 ${activeTab === "MLOps Pipeline" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
          >
            MLOps Pipeline
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto h-screen">
        
        {/* Conditional Rendering based on activeTab */}
        {activeTab === "Live Hotspots" ? (
          <>
            <header className="mb-8">
              <h1 className="text-3xl font-bold">HCHO Surface Concentration</h1>
              <p className="text-slate-400">AI-Predicted AQI derived from Sentinel-5P VCD Satellite Data</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-900 p-6 rounded border border-slate-800">
                <h3 className="text-slate-400">Critical Hotspots</h3>
                <p className="text-4xl font-bold text-red-500">
                  {filteredData.filter(d => d.predicted_aqi > 150).length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
              
              {/* Live Geospatial Map */}
              <div className="col-span-2 bg-slate-900 p-6 rounded border border-slate-800" style={{ height: '500px' }}>
                <h2 className="mb-4 font-bold">Live HCHO Heatmap (India)</h2>
                <div className="w-full h-[400px] rounded overflow-hidden border border-slate-800 relative z-0">
                  <MapContainer 
                    center={[22.5937, 78.9629]} 
                    zoom={4} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    />
                    
                    {/* The map now loops over 'filteredData' instead of raw 'data' */}
                    {filteredData.map((city, idx) => (
                      <CircleMarker
                        key={idx}
                        center={[city.lat, city.lng]}
                        pathOptions={{ 
                          color: city.predicted_aqi > 150 ? '#ef4444' : city.predicted_aqi > 100 ? '#f97316' : '#22c55e',
                          fillColor: city.predicted_aqi > 150 ? '#ef4444' : city.predicted_aqi > 100 ? '#f97316' : '#22c55e',
                          fillOpacity: 0.6
                        }}
                        radius={city.predicted_aqi > 100 ? 20 : 12}
                      >
                        <Popup>
                          <div className="text-slate-900 text-sm">
                            <strong className="text-lg">{city.city}</strong><br/>
                            Predicted AQI: <strong>{city.predicted_aqi}</strong><br/>
                            Temperature: {city.temp_c}°C
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>
              </div>

              {/* Highest Risk Zones (Searchable) */}
              <div className="bg-slate-900 p-6 rounded border border-slate-800 flex flex-col" style={{ height: '500px' }}>
                <h2 className="mb-4 font-bold">Highest Risk Zones</h2>
                
                <input 
                  type="text" 
                  placeholder="Search city..." 
                  className="w-full p-2 mb-4 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                  {loading ? (
                    <p>Loading data...</p>
                  ) : filteredData.length > 0 ? (
                    filteredData.map(city => (
                      <div key={city.city} className="flex justify-between p-3 bg-slate-950 rounded border border-slate-800">
                        <span>{city.city}</span>
                        <span className={city.predicted_aqi > 150 ? "text-red-400" : "text-green-400"}>
                          {city.predicted_aqi} AQI
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">No cities found.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-start pt-10">
            {/* Renders your new Pipeline Architecture component */}
            <MLOpsPipeline />
          </div>
        )}
      </main>
    </div>
  );
}

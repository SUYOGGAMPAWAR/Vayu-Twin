import React, { useState, useEffect } from 'react';

export default function App() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // 1. Fetch live data
  useEffect(() => {
    fetch('http://localhost:8000/data')
      .then(res => res.json())
      .then(json => {
        // Force data to be an array even if API sends something else
        setData(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("API error:", err);
        setData([]); 
        setLoading(false);
      });
  }, []);

  // 2. Defensive filtering: ensures we never call .filter() on a null/undefined variable
  const filteredData = (Array.isArray(data) ? data : []).filter(item => 
    item && item.city && item.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 p-6 border-r border-slate-800">
        <h1 className="text-2xl font-bold mb-10 text-blue-500">VayuTwin</h1>
        <nav className="space-y-4">
          <div className="p-3 bg-blue-600 rounded">Live Hotspots</div>
          <div className="p-3 text-slate-400 hover:text-white">MLOps Pipeline</div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
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
          {/* Map Placeholder */}
          <div className="col-span-2 bg-slate-900 p-6 rounded border border-slate-800 h-96">
            <h2 className="mb-4">Live HCHO Heatmap (India)</h2>
            <div className="w-full h-full bg-slate-950 rounded flex items-center justify-center border border-slate-800">
               Map Visualization Placeholder
            </div>
          </div>

          {/* Highest Risk Zones (Searchable) */}
          <div className="bg-slate-900 p-6 rounded border border-slate-800">
            <h2 className="mb-4 font-bold">Highest Risk Zones</h2>
            
            <input 
              type="text" 
              placeholder="Search city..." 
              className="w-full p-2 mb-4 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="space-y-3">
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
      </main>
    </div>
  );
}
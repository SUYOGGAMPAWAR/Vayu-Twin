import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { supabase } from './supabaseClient';
import TrendChart from './TrendChart';
import PolicySimulator from './PolicySimulator';
import HeatmapLayer from './HeatmapLayer';
import ExposureCard from './ExposureCard';

const DEFAULT_CENTER = [22.5937, 78.9629];
const DEFAULT_ZOOM = 4.5;
const ZOOMED_IN_LEVEL = 10;

// Helper to handle smooth map flying
function MapController({ selectedCity }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCity) {
      map.flyTo([selectedCity.lat, selectedCity.lng], ZOOMED_IN_LEVEL, { duration: 1.2 });
    } else {
      map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.2 });
    }
  }, [selectedCity, map]);

  return null;
}

// VayuTwin Logo Icon Component
function VayuTwinLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-600 p-0.5 shadow-md shadow-blue-500/20 shrink-0">
        <div className="w-full h-full bg-[#0a0f1c] rounded-[6px] flex items-center justify-center">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 002.5-2.5V14M12 21a9 9 0 100-18 9 9 0 000 18z" />
          </svg>
        </div>
      </div>
      <div>
        <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-blue-400 bg-clip-text text-transparent leading-none">
          VayuTwin
        </h1>
        <span className="text-[9px] text-cyan-400 font-semibold tracking-wider uppercase">
          Atmospheric Twin
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  // Policy Simulator Sliders
  const [trafficReduction, setTrafficReduction] = useState(0);
  const [industrialReduction, setIndustrialReduction] = useState(0);

  // Map Display Controls
  const [viewMode, setViewMode] = useState('heatmap');
  const [mapStyle, setMapStyle] = useState('dark');

  // Supabase Auth Session Handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const calculateSimulatedAQI = (baseAqi) => {
    if (!baseAqi) return 0;
    const offsetFactor = 1 - (trafficReduction * 0.0035 + industrialReduction * 0.0025);
    return Math.max(10, Math.round(baseAqi * offsetFactor));
  };

  // Fetch Telemetry Data
  useEffect(() => {
    if (!session) return;

    fetch('https://vayu-twin-backend.onrender.com/data')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sortedData = data.sort((a, b) => (b.original_aqi || 0) - (a.original_aqi || 0));
          setCities(sortedData);
        }
      })
      .catch((err) => console.error('Error fetching backend telemetry:', err));
  }, [session]);

  // Fetch 24h Trend History
  useEffect(() => {
    if (selectedCity?.city && session) {
      fetch(`https://vayu-twin-backend.onrender.com/history/${selectedCity.city}`)
        .then((res) => res.json())
        .then((data) => setHistoryData(data))
        .catch((err) => console.error('Error fetching history:', err));
    } else {
      setHistoryData([]);
    }
  }, [selectedCity, session]);

  // Toggle selection on city click
  const handleCityClick = (cityObj) => {
    if (selectedCity?.city === cityObj.city) {
      setSelectedCity(null); // Zoom back out
    } else {
      setSelectedCity(cityObj); // Zoom in
    }
  };

  const resetMapView = () => setSelectedCity(null);

  const citiesWithSimulation = cities.map((c) => ({
    ...c,
    simulated_aqi: calculateSimulatedAQI(c.predicted_aqi),
  }));

  const filteredCities = citiesWithSimulation.filter((c) =>
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSelectedCity = citiesWithSimulation.find((c) => c.city === selectedCity?.city) || selectedCity;
  const criticalHotspots = citiesWithSimulation.filter((c) => (c.original_aqi || 0) > 50).length;

  const exportToCSV = () => {
    if (!citiesWithSimulation || citiesWithSimulation.length === 0) return;

    const headers = [
      'City', 'Latitude', 'Longitude', 'Temp (°C)', 'Humidity (%)',
      'HCHO VCD (mol/m²)', 'HCHO AQI (Raw)', 'Simulated AQI',
      'Original Sensor AQI', 'Population'
    ];

    const rows = citiesWithSimulation.map((c) => [
      `"${c.city}"`, c.lat, c.lng, c.temp_c, c.humidity,
      c.vcd_mol_m2, c.predicted_aqi, c.simulated_aqi,
      c.original_aqi || 'N/A', c.population || 'N/A'
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `VayuTwin_Telemetry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loadingAuth) {
    return (
      <div className="h-screen bg-[#0a0f1c] text-white flex items-center justify-center font-sans">
        <p className="text-slate-400 font-medium">Authenticating VayuTwin Console...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen bg-[#0a0f1c] text-slate-200 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-[#111827] border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl text-center">
          <div className="flex justify-center mb-6">
            <VayuTwinLogo />
          </div>

          <p className="text-slate-400 text-sm mb-8">
            Eco-Societal Air Quality Digital Twin Platform
          </p>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold py-3 px-4 rounded-xl hover:bg-slate-100 transition shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const tileUrl =
    mapStyle === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  return (
    <div className="flex flex-col h-screen bg-[#0a0f1c] text-slate-300 overflow-hidden font-sans">
      {/* TOP WIDESCREEN NAVIGATION HEADER */}
      <header className="bg-[#111827] border-b border-slate-800 px-6 py-2 flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center gap-5">
          <VayuTwinLogo />
          
          <div className="h-4 w-[1px] bg-slate-800 hidden md:block"></div>
          
          <div className="hidden md:flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-300">Eco-Societal Control Center</span>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-semibold rounded-full border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Sentinel-5P Satellite Active
            </span>
          </div>
        </div>

        {/* HEADER RIGHT ACTION CONTROLS */}
        <div className="flex items-center gap-3">
          <div className="flex bg-[#0a0f1c] border border-slate-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'heatmap' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Heatmap
            </button>
            <button
              onClick={() => setViewMode('markers')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'markers' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Markers
            </button>
          </div>

          <button
            onClick={exportToCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>

          <div className="h-4 w-[1px] bg-slate-800"></div>

          {/* USER AVATAR & SIGN OUT */}
          <div className="flex items-center gap-2">
            {session.user.user_metadata?.avatar_url ? (
              <img
                src={session.user.user_metadata.avatar_url}
                alt="User"
                className="w-6 h-6 rounded-full border border-blue-500/30"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[10px] text-white">
                {session.user.email?.[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="text-slate-500 hover:text-red-400 text-xs transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD BODY (FULL SCREEN FLEX LAYOUT) */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden gap-2.5">
        
        {/* ROW 1: ULTRA-COMPACT METRICS & SIMULATOR GRID */}
        <div className="grid grid-cols-12 gap-2.5 shrink-0 min-h-[115px]">
          <div className="col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-3 shadow-sm flex flex-col justify-between">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Hotspots (&gt;50 AQI)</h3>
            <p className="text-2xl font-bold text-red-500">{criticalHotspots}</p>
            <span className="text-[9px] text-slate-500">Critical zones</span>
          </div>

          <div className="col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-3 shadow-sm flex flex-col justify-between">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Target</h3>
            <p className="text-lg font-bold text-blue-400 truncate">
              {selectedCity?.city || 'National Grid'}
            </p>
            <span className="text-[9px] text-slate-500">
              {selectedCity ? 'Click again to zoom out' : 'Select city on map'}
            </span>
          </div>

          <div className="col-span-4">
            <ExposureCard selectedCity={activeSelectedCity} simulatedAqi={activeSelectedCity?.simulated_aqi} />
          </div>

          <div className="col-span-4">
            <PolicySimulator
              trafficReduction={trafficReduction}
              setTrafficReduction={setTrafficReduction}
              industrialReduction={industrialReduction}
              setIndustrialReduction={setIndustrialReduction}
            />
          </div>
        </div>

        {/* ROW 2: MAP & CITY DATABASE (flex-1 dynamically expands map to fill vertical height) */}
        <div className="flex gap-2.5 flex-1 min-h-0">
          
          {/* LEAFLET MAP CONTAINER */}
          <div className="flex-[3] bg-[#111827] border border-slate-800 rounded-xl p-2 flex flex-col shadow-sm relative z-0">
            <div className="absolute top-3 left-3 z-[1000] bg-[#0a0f1c]/90 backdrop-blur-md border border-slate-700/80 rounded-lg px-2.5 py-1 shadow-lg flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-slate-200">
                  {selectedCity ? selectedCity.city : 'National Overview'}
                </span>
              </div>

              {selectedCity && (
                <button
                  onClick={resetMapView}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-2 py-0.5 rounded text-[10px] transition shadow"
                >
                  🎯 Recenter Map
                </button>
              )}

              <div className="flex border-l border-slate-700 pl-2 gap-1">
                <button
                  onClick={() => setMapStyle('dark')}
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    mapStyle === 'dark' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setMapStyle('satellite')}
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    mapStyle === 'satellite' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Satellite
                </button>
              </div>
            </div>

            <div className="flex-1 rounded-lg overflow-hidden border border-slate-800 relative">
              <MapContainer 
                center={DEFAULT_CENTER} 
                zoom={DEFAULT_ZOOM} 
                zoomControl={false} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url={tileUrl} attribution='&copy; CARTO' />
                <MapController selectedCity={selectedCity} />

                {viewMode === 'heatmap' && <HeatmapLayer points={citiesWithSimulation} />}

                {citiesWithSimulation.map((c) => {
                  const isSelected = selectedCity?.city === c.city;
                  const isCritical = (c.original_aqi || 0) > 50;

                  return (
                    <CircleMarker
                      key={c.city}
                      center={[c.lat, c.lng]}
                      radius={isSelected ? 14 : isCritical ? 10 : 7}
                      eventHandlers={{ click: () => handleCityClick(c) }}
                      pathOptions={{
                        color: isSelected ? '#38bdf8' : isCritical ? '#ef4444' : '#3b82f6',
                        fillColor: isSelected ? '#38bdf8' : isCritical ? '#ef4444' : '#3b82f6',
                        fillOpacity: isSelected ? 0.9 : viewMode === 'heatmap' ? 0.4 : 0.75,
                        weight: isSelected ? 3 : 1.5,
                      }}
                    >
                      <Popup className="text-slate-900 font-sans">
                        <div className="font-bold text-base mb-1">{c.city}</div>
                        <div className="text-xs text-slate-500 mb-2">
                          {isSelected ? 'Click marker again to zoom out' : 'Click marker to focus'}
                        </div>
                        <div className="text-sm text-amber-600 mb-0.5">
                          <strong>Original AQI:</strong> {c.original_aqi || 'N/A'}
                        </div>
                        <div className="text-sm text-blue-600 mb-0.5">
                          <strong>HCHO Only:</strong> {c.simulated_aqi}
                        </div>
                        <div className="text-sm text-slate-600">
                          <strong>Population:</strong> {c.population ? c.population.toLocaleString() : 'N/A'}
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          {/* LOCATION DATABASE SIDEBAR */}
          <div className="flex-1 bg-[#111827] border border-slate-800 rounded-xl p-2.5 flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-1.5">
              <h3 className="text-xs font-semibold text-white">Location Database</h3>
              {selectedCity && (
                <button onClick={resetMapView} className="text-[10px] text-blue-400 hover:text-blue-300 underline">
                  Clear Focus
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder="Search city location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b] border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 mb-2 focus:outline-none focus:border-blue-500 text-xs transition-colors"
            />

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {filteredCities.map((city) => {
                const isSelected = selectedCity?.city === city.city;

                return (
                  <div
                    key={city.city}
                    onClick={() => handleCityClick(city)}
                    className={`p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-[#1e293b] border-blue-500 shadow-md ring-1 ring-blue-500/50'
                        : 'bg-[#0a0f1c]/50 border-transparent hover:bg-[#1e293b]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-100 text-xs">{city.city}</span>
                      {isSelected ? (
                        <span className="text-[9px] text-blue-400 font-bold uppercase">Active</span>
                      ) : (
                        <span className="text-[10px] text-slate-500">{city.temp_c}°C</span>
                      )}
                    </div>

                    <div className="flex gap-1.5 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-400">
                        AQI: {city.original_aqi || '--'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-500/20 text-blue-400">
                        Sim: {city.simulated_aqi}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-800/60 pt-1">
                      <span>Density: {city.vcd_mol_m2} mol/m²</span>
                      <span>Pop: {city.population ? `${(city.population / 1000000).toFixed(1)}M` : 'N/A'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ROW 3: COMPACT TREND CHART PANEL */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 h-48 shadow-sm shrink-0 overflow-hidden">
            <TrendChart cityName={selectedCity?.city} data={historyData} />
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { supabase } from './supabaseClient';
import TrendChart from './TrendChart';
import PolicySimulator from './PolicySimulator';
import HeatmapLayer from './HeatmapLayer';
import ExposureCard from './ExposureCard';

// Default India Overview Center and Zoom Level
const DEFAULT_CENTER = [22.5937, 78.9629];
const DEFAULT_ZOOM = 4.5;
const ZOOMED_IN_LEVEL = 10;

// --- Controller for Smooth Map Panning/Zooming ---
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

export default function VayuTwinDashboard() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(null); // Starts zoomed out (null)
  const [historyData, setHistoryData] = useState([]);

  // Policy Simulation Sliders
  const [trafficReduction, setTrafficReduction] = useState(0);
  const [industrialReduction, setIndustrialReduction] = useState(0);

  // Map Controls
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap' vs 'markers'
  const [mapStyle, setMapStyle] = useState('dark'); // 'dark' vs 'satellite'

  // --- 1. Supabase Auth Listener ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

  // --- 2. Calculate Policy Offsets ---
  const calculateSimulatedAQI = (baseAqi) => {
    if (!baseAqi) return 0;
    const offsetFactor = 1 - (trafficReduction * 0.0035 + industrialReduction * 0.0025);
    return Math.max(10, Math.round(baseAqi * offsetFactor));
  };

  // --- 3. Fetch Telemetry Data ---
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
      .catch((err) => console.error('Error fetching backend data:', err));
  }, [session]);

  // --- 4. Fetch 24-Hour Trend History ---
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

  // --- 5. Interactive City Selection Logic (Zoom In / Zoom Out on Repeat Click) ---
  const handleCityClick = (cityObj) => {
    if (selectedCity?.city === cityObj.city) {
      // If already selected: Unselect and smooth fly back to zoomed-out default view
      setSelectedCity(null);
    } else {
      // Zoom in to selected city
      setSelectedCity(cityObj);
    }
  };

  const resetMapView = () => {
    setSelectedCity(null);
  };

  // Transformation Data
  const citiesWithSimulation = cities.map((c) => ({
    ...c,
    simulated_aqi: calculateSimulatedAQI(c.predicted_aqi),
  }));

  const filteredCities = citiesWithSimulation.filter((c) =>
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSelectedCity = citiesWithSimulation.find((c) => c.city === selectedCity?.city) || selectedCity;

  const criticalHotspots = citiesWithSimulation.filter((c) => (c.original_aqi || 0) > 50).length;

  // --- CSV Export ---
  const exportToCSV = () => {
    if (!citiesWithSimulation || citiesWithSimulation.length === 0) return;

    const headers = [
      'City',
      'Latitude',
      'Longitude',
      'Temperature (°C)',
      'Humidity (%)',
      'HCHO VCD (mol/m²)',
      'HCHO AQI (Raw AI)',
      'HCHO AQI (Simulated)',
      'Original AQI (Sensors)',
      'Census Population',
    ];

    const rows = citiesWithSimulation.map((c) => [
      `"${c.city}"`,
      c.lat,
      c.lng,
      c.temp_c,
      c.humidity,
      c.vcd_mol_m2,
      c.predicted_aqi,
      c.simulated_aqi,
      c.original_aqi || 'N/A',
      c.population || 'N/A',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `VayuTwin_AQI_Export_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- AUTH SCREEN ---
  if (loadingAuth) {
    return (
      <div className="h-screen bg-[#0a0f1c] text-white flex items-center justify-center font-sans">
        <p className="text-slate-400">Connecting to VayuTwin Security Portal...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen bg-[#0a0f1c] text-slate-200 flex flex-col items-center justify-center font-sans p-4">
        <div className="bg-[#111827] border border-slate-800 p-8 rounded-xl max-w-md w-full shadow-2xl text-center">
          <h1 className="text-3xl font-bold text-blue-500 mb-2">VayuTwin</h1>
          <p className="text-slate-400 text-sm mb-8">
            Eco-Societal Air Quality Digital Twin Platform
          </p>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold py-3 px-4 rounded-lg hover:bg-slate-100 transition duration-200 shadow"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Tile layer mapping
  const tileUrl =
    mapStyle === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  return (
    <div className="flex h-screen bg-[#0a0f1c] text-slate-300 font-sans overflow-hidden">
      {/* NAVIGATION SIDEBAR */}
      <div className="w-64 bg-[#0a0f1c] border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
        <div>
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

        {/* PROFILE CARD */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {session.user.user_metadata?.avatar_url ? (
              <img
                src={session.user.user_metadata.avatar_url}
                alt="Avatar"
                className="w-8 h-8 rounded-full border border-blue-500/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                {session.user.email?.[0].toUpperCase()}
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {session.user.user_metadata?.full_name || session.user.email}
              </p>
              <p className="text-[10px] text-emerald-400 font-medium">● Online</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="text-slate-400 hover:text-red-400 text-xs p-1 transition"
          >
            ✕
          </button>
        </div>
      </div>

      {/* MAIN BODY */}
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        {/* HEADER */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Eco-Societal Digital Twin</h2>
            <p className="text-slate-400 text-sm">
              Sentinel-5P HCHO Satellite Telemetry & Real-Time Policy Simulation
            </p>
          </div>

          <div className="flex gap-3 items-center">
            {/* EXPORT BUTTON */}
            <button
              onClick={exportToCSV}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition"
            >
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>

            {/* VIEW MODE TOGGLE */}
            <div className="flex bg-[#111827] border border-slate-800 p-1 rounded-md text-xs font-semibold">
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  viewMode === 'heatmap' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Heatmap Surface
              </button>
              <button
                onClick={() => setViewMode('markers')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  viewMode === 'markers' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Station Markers
              </button>
            </div>
          </div>
        </div>

        {/* METRICS & SIMULATOR GRID */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 shadow-sm">
            <h3 className="text-xs font-medium text-slate-400 mb-1">Critical Hotspots (Original AQI &gt; 50)</h3>
            <p className="text-3xl font-bold text-red-500">{criticalHotspots}</p>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-medium text-slate-400 mb-1">Active Focus Location</h3>
              <p className="text-2xl font-bold text-blue-400 truncate mb-1">
                {selectedCity?.city || 'National Overview'}
              </p>
            </div>
            <p className="text-[10px] text-slate-500">
              {selectedCity ? 'Click city marker again to unselect' : 'Select city to inspect target'}
            </p>
          </div>

          {/* EXPOSURE CARD */}
          <ExposureCard selectedCity={activeSelectedCity} simulatedAqi={activeSelectedCity?.simulated_aqi} />

          {/* POLICY SIMULATOR CARD */}
          <PolicySimulator
            trafficReduction={trafficReduction}
            setTrafficReduction={setTrafficReduction}
            industrialReduction={industrialReduction}
            setIndustrialReduction={setIndustrialReduction}
          />
        </div>

        {/* MAP & CITY LIST SECTION */}
        <div className="flex gap-6 h-[420px] mb-6">
          {/* LEAFLET MAP CONTAINER */}
          <div className="flex-[2] bg-[#111827] border border-slate-800 rounded-lg p-4 flex flex-col shadow-sm relative z-0">
            {/* SLEEK MAP OVERLAY HUD */}
            <div className="absolute top-6 left-6 z-[1000] bg-[#0a0f1c]/85 backdrop-blur-md border border-slate-700/80 rounded-lg px-3 py-2 shadow-lg flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-slate-200">
                  {selectedCity ? selectedCity.city : 'National Grid'}
                </span>
              </div>

              {selectedCity && (
                <button
                  onClick={resetMapView}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-2 py-1 rounded text-[11px] transition shadow"
                >
                  🎯 Recenter Map
                </button>
              )}

              {/* Map Tile Style Switcher */}
              <div className="flex border-l border-slate-700 pl-3 gap-1">
                <button
                  onClick={() => setMapStyle('dark')}
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    mapStyle === 'dark' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cyber Dark
                </button>
                <button
                  onClick={() => setMapStyle('satellite')}
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    mapStyle === 'satellite' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Satellite
                </button>
              </div>
            </div>

            {/* LEAFLET CONTAINER */}
            <div className="flex-1 rounded-md overflow-hidden border border-slate-800 relative">
              <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={tileUrl} attribution='&copy; <a href="https://carto.com/">CARTO</a>' />

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
                      eventHandlers={{
                        click: () => handleCityClick(c),
                      }}
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

          {/* SIDEBAR LOCATION LIST */}
          <div className="flex-1 bg-[#111827] border border-slate-800 rounded-lg p-4 flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-white">Location Database</h3>
              {selectedCity && (
                <button
                  onClick={resetMapView}
                  className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder="Search city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b] border border-slate-700 text-slate-200 rounded-md px-3 py-2 mb-3 focus:outline-none focus:border-blue-500 text-sm transition-colors"
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredCities.map((city) => {
                const isSelected = selectedCity?.city === city.city;

                return (
                  <div
                    key={city.city}
                    onClick={() => handleCityClick(city)}
                    className={`p-3 rounded-md cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-[#1e293b] border-blue-500 shadow-md ring-1 ring-blue-500/50'
                        : 'bg-[#0a0f1c]/50 border-transparent hover:bg-[#1e293b]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-medium text-slate-200">{city.city}</span>
                      {isSelected && <span className="text-[10px] text-blue-400 font-semibold">Active Focus</span>}
                    </div>

                    <div className="flex gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-400">
                        Original: {city.original_aqi || '--'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-blue-500/20 text-blue-400">
                        HCHO Only: {city.simulated_aqi}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>{city.vcd_mol_m2} mol/m²</span>
                      <span>
                        {city.population ? `${(city.population / 1000000).toFixed(1)}M pop` : `${city.temp_c}°C`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* TIME-SERIES TREND CHART PANEL */}
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 h-64 shadow-sm shrink-0">
          <TrendChart cityName={selectedCity?.city} data={historyData} />
        </div>
      </div>
    </div>
  );
}

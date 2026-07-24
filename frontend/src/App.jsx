import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { supabase } from './supabaseClient';
import TrendChart from './TrendChart';
import PolicySimulator from './PolicySimulator';
import HeatmapLayer from './HeatmapLayer';
import ExposureCard from './ExposureCard';

// Helper Component for Smooth Map Zooming
function FlyToCity({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], 10, { duration: 1.5 });
    }
  }, [center, map]);

  return null;
}

export default function VayuTwinDashboard() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  // Policy Simulation Sliders
  const [trafficReduction, setTrafficReduction] = useState(0);
  const [industrialReduction, setIndustrialReduction] = useState(0);

  // Map View Mode: 'heatmap' vs 'markers'
  const [viewMode, setViewMode] = useState('heatmap');

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

  // Login & Logout Handlers
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // --- 2. Calculate Simulated AQI ---
  const calculateSimulatedAQI = (baseAqi) => {
    if (!baseAqi) return 0;
    const offsetFactor = 1 - (trafficReduction * 0.0035 + industrialReduction * 0.0025);
    return Math.max(10, Math.round(baseAqi * offsetFactor));
  };

  // --- 3. Fetch City Telemetry Data ---
  useEffect(() => {
    if (!session) return;

    fetch('https://vayu-twin-backend.onrender.com/data')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sortedData = data.sort((a, b) => (b.original_aqi || 0) - (a.original_aqi || 0));
          setCities(sortedData);

          if (sortedData.length > 0 && !selectedCity) {
            setSelectedCity(sortedData[0]);
          }
        }
      })
      .catch((err) => console.error('Error loading backend data:', err));
  }, [session]);

  // --- 4. Fetch 24-Hour Trend History ---
  useEffect(() => {
    if (selectedCity?.city && session) {
      fetch(`https://vayu-twin-backend.onrender.com/history/${selectedCity.city}`)
        .then((res) => res.json())
        .then((data) => setHistoryData(data))
        .catch((err) => console.error('Error loading trend history:', err));
    }
  }, [selectedCity, session]);

  // Transform cities with simulated policy metrics
  const citiesWithSimulation = cities.map((c) => ({
    ...c,
    simulated_aqi: calculateSimulatedAQI(c.predicted_aqi),
  }));

  const filteredCities = citiesWithSimulation.filter((c) =>
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSelectedCity = citiesWithSimulation.find((c) => c.city === selectedCity?.city) || selectedCity;

  const criticalHotspots = citiesWithSimulation.filter((c) => (c.original_aqi || 0) > 50).length;

  // --- 5. Export Telemetry & Simulation Data to CSV ---
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

  // --- AUTH SCREEN (When not logged in) ---
  if (loadingAuth) {
    return (
      <div className="h-screen bg-[#0a0f1c] text-white flex items-center justify-center font-sans">
        <p className="text-slate-400">Loading VayuTwin Authentication...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen bg-[#0a0f1c] text-slate-200 flex flex-col items-center justify-center font-sans p-4">
        <div className="bg-[#111827] border border-slate-800 p-8 rounded-xl max-w-md w-full shadow-xl text-center">
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

  // --- AUTHENTICATED DASHBOARD SCREEN ---
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

        {/* USER PROFILE & LOGOUT */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {session.user.user_metadata?.avatar_url ? (
              <img
                src={session.user.user_metadata.avatar_url}
                alt="Avatar"
                className="w-8 h-8 rounded-full"
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
              <p className="text-[10px] text-slate-500">Authenticated</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="text-slate-400 hover:text-red-400 text-xs p-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* DASHBOARD BODY */}
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        {/* HEADER */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Eco-Societal Digital Twin</h2>
            <p className="text-slate-400 text-sm">
              Sentinel-5P HCHO Satellite Telemetry & Real Census Demographics
            </p>
          </div>

          <div className="flex gap-3 items-center">
            {/* EXPORT CSV BUTTON */}
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
                Continuous Heatmap
              </button>
              <button
                onClick={() => setViewMode('markers')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  viewMode === 'markers' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pin Markers
              </button>
            </div>
          </div>
        </div>

        {/* TOP METRICS & SIMULATOR GRID */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 shadow-sm">
            <h3 className="text-xs font-medium text-slate-400 mb-1">Critical Hotspots (Original AQI &gt; 50)</h3>
            <p className="text-3xl font-bold text-red-500">{criticalHotspots}</p>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 shadow-sm">
            <h3 className="text-xs font-medium text-slate-400 mb-1">Active Focus Location</h3>
            <p className="text-2xl font-bold text-blue-400 mb-1">{selectedCity?.city || 'None'}</p>
            <span className="text-[11px] text-slate-500">Targeted for scenario evaluation</span>
          </div>

          {/* SOCIETAL EXPOSURE CARD */}
          <ExposureCard
            selectedCity={activeSelectedCity}
            simulatedAqi={activeSelectedCity?.simulated_aqi}
          />

          {/* POLICY SIMULATOR CARD */}
          <PolicySimulator
            trafficReduction={trafficReduction}
            setTrafficReduction={setTrafficReduction}
            industrialReduction={industrialReduction}
            setIndustrialReduction={setIndustrialReduction}
          />
        </div>

        {/* MAP & CITY LIST SECTION */}
        <div className="flex gap-6 h-[400px] mb-6">
          {/* LEAFLET MAP */}
          <div className="flex-[2] bg-[#111827] border border-slate-800 rounded-lg p-4 flex flex-col shadow-sm relative z-0">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-white">Spatial Surface HCHO Density</h3>
              <span className="text-xs text-slate-400">
                Mode: {viewMode === 'heatmap' ? 'Gradient Surface Interpolation' : 'Station Markers'}
              </span>
            </div>

            <div className="flex-1 rounded-md overflow-hidden border border-slate-800">
              <MapContainer
                center={[22.5937, 78.9629]}
                zoom={4.5}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                <FlyToCity center={selectedCity} />

                {viewMode === 'heatmap' && <HeatmapLayer points={citiesWithSimulation} />}

                {citiesWithSimulation.map((c) => (
                  <CircleMarker
                    key={c.city}
                    center={[c.lat, c.lng]}
                    radius={(c.original_aqi || 0) > 50 ? 10 : 7}
                    eventHandlers={{
                      click: () => setSelectedCity(c),
                    }}
                    pathOptions={{
                      color: (c.original_aqi || 0) > 50 ? '#ef4444' : '#3b82f6',
                      fillColor: (c.original_aqi || 0) > 50 ? '#ef4444' : '#3b82f6',
                      fillOpacity: viewMode === 'heatmap' ? 0.3 : 0.7,
                      weight: 1.5,
                    }}
                  >
                    <Popup className="text-slate-900 font-sans">
                      <div className="font-bold text-base mb-1">{c.city}</div>
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
                ))}
              </MapContainer>
            </div>
          </div>

          {/* SIDEBAR LIST */}
          <div className="flex-1 bg-[#111827] border border-slate-800 rounded-lg p-4 flex flex-col shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-3">Location Database</h3>

            <input
              type="text"
              placeholder="Search city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b] border border-slate-700 text-slate-200 rounded-md px-3 py-2 mb-3 focus:outline-none focus:border-blue-500 text-sm transition-colors"
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredCities.map((city) => (
                <div
                  key={city.city}
                  onClick={() => setSelectedCity(city)}
                  className={`p-3 rounded-md cursor-pointer transition-colors border ${
                    selectedCity?.city === city.city
                      ? 'bg-[#1e293b] border-blue-500/50'
                      : 'bg-[#0a0f1c]/50 border-transparent hover:bg-[#1e293b]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-slate-200">{city.city}</span>
                  </div>

                  <div className="flex gap-2 mb-2">
                    <span className="text-xs px-2 py-1 rounded font-semibold bg-amber-500/20 text-amber-400">
                      Original: {city.original_aqi || '--'}
                    </span>
                    <span className="text-xs px-2 py-1 rounded font-semibold bg-blue-500/20 text-blue-400">
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
              ))}
            </div>
          </div>
        </div>

        {/* RECHARTS TREND CHART */}
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 h-64 shadow-sm shrink-0">
          <TrendChart cityName={selectedCity?.city} data={historyData} />
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export default function TrendChart({ cityName, data }) {
  if (!cityName) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
        <p className="font-medium">No Location Selected</p>
        <p className="text-xs text-slate-600 mt-1">Click any city marker to load 24-hour sensor trends.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        Loading telemetry data for {cityName}...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-white">
          24-Hour Telemetry Trend — <span className="text-blue-400">{cityName}</span>
        </h3>
        <span className="text-xs text-slate-400">Ground Sensors vs Satellite HCHO Proxy</span>
      </div>

      <div className="flex-1 min-h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }} />

            <Line
              type="monotone"
              dataKey="original_aqi"
              name="Original AQI (Ground Sensor)"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b' }}
              activeDot={{ r: 6 }}
            />

            <Line
              type="monotone"
              dataKey="hcho_aqi"
              name="HCHO Only (AI Proxy)"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

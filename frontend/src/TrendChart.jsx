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
      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
        <p className="font-medium">No Location Selected</p>
        <p className="text-[11px] text-slate-600 mt-0.5">Click any city marker to load 24-hour telemetry trends.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-xs">
        Loading telemetry data for {cityName}...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-1 shrink-0">
        <h3 className="text-xs font-semibold text-white">
          24-Hour Telemetry Trend — <span className="text-blue-400">{cityName}</span>
        </h3>
        <span className="text-[10px] text-slate-400">Ground Sensors vs Satellite HCHO Proxy</span>
      </div>

      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} dy={4} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} width={35} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '11px',
                padding: '6px 10px',
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '10px', paddingTop: '2px' }} 
              verticalAlign="top" 
              align="right"
            />

            <Line
              type="monotone"
              dataKey="original_aqi"
              name="Original AQI (Ground Sensor)"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#f59e0b' }}
              activeDot={{ r: 5 }}
            />

            <Line
              type="monotone"
              dataKey="hcho_aqi"
              name="HCHO Only (AI Proxy)"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

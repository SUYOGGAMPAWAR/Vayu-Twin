import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export default function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    const heatPoints = points.map((p) => [
      p.lat,
      p.lng,
      Math.min(1.0, Math.max(0.2, (p.simulated_aqi || p.predicted_aqi || 20) / 100)),
    ]);

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 38,
      blur: 22,
      maxZoom: 10,
      max: 1.0,
      gradient: {
        0.2: '#1d4ed8', // Deep Blue
        0.4: '#06b6d4', // Cyan
        0.6: '#10b981', // Emerald
        0.8: '#f59e0b', // Amber
        1.0: '#ef4444', // Neon Red
      },
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}

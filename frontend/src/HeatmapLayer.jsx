import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export default function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    // Map city records into Leaflet heat format: [lat, lng, intensity]
    // intensity is normalized between 0.1 and 1.0 based on predicted_aqi
    const heatPoints = points.map((p) => [
      p.lat,
      p.lng,
      Math.min(1.0, Math.max(0.2, (p.simulated_aqi || p.predicted_aqi || 20) / 100)),
    ]);

    // Create Leaflet Heat Layer with custom gradient
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 35,
      blur: 20,
      maxZoom: 10,
      max: 1.0,
      gradient: {
        0.2: '#3b82f6', // Light Blue (Low)
        0.4: '#10b981', // Green (Good)
        0.6: '#f59e0b', // Amber (Moderate)
        0.8: '#ef4444', // Red (Unhealthy)
        1.0: '#8b5cf6', // Purple (Severe)
      },
    });

    heatLayer.addTo(map);

    // Clean up layer when component unmounts or points update
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}

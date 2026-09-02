import { useState, useEffect } from 'react';

export function useV4Data() {
  const [data, setData] = useState({
    frames: [],
    loading: true,
    error: null,
    totalFrames: 0,
    intervalSec: 60,
    maxDepthUrl: "/api/runs/v4_extended/exports/max_depth?format=geotiff",
    inundationUrl: "/api/runs/v4_extended/exports/inundation_extent?format=geojson"
  });

  useEffect(() => {
    fetch('/api/runs/v4_extended/frames')
      .then(res => res.json())
      .then(json => {
        setData(prev => ({
          ...prev,
          frames: json.frames || [],
          totalFrames: json.frames ? json.frames.length : 0,
          loading: false
        }));
      })
      .catch(err => {
        console.error("V4 Frames fetch error:", err);
        setData(prev => ({ ...prev, error: err, loading: false }));
      });
  }, []);

  return data;
}

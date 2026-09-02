import React, { useState, useEffect } from 'react';
import { Download, ChevronDown, FileJson, Map, FileCode2, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';

export default function ExportMenu({ runId = 'TEHRI_V3_BENCHMARK', products = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [available, setAvailable] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/runs/${runId}/exports`)
      .then(res => res.json())
      .then(data => setAvailable(data))
      .catch(err => console.error("Failed to load exports:", err));
  }, [runId]);

  const handleDownload = async (product, format) => {
    setLoading(true);
    setMessage(`Preparing export...`);
    try {
      const res = await fetch(`/api/runs/${runId}/exports/${product}?format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${runId}_${product}.${format === 'shp' ? 'zip' : format === 'geotiff' ? 'tif' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setMessage('Download ready!');
      setTimeout(() => { setIsOpen(false); setMessage(''); }, 2000);
    } catch (err) {
      alert("Failed to download: " + err.message);
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  const formatIcon = (fmt) => {
    if (fmt === 'geojson') return <FileJson className="w-3 h-3" />;
    if (fmt === 'shp') return <Map className="w-3 h-3" />;
    if (fmt === 'kml') return <FileCode2 className="w-3 h-3" />;
    if (fmt === 'geotiff') return <ImageIcon className="w-3 h-3" />;
    if (fmt === 'csv') return <FileSpreadsheet className="w-3 h-3" />;
    return <Download className="w-3 h-3" />;
  };

  const displayProducts = products.filter(p => available[p]);

  if (displayProducts.length === 0) return null;

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
      >
        <Download className="w-4 h-4" /> EXPORT <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden text-sm">
          {message && (
             <div className="p-3 bg-blue-50 text-blue-700 font-bold text-xs border-b border-blue-100 text-center">
               {message}
             </div>
          )}
          <div className="max-h-96 overflow-y-auto">
            {displayProducts.map(p => (
              <div key={p} className="p-2 border-b border-slate-100 last:border-b-0">
                <div className="text-xs font-bold text-slate-500 mb-1 px-1 capitalize">{p.replace(/_/g, ' ')}</div>
                <div className="flex flex-wrap gap-1">
                  {available[p].map(fmt => (
                    <button 
                      key={fmt}
                      onClick={() => handleDownload(p, fmt)}
                      disabled={loading}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded text-[10px] font-bold uppercase transition disabled:opacity-50"
                    >
                      {formatIcon(fmt)} {fmt === 'shp' ? 'Shapefile' : fmt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

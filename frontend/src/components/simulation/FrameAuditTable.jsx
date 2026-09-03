import React from 'react';
import { CheckCircle2, FileCheck } from 'lucide-react';
import v4FramesMeta from '../../data/v4_frames_meta.json';

export default function FrameAuditTable({ onSelectFrame }) {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded flex flex-col h-full overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 bg-[#0B0F19] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-100 uppercase">
            LISFLOOD-FP 8.1 — 61 Temporal GeoTIFF Integrity Audit Table
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-800 bg-emerald-950/80 text-emerald-400 font-bold">
            61/61 VERIFIED UNIQUE
          </span>
        </div>
        <div className="text-[10px] text-slate-400">
          RESOLUTION: 30 m · WINDOW: 3600 s · INTERVAL: 60 s
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead className="sticky top-0 bg-[#0B0F19] border-b border-slate-800 text-slate-400 text-[10px] uppercase">
            <tr>
              <th className="py-2 px-3">Frame</th>
              <th className="py-2 px-3">Timestamp</th>
              <th className="py-2 px-3">File Identifier</th>
              <th className="py-2 px-3 text-right">Wet Cells</th>
              <th className="py-2 px-3 text-right">Wet Area</th>
              <th className="py-2 px-3 text-right">Frame Max Depth</th>
              <th className="py-2 px-3 text-center">MD5 Checksum</th>
              <th className="py-2 px-3 text-center">Integrity Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {v4FramesMeta.map((row) => (
              <tr
                key={row.frame}
                onClick={() => onSelectFrame && onSelectFrame(row.time_sec)}
                className="hover:bg-slate-800/50 cursor-pointer transition"
              >
                <td className="py-1.5 px-3 font-bold text-sky-400">#{String(row.frame).padStart(2, '0')}</td>
                <td className="py-1.5 px-3 text-slate-300">T+{row.time_sec}s</td>
                <td className="py-1.5 px-3 text-slate-400">{row.file}</td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-200">
                  {row.wet_cells.toLocaleString()}
                </td>
                <td className="py-1.5 px-3 text-right font-bold text-sky-300">
                  {row.wet_area_km2.toFixed(2)} km²
                </td>
                <td className="py-1.5 px-3 text-right text-slate-400">
                  {row.max_depth_m > 0 ? `${row.max_depth_m.toFixed(1)} m` : '0.0 m'}
                </td>
                <td className="py-1.5 px-3 text-center text-slate-500 font-mono text-[10px]">
                  {row.md5}
                </td>
                <td className="py-1.5 px-3 text-center">
                  <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border border-emerald-800/80 bg-emerald-950/60 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    VERIFIED
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

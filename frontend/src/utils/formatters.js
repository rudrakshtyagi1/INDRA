export function formatM3s(val) {
  if (val === undefined || val === null) return '-';
  if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M m³/s`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1)}k m³/s`;
  return `${Number(val).toFixed(1)} m³/s`;
}

export function formatCrores(val) {
  if (val === undefined || val === null) return '-';
  return `₹${Number(val).toFixed(2)} Cr`;
}

export function formatHours(val) {
  if (val === undefined || val === null) return '-';
  const hrs = Math.floor(val);
  const mins = Math.round((val - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

export function formatMinutes(mins) {
  if (mins === undefined || mins === null) return '-';
  if (mins < 60) return `${Math.round(mins)} min`;
  const hrs = Math.floor(mins / 60);
  const rem = Math.round(mins % 60);
  return `${hrs}h ${rem}m`;
}

/**
 * HydroBreach - Color scales for flood depth, velocity, and difference maps
 */

export function getDepthColor(depth, maxDepth = 15.0) {
  if (depth < 0.1) return 'rgba(0, 0, 0, 0)'; // dry
  const ratio = Math.min(Math.max(depth / maxDepth, 0), 1);

  // Deep Blues / Cyan / Purple ramp for water depth
  if (ratio < 0.15) return 'rgba(56, 189, 248, 0.65)'; // light cyan/blue (shallow < 2m)
  if (ratio < 0.40) return 'rgba(14, 165, 233, 0.75)'; // cyan-blue (2-5m)
  if (ratio < 0.70) return 'rgba(2, 132, 199, 0.85)';  // deep blue (5-10m)
  return 'rgba(30, 58, 138, 0.95)';                   // dark navy/purple (extreme > 10m)
}

export function getVelocityColor(vel, maxVel = 20.0) {
  if (vel < 0.2) return 'rgba(0,0,0,0)';
  const ratio = Math.min(Math.max(vel / maxVel, 0), 1);

  // Yellow -> Orange -> Red -> Magenta for velocity surge
  if (ratio < 0.25) return 'rgba(234, 179, 8, 0.7)';   // yellow (low < 5 m/s)
  if (ratio < 0.55) return 'rgba(249, 115, 22, 0.8)';  // orange (moderate 5-11 m/s)
  if (ratio < 0.80) return 'rgba(239, 68, 68, 0.9)';   // red (high 11-16 m/s)
  return 'rgba(168, 85, 247, 0.95)';                   // purple/magenta (extreme > 16 m/s)
}

export function getDifferenceColor(diff) {
  // SPH depth minus Delft3D depth (-5m to +5m)
  if (Math.abs(diff) < 0.1) return 'rgba(100, 116, 139, 0.3)'; // identical (neutral gray)
  if (diff > 0) {
    // SPH is deeper (red gradient)
    const alpha = Math.min(diff / 3.0, 0.9);
    return `rgba(239, 68, 68, ${alpha})`;
  } else {
    // Delft3D is deeper (blue gradient)
    const alpha = Math.min(Math.abs(diff) / 3.0, 0.9);
    return `rgba(59, 130, 246, ${alpha})`;
  }
}

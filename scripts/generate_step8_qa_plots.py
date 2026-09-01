#!/usr/bin/env python3
"""
Generate 7 standalone SVG engineering QA plots for Step 8:
1. Step 7 inflow Q_in(t)
2. Reservoir elevation vs time
3. Breach width vs time
4. Q_breach(t)
5. Cumulative release
6. LOW / BASE / HIGH breach hydrographs
7. Numerical timestep sensitivity
"""
from pathlib import Path
import pandas as pd
import numpy as np

BREACH_DIR = Path("data/processed/tehri_inputs/breach")
QA_DIR = BREACH_DIR / "qa"
PLOTS_DIR = QA_DIR / "plots"
PLOTS_DIR.mkdir(parents=True, exist_ok=True)

df_low = pd.read_csv(BREACH_DIR / "hydrographs" / "breach_hydrograph_low.csv")
df_base = pd.read_csv(BREACH_DIR / "hydrographs" / "breach_hydrograph_base.csv")
df_high = pd.read_csv(BREACH_DIR / "hydrographs" / "breach_hydrograph_high.csv")
df_ts = pd.read_csv(QA_DIR / "timestep_sensitivity.csv")

def create_svg_line_plot(filepath, title, x_data, y_series, x_label, y_label, width=800, height=450):
    """Generates a professional standalone SVG line chart."""
    pad_left, pad_right, pad_top, pad_bottom = 90, 40, 50, 60
    plot_w = width - pad_left - pad_right
    plot_h = height - pad_top - pad_bottom

    x_min, x_max = float(np.min(x_data)), float(np.max(x_data))
    if x_max == x_min: x_max += 1.0

    all_y = [y for _, y_arr, _ in y_series for y in y_arr]
    y_min, y_max = float(np.min(all_y)), float(np.max(all_y))
    if y_max == y_min: y_max += 1.0
    y_margin = (y_max - y_min) * 0.05
    y_min_plot = max(0.0, y_min - y_margin)
    y_max_plot = y_max + y_margin

    def to_screen(x, y):
        sx = pad_left + (x - x_min) / (x_max - x_min) * plot_w
        sy = pad_top + (1.0 - (y - y_min_plot) / (y_max_plot - y_min_plot)) * plot_h
        return sx, sy

    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">']
    svg.append('<rect width="100%" height="100%" fill="#0d1117"/>')
    svg.append(f'<text x="{width/2}" y="30" fill="#e6edf3" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" text-anchor="middle">{title}</text>')

    # Gridlines & Y-ticks
    n_yticks = 6
    for i in range(n_yticks):
        y_val = y_min_plot + (i / (n_yticks - 1)) * (y_max_plot - y_min_plot)
        _, sy = to_screen(x_min, y_val)
        svg.append(f'<line x1="{pad_left}" y1="{sy}" x2="{width-pad_right}" y2="{sy}" stroke="#30363d" stroke-width="1" stroke-dasharray="3,3"/>')
        svg.append(f'<text x="{pad_left-10}" y="{sy+4}" fill="#8b949e" font-family="system-ui, sans-serif" font-size="11" text-anchor="end">{y_val:,.1f}</text>')

    # X-ticks
    n_xticks = 7
    for i in range(n_xticks):
        x_val = x_min + (i / (n_xticks - 1)) * (x_max - x_min)
        sx, _ = to_screen(x_val, y_min_plot)
        svg.append(f'<line x1="{sx}" y1="{pad_top}" x2="{sx}" y2="{height-pad_bottom}" stroke="#30363d" stroke-width="1" stroke-dasharray="3,3"/>')
        svg.append(f'<text x="{sx}" y="{height-pad_bottom+20}" fill="#8b949e" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle">{x_val:.1f}</text>')

    # Axis Labels
    svg.append(f'<text x="{width/2}" y="{height-15}" fill="#c9d1d9" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">{x_label}</text>')
    svg.append(f'<text x="25" y="{height/2}" fill="#c9d1d9" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle" transform="rotate(-90, 25, {height/2})">{y_label}</text>')

    # Border
    svg.append(f'<rect x="{pad_left}" y="{pad_top}" width="{plot_w}" height="{plot_h}" fill="none" stroke="#8b949e" stroke-width="1.5"/>')

    # Lines
    legend_items = []
    for idx, (label, y_arr, color) in enumerate(y_series):
        points = []
        for x, y in zip(x_data, y_arr):
            sx, sy = to_screen(x, y)
            points.append(f"{sx:.1f},{sy:.1f}")
        pts_str = " ".join(points)
        svg.append(f'<polyline fill="none" stroke="{color}" stroke-width="2.5" points="{pts_str}"/>')
        legend_items.append((label, color))

    # Legend
    leg_x = width - pad_right - 180
    leg_y = pad_top + 15
    for idx, (lbl, col) in enumerate(legend_items):
        ly = leg_y + idx * 20
        svg.append(f'<line x1="{leg_x}" y1="{ly}" x2="{leg_x+25}" y2="{ly}" stroke="{col}" stroke-width="3"/>')
        svg.append(f'<text x="{leg_x+32}" y="{ly+4}" fill="#e6edf3" font-family="system-ui, sans-serif" font-size="12">{lbl}</text>')

    svg.append('</svg>')
    with open(filepath, "w") as f:
        f.write("\n".join(svg))
    print(f"  • Generated Plot: {filepath.name}")

def main():
    print("\n>>> Generating Step 8 Engineering QA Plots...")
    t_hrs = df_base["time_hrs"].values

    # 1. Step 7 Inflows
    create_svg_line_plot(
        PLOTS_DIR / "qa_plot_1_inflow_hydrographs.svg",
        "Step 7: Tehri Reservoir Inflow Hydrographs Q_in(t)",
        t_hrs,
        [
            ("Inflow LOW", df_low["Q_in_m3s"].values, "#58a6ff"),
            ("Inflow BASE", df_base["Q_in_m3s"].values, "#3fb950"),
            ("Inflow HIGH", df_high["Q_in_m3s"].values, "#f85149")
        ],
        "Event Time (hours from 2024-07-30 00:00 UTC)",
        "Inflow Discharge (m³/s)"
    )

    # 2. Reservoir Elevation vs Time
    create_svg_line_plot(
        PLOTS_DIR / "qa_plot_2_reservoir_elevation.svg",
        "What-If Dam Breach: Reservoir Water Surface Elevation Z(t)",
        t_hrs,
        [
            ("Elev LOW (MDDL 740m)", df_low["reservoir_elevation_m"].values, "#58a6ff"),
            ("Elev BASE (815m)", df_base["reservoir_elevation_m"].values, "#3fb950"),
            ("Elev HIGH (FRL 830m)", df_high["reservoir_elevation_m"].values, "#f85149")
        ],
        "Event Time (hours from 2024-07-30 00:00 UTC)",
        "Reservoir Water Level (m MSL)"
    )

    # 3. Breach Width vs Time
    create_svg_line_plot(
        PLOTS_DIR / "qa_plot_3_breach_width_evolution.svg",
        "What-If Breach Growth: Average Breach Width B(t)",
        t_hrs,
        [
            ("Width LOW (120m)", df_low["breach_width_m"].values, "#58a6ff"),
            ("Width BASE (220m)", df_base["breach_width_m"].values, "#3fb950"),
            ("Width HIGH (350m)", df_high["breach_width_m"].values, "#f85149")
        ],
        "Event Time (hours from 2024-07-30 00:00 UTC)",
        "Breach Opening Width (m)"
    )

    # 4. Q_breach(t) BASE
    create_svg_line_plot(
        PLOTS_DIR / "qa_plot_4_breach_hydrograph_base.svg",
        "What-If Breach Hydrograph Q_breach(t) — BASE Scenario (Froehlich 2008)",
        t_hrs,
        [
            ("Breach Inflow Q_in", df_base["Q_in_m3s"].values, "#8b949e"),
            ("Breach Outflow Q_breach", df_base["Q_breach_m3s"].values, "#f0883e")
        ],
        "Event Time (hours from 2024-07-30 00:00 UTC)",
        "Discharge (m³/s)"
    )

    # 5. Cumulative Release
    create_svg_line_plot(
        PLOTS_DIR / "qa_plot_5_cumulative_release.svg",
        "Cumulative Dam Breach Released Volume (MCM)",
        t_hrs,
        [
            ("Release LOW", df_low["cumulative_breach_release_m3"].values / 1e6, "#58a6ff"),
            ("Release BASE", df_base["cumulative_breach_release_m3"].values / 1e6, "#3fb950"),
            ("Release HIGH", df_high["cumulative_breach_release_m3"].values / 1e6, "#f85149")
        ],
        "Event Time (hours from 2024-07-30 00:00 UTC)",
        "Cumulative Volume (Million m³)"
    )

    # 6. Scenarios Comparison
    create_svg_line_plot(
        PLOTS_DIR / "qa_plot_6_scenarios_comparison.svg",
        "What-If Breach Outflow Hydrographs: LOW vs BASE vs HIGH Scenarios",
        t_hrs,
        [
            ("Breach LOW", df_low["Q_breach_m3s"].values, "#58a6ff"),
            ("Breach BASE", df_base["Q_breach_m3s"].values, "#3fb950"),
            ("Breach HIGH", df_high["Q_breach_m3s"].values, "#f85149")
        ],
        "Event Time (hours from 2024-07-30 00:00 UTC)",
        "Dam Breach Outflow (m³/s)"
    )

    # 7. Timestep Sensitivity
    create_svg_line_plot(
        PLOTS_DIR / "qa_plot_7_timestep_sensitivity.svg",
        "Numerical Integration Timestep Sensitivity (Peak Discharge vs Timestep)",
        df_ts["timestep_seconds"].values,
        [
            ("Peak Q_breach (m³/s)", df_ts["peak_Q_breach_m3s"].values, "#a371f7")
        ],
        "Integration Timestep dt (seconds)",
        "Peak Breach Discharge (m³/s)"
    )

if __name__ == "__main__":
    main()

import re

with open('frontend/src/components/sim/PlaybackRail.jsx', 'r') as f:
    content = f.read()

content = content.replace("maxTimeMin = 240", "maxTimeMin = 13.33") # ~800s

# Let's add the unavailable-edge progression text
# The timeLabel is currently `T+${hrs}h ${mins}m`. Let's just change it to seconds.
content = content.replace("const timeLabel = hrs > 0 ? `T+${hrs}h ${mins.toString().padStart(2, '0')}m` : `T+${currentTimeMin}m`;", 
"const totalSecs = Math.round(currentTimeMin * 60);\n"
"const timeLabel = `T+${totalSecs}s (Max 800s)`;\n"
"let edgeCount = 0; if (totalSecs >= 800) edgeCount = 52; else if (totalSecs >= 600) edgeCount = 49; else if (totalSecs >= 300) edgeCount = 31;\n"
"const roadStatus = totalSecs > 0 ? `UNAVAILABLE EDGES: ${edgeCount}` : 'AVAILABLE UNDER CURRENT MODEL';")

# Find where timeLabel is rendered
#           <span className="font-mono font-bold text-sm text-[var(--text-primary)] tabular-nums tracking-wide">
#            {timeLabel}
#          </span>

content = content.replace("{timeLabel}", "{timeLabel} | {roadStatus}")

with open('frontend/src/components/sim/PlaybackRail.jsx', 'w') as f:
    f.write(content)

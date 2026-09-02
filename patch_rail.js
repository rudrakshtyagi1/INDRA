const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/sim/PlaybackRail.jsx', 'utf-8');

const checkpoints = `
      {/* Checkpoint labels */}
      <div className="hidden md:flex flex-col text-[9px] font-mono text-slate-400 shrink-0">
        <div className="flex justify-between w-48 px-1 mb-0.5">
          <span title="~2 km">101s</span>
          <span title="~5 km">349s</span>
          <span title="~8 km">763s</span>
          <span className="text-slate-600 font-semibold" title="10 km">NOT REACHED</span>
        </div>
        <div className="flex justify-between w-48 border-t border-slate-300 relative">
          <div className="absolute top-0 left-0 h-1 border-l border-slate-300"></div>
          <div className="absolute top-0 left-1/3 h-1 border-l border-slate-300"></div>
          <div className="absolute top-0 left-2/3 h-1 border-l border-slate-300"></div>
          <div className="absolute top-0 right-0 h-1 border-r border-slate-400"></div>
        </div>
      </div>
`;

const checkpointsToken = "{/* Checkpoint labels */}";
const speedToken = "{/* Speed */}";
const startIdx = content.indexOf(checkpointsToken);
const endIdx = content.indexOf(speedToken);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.slice(0, startIdx) + checkpoints + '\n      ' + content.slice(endIdx);
}

fs.writeFileSync('frontend/src/components/sim/PlaybackRail.jsx', content);

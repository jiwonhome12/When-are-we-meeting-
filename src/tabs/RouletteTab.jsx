import React, { useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { Dices, Award, RefreshCw, HelpCircle } from 'lucide-react';

const SECTOR_COLORS = [
  '#FDA4AF', '#FED7AA', '#FEF08A', '#A7F3D0', 
  '#BAE6FD', '#E9D5FF', '#FBCFE8', '#99F6E4'
];

const RouletteTab = () => {
  const { 
    locations, 
    rouletteResult, 
    isSpinning, 
    spinRoulette 
  } = useRoom();

  const [rotationDegrees, setRotationDegrees] = useState(0);

  // We need at least 2 locations to run the roulette
  const candidates = locations.slice(0, 8); // Limit to 8 sectors for readability

  const handleSpin = () => {
    if (candidates.length < 2 || isSpinning) return;
    
    // Choose a large random rotation to spin several times
    // and align the pointer with the winner.
    // Each sector size = 360 / candidates.length
    const targetSpinDegrees = 1440 + Math.floor(Math.random() * 360);
    setRotationDegrees(prev => prev + targetSpinDegrees);
    
    spinRoulette(candidates);
  };

  return (
    <div className="space-y-4 w-full flex-1 flex flex-col items-center justify-center select-none text-center">
      
      {candidates.length < 2 ? (
        <div className="flex-1 w-full glass-card rounded-3xl border border-rose-100/50 bg-white/90 p-8 flex flex-col items-center justify-center text-center space-y-4 max-h-[350px]">
          <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100/60 flex items-center justify-center text-[#C00A4A] animate-bounce shadow-sm">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">룰렛 후보 장소 부족</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-[240px] mx-auto leading-relaxed font-medium">
              [장소 조율] 탭에서 후보지를 <span className="font-bold text-[#C00A4A]">2개 이상</span> 추천하고 투표에 올려주셔야 결정 도우미 룰렛을 돌릴 수 있습니다!
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-6 flex flex-col items-center">
          {/* 🎡 Vector SVG Styled Roulette Wheel Container */}
          <div className="relative w-56 h-56 flex items-center justify-center mt-2">
            
            {/* Arrow Pin at the top */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 z-30 drop-shadow-md">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-[#C00A4A] fill-[#C00A4A]">
                <path d="M12 21l-8-14h16l-8 14z" />
              </svg>
            </div>

            {/* Wheel SVG */}
            <div 
              className="w-full h-full rounded-full border-4 border-white shadow-xl ring-4 ring-slate-100/80 overflow-hidden relative transition-transform duration-[3000ms] cubic-bezier(0.2, 0.8, 0.2, 1)"
              style={{ transform: `rotate(${rotationDegrees}deg)` }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {candidates.map((loc, idx) => {
                  const numSectors = candidates.length;
                  const angle = 360 / numSectors;
                  const startAngle = idx * angle;
                  const endAngle = startAngle + angle;
                  
                  // Convert angles to radians for calculation
                  const radStart = (startAngle - 90) * (Math.PI / 180);
                  const radEnd = (endAngle - 90) * (Math.PI / 180);
                  
                  const x1 = 100 + 100 * Math.cos(radStart);
                  const y1 = 100 + 100 * Math.sin(radStart);
                  const x2 = 100 + 100 * Math.cos(radEnd);
                  const y2 = 100 + 100 * Math.sin(radEnd);
                  
                  // Large arc flag
                  const largeArc = angle > 180 ? 1 : 0;
                  
                  // Path for sector pie slice
                  const d = `M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  const color = SECTOR_COLORS[idx % SECTOR_COLORS.length];
                  
                  // Text rotation and anchor coordinates
                  const textAngle = startAngle + angle / 2;
                  const textRad = (textAngle - 90) * (Math.PI / 180);
                  const tx = 100 + 65 * Math.cos(textRad);
                  const ty = 100 + 65 * Math.sin(textRad);
                  
                  return (
                    <g key={loc.id}>
                      <path d={d} fill={color} stroke="#ffffff" strokeWidth="2" />
                      <text
                        x={tx}
                        y={ty}
                        fill="#1e293b"
                        fontSize="6.5"
                        fontWeight="900"
                        textAnchor="middle"
                        transform={`rotate(${textAngle}, ${tx}, ${ty})`}
                      >
                        {loc.name.length > 5 ? `${loc.name.slice(0, 5)}..` : loc.name}
                      </text>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="16" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
                <circle cx="100" cy="100" r="6" fill="#C00A4A" />
              </svg>
            </div>
          </div>

          {/* 🎲 Control Action Button */}
          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                isSpinning 
                  ? 'bg-slate-100 text-slate-400 border border-slate-200/60 scale-[0.98]'
                  : 'bg-gradient-to-r from-[#C00A4A] to-[#a3083e] hover:from-[#b00943] hover:to-[#910737] text-white shadow-pink-900/10 hover:scale-105 active:scale-95'
              }`}
            >
              {isSpinning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  룰렛 휠 롤링 중...
                </>
              ) : (
                <>
                  <Dices className="w-5 h-5" />
                  돌리기! 결정 도우미 스핀
                </>
              )}
            </button>
          </div>

          {/* 🎉 Winner Overlay Box */}
          {rouletteResult && !isSpinning && (
            <div className="glass-card p-5 rounded-2xl border border-rose-100 bg-white/95 max-w-xs w-full relative overflow-hidden animate-fadeIn shadow-xl">
              {/* Confetti floats simulation */}
              <div className="absolute inset-0 pointer-events-none opacity-40 select-none text-xs">
                <span className="absolute top-2 left-6 animate-float">🎉</span>
                <span className="absolute top-10 right-8 animate-float" style={{ animationDelay: '0.5s' }}>🌟</span>
                <span className="absolute bottom-4 left-10 animate-float" style={{ animationDelay: '1.2s' }}>🎊</span>
              </div>

              <div className="text-center space-y-2 relative z-10">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-[#C00A4A] flex items-center justify-center mx-auto shadow-sm">
                  <Award className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[#C00A4A] tracking-widest uppercase block">ROULETTE WINNER</span>
                  <h4 className="text-base font-extrabold text-slate-800 mt-1">{rouletteResult.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">{rouletteResult.address}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RouletteTab;

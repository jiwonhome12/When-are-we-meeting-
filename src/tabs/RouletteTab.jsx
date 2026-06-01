import React, { useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { Dices, Award, RefreshCw, HelpCircle, MapPin, Calendar } from 'lucide-react';

const SECTOR_COLORS = [
  '#FDA4AF', '#FED7AA', '#FEF08A', '#A7F3D0', 
  '#BAE6FD', '#E9D5FF', '#FBCFE8', '#99F6E4'
];

const RouletteTab = () => {
  const { 
    locations, 
    calendarVotes,
    rouletteResult, 
    isSpinning, 
    spinRoulette 
  } = useRoom();

  const [rouletteType, setRouletteType] = useState('location'); // 'location' or 'time'
  const [winnerCount, setWinnerCount] = useState(1); // 1, 2, or 3
  const [rotationDegrees, setRotationDegrees] = useState(0);

  const formatTimeKey = (key) => {
    try {
      const [dateStr, timeStr] = key.split('_');
      const [, month, day] = dateStr.split('-');
      return `${parseInt(month)}월 ${parseInt(day)}일 ${timeStr}`;
    } catch (e) {
      return key;
    }
  };

  // Convert calendarVotes to candidate format
  const timeCandidates = Object.entries(calendarVotes || {})
    .filter(([, votes]) => votes && votes.length > 0)
    .map(([key, votes]) => ({
      id: key,
      name: formatTimeKey(key),
      address: `${votes.length}명 투표함`
    }));

  const candidates = (rouletteType === 'location' ? locations : timeCandidates).slice(0, 8); // Limit to 8 for sectors

  const handleSpin = () => {
    if (candidates.length < 2 || isSpinning) return;
    
    // Choose rotation degree
    const targetSpinDegrees = 1440 + Math.floor(Math.random() * 360);
    setRotationDegrees(prev => prev + targetSpinDegrees);
    
    spinRoulette(candidates, winnerCount, rouletteType);
  };

  // Safe checks for rendering results
  const renderWinners = () => {
    if (!rouletteResult) return null;
    
    // Support legacy singular result, or new multi-winner result structure
    const winnersList = Array.isArray(rouletteResult.winners) 
      ? rouletteResult.winners 
      : [rouletteResult];

    return (
      <div className="grid grid-cols-1 gap-2.5 w-full mt-2">
        {winnersList.map((winner, idx) => (
          <div 
            key={winner.id || idx}
            className="flex items-center gap-3 p-3 bg-white border border-rose-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-8 h-8 rounded-full bg-rose-50 text-[#C00A4A] flex items-center justify-center font-bold text-xs shrink-0 select-none">
              {idx + 1}
            </div>
            <div className="text-left min-w-0 flex-1">
              <h5 className="font-extrabold text-xs text-slate-800 truncate">{winner.name}</h5>
              <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{winner.address}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full flex-1 flex flex-col items-center justify-center select-none text-center animate-fade-in-up">
      
      {/* 👑 Roulette Settings Panel */}
      <div className="w-full max-w-sm glass-card rounded-2xl p-3 border border-slate-200/50 flex flex-col gap-2.5 bg-white/50">
        <div className="flex gap-2">
          <button
            onClick={() => { setRouletteType('location'); }}
            disabled={isSpinning}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
              rouletteType === 'location'
                ? 'bg-[#C00A4A] text-white border-transparent shadow'
                : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200/60'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            장소 결정
          </button>
          
          <button
            onClick={() => { setRouletteType('time'); }}
            disabled={isSpinning}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
              rouletteType === 'time'
                ? 'bg-[#C00A4A] text-white border-transparent shadow'
                : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            시간 결정
          </button>
        </div>

        <div className="flex items-center justify-between px-1.5 text-xs font-bold text-slate-500 select-none">
          <span>🎯 선출할 선택지 개수</span>
          <select
            value={winnerCount}
            onChange={(e) => setWinnerCount(parseInt(e.target.value))}
            disabled={isSpinning}
            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-extrabold focus:outline-none focus:border-[#C00A4A] cursor-pointer"
          >
            <option value={1}>1개 선택지 뽑기</option>
            <option value={2}>2개 선택지 뽑기</option>
            <option value={3}>3개 선택지 뽑기</option>
          </select>
        </div>
      </div>

      {candidates.length < 2 ? (
        <div className="flex-1 w-full glass-card rounded-3xl border border-rose-100/50 bg-white/90 p-8 flex flex-col items-center justify-center text-center space-y-4 max-h-[300px]">
          <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100/60 flex items-center justify-center text-[#C00A4A] animate-bounce shadow-sm">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">
              {rouletteType === 'location' ? '룰렛 후보 장소 부족' : '룰렛 후보 시간 부족'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-2 max-w-[240px] mx-auto leading-relaxed font-semibold">
              {rouletteType === 'location' 
                ? '[장소 조율] 탭에서 후보지를 2개 이상 등록하고 투표해 주세요!'
                : '[일정 조율] 탭에서 가능한 시간대를 2개 이상 선택(투표)해 주세요!'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-5 flex flex-col items-center">
          {/* 🎡 Vector SVG Styled Roulette Wheel Container */}
          <div className="relative w-52 h-52 flex items-center justify-center mt-2">
            
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
                {candidates.map((cand, idx) => {
                  const numSectors = candidates.length;
                  const angle = 360 / numSectors;
                  const startAngle = idx * angle;
                  const endAngle = startAngle + angle;
                  
                  const radStart = (startAngle - 90) * (Math.PI / 180);
                  const radEnd = (endAngle - 90) * (Math.PI / 180);
                  
                  const x1 = 100 + 100 * Math.cos(radStart);
                  const y1 = 100 + 100 * Math.sin(radStart);
                  const x2 = 100 + 100 * Math.cos(radEnd);
                  const y2 = 100 + 100 * Math.sin(radEnd);
                  
                  const largeArc = angle > 180 ? 1 : 0;
                  const d = `M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  const color = SECTOR_COLORS[idx % SECTOR_COLORS.length];
                  
                  const textAngle = startAngle + angle / 2;
                  const textRad = (textAngle - 90) * (Math.PI / 180);
                  const tx = 100 + 65 * Math.cos(textRad);
                  const ty = 100 + 65 * Math.sin(textRad);
                  
                  return (
                    <g key={cand.id}>
                      <path d={d} fill={color} stroke="#ffffff" strokeWidth="2" />
                      <text
                        x={tx}
                        y={ty}
                        fill="#1e293b"
                        fontSize="6"
                        fontWeight="900"
                        textAnchor="middle"
                        transform={`rotate(${textAngle}, ${tx}, ${ty})`}
                      >
                        {cand.name.length > 5 ? `${cand.name.slice(0, 5)}..` : cand.name}
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
          <div className="w-full max-w-xs">
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer text-xs ${
                isSpinning 
                  ? 'bg-slate-100 text-slate-400 border border-slate-200/60 scale-[0.98]'
                  : 'bg-gradient-to-r from-[#C00A4A] to-[#a3083e] hover:from-[#b00943] hover:to-[#910737] text-white shadow-pink-900/10 hover:scale-105 active:scale-95'
              }`}
            >
              {isSpinning ? (
                <>
                  <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  룰렛 휠 돌리는 중...
                </>
              ) : (
                <>
                  <Dices className="w-4.5 h-4.5" />
                  룰렛 스핀! {winnerCount}개 후보 선정
                </>
              )}
            </button>
          </div>
 
          {/* 🎉 Winners Overlay Box */}
          {rouletteResult && !isSpinning && (
            <div className="glass-card p-4 rounded-2xl border border-rose-100 bg-white/95 max-w-xs w-full relative overflow-hidden animate-fadeIn shadow-xl">
              {/* Confetti decoration */}
              <div className="absolute inset-0 pointer-events-none opacity-30 select-none text-xs">
                <span className="absolute top-2 left-6 animate-float">🎉</span>
                <span className="absolute top-10 right-8 animate-float" style={{ animationDelay: '0.5s' }}>🌟</span>
                <span className="absolute bottom-4 left-10 animate-float" style={{ animationDelay: '1.2s' }}>🎊</span>
              </div>
 
              <div className="text-center space-y-2.5 relative z-10">
                <div className="w-9 h-9 rounded-full bg-rose-50 text-[#C00A4A] flex items-center justify-center mx-auto shadow-sm">
                  <Award className="w-5.5 h-5.5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-[#C00A4A] tracking-widest uppercase block">
                    {rouletteResult.type === 'location' ? 'SELECTED LOCATION' : 'SELECTED TIME'}
                  </span>
                  {renderWinners()}
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

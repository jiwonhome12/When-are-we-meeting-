import React, { useState, useRef } from 'react';
import { useRoom } from '../context/RoomContext';
import { Award, Calendar, MapPin, Clock, Download, ChevronRight, UserCheck, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';

const HOURS = Array.from({ length: 144 }, (_, i) => {
  const h = Math.floor(i / 6);
  const m = (i % 6) * 10;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}); // 00:00 ~ 23:50 (with 10 min intervals)

const WrapupTab = () => {
  const { 
    roomInfo, 
    participants, 
    currentUser, 
    locations, 
    rouletteResult,
    finalizeYaksok, 
    leaveRoom 
  } = useRoom();

  const isHost = currentUser?.isHost;

  const roomStartDate = roomInfo?.startDate || new Date().toISOString().split('T')[0];
  const roomEndDate = roomInfo?.endDate || (() => {
    const d = new Date(roomStartDate);
    d.setDate(d.getDate() + 9);
    return d.toISOString().split('T')[0];
  })();

  // Generate days dynamically matching CalendarTab
  const DAYS = (() => {
    const arr = [];
    const dt = new Date(roomStartDate);
    const endDt = new Date(roomEndDate);
    
    // Safety limit: max 31 days
    const limit = new Date(roomStartDate);
    limit.setDate(limit.getDate() + 30);
    const actualEnd = endDt > limit ? limit : endDt;
    
    while (dt <= actualEnd) {
      arr.push({
        key: dt.toISOString().split('T')[0],
        label: dt.toLocaleDateString([], { month: 'numeric', day: 'numeric' }),
        dayOfWeek: dt.toLocaleDateString([], { weekday: 'short' })
      });
      dt.setDate(dt.getDate() + 1);
    }
    return arr;
  })();

  const receiptRef = useRef(null);

  // Setup form states for Host
  const [selectedDayKey, setSelectedDayKey] = useState(DAYS[0]?.key || '');
  const [selectedHour, setSelectedHour] = useState(HOURS[3]); // 12:00 default
  const [selectedLocId, setSelectedLocId] = useState(
    locations.length > 0 ? locations[0].id : 'custom'
  );
  const [customLocName, setCustomLocName] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const activeDayKey = selectedDayKey || DAYS[0]?.key || '';

  const handleFinalize = () => {
    let finalLocName = '';
    if (selectedLocId === 'custom') {
      finalLocName = customLocName.trim() || '사용자 지정 위치';
    } else {
      const loc = locations.find(l => l.id === selectedLocId);
      finalLocName = loc ? loc.name : '미정';
    }

    const day = DAYS.find(d => d.key === activeDayKey);
    const finalDateStr = day ? `${day.label}일 (${day.dayOfWeek})` : '미정';

    finalizeYaksok({
      date: finalDateStr,
      time: selectedHour,
      location: finalLocName
    });
  };

  const handleDownloadReceipt = () => {
    if (!receiptRef.current || isDownloading) return;
    setIsDownloading(true);

    // Render receipt element into canvas and save it
    html2canvas(receiptRef.current, {
      backgroundColor: '#f8fafc',
      scale: 2, // High resolution
      logging: false,
      useCORS: true
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `baro_yaksok_${roomInfo.code}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setIsDownloading(false);
    }).catch(err => {
      console.error(err);
      setIsDownloading(false);
    });
  };

  // 1. Render setup screen if room is not wrapup
  if (roomInfo?.step !== 'wrapup') {
    return (
      <div className="space-y-4 w-full flex-1 flex flex-col justify-center select-none animate-fade-in-up">
        
        {isHost ? (
          <div className="glass-card rounded-3xl p-6 space-y-4 border border-rose-150/50 bg-white/90 shadow-xl">
            <div className="text-center space-y-1">
              <span className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 text-[#C00A4A] flex items-center justify-center mx-auto mb-2 animate-bounce shadow-sm">
                <Sparkles className="w-5 h-5" />
              </span>
              <h3 className="font-extrabold text-slate-800 text-base">최종 약속 마감 및 영수증 발행</h3>
              <p className="text-xs text-slate-500 font-semibold">조율된 내용을 토대로 최종 시간과 장소를 마감해주세요.</p>
            </div>

            <div className="space-y-4 text-left">
              {/* Day selection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  최종 날짜 선택
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {DAYS.map(day => (
                    <button
                      key={day.key}
                      onClick={() => setSelectedDayKey(day.key)}
                      type="button"
                      className={`px-3 py-2 rounded-xl text-[10px] font-extrabold flex flex-col items-center border transition-all cursor-pointer ${
                        activeDayKey === day.key
                          ? 'bg-[#C00A4A] text-white border-[#C00A4A] shadow-md shadow-pink-900/10'
                          : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100/50'
                      }`}
                    >
                      <span>{day.label}</span>
                      <span className="text-[8px] opacity-80 mt-0.5">{day.dayOfWeek}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time selection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  최종 시간 선택
                </label>
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(e.target.value)}
                  className="w-full glass-input rounded-2xl py-3 px-4 text-xs font-extrabold focus:border-[#C00A4A] cursor-pointer"
                >
                  {HOURS.map(hour => (
                    <option key={hour} value={hour} className="text-slate-800 font-semibold">
                      {hour}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location selection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  최종 장소 선택
                </label>
                <select
                  value={selectedLocId}
                  onChange={(e) => setSelectedLocId(e.target.value)}
                  className="w-full glass-input rounded-2xl py-3 px-4 text-xs font-extrabold focus:border-[#C00A4A] cursor-pointer"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id} className="text-slate-800 font-semibold">
                      📍 {loc.name} ({loc.votes.length}표)
                    </option>
                  ))}
                  {rouletteResult && (
                    <option value="roulette" className="text-slate-800 font-semibold">
                      🎲 룰렛 당첨지: {rouletteResult.name}
                    </option>
                  )}
                  <option value="custom" className="text-slate-800 font-semibold">
                    ✍️ 직접 수동 입력...
                  </option>
                </select>

                {selectedLocId === 'custom' && (
                  <input
                    type="text"
                    value={customLocName}
                    onChange={(e) => setCustomLocName(e.target.value)}
                    placeholder="수동으로 장소 이름을 직접 입력해주세요."
                    className="w-full glass-input rounded-2xl py-3 px-4 text-xs mt-2 focus:border-[#C00A4A] font-semibold"
                  />
                )}
              </div>
            </div>

            <button
              onClick={handleFinalize}
              className="w-full py-4 mt-2 bg-gradient-to-r from-[#C00A4A] to-[#a3083e] hover:from-[#b00943] hover:to-[#910737] text-white rounded-2xl font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-pink-900/10 active:scale-[0.98] cursor-pointer transition-all"
            >
              <Award className="w-5 h-5 animate-pulse" />
              최종 영수증 발행하기 (마감)
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-3xl p-8 space-y-4 border border-rose-100/50 bg-white/90 text-center shadow-xl max-h-[350px]">
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-[#C00A4A] mx-auto animate-pulse shadow-sm">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 text-base">약속 대기 중</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1 max-w-[240px] mx-auto leading-relaxed">
                현재 방 설립자(Host)가 최종 약속 조율 결과를 종합하고 있습니다.
              </p>
              <p className="text-[10px] text-slate-400 font-bold mt-2">
                방장이 마침을 누르면 본 탭에서 <span className="text-[#C00A4A]">감성 약속 영수증</span>을 다운로드할 수 있습니다!
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Render highly stylized emotional "RECEIPT TICKET" once finalized
  const receipt = roomInfo.finalYaksok;

  return (
    <div className="space-y-4 w-full flex-1 flex flex-col items-center justify-center select-none text-center animate-fade-in-up">
      {/* 🧾 Emotional Receipt Screen */}
      <div 
        ref={receiptRef}
        className="w-full max-w-[320px] bg-white border border-rose-100/80 rounded-3xl p-6 shadow-xl relative select-text text-left overflow-hidden"
      >
        {/* Diagonal Rounded background decoration chips for premium feel */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-rose-50 rounded-full opacity-60 pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-rose-50 rounded-full opacity-60 pointer-events-none"></div>

        {/* Decorative ticket notch cuts */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#f8fafc] border-b border-rose-100/60 shrink-0 z-20"></div>
        <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#f8fafc] border-t border-rose-100/60 shrink-0 z-20"></div>
        
        <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#f8fafc] border-r border-rose-100/60 shrink-0 z-20"></div>
        <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#f8fafc] border-l border-rose-100/60 shrink-0 z-20"></div>
        
        {/* Receipt Header details */}
        <div className="text-center pb-4 border-b-2 border-dashed border-slate-100 space-y-1 relative z-10">
          <span className="text-[9px] font-extrabold tracking-widest text-[#C00A4A] bg-[#C00A4A]/10 border border-[#C00A4A]/20 px-2 py-0.5 rounded">
            약속 조율 영수증
          </span>
          <h2 className="text-lg font-extrabold text-slate-800 mt-2">{roomInfo.title}</h2>
          <p className="text-[9px] text-slate-400 font-bold font-mono">CODE: {roomInfo.code}</p>
        </div>

        {/* Content Table resembling a detailed invoice receipt */}
        <div className="py-5 space-y-4 border-b-2 border-dashed border-slate-100 relative z-10">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#C00A4A] border border-rose-100/40 flex items-center justify-center shrink-0 shadow-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">FINAL DATE</span>
              <span className="text-xs font-extrabold text-slate-800">{receipt.date}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#C00A4A] border border-rose-100/40 flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">FINAL TIME</span>
              <span className="text-xs font-extrabold text-slate-800">{receipt.time}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#C00A4A] border border-rose-100/40 flex items-center justify-center shrink-0 shadow-sm">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">FINAL LOCATION</span>
              <span className="text-xs font-extrabold text-slate-800">{receipt.location}</span>
            </div>
          </div>

          {/* Attendees summary list */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> ATTENDEES ({receipt.attendees.length}명)
            </span>
            <div className="flex flex-wrap gap-1.5 py-1">
              {receipt.attendees.map((att, idx) => (
                <span 
                  key={idx}
                  className="bg-slate-50 border border-slate-200/80 text-[10px] font-bold px-2 py-0.5 rounded-lg text-slate-700 shadow-sm"
                >
                  {att}
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* Receipt footer barcode / timestamp details */}
        <div className="pt-4 text-center space-y-3 select-none relative z-10">
          {/* Simulated barcode */}
          <div className="flex flex-col items-center space-y-1">
            <div className="w-44 h-8 bg-slate-50 border border-slate-100 flex items-end justify-around py-0.5 rounded px-2 opacity-90">
              {Array.from({ length: 28 }).map((_, i) => (
                <div 
                  key={i} 
                  className="bg-slate-800 w-[1.5px] h-full"
                  style={{ 
                    width: i % 3 === 0 ? '3.5px' : i % 5 === 0 ? '4.5px' : '1.5px',
                    opacity: i % 7 === 0 ? 0.35 : 0.9
                  }}
                ></div>
              ))}
            </div>
            <span className="text-[8px] font-extrabold text-slate-400 font-mono">CONFIRMED AT: {receipt.confirmedAt}</span>
          </div>
        </div>
      </div>

      {/* 🚀 Ticket actions */}
      <div className="w-full max-w-[280px] space-y-2">
        <button
          onClick={handleDownloadReceipt}
          disabled={isDownloading}
          className="w-full py-3.5 bg-[#C00A4A] hover:bg-[#a3083e] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-pink-900/10 active:scale-95 transition-all cursor-pointer"
        >
          {isDownloading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              이미지 변환 중...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              영수증 이미지로 저장 (PNG)
            </>
          )}
        </button>

        <button
          onClick={leaveRoom}
          className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
        >
          대시보드로 나가기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default WrapupTab;

import React, { useState, useRef, useMemo } from 'react';
import { useRoom } from '../context/RoomContext';
import { Calendar, Clock, Sparkles, MessageSquare, ChevronLeft, ChevronRight, CheckSquare, Trash2 } from 'lucide-react';

// Generates 10-minute intervals: 00:00 to 23:50 (144 slots)
const MINUTES_10 = Array.from({ length: 144 }, (_, i) => {
  const h = Math.floor(i / 6);
  const m = (i % 6) * 10;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

const CalendarTab = ({ setActiveTab }) => {
  const { 
    participants, 
    currentUser, 
    calendarVotes, 
    toggleTimeVotes, 
    sendChatMessage,
    roomInfo,
    updateDateRange
  } = useRoom();

  // Get startDate & endDate from roomInfo or default
  const roomStartDate = roomInfo?.startDate || new Date().toISOString().split('T')[0];
  const roomEndDate = roomInfo?.endDate || (() => {
    const d = new Date(roomStartDate);
    d.setDate(d.getDate() + 9);
    return d.toISOString().split('T')[0];
  })();

  // State for active selected date and the month being viewed
  const [selectedDate, setSelectedDate] = useState(roomStartDate);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(roomStartDate));

  const [pickerHour, setPickerHour] = useState('12');
  const [pickerMinute, setPickerMinute] = useState('00');

  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')), []);
  const minuteOptions = useMemo(() => ['00', '10', '20', '30', '40', '50'], []);

  // Get active (voted) slots for selectedDate
  const votedSlotsForSelectedDate = useMemo(() => {
    const arr = [];
    MINUTES_10.forEach(time => {
      const cellKey = `${selectedDate}_${time}`;
      const votes = calendarVotes[cellKey] || [];
      if (votes.length > 0) {
        arr.push({ time, votes, key: cellKey });
      }
    });
    return arr.sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDate, calendarVotes]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // 'add' or 'remove'
  const draggedCellsRef = useRef(new Set());

  // Generate day items for the viewed month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Padding from previous month
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0: Sun, 6: Sat
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        key: d.toISOString().split('T')[0]
      });
    }
    
    // Current month days
    const totalDays = lastDayOfMonth.getDate();
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      // Format as YYYY-MM-DD local date string safely
      const localStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date: d,
        isCurrentMonth: true,
        key: localStr
      });
    }
    
    // Padding for next month to complete the grid (multiple of 7, max 42 cells)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const nextMonthDaysNeeded = totalCells - days.length;
    for (let i = 1; i <= nextMonthDaysNeeded; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        key: d.toISOString().split('T')[0]
      });
    }
    
    return days;
  }, [currentMonth]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  // Find the slot with the maximum votes globally
  const { bestCell, maxVotes } = useMemo(() => {
    let best = null;
    let max = 0;
    Object.entries(calendarVotes).forEach(([cellKey, votes]) => {
      if (votes.length > max) {
        max = votes.length;
        best = cellKey;
      }
    });
    return { bestCell: best, maxVotes: max };
  }, [calendarVotes]);

  // Calculate day-specific voting summary for heat map indicator
  const getDayVoteSummary = (dayKey) => {
    let slotCount = 0;
    let maxVotedForDay = 0;
    MINUTES_10.forEach(time => {
      const cellKey = `${dayKey}_${time}`;
      const v = calendarVotes[cellKey] || [];
      if (v.length > 0) {
        slotCount++;
        if (v.length > maxVotedForDay) {
          maxVotedForDay = v.length;
        }
      }
    });
    return { slotCount, maxVotedForDay };
  };

  // Drag select handlers
  const handleCellMouseDown = (cellKey) => {
    if (!currentUser) return;
    setIsDragging(true);
    draggedCellsRef.current.clear();
    
    const isAlreadyVoted = calendarVotes[cellKey]?.includes(currentUser.id);
    const mode = isAlreadyVoted ? 'remove' : 'add';
    setDragMode(mode);
    
    toggleTimeVotes([cellKey], mode === 'add');
    draggedCellsRef.current.add(cellKey);
  };

  const handleCellMouseEnter = (cellKey) => {
    if (!isDragging || !currentUser) return;
    if (!draggedCellsRef.current.has(cellKey)) {
      toggleTimeVotes([cellKey], dragMode === 'add');
      draggedCellsRef.current.add(cellKey);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  // Helper actions: Select All & Deselect All for selected date
  const handleSelectAllDay = () => {
    if (!currentUser) return;
    const timeKeys = MINUTES_10.map(time => `${selectedDate}_${time}`);
    toggleTimeVotes(timeKeys, true);
  };

  const handleClearAllDay = () => {
    if (!currentUser) return;
    const timeKeys = MINUTES_10.map(time => `${selectedDate}_${time}`);
    toggleTimeVotes(timeKeys, false);
  };

  // Announce the best time to chat
  const handleAnnounceBestTime = () => {
    if (!bestCell) return;
    const [dayKey, hour] = bestCell.split('_');
    const dayDate = new Date(dayKey);
    const label = dayDate.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
    const dayOfWeek = dayDate.toLocaleDateString([], { weekday: 'short' });
    const text = `📅 제일 많은 사람들이 가능해요! [${label}(${dayOfWeek}) ${hour}] 시간대 어떠세요?`;
    sendChatMessage(text, 'link', 'calendar');
    if (setActiveTab) setActiveTab('chat');
  };

  // Participant helper styling
  const getParticipantColor = (userId) => {
    const p = participants.find(part => part.id === userId);
    if (!p) return '#BAE6FD';
    const mapping = {
      Red: '#FDA4AF', Orange: '#FED7AA', Yellow: '#FEF08A',
      Green: '#A7F3D0', Blue: '#BAE6FD', Purple: '#E9D5FF', Pink: '#FBCFE8'
    };
    return mapping[p.color] || '#BAE6FD';
  };

  const getParticipantEmoji = (userId) => {
    const p = participants.find(part => part.id === userId);
    return p ? p.emoji : '👤';
  };

  const formattedSelectedDate = useMemo(() => {
    const d = new Date(selectedDate);
    if (isNaN(d.getTime())) return selectedDate;
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  }, [selectedDate]);

  return (
    <div 
      className="space-y-4 w-full flex-1 flex flex-col select-none animate-fade-in"
      onMouseLeave={handleMouseUp}
      onMouseUp={handleMouseUp}
    >
      {/* 💡 Information Banner */}
      <div className="glass-card rounded-2xl p-4 bg-[#C00A4A]/5 border border-[#C00A4A]/10 flex items-start gap-3 shadow-sm">
        <Sparkles className="w-5 h-5 text-[#C00A4A] shrink-0 mt-0.5 animate-pulse" />
        <div className="text-xs sm:text-sm space-y-1">
          <h4 className="font-extrabold text-slate-800 text-sm">📅 날짜 선택 후 아래에서 시간 투표</h4>
          <p className="text-slate-600 font-semibold leading-relaxed text-xs">
            달력에서 날짜를 누르고, 시간대를 터치하거나 긁듯이 드래그하여 간편하게 투표해보세요.
          </p>
        </div>
      </div>

      {/* 📅 Best Time Highlight Card */}
      {bestCell && maxVotes > 0 && (
        <div className="glass-card p-4 rounded-2xl border border-[#C00A4A]/20 flex items-center justify-between shadow-md bg-white animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C00A4A]/10 text-[#C00A4A] flex items-center justify-center pulse-primary shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-[#C00A4A] uppercase tracking-wider block">💡 추천 시간 ({maxVotes}명)</span>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5">
                {(() => {
                  const [dayKey, hour] = bestCell.split('_');
                  const d = new Date(dayKey);
                  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${d.toLocaleDateString([], { weekday: 'short' })}) ${hour}`;
                })()}
              </h3>
            </div>
          </div>
          <button
            onClick={handleAnnounceBestTime}
            className="px-3 py-1.5 bg-[#C00A4A] hover:bg-[#9e083d] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            알리기
          </button>
        </div>
      )}

      {/* 📅 Calendar + Timeline Two-Column Grid */}
      <div className="flex flex-col lg:flex-row gap-4 w-full flex-1 min-h-[460px]">
        {/* Left Side: Monthly Calendar Card */}
        <div className="flex-1 glass-card rounded-2xl border border-slate-200/50 p-4 bg-white shadow-md flex flex-col justify-between">
          <div className="space-y-3">
            {/* Calendar Month Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-800">
                  {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleGoToToday}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition-all"
                >
                  오늘
                </button>
                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center border-b border-slate-100 pb-1 text-xs font-bold text-slate-500">
              <span className="text-rose-500">일</span>
              <span>월</span>
              <span>화</span>
              <span>수</span>
              <span>목</span>
              <span>금</span>
              <span className="text-blue-500">토</span>
            </div>

            {/* Calendar Day Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayItem) => {
                const isSelected = selectedDate === dayItem.key;
                const isToday = dayItem.key === new Date().toISOString().split('T')[0];
                
                // Check if day is within set room date range
                const startLimit = new Date(roomStartDate);
                const endLimit = new Date(roomEndDate);
                const itemDate = dayItem.date;
                const isWithinRange = itemDate >= startLimit && itemDate <= endLimit;
                
                // Get votes on this specific day for Heat map
                const { slotCount, maxVotedForDay } = getDayVoteSummary(dayItem.key);
                const hasVotes = slotCount > 0;
                
                return (
                  <button
                    key={dayItem.key}
                    onClick={() => setSelectedDate(dayItem.key)}
                    className={`h-11 rounded-xl flex flex-col items-center justify-between p-1 cursor-pointer transition-all relative border ${
                      isSelected
                        ? 'bg-[#C00A4A] border-[#C00A4A] text-white shadow-md scale-[1.03] z-10'
                        : isToday
                          ? 'bg-slate-50 border-[#C00A4A]/40 text-[#C00A4A] hover:bg-slate-100'
                          : dayItem.isCurrentMonth
                            ? isWithinRange
                              ? 'bg-[#C00A4A]/5 border-[#C00A4A]/10 text-slate-800 hover:bg-[#C00A4A]/10'
                              : 'bg-white border-transparent text-slate-800 hover:bg-slate-50'
                            : 'bg-white border-transparent text-slate-300 opacity-40 hover:bg-slate-50'
                    }`}
                  >
                    {/* Date Number */}
                    <span className="text-sm font-bold">{dayItem.date.getDate()}</span>
                    
                    {/* Voting heat indicators */}
                    <div className="flex gap-1 items-center justify-center h-2 w-full">
                      {hasVotes && (
                        <div 
                          className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-[#C00A4A]'} animate-pulse`} 
                          style={{
                            opacity: Math.max(0.4, Math.min(1, maxVotedForDay / (participants.length || 1)))
                          }}
                        />
                      )}
                      {slotCount > 0 && (
                        <span className={`text-[9px] font-bold leading-none ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                          {slotCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="text-xs text-slate-500 font-semibold border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[#C00A4A]/10 border border-[#C00A4A]/25" />
              조율 범위
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C00A4A] animate-pulse" />
              투표 존재일
            </span>
          </div>
        </div>

        {/* Right Side: Timeline Selection Panel */}
        <div className="w-full lg:w-[320px] glass-card rounded-2xl border border-slate-200/50 p-4 bg-white shadow-md flex flex-col space-y-4 justify-between">
          
          {/* Header information for timeline */}
          <div className="flex flex-col border-b border-slate-100 pb-2.5 gap-1 shrink-0">
            <span className="text-xs font-bold text-[#C00A4A] uppercase tracking-wider">시간 선택 (10분 다이얼)</span>
            <h4 className="text-sm font-extrabold text-slate-800 leading-tight truncate">
              {formattedSelectedDate}
            </h4>
          </div>

          {/* Premium Birthdate-style Double Wheel Dial Picker */}
          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-center bg-slate-50 border border-slate-200/50 rounded-2xl relative h-28 w-full overflow-hidden shadow-inner px-4 select-none">
              {/* Highlight selection bracket in the center */}
              <div className="absolute left-2 right-2 top-10 h-8 border-y border-[#C00A4A]/20 bg-[#C00A4A]/5 pointer-events-none rounded-lg" />
              
              {/* Top & Bottom 3D mask fades */}
              <div className="absolute left-0 right-0 top-0 h-8 bg-gradient-to-b from-slate-50 to-transparent pointer-events-none z-10" />
              <div className="absolute left-0 right-0 bottom-0 h-8 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none z-10" />
              
              {/* Hour Wheel Dial Column */}
              <div className="flex-1 h-28 overflow-y-auto snap-y snap-mandatory scrollbar-none text-center relative py-10" style={{ scrollSnapType: 'y mandatory' }}>
                {hourOptions.map(h => {
                  const isSel = pickerHour === h;
                  return (
                    <button
                      type="button"
                      key={h}
                      onClick={() => setPickerHour(h)}
                      className={`w-full h-8 flex items-center justify-center text-sm font-bold snap-center cursor-pointer transition-all ${
                        isSel ? 'text-[#C00A4A] text-lg font-black scale-110' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {h}시
                    </button>
                  );
                })}
              </div>

              {/* Center Divider colon */}
              <span className="text-slate-400 font-extrabold px-1 z-20">:</span>

              {/* Minute Wheel Dial Column */}
              <div className="flex-1 h-28 overflow-y-auto snap-y snap-mandatory scrollbar-none text-center relative py-10" style={{ scrollSnapType: 'y mandatory' }}>
                {minuteOptions.map(m => {
                  const isSel = pickerMinute === m;
                  return (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPickerMinute(m)}
                      className={`w-full h-8 flex items-center justify-center text-sm font-bold snap-center cursor-pointer transition-all ${
                        isSel ? 'text-[#C00A4A] text-lg font-black scale-110' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {m}분
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dial Vote Button */}
            {(() => {
              const targetTime = `${pickerHour}:${pickerMinute}`;
              const targetKey = `${selectedDate}_${targetTime}`;
              const isVoted = currentUser && (calendarVotes[targetKey] || []).includes(currentUser.id);
              
              return (
                <button
                  onClick={() => {
                    if (!currentUser) return;
                    toggleTimeVotes([targetKey], !isVoted);
                  }}
                  className={`w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
                    isVoted
                      ? 'bg-rose-50 border border-[#C00A4A]/30 text-[#C00A4A]'
                      : 'bg-[#C00A4A] hover:bg-[#9e083d] text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {pickerHour}:{pickerMinute} {isVoted ? '투표 취소' : '이 시간 투표'}
                </button>
              );
            })()}
          </div>

          {/* Voted chips panel */}
          <div className="flex-1 flex flex-col justify-start overflow-hidden">
            <span className="text-[10px] font-bold text-slate-400 mb-1.5 block shrink-0">투표 현황 (선택된 일자)</span>
            {votedSlotsForSelectedDate.length === 0 ? (
              <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400 font-semibold leading-relaxed my-auto">
                아직 투표된 시간대가 없습니다.<br />
                위의 다이얼을 굴려 시간을 선택해 보세요!
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[140px] pr-1 scrollbar-thin">
                {votedSlotsForSelectedDate.map(({ time, votes, key }) => {
                  const isUserVoted = currentUser ? votes.includes(currentUser.id) : false;
                  const isBest = bestCell === key && maxVotes > 0;
                  return (
                    <div
                      key={time}
                      onClick={() => {
                        const [h, m] = time.split(':');
                        setPickerHour(h);
                        setPickerMinute(m);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl border select-none transition-all cursor-pointer ${
                        isUserVoted
                          ? 'bg-[#C00A4A]/5 border-[#C00A4A]/25'
                          : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-mono font-bold ${isUserVoted ? 'text-[#C00A4A] font-extrabold' : 'text-slate-700'}`}>
                          {time}
                        </span>
                        {isBest && (
                          <span className="text-[8px] font-extrabold bg-[#C00A4A] text-white px-1 py-0.5 rounded leading-none">
                            Best
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1 overflow-hidden">
                          {votes.slice(0, 3).map((vId) => (
                            <div
                              key={vId}
                              className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[8px]"
                              style={{ backgroundColor: getParticipantColor(vId) }}
                            >
                              {getParticipantEmoji(vId)}
                            </div>
                          ))}
                          {votes.length > 3 && (
                            <div className="w-4 h-4 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[7px] font-extrabold text-slate-600">
                              +{votes.length - 3}
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold ${isUserVoted ? 'text-[#C00A4A]' : 'text-slate-400'}`}>
                          {participants.length > 0 ? Math.round((votes.length / participants.length) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
      </div>
    </div>
  </div>
);
};

export default CalendarTab;

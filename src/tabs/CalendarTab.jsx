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
        <div className="w-full lg:w-[320px] glass-card rounded-2xl border border-slate-200/50 p-4 bg-white shadow-md flex flex-col">
          {/* Header information for timeline */}
          <div className="flex flex-col border-b border-slate-100 pb-3 mb-3 gap-2">
            <div>
              <span className="text-xs font-bold text-[#C00A4A] uppercase tracking-wider">시간 선택 (10분 단위)</span>
              <h4 className="text-sm font-extrabold text-slate-800 leading-tight truncate mt-0.5">
                {formattedSelectedDate}
              </h4>
            </div>
            
            {/* Quick Actions (Select All, Deselect All) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllDay}
                className="flex-1 py-1.5 px-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                전체 선택
              </button>
              <button
                onClick={handleClearAllDay}
                className="flex-1 py-1.5 px-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                선택 취소
              </button>
            </div>
          </div>

          {/* Timeline list scroll area */}
          <div className="flex-1 overflow-y-auto max-h-[320px] lg:max-h-[360px] pr-1.5 space-y-1.5 scrollbar-thin">
            {MINUTES_10.map((time) => {
              const cellKey = `${selectedDate}_${time}`;
              const cellVotes = calendarVotes[cellKey] || [];
              const isUserVoted = currentUser ? cellVotes.includes(currentUser.id) : false;
              const isBest = bestCell === cellKey && maxVotes > 0;
              
              // Validate if the slot is in the past
              const cellDateTime = new Date(`${selectedDate}T${time}:00`);
              const isPast = cellDateTime < new Date();

              return (
                <div
                  key={time}
                  onMouseDown={() => !isPast && handleCellMouseDown(cellKey)}
                  onMouseEnter={() => !isPast && handleCellMouseEnter(cellKey)}
                  onTouchStart={() => !isPast && handleCellMouseDown(cellKey)}
                  className={`flex items-center justify-between p-2 rounded-xl border select-none transition-all cursor-pointer ${
                    isPast
                      ? 'bg-slate-50/50 border-slate-100 opacity-30 cursor-not-allowed pointer-events-none'
                      : isUserVoted
                        ? 'bg-[#C00A4A]/10 border-[#C00A4A]/30 shadow-inner'
                        : isBest
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-100 hover:scale-[1.01]'
                  }`}
                >
                  {/* Left: Time display */}
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${isUserVoted ? 'text-[#C00A4A]' : 'text-slate-400'}`} />
                    <span className={`text-sm font-mono font-bold ${isUserVoted ? 'text-[#C00A4A] font-extrabold text-base' : 'text-slate-700'}`}>
                      {time}
                    </span>
                    {isBest && !isPast && (
                      <span className="text-[9px] font-extrabold bg-[#C00A4A] text-white px-1.5 py-0.5 rounded uppercase leading-none">
                        Best
                      </span>
                    )}
                  </div>

                  {/* Right: Vote counts and avatars */}
                  <div className="flex items-center gap-2.5">
                    {!isPast && (
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {cellVotes.slice(0, 3).map((voterId) => (
                          <div
                            key={voterId}
                            className="w-4.5 h-4.5 rounded-full border border-white flex items-center justify-center text-[10px] shadow-sm font-bold"
                            style={{ backgroundColor: getParticipantColor(voterId) }}
                          >
                            {getParticipantEmoji(voterId)}
                          </div>
                        ))}
                        {cellVotes.length > 3 && (
                          <div className="w-4.5 h-4.5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[8px] font-extrabold text-slate-600">
                            +{cellVotes.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    <span className={`text-xs font-extrabold w-10 text-right ${
                      isPast 
                        ? 'text-slate-350' 
                        : cellVotes.length > 0 
                          ? 'text-[#C00A4A] font-black' 
                          : 'text-slate-500'
                    }`}>
                      {isPast ? '-' : `${participants.length > 0 ? Math.round((cellVotes.length / participants.length) * 100) : 0}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarTab;

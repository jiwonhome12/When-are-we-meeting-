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

  const [pickerStartHour, setPickerStartHour] = useState('12');
  const [pickerStartMinute, setPickerStartMinute] = useState('00');
  const [pickerEndHour, setPickerEndHour] = useState('14');
  const [pickerEndMinute, setPickerEndMinute] = useState('00');
  const [rangeActiveTab, setRangeActiveTab] = useState('start'); // 'start' | 'end'
  const [timeMode, setTimeMode] = useState('range'); // 'range' | 'single' | 'macro'

  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')), []);
  const minuteOptions = useMemo(() => ['00', '10', '20', '30', '40', '50'], []);

  // Get active (voted) slots for ALL dates grouped by consecutive ranges with Peak Time extraction
  const groupedVotedSlots = useMemo(() => {
    const arr = [];
    Object.entries(calendarVotes).forEach(([cellKey, votes]) => {
      const [date, time] = cellKey.split('_');
      if (votes.length > 0) {
        arr.push({ date, time, votes, key: cellKey });
      }
    });

    arr.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    if (arr.length === 0) return [];

    const getMinutes = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const add10Minutes = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      const total = h * 60 + m + 10;
      const newH = Math.floor(total / 60) % 24;
      const newM = total % 60;
      return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    };

    const groups = [];
    let currentGroup = null;

    arr.forEach(slot => {
      if (!currentGroup) {
        currentGroup = {
          date: slot.date,
          startTime: slot.time,
          endTime: slot.time,
          slots: [slot]
        };
      } else {
        const prevMinutes = getMinutes(currentGroup.endTime);
        const currMinutes = getMinutes(slot.time);
        
        if (slot.date === currentGroup.date && currMinutes - prevMinutes === 10) {
          currentGroup.endTime = slot.time;
          currentGroup.slots.push(slot);
        } else {
          groups.push(currentGroup);
          currentGroup = {
            date: slot.date,
            startTime: slot.time,
            endTime: slot.time,
            slots: [slot]
          };
        }
      }
    });
    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups.map(g => {
      const unionVoters = Array.from(new Set(g.slots.flatMap(s => s.votes)));
      const keys = g.slots.map(s => s.key);
      
      // Find Peak Time (sub-range with maximum votes)
      let maxVotesCount = 0;
      g.slots.forEach(s => {
        if (s.votes.length > maxVotesCount) {
          maxVotesCount = s.votes.length;
        }
      });

      let peakStart = null;
      let peakEnd = null;
      let maxPeakLength = 0;
      
      let tempStart = null;
      let tempEnd = null;
      let tempLength = 0;

      g.slots.forEach(s => {
        if (s.votes.length === maxVotesCount) {
          if (tempStart === null) {
            tempStart = s.time;
            tempEnd = s.time;
            tempLength = 1;
          } else {
            tempEnd = s.time;
            tempLength += 1;
          }
        } else {
          if (tempStart !== null) {
            if (tempLength > maxPeakLength) {
              maxPeakLength = tempLength;
              peakStart = tempStart;
              peakEnd = tempEnd;
            }
            tempStart = null;
            tempEnd = null;
            tempLength = 0;
          }
        }
      });
      if (tempStart !== null && tempLength > maxPeakLength) {
        peakStart = tempStart;
        peakEnd = tempEnd;
      }

      return {
        date: g.date,
        startTime: g.startTime,
        endTime: add10Minutes(g.endTime),
        votes: unionVoters,
        keys,
        peakTime: peakStart && maxVotesCount > 0 ? {
          startTime: peakStart,
          endTime: add10Minutes(peakEnd),
          votesCount: maxVotesCount
        } : null
      };
    });
  }, [calendarVotes]);

  // Group the voted ranges by date (chronologically)
  const groupedByDate = useMemo(() => {
    const map = {};
    groupedVotedSlots.forEach(slot => {
      if (!map[slot.date]) {
        map[slot.date] = [];
      }
      map[slot.date].push(slot);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [groupedVotedSlots]);

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

  // Find the slots with the maximum votes globally (handling ties)
  const { bestCells, maxVotes } = useMemo(() => {
    let bests = [];
    let max = 0;
    Object.entries(calendarVotes).forEach(([cellKey, votes]) => {
      if (votes.length > max) {
        max = votes.length;
        bests = [cellKey];
      } else if (votes.length === max && max > 0) {
        bests.push(cellKey);
      }
    });
    return { bestCells: bests, maxVotes: max };
  }, [calendarVotes]);

  // Calculate day-specific voting summary for heat map indicator
  const getDayVoteSummary = (dayKey) => {
    const uniqueVoters = new Set();
    let maxVotedForDay = 0;
    MINUTES_10.forEach(time => {
      const cellKey = `${dayKey}_${time}`;
      const v = calendarVotes[cellKey] || [];
      v.forEach(vId => uniqueVoters.add(vId));
      if (v.length > maxVotedForDay) {
        maxVotedForDay = v.length;
      }
    });
    return { uniqueVotersCount: uniqueVoters.size, maxVotedForDay };
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
    if (bestCells.length === 0) return;
    const listStr = bestCells.map(cell => {
      const [dayKey, hour] = cell.split('_');
      const d = new Date(dayKey);
      const label = d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
      const dayOfWeek = d.toLocaleDateString([], { weekday: 'short' });
      return `${label}(${dayOfWeek}) ${hour}`;
    }).join(', ');
    const text = `📅 제일 많은 사람들이 가능해요! [${listStr}] 시간대 어떠세요?`;
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

  const getParticipantName = (userId) => {
    const p = participants.find(part => part.id === userId);
    return p ? p.name : '참여자';
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



      {/* 📅 Calendar + Timeline Vertical Stack */}
      <div className="flex flex-col gap-4 w-full flex-1">
        {/* Left Side: Monthly Calendar Card */}
        <div className="flex-1 glass-card rounded-2xl border border-slate-200/50 p-4 bg-white shadow-md flex flex-col justify-between">
          <div className="space-y-3">
            {/* 📅 Date Range Coordination Panel */}
            <div className="flex flex-wrap items-center gap-2 pb-2.5 mb-1 border-b border-slate-100/80 text-[11px] font-bold text-slate-500">
              <span className="text-[10px] bg-rose-50 text-[#C00A4A] border border-rose-100 px-2 py-0.5 rounded-lg select-none">
                조율 범위 설정
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={roomStartDate}
                  onChange={(e) => updateDateRange(e.target.value, roomEndDate)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none focus:border-[#C00A4A] font-bold text-slate-700 cursor-pointer"
                />
                <span className="text-slate-400">~</span>
                <input
                  type="date"
                  value={roomEndDate}
                  onChange={(e) => updateDateRange(roomStartDate, e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none focus:border-[#C00A4A] font-bold text-slate-700 cursor-pointer"
                />
              </div>
            </div>

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
                const { uniqueVotersCount, maxVotedForDay } = getDayVoteSummary(dayItem.key);
                const hasVotes = uniqueVotersCount > 0;
                
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
                      {uniqueVotersCount > 0 && (
                        <span className={`text-[9px] font-bold leading-none ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                          {uniqueVotersCount}명
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
        <div className="w-full glass-card rounded-2xl border border-slate-200/50 p-4 bg-white shadow-md flex flex-col space-y-4 justify-between">
          
          {/* Header information for timeline */}
          <div className="flex flex-col border-b border-slate-100 pb-2.5 gap-1 shrink-0">
            <span className="text-xs font-bold text-[#C00A4A] uppercase tracking-wider">시간 선택 (10분 다이얼)</span>
            <h4 className="text-sm font-extrabold text-slate-800 leading-tight truncate">
              {formattedSelectedDate}
            </h4>
          </div>

          {/* ⚡ Time Mode Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shrink-0">
            <button
              type="button"
              onClick={() => setTimeMode('range')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                timeMode === 'range'
                  ? 'bg-white text-[#C00A4A] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ⏱️ 지정 시간
            </button>
            <button
              type="button"
              onClick={() => setTimeMode('single')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                timeMode === 'single'
                  ? 'bg-white text-[#C00A4A] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              🕒 단일 시간
            </button>
            <button
              type="button"
              onClick={() => setTimeMode('macro')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                timeMode === 'macro'
                  ? 'bg-white text-[#C00A4A] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ⚡ 대형 필터
            </button>
          </div>

          {/* Premium Birthdate-style Double Wheel Dial Picker / Mode Illustration */}
          <div className="flex flex-col gap-3 shrink-0">
            {timeMode === 'range' && (
              <div className="space-y-2">
                {/* Tabs inside range mode: Start vs End */}
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200/40">
                  <button 
                    type="button" 
                    onClick={() => setRangeActiveTab('start')} 
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      rangeActiveTab === 'start' 
                        ? 'bg-[#C00A4A] text-white shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    시작: {pickerStartHour}:{pickerStartMinute}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setRangeActiveTab('end')} 
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      rangeActiveTab === 'end' 
                        ? 'bg-[#C00A4A] text-white shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    종료: {pickerEndHour}:{pickerEndMinute}
                  </button>
                </div>

                <div className="flex items-center justify-center bg-slate-50 border border-slate-200/50 rounded-2xl relative h-28 w-full overflow-hidden shadow-inner px-4 select-none">
                  <div className="absolute left-2 right-2 top-10 h-8 border-y border-[#C00A4A]/20 bg-[#C00A4A]/5 pointer-events-none rounded-lg" />
                  <div className="absolute left-0 right-0 top-0 h-8 bg-gradient-to-b from-slate-50 to-transparent pointer-events-none z-10" />
                  <div className="absolute left-0 right-0 bottom-0 h-8 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none z-10" />
                  
                  {/* Hour Wheel Dial Column */}
                  <div className="flex-1 h-28 overflow-y-auto snap-y snap-mandatory scrollbar-none text-center relative py-10" style={{ scrollSnapType: 'y mandatory' }}>
                    {hourOptions.map(h => {
                      const isSel = rangeActiveTab === 'start' ? pickerStartHour === h : pickerEndHour === h;
                      return (
                        <button
                          type="button"
                          key={h}
                          onClick={() => {
                            if (rangeActiveTab === 'start') {
                              setPickerStartHour(h);
                              if (parseInt(h) > parseInt(pickerEndHour)) {
                                setPickerEndHour(h);
                              }
                            } else {
                              setPickerEndHour(h);
                              if (parseInt(h) < parseInt(pickerStartHour)) {
                                setPickerStartHour(h);
                              }
                            }
                          }}
                          className={`w-full h-8 flex items-center justify-center text-sm font-bold snap-center cursor-pointer transition-all ${
                            isSel ? 'text-[#C00A4A] text-lg font-black scale-110' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {h}시
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-slate-400 font-extrabold px-1 z-20">:</span>

                  {/* Minute Wheel Dial Column */}
                  <div className="flex-1 h-28 overflow-y-auto snap-y snap-mandatory scrollbar-none text-center relative py-10" style={{ scrollSnapType: 'y mandatory' }}>
                    {minuteOptions.map(m => {
                      const isSel = rangeActiveTab === 'start' ? pickerStartMinute === m : pickerEndMinute === m;
                      return (
                        <button
                          type="button"
                          key={m}
                          onClick={() => {
                            if (rangeActiveTab === 'start') {
                              setPickerStartMinute(m);
                              if (pickerStartHour === pickerEndHour && parseInt(m) > parseInt(pickerEndMinute)) {
                                setPickerEndMinute(m);
                              }
                            } else {
                              setPickerEndMinute(m);
                              if (pickerStartHour === pickerEndHour && parseInt(m) < parseInt(pickerStartMinute)) {
                                setPickerStartMinute(m);
                              }
                            }
                          }}
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
              </div>
            )}

            {timeMode === 'single' && (
              <div className="flex items-center justify-center bg-slate-50 border border-slate-200/50 rounded-2xl relative h-28 w-full overflow-hidden shadow-inner px-4 select-none">
                <div className="absolute left-2 right-2 top-10 h-8 border-y border-[#C00A4A]/20 bg-[#C00A4A]/5 pointer-events-none rounded-lg" />
                <div className="absolute left-0 right-0 top-0 h-8 bg-gradient-to-b from-slate-50 to-transparent pointer-events-none z-10" />
                <div className="absolute left-0 right-0 bottom-0 h-8 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none z-10" />
                
                {/* Hour Wheel Dial Column */}
                <div className="flex-1 h-28 overflow-y-auto snap-y snap-mandatory scrollbar-none text-center relative py-10" style={{ scrollSnapType: 'y mandatory' }}>
                  {hourOptions.map(h => {
                    const isSel = pickerStartHour === h;
                    return (
                      <button
                        type="button"
                        key={h}
                        onClick={() => setPickerStartHour(h)}
                        className={`w-full h-8 flex items-center justify-center text-sm font-bold snap-center cursor-pointer transition-all ${
                          isSel ? 'text-[#C00A4A] text-lg font-black scale-110' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {h}시
                      </button>
                    );
                  })}
                </div>

                <span className="text-slate-400 font-extrabold px-1 z-20">:</span>

                {/* Minute Wheel Dial Column */}
                <div className="flex-1 h-28 overflow-y-auto snap-y snap-mandatory scrollbar-none text-center relative py-10" style={{ scrollSnapType: 'y mandatory' }}>
                  {minuteOptions.map(m => {
                    const isSel = pickerStartMinute === m;
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setPickerStartMinute(m)}
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
            )}

            {timeMode === 'macro' && (
              <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto p-1 border border-slate-100 rounded-2xl bg-slate-50/50">
                {[
                  { label: '☀️ 하루 종일', desc: '00:00 ~ 23:50', start: '00:00', end: '23:50' },
                  { label: '🌅 오전', desc: '06:00 ~ 12:00', start: '06:00', end: '12:00' },
                  { label: '☀️ 오후', desc: '12:00 ~ 18:00', start: '12:00', end: '18:00' },
                  { label: '🌆 저녁', desc: '18:00 ~ 22:00', start: '18:00', end: '22:00' },
                  { label: '🌙 밤/새벽', desc: '22:00 ~ 23:50', start: '22:00', end: '23:50' },
                  { label: '🍜 점심시간', desc: '11:30 ~ 13:30', start: '11:30', end: '13:30' },
                  { label: '💼 퇴근이후', desc: '18:00 ~ 23:50', start: '18:00', end: '23:50' }
                ].map((macro) => {
                  const filterTimes = MINUTES_10.filter(time => time.localeCompare(macro.start) >= 0 && time.localeCompare(macro.end) <= 0);
                  const timeKeys = filterTimes.map(time => `${selectedDate}_${time}`);
                  const isAllVoted = currentUser && timeKeys.every(k => (calendarVotes[k] || []).includes(currentUser.id));
                  
                  return (
                    <button
                      type="button"
                      key={macro.label}
                      onClick={() => {
                        if (!currentUser) return;
                        toggleTimeVotes(timeKeys, !isAllVoted);
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-extrabold transition-all cursor-pointer text-left flex flex-col justify-center gap-0.5 active:scale-95 ${
                        isAllVoted
                          ? 'bg-rose-50 border-[#C00A4A] text-[#C00A4A]'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{macro.label}</span>
                      <span className="text-[9px] opacity-70 font-mono font-medium">{macro.desc}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Dial Vote Button */}
            {(() => {
              if (timeMode === 'range') {
                const startTime = `${pickerStartHour}:${pickerStartMinute}`;
                const endTime = `${pickerEndHour}:${pickerEndMinute}`;
                const filterTimes = MINUTES_10.filter(time => time.localeCompare(startTime) >= 0 && time.localeCompare(endTime) <= 0);
                const timeKeys = filterTimes.map(time => `${selectedDate}_${time}`);
                const isAllVoted = currentUser && timeKeys.length > 0 && timeKeys.every(k => (calendarVotes[k] || []).includes(currentUser.id));

                return (
                  <button
                    onClick={() => {
                      if (!currentUser || timeKeys.length === 0) return;
                      toggleTimeVotes(timeKeys, !isAllVoted);
                    }}
                    className={`w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
                      isAllVoted
                        ? 'bg-rose-50 border border-[#C00A4A]/30 text-[#C00A4A]'
                        : 'bg-[#C00A4A] hover:bg-[#9e083d] text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {startTime} ~ {endTime} 범위 {isAllVoted ? '투표 취소' : '이 범위 투표'}
                  </button>
                );
              } else if (timeMode === 'single') {
                const targetTime = `${pickerStartHour}:${pickerStartMinute}`;
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
                    {pickerStartHour}:{pickerStartMinute} {isVoted ? '투표 취소' : '이 시간 투표'}
                  </button>
                );
              }
              return null;
            })()}
          </div>

          {/* Voted chips panel */}
          <div className="flex-1 flex flex-col justify-start overflow-hidden">
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-400">전체 투표 현황 (모든 일자)</span>
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) return;
                  if (window.confirm("내가 투표한 모든 날짜와 시간의 투표를 비우시겠습니까?")) {
                    const myKeys = [];
                    Object.entries(calendarVotes).forEach(([key, votes]) => {
                      if (votes.includes(currentUser.id)) {
                        myKeys.push(key);
                      }
                    });
                    toggleTimeVotes(myKeys, false);
                  }
                }}
                className="px-2 py-0.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:text-rose-600 active:scale-95 rounded-lg text-[9px] font-black text-rose-500 transition-all cursor-pointer"
                title="내가 투표한 모든 일정 비우기"
              >
                🧹 전체 비우기
              </button>
            </div>
            {groupedByDate.length === 0 ? (
              <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400 font-semibold leading-relaxed my-auto">
                아직 투표된 시간대가 없습니다.<br />
                위의 달력과 다이얼을 통해 투표해 보세요!
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[140px] pr-1 scrollbar-thin">
                {groupedByDate.map(([date, slots], dateIdx) => {
                  const dObj = new Date(date);
                  const dateLabel = `${dObj.getMonth() + 1}월 ${dObj.getDate()}일 (${dObj.toLocaleDateString([], { weekday: 'short' })})`;
                  
                  return (
                    <div key={date} className={`space-y-1.5 ${dateIdx > 0 ? 'pt-2.5 border-t border-slate-100' : ''}`}>
                      {/* Date Group Badge */}
                      <div className="text-[9px] font-black text-[#C00A4A] bg-[#C00A4A]/5 px-2 py-0.5 rounded-lg w-fit flex items-center gap-1 select-none border border-[#C00A4A]/10">
                        <span>📅</span>
                        <span>{dateLabel}</span>
                      </div>
                      
                      {/* Time Slots under this Date */}
                      <div className="space-y-1">
                        {slots.map(({ startTime, endTime, votes, keys, peakTime }) => {
                          const isUserVoted = currentUser ? votes.includes(currentUser.id) : false;
                          const isBest = keys.some(k => bestCells.includes(k)) && maxVotes > 0;
                          
                          const rangeLabel = startTime === '00:00' && endTime === '24:00' 
                            ? '하루 종일' 
                            : `${startTime} ~ ${endTime}`;
                          
                          return (
                            <div
                              key={`${date}_${startTime}`}
                              onClick={() => {
                                setSelectedDate(date);
                                const [sh, sm] = startTime.split(':');
                                setPickerStartHour(sh);
                                setPickerStartMinute(sm);
                                if (endTime !== '24:00') {
                                  const [eh, em] = endTime.split(':');
                                  setPickerEndHour(eh);
                                  setPickerEndMinute(em);
                                } else {
                                  setPickerEndHour('23');
                                  setPickerEndMinute('50');
                                }
                              }}
                              className={`flex flex-col gap-1 p-2 rounded-xl border select-none transition-all cursor-pointer ${
                                isUserVoted
                                  ? 'bg-[#C00A4A]/5 border-[#C00A4A]/25'
                                  : 'bg-white border-slate-100 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-mono font-bold ${isUserVoted ? 'text-[#C00A4A]' : 'text-slate-700'}`}>
                                    {rangeLabel}
                                  </span>
                                  {isBest && (
                                    <span className="text-[8px] font-extrabold bg-[#C00A4A] text-white px-1 py-0.5 rounded leading-none">
                                      Best
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {isUserVoted && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTimeVotes(keys, false);
                                      }}
                                      className="p-1 hover:bg-rose-100/80 rounded-lg text-rose-500 transition-colors cursor-pointer shrink-0"
                                      title="내 투표 삭제"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <div className="flex -space-x-1 overflow-hidden">
                                    {votes.slice(0, 3).map((vId) => (
                                      <div
                                        key={vId}
                                        className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[8px]"
                                        style={{ backgroundColor: getParticipantColor(vId) }}
                                        title={getParticipantName(vId)}
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
                              {peakTime && peakTime.votesCount > 0 && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[8px] bg-rose-100 text-[#C00A4A] font-bold px-1.5 py-0.5 rounded-md leading-none">
                                    🔥 핵심: {peakTime.startTime} ~ {peakTime.endTime} ({peakTime.votesCount}명)
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
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

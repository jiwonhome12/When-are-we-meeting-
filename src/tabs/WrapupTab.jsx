import React, { useState, useRef } from 'react';
import { useRoom } from '../context/RoomContext';
import { Award, Calendar, MapPin, Clock, Download, ChevronRight, UserCheck, ShieldAlert, Sparkles, RefreshCw, FileText, Undo2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
    calendarVotes,
    finalizeYaksok, 
    reopenRoom,
    leaveRoom,
    explodeRoom
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

  // Auto-download receipt image and PDF once finalized
  React.useEffect(() => {
    if (roomInfo?.step === 'wrapup' && roomInfo?.finalYaksok) {
      const storageKey = `auto_download_${roomInfo.code}`;
      const alreadyDownloaded = sessionStorage.getItem(storageKey);
      
      if (!alreadyDownloaded) {
        sessionStorage.setItem(storageKey, 'true');
        
        // Wait for rendering to complete before capture
        setTimeout(() => {
          // Trigger PNG
          const oldImageState = isDownloadingImage;
          html2canvas(receiptRef.current, {
            backgroundColor: null,
            scale: 1.5,
            logging: false,
            useCORS: true,
            allowTaint: true
          }).then(canvas => {
            try {
              const imgDataUrl = canvas.toDataURL('image/png');
              if (imgDataUrl && imgDataUrl !== 'data:,') {
                const link = document.createElement('a');
                link.download = `baro_yaksok_${roomInfo.code}.png`;
                link.href = imgDataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setDownloadedImgUrl(imgDataUrl);
              }
            } catch (e) {
              console.error("Auto PNG failed", e);
            }
          }).catch(e => console.error(e));

          // Trigger PDF with a small delay
          setTimeout(() => {
            try {
              let ResolvedjsPDF = jsPDF;
              if (typeof ResolvedjsPDF !== 'function' && ResolvedjsPDF.jsPDF) {
                ResolvedjsPDF = ResolvedjsPDF.jsPDF;
              }
              html2canvas(receiptRef.current, {
                backgroundColor: null,
                scale: 1.5,
                logging: false,
                useCORS: true,
                allowTaint: true
              }).then(canvas => {
                try {
                  const imgData = canvas.toDataURL('image/png');
                  if (imgData && imgData !== 'data:,') {
                    const imgWidthPt = canvas.width * 0.75;
                    const imgHeightPt = canvas.height * 0.75;
                    const pdf = new ResolvedjsPDF('p', 'pt', [imgWidthPt, imgHeightPt]);
                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidthPt, imgHeightPt);
                    pdf.save(`baro_yaksok_${roomInfo.code}.pdf`);
                  }
                } catch (e) {
                  console.error("Auto PDF failed", e);
                }
              }).catch(e => console.error(e));
            } catch (e) {
              console.error(e);
            }
          }, 1200);
        }, 1800);
      }
    }
  }, [roomInfo?.step, roomInfo?.finalYaksok]);

  // Initialize values based on rouletteResult
  const getInitialDayKey = () => {
    if (rouletteResult && rouletteResult.type === 'time' && rouletteResult.winners && rouletteResult.winners.length > 0) {
      const parts = rouletteResult.winners[0].id.split('_');
      if (parts[0]) return parts[0];
    }
    return DAYS[0]?.key || '';
  };

  const getInitialHour = () => {
    if (rouletteResult && rouletteResult.type === 'time' && rouletteResult.winners && rouletteResult.winners.length > 0) {
      const parts = rouletteResult.winners[0].id.split('_');
      if (parts[1]) return parts[1];
    }
    return HOURS[3]; // 12:00 default
  };

  const getInitialLocId = () => {
    if (rouletteResult && rouletteResult.type === 'location' && rouletteResult.winners && rouletteResult.winners.length > 0) {
      return rouletteResult.winners[0].id;
    }
    return locations.length > 0 ? locations[0].id : 'custom';
  };

  // Setup form states for Host
  const [selectedDayKey, setSelectedDayKey] = useState(getInitialDayKey);
  const [selectedHour, setSelectedHour] = useState(getInitialHour);
  const [selectedLocId, setSelectedLocId] = useState(getInitialLocId);
  const [customLocName, setCustomLocName] = useState('');
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [downloadedImgUrl, setDownloadedImgUrl] = useState(null);

  const activeDayKey = selectedDayKey || DAYS[0]?.key || '';

  // Sort and rank time slots based on votes count (supporting ties)
  const rankedTimes = React.useMemo(() => {
    const votedList = [];
    HOURS.forEach(time => {
      const cellKey = `${activeDayKey}_${time}`;
      const votes = (calendarVotes || {})[cellKey] || [];
      if (votes.length > 0) {
        votedList.push({ time, votesCount: votes.length });
      }
    });

    votedList.sort((a, b) => {
      if (b.votesCount !== a.votesCount) return b.votesCount - a.votesCount;
      return a.time.localeCompare(b.time);
    });

    const ranked = [];
    let currentRank = 1;
    let prevVotesCount = -1;
    
    votedList.forEach((item, index) => {
      if (prevVotesCount !== -1 && item.votesCount < prevVotesCount) {
        currentRank = index + 1;
      }
      ranked.push({
        ...item,
        rank: currentRank
      });
      prevVotesCount = item.votesCount;
    });

    return ranked;
  }, [activeDayKey, calendarVotes]);

  // Get active (voted) slots grouped by consecutive ranges for the active day
  const groupedVotedSlotsForActiveDay = React.useMemo(() => {
    const arr = [];
    HOURS.forEach(time => {
      const cellKey = `${activeDayKey}_${time}`;
      const votes = (calendarVotes || {})[cellKey] || [];
      if (votes.length > 0) {
        arr.push({ time, votes });
      }
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
          startTime: slot.time,
          endTime: slot.time,
          slots: [slot]
        };
      } else {
        const prevMinutes = getMinutes(currentGroup.endTime);
        const currMinutes = getMinutes(slot.time);

        if (currMinutes - prevMinutes === 10) {
          currentGroup.endTime = slot.time;
          currentGroup.slots.push(slot);
        } else {
          groups.push(currentGroup);
          currentGroup = {
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
      const maxVotesCount = Math.max(...g.slots.map(s => s.votes.length));
      const rangeStr = g.startTime === '00:00' && g.endTime === '23:50' 
        ? '하루 종일' 
        : `${g.startTime} ~ ${add10Minutes(g.endTime)}`;

      return {
        label: `${rangeStr} (최대 ${maxVotesCount}명 찬성)`,
        value: rangeStr,
        votesCount: maxVotesCount
      };
    }).sort((a, b) => b.votesCount - a.votesCount);
  }, [activeDayKey, calendarVotes]);

  // Sort and rank locations based on votes count (supporting ties)
  const rankedLocations = React.useMemo(() => {
    const list = [...(locations || [])];
    list.sort((a, b) => ((b.votes || []).length) - ((a.votes || []).length));
    
    const ranked = [];
    let currentRank = 1;
    let prevVotesCount = -1;
    
    list.forEach((item, index) => {
      if (prevVotesCount !== -1 && (item.votes || []).length < prevVotesCount) {
        currentRank = index + 1;
      }
      ranked.push({
        ...item,
        rank: currentRank
      });
      prevVotesCount = (item.votes || []).length;
    });
    return ranked;
  }, [locations]);

  // Synchronize selections with rouletteResult or default lists when they load
  React.useEffect(() => {
    if (rouletteResult) {
      if (rouletteResult.type === 'time' && rouletteResult.winners && rouletteResult.winners.length > 0) {
        const parts = rouletteResult.winners[0].id.split('_');
        if (parts[0]) setSelectedDayKey(parts[0]);
        if (parts[1]) setSelectedHour(parts[1]);
      }
      if (rouletteResult.type === 'location' && rouletteResult.winners && rouletteResult.winners.length > 0) {
        setSelectedLocId(rouletteResult.winners[0].id);
      }
    } else {
      if (DAYS.length > 0 && !selectedDayKey) {
        setSelectedDayKey(DAYS[0].key);
      }
      if ((locations || []).length > 0 && !selectedLocId) {
        setSelectedLocId(locations[0].id);
      }
    }
  }, [rouletteResult, DAYS.length, (locations || []).length]);

  // Auto-select the top voted time slot or range for the selected day
  React.useEffect(() => {
    if (groupedVotedSlotsForActiveDay.length > 0) {
      setSelectedHour(groupedVotedSlotsForActiveDay[0].value);
    } else if (rankedTimes.length > 0) {
      setSelectedHour(rankedTimes[0].time);
    }
  }, [activeDayKey, groupedVotedSlotsForActiveDay, rankedTimes]);

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

    let finalPlaceUrl = '';
    let finalComment = '';
    if (selectedLocId !== 'custom') {
      const loc = locations.find(l => l.id === selectedLocId);
      finalPlaceUrl = loc ? loc.placeUrl : '';
      finalComment = loc ? loc.comment : '';
    }
    finalizeYaksok({
      date: finalDateStr,
      time: selectedHour,
      location: finalLocName,
      placeUrl: finalPlaceUrl,
      comment: finalComment
    });
  };

  const handleDownloadReceipt = () => {
    if (!receiptRef.current || isDownloadingImage) return;
    setIsDownloadingImage(true);

    // Use scale: 1.5 to keep it crisp but safe on mobile canvas size limits
    html2canvas(receiptRef.current, {
      backgroundColor: null,
      scale: 1.5,
      logging: false,
      useCORS: true,
      allowTaint: true
    }).then(canvas => {
      try {
        const imgDataUrl = canvas.toDataURL('image/png');
        
        if (!imgDataUrl || imgDataUrl === 'data:,') {
          throw new Error('Canvas size exceeded limits or rendering returned empty image.');
        }

        const link = document.createElement('a');
        link.download = `baro_yaksok_${roomInfo.code}.png`;
        link.href = imgDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Open preview modal
        setDownloadedImgUrl(imgDataUrl);
        setIsDownloadingImage(false);
      } catch (err) {
        console.error("PNG save failed:", err);
        alert("이미지 저장 중 오류가 발생했습니다: " + err.message);
        setIsDownloadingImage(false);
      }
    }).catch(err => {
      console.error("HTML2Canvas render failed:", err);
      alert("이미지 생성에 실패했습니다: " + err.message);
      setIsDownloadingImage(false);
    });
  };

  const handleDownloadPDF = () => {
    if (!receiptRef.current || isDownloadingPDF) return;
    setIsDownloadingPDF(true);

    try {
      let ResolvedjsPDF = jsPDF;
      if (typeof ResolvedjsPDF !== 'function' && ResolvedjsPDF.jsPDF) {
        ResolvedjsPDF = ResolvedjsPDF.jsPDF;
      }
      
      html2canvas(receiptRef.current, {
        backgroundColor: null,
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true
      }).then(canvas => {
        try {
          const imgData = canvas.toDataURL('image/png');
          
          if (!imgData || imgData === 'data:,') {
            throw new Error('Canvas size exceeded limits or rendering returned empty image.');
          }

          // Crop PDF page dimensions to match the receipt image exactly
          const imgWidthPt = canvas.width * 0.75;
          const imgHeightPt = canvas.height * 0.75;
          
          const pdf = new ResolvedjsPDF('p', 'pt', [imgWidthPt, imgHeightPt]);
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidthPt, imgHeightPt);
          pdf.save(`baro_yaksok_${roomInfo.code}.pdf`);
          setIsDownloadingPDF(false);
        } catch (innerErr) {
          console.error("PDF generation inside canvas promise failed:", innerErr);
          alert("PDF 저장 중 오류가 발생했습니다: " + innerErr.message);
          setIsDownloadingPDF(false);
        }
      }).catch(err => {
        console.error("HTML2Canvas render for PDF failed:", err);
        alert("PDF용 이미지 생성에 실패했습니다: " + err.message);
        setIsDownloadingPDF(false);
      });
    } catch (err) {
      console.error("PDF Library initialization failed:", err);
      alert("PDF 라이브러리 로드 중 오류가 발생했습니다: " + err.message);
      setIsDownloadingPDF(false);
    }
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
                  className="w-full glass-input rounded-2xl py-3 px-4 text-xs font-extrabold focus:border-[#C00A4A] cursor-pointer text-slate-850"
                >
                  {groupedVotedSlotsForActiveDay.length > 0 && (
                    <optgroup label="✨ 추천 시간 범위 (인기 순)">
                      {groupedVotedSlotsForActiveDay.map((range, idx) => (
                        <option key={range.value} value={range.value} className="text-slate-800 font-extrabold">
                          🏆 {idx + 1}순위: {range.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="🔥 투표 결과 (인기 10분 단위)">
                    {rankedTimes.map(rt => (
                      <option key={rt.time} value={rt.time} className="text-slate-800 font-medium">
                        ⏱️ {rt.rank}순위: {rt.time} ({rt.votesCount}명 찬성)
                      </option>
                    ))}
                    {rankedTimes.length === 0 && (
                      <option disabled className="text-slate-400 font-semibold">아직 투표된 시간이 없습니다.</option>
                    )}
                  </optgroup>
                  <optgroup label="⏱️ 전체 시간대">
                    {HOURS.map(hour => (
                      <option key={hour} value={hour} className="text-slate-600 font-medium">
                        {hour}
                      </option>
                    ))}
                  </optgroup>
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
                  <optgroup label="🔥 후보 장소 투표 순위">
                    {rankedLocations.map(loc => (
                      <option key={loc.id} value={loc.id} className="text-slate-850 font-bold">
                        🏆 {loc.rank}순위: 📍 {loc.name} ({loc.votes.length}표)
                      </option>
                    ))}
                    {rankedLocations.length === 0 && (
                      <option disabled className="text-slate-400 font-semibold">등록된 후보지가 없습니다.</option>
                    )}
                  </optgroup>
                  {rouletteResult && (
                    <optgroup label="🎲 결정 도우미 결과">
                      <option value="roulette" className="text-slate-800 font-semibold">
                        🎲 룰렛 당첨지: {rouletteResult.winners?.[0]?.name || '미정'}
                      </option>
                    </optgroup>
                  )}
                  <optgroup label="기타">
                    <option value="custom" className="text-slate-800 font-semibold">
                      ✍️ 직접 수동 입력...
                    </option>
                  </optgroup>
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

            <button
              onClick={() => {
                if (window.confirm("방을 폭파하시겠습니까? 모든 정보가 영구 삭제됩니다.")) {
                  explodeRoom();
                }
              }}
              type="button"
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100/70 text-red-600 border border-rose-100 rounded-2xl font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
            >
              💣 방 폭파하기
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
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                {receipt.location}
                {receipt.placeUrl && (
                  <a
                    href={receipt.placeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-extrabold text-[#C00A4A] hover:underline"
                  >
                    상세보기 🔗
                  </a>
                )}
              </span>
              {receipt.comment && (
                <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-100/40 px-1.5 py-0.5 rounded mt-0.5 block w-fit">
                  💬 {receipt.comment}
                </span>
              )}
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
          disabled={isDownloadingImage}
          className="w-full py-3.5 bg-[#C00A4A] hover:bg-[#a3083e] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-pink-900/10 active:scale-95 transition-all cursor-pointer"
        >
          {isDownloadingImage ? (
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
          onClick={handleDownloadPDF}
          disabled={isDownloadingPDF}
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          {isDownloadingPDF ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              PDF 생성 중...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 text-emerald-400" />
              영수증 PDF 파일로 저장 (PDF)
            </>
          )}
        </button>

        {isHost && (
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={reopenRoom}
              className="w-full py-3 bg-rose-50 hover:bg-rose-100/80 text-[#C00A4A] border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
              약속 조율 수정하기 (마감 취소)
            </button>
            <button
              onClick={() => {
                if (window.confirm("방을 폭파하시겠습니까? 모든 정보가 영구 삭제됩니다.")) {
                  explodeRoom();
                }
              }}
              type="button"
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100/70 text-red-600 border border-rose-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              💣 방 폭파하기
            </button>
          </div>
        )}

        <button
          onClick={leaveRoom}
          className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
        >
          대시보드로 나가기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 📥 Image Download Fallback Modal */}
      {downloadedImgUrl && (
        <div 
          onClick={() => setDownloadedImgUrl(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-3xl p-5 w-full max-w-sm border border-slate-200/60 shadow-2xl relative overflow-hidden animate-fade-in-up cursor-default text-center space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 select-none">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#C00A4A]" />
                영수증 저장 완료!
              </h3>
              <button 
                type="button" 
                onClick={() => setDownloadedImgUrl(null)}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <img 
                src={downloadedImgUrl} 
                alt="Receipt Ticket Preview" 
                className="w-full max-h-[300px] object-contain rounded-2xl border border-rose-100 shadow-sm"
              />
              <div className="bg-rose-50/50 border border-rose-100/60 rounded-xl p-3 text-left space-y-1">
                <span className="text-[9px] font-extrabold text-[#C00A4A] tracking-wider block">💡 모바일/인앱 브라우저 안내</span>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  만약 다운로드가 진행되지 않은 경우, 위의 **영수증 이미지를 길게 누르시거나** 우클릭하여 **'이미지 저장'** 또는 **'사진에 추가'**를 선택해서 저장해주세요.
                </p>
              </div>
            </div>

            <button
              onClick={() => setDownloadedImgUrl(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WrapupTab;

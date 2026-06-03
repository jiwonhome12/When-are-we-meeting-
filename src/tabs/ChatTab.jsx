import React, { useState, useEffect, useRef } from 'react';
import { useRoom } from '../context/RoomContext';
import { Send, Calendar, MapPin, Dices, Award, Bell } from 'lucide-react';

const ChatTab = ({ setActiveTab }) => {
  const { 
    chatMessages, 
    currentUser, 
    participants, 
    locations,
    sendChatMessage,
    roomInfo
  } = useRoom();

  const [inputText, setInputText] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showBombDialog, setShowBombDialog] = useState(false);
  const chatBottomRef = useRef(null);

  const BOMB_TEMPLATES = [
    "📢 어이, 눈팅하지 말고 얼른 투표해라냥! 💣",
    "⏰ 약속 시간/장소 투표 마감 임박!! 대답 좀!! ⏳",
    "🔥 대답 안 하면 꿀밤 한 대 투하! 💥",
    "🚨 야! 언제 만날지 빨리 고르라고! 😡",
    "💣 폭탄 배달 완료! (빨리 의견 내라냥🐾)"
  ];

  const handleSendBomb = (text) => {
    sendChatMessage(text, 'bomb');
    setShowBombDialog(false);
  };

  const roomStartDate = roomInfo?.startDate || new Date().toISOString().split('T')[0];
  const roomEndDate = roomInfo?.endDate || (() => {
    const d = new Date(roomStartDate);
    d.setDate(d.getDate() + 9);
    return d.toISOString().split('T')[0];
  })();

  // Generate days identically to CalendarTab
  const DAYS = (() => {
    const arr = [];
    const dt = new Date(roomStartDate);
    const endDt = new Date(roomEndDate);
    
    // Safety cap: max 31 days to prevent UI overload
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

  const handleShareDate = (day) => {
    const text = `📅 날짜 제안: [${day.label} (${day.dayOfWeek})] 어떠신가요? 이 날짜가 괜찮으시다면 일정 조율 탭에서 투표해주세요!`;
    sendChatMessage(text, 'link', 'calendar-share');
    setShowShareDialog(false);
  };

  const handleShareLocation = (loc) => {
    const text = `📍 장소 제안: [${loc.name}] 어떠신가요? (${loc.address}) 마음에 드신다면 장소 조율 탭에서 투표해주세요!`;
    sendChatMessage(text, 'link', 'location-share');
    setShowShareDialog(false);
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendChatMessage(inputText.trim(), 'text');
    setInputText('');
  };

  const getParticipantColor = (userId) => {
    const p = participants.find(part => part.id === userId);
    if (!p) return '#BAE6FD';
    const mapping = {
      Red: '#FDA4AF', Orange: '#FED7AA', Yellow: '#FEF08A',
      Green: '#A7F3D0', Blue: '#BAE6FD', Purple: '#E9D5FF', Pink: '#FBCFE8'
    };
    return mapping[p.color] || '#BAE6FD';
  };

  // Helper to render special deep links
  const renderMessageContent = (msg) => {
    if (msg.type === 'bomb') {
      return (
        <div className="flex items-start gap-2 py-0.5">
          <span className="text-base shrink-0 animate-bounce">💣</span>
          <div className="flex flex-col text-left">
            <span className="text-[9px] uppercase tracking-wider text-red-500 font-extrabold mb-0.5">🚨 독촉 폭탄 투하!</span>
            <span className="break-all whitespace-pre-wrap leading-relaxed">{msg.text}</span>
          </div>
        </div>
      );
    }

    if (msg.type === 'link') {
      const getLinkDetails = () => {
        switch (msg.linkType) {
          case 'calendar':
            return {
              title: '최적 시간대 제안 도착!',
              desc: '가장 많은 사람이 조율한 추천 시간대로 이동하려면 터치하세요.',
              icon: <Calendar className="w-5 h-5 text-[#C00A4A]" />,
              color: 'border-rose-100 bg-rose-50/50 hover:bg-rose-100/80',
              tab: 'calendar'
            };
          case 'calendar-share':
            return {
              title: '📅 제안된 약속 날짜 도착!',
              desc: msg.text,
              icon: <Calendar className="w-5 h-5 text-[#C00A4A]" />,
              color: 'border-rose-200 bg-rose-50/70 hover:bg-rose-100/90 shadow-sm',
              tab: 'calendar'
            };
          case 'location':
            return {
              title: '신규 추천 장소가 등록되었습니다!',
              desc: '지도에서 추천 장소를 확인하고 투표를 행사하세요.',
              icon: <MapPin className="w-5 h-5 text-emerald-600" />,
              color: 'border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/80',
              tab: 'location'
            };
          case 'location-share':
            return {
              title: '📍 제안된 약속 장소 도착!',
              desc: msg.text,
              icon: <MapPin className="w-5 h-5 text-emerald-600" />,
              color: 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/90 shadow-sm',
              tab: 'location'
            };
          case 'roulette':
            return {
              title: '결정 도우미 룰렛 추첨 완료!',
              desc: '추첨 결과를 확인하고 룰렛을 다시 돌려보세요.',
              icon: <Dices className="w-5 h-5 text-purple-600" />,
              color: 'border-purple-100 bg-purple-50/50 hover:bg-purple-100/80',
              tab: 'roulette'
            };
          case 'wrapup':
            return {
              title: '약속 최종 영수증 발행 완료!',
              desc: '최종 확정된 날짜와 장소 영수증을 소장/저장하세요.',
              icon: <Award className="w-5 h-5 text-amber-600 animate-bounce" />,
              color: 'border-amber-100 bg-amber-50/50 hover:bg-amber-100/80',
              tab: 'wrapup'
            };
          default:
            return null;
        }
      };

      const link = getLinkDetails();
      if (!link) return <span>{msg.text}</span>;

      return (
        <button
          onClick={() => setActiveTab(link.tab)}
          className={`w-full text-left p-3.5 rounded-xl border flex items-start gap-3.5 transition-all transform active:scale-[0.98] cursor-pointer mt-1 ${link.color}`}
        >
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
            {link.icon}
          </div>
          <div className="text-xs space-y-0.5">
            <h5 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              {link.title}
            </h5>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{msg.text}</p>
            <span className="inline-block text-[9px] text-[#C00A4A] font-bold mt-1.5 underline">
              해당 탭으로 즉시 이동 ➡️
            </span>
          </div>
        </button>
      );
    }

    return <span className="break-all whitespace-pre-wrap">{msg.text}</span>;
  };

  return (
    <div className="flex-1 flex flex-col min-h-[300px] overflow-hidden max-h-full">
      {/* 💬 Chat Messages Panel */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 max-h-[320px] mb-3">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none opacity-60">
            <Bell className="w-7 h-7 text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-600">실시간 채팅방이 개설되었습니다.</p>
            <p className="text-[9px] text-slate-400 mt-0.5">메시지나 링크 배너를 통해 소통해보세요.</p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div 
                  key={msg.id}
                  className="w-full text-center py-2 px-4 bg-slate-100 border border-slate-200/80 rounded-xl text-[10px] font-bold text-slate-500 select-none animate-fadeIn shadow-sm"
                >
                  {msg.text}
                </div>
              );
            }

            const isMine = msg.senderId === currentUser?.id;
            const senderColor = getParticipantColor(msg.senderId);

            return (
              <div 
                key={msg.id} 
                className={`flex gap-2.5 max-w-[85%] animate-fadeIn ${
                  isMine ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar Emo */}
                {!isMine && (
                  <div 
                    className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-base border-2 border-white shadow-sm shrink-0 select-none"
                    style={{ backgroundColor: senderColor }}
                  >
                    {msg.senderEmoji}
                  </div>
                )}

                {/* Message Body */}
                <div className="space-y-1">
                  {!isMine && (
                    <span className="block text-[10px] font-extrabold text-slate-500 px-1 select-none">
                      {msg.senderName}
                    </span>
                  )}
                  
                  <div className={`p-3 rounded-2xl text-xs relative ${
                    isMine
                      ? msg.type === 'bomb'
                        ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-tr-none shadow-lg shadow-red-900/20 font-bold border border-red-400'
                        : 'bg-[#C00A4A] text-white rounded-tr-none shadow-md shadow-pink-900/10'
                      : msg.type === 'link'
                        ? 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-none w-full shadow-sm'
                        : msg.type === 'bomb'
                          ? 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 text-slate-800 rounded-tl-none shadow-md font-bold'
                          : 'bg-white border border-slate-200/60 text-slate-800 rounded-tl-none shadow-sm'
                  }`}>
                    {renderMessageContent(msg)}
                  </div>
                  
                  <span className={`block text-[8px] font-bold text-slate-400 select-none ${
                    isMine ? 'text-right' : 'text-left'
                  }`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* ✍️ Message Input Box */}
      <div className="flex flex-col relative w-full">
        {/* 👑 Share Dialog Popover above input */}
        {showShareDialog && (
          <div className="absolute bottom-[52px] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 animate-fade-in-up flex flex-col gap-3 max-h-56 overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                📅 날짜 또는 📍 장소 공유 대화상자
              </span>
              <button 
                type="button"
                onClick={() => setShowShareDialog(false)}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                닫기
              </button>
            </div>

            {/* 📅 Date suggestions */}
            <div className="space-y-1.5">
              <div className="text-[8.5px] font-extrabold text-[#C00A4A] uppercase tracking-wider select-none">📅 추천 일정 공유</div>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(day => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => handleShareDate(day)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-100/50 hover:border-rose-200 text-[#C00A4A] text-[10px] font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                  >
                    {day.label}({day.dayOfWeek})
                  </button>
                ))}
              </div>
            </div>

            {/* 📍 Location suggestions */}
            <div className="space-y-1.5">
              <div className="text-[8.5px] font-extrabold text-emerald-600 uppercase tracking-wider select-none">📍 추천 후보 장소 공유</div>
              {locations.length === 0 ? (
                <div className="text-[9.5px] text-slate-400 font-medium italic select-none pl-1">
                  아직 등록된 후보지가 없습니다. 장소 조율 탭에서 장소를 먼저 추가하세요!
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {locations.map(loc => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleShareLocation(loc)}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100/50 hover:border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all active:scale-95 truncate max-w-[150px]"
                      title={loc.address}
                    >
                      📍 {loc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 👑 Bomb Nudge Dialog Popover above input */}
        {showBombDialog && (
          <div className="absolute bottom-[52px] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 z-50 animate-fade-in-up flex flex-col gap-2.5 max-h-56 overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none flex items-center gap-1">
                💣 독촉 폭탄 투하 준비 (나만 살 수 없다!)
              </span>
              <button 
                type="button"
                onClick={() => setShowBombDialog(false)}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                닫기
              </button>
            </div>

            <div className="text-[9px] text-slate-400 font-medium mb-1 select-none">
              아래 폭탄 중 하나를 선택하면 채팅방 전체 화면이 흔들리며 강하게 알림이 갑니다!
            </div>

            <div className="flex flex-col gap-1.5">
              {BOMB_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendBomb(tmpl)}
                  className="w-full text-left p-2.5 bg-red-50/50 hover:bg-red-50 border border-red-100/50 hover:border-red-200 text-slate-700 hover:text-red-700 text-[10px] font-bold rounded-xl cursor-pointer transition-all active:scale-[0.99] flex items-center gap-2"
                >
                  <span className="text-xs">💣</span>
                  <span className="truncate">{tmpl}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 w-full relative">
          <button
            type="button"
            onClick={() => { setShowShareDialog(!showShareDialog); setShowBombDialog(false); }}
            className="w-11.5 h-11.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60 transition-all cursor-pointer shadow-sm active:scale-95 text-lg font-bold"
            title="일정/장소 공유 대화상자"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => { setShowBombDialog(!showBombDialog); setShowShareDialog(false); }}
            className="w-11.5 h-11.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-600 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95 text-lg"
            title="약속 독촉 폭탄 던지기"
          >
            💣
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="실시간 대화 입력..."
              maxLength={150}
              className="w-full glass-input rounded-xl py-3.5 pl-4 pr-12 text-xs font-semibold placeholder:text-slate-400 focus:border-[#C00A4A] transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="absolute right-1.5 top-1.5 w-8.5 h-8.5 rounded-lg bg-[#C00A4A] hover:bg-[#a3083e] disabled:opacity-40 disabled:pointer-events-none text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatTab;

import React, { useState, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { Share2, LogOut, Copy, Check, Calendar, MapPin, MessageSquare, Dices, Award, Users, User, Sparkles } from 'lucide-react';

// Core Tabs
import CalendarTab from '../tabs/CalendarTab';
import LocationTab from '../tabs/LocationTab';
import ChatTab from '../tabs/ChatTab';
import RouletteTab from '../tabs/RouletteTab';
import WrapupTab from '../tabs/WrapupTab';

const EMOJIS = ['🦊', '🐱', '🐼', '🦁', '🐸', '🐨', '🦖', '🦄', '🐳', '🌟', '🍕', '🎉', '🎸', '🍦', '🎈', '🍭'];
const COLORS = [
  { name: 'Red', hex: '#FDA4AF', bg: 'bg-[#FDA4AF]/20 border-[#FDA4AF]/40 text-rose-700' },
  { name: 'Orange', hex: '#FED7AA', bg: 'bg-[#FED7AA]/20 border-[#FED7AA]/40 text-orange-700' },
  { name: 'Yellow', hex: '#FEF08A', bg: 'bg-[#FEF08A]/20 border-[#FEF08A]/40 text-amber-700' },
  { name: 'Green', hex: '#A7F3D0', bg: 'bg-[#A7F3D0]/20 border-[#A7F3D0]/40 text-emerald-700' },
  { name: 'Blue', hex: '#BAE6FD', bg: 'bg-[#BAE6FD]/20 border-[#BAE6FD]/40 text-sky-700' },
  { name: 'Purple', hex: '#E9D5FF', bg: 'bg-[#E9D5FF]/20 border-[#E9D5FF]/40 text-purple-700' },
  { name: 'Pink', hex: '#FBCFE8', bg: 'bg-[#FBCFE8]/20 border-[#FBCFE8]/40 text-pink-700' }
];

const RoomContainer = () => {
  const { 
    roomCode, 
    roomInfo, 
    participants, 
    currentUser, 
    onboardUser, 
    leaveRoom 
  } = useRoom();

  const [activeTab, setActiveTab] = useState('calendar'); // calendar, location, chat, roulette, wrapup
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Initialize Kakao SDK
  useEffect(() => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      try {
        window.Kakao.init('849ee984e85bceda41fd0849b6ba6a05');
      } catch (err) {
        console.error("Kakao SDK initialization error:", err);
      }
    }
  }, []);

  const handleKakaoShare = () => {
    if (!window.Kakao) return;
    const shareUrl = `${window.location.origin}/?roomCode=${roomCode}`;
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `🤝 바로약속 초대: ${roomInfo?.title}`,
        description: `참여 코드: ${roomCode}\n실시간으로 우리들의 만날 수 있는 약속 일정과 장소를 조율해요!`,
        imageUrl: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800&auto=format&fit=crop',
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: '약속 참여하기',
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
    setShowShareMenu(false);
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/?roomCode=${roomCode}`;
    const shareText = `[바로약속] '${roomInfo?.title}' 약속 조율 방에 초대합니다!\n\n참여 코드: ${roomCode}\n\n아래 링크를 누르면 별도 입력 없이 실시간으로 즉시 참여하실 수 있습니다.\n초대 링크: ${shareUrl}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowShareMenu(false);
  };
  
  // Guest Profile Form State
  const [nickname, setNickname] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[4]); // Blue default
  const [onboardError, setOnboardError] = useState('');

  // Handle auto tab transition from chat deep links
  useEffect(() => {
    if (roomInfo?.step === 'wrapup') {
      setActiveTab('wrapup');
    }
  }, [roomInfo?.step]);

  // Handle guest manual onboarding submit
  const handleGuestOnboardSubmit = (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setOnboardError('닉네임을 입력해 주세요.');
      return;
    }
    setOnboardError('');
    onboardUser({
      name: nickname.trim(),
      emoji: selectedEmoji,
      color: selectedColor.name,
      isHost: false
    });
  };

  // If user is not onboarded, show the premium profile entry form
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center py-6 px-4 bg-[#f8fafc]">
        {/* 🌸 Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-10 left-10 w-64 h-64 bg-rose-200/40 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-pink-100/50 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <div className="glass-card rounded-3xl p-6 w-full max-w-md border border-slate-200/60 shadow-xl animate-fade-in-up z-10">
          <div className="text-center mb-6">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center justify-center gap-1.5">
              <Sparkles className="w-5 h-5 text-[#C00A4A]" />
              바로약속 프로필 생성
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              약속방에 참가하기 위해 사용할 닉네임과 아바타를 설정해주세요.
            </p>
          </div>

          {/* Profile Avatar Preview */}
          <div className="flex flex-col items-center justify-center mb-5">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-4 border-white shadow-md"
              style={{ backgroundColor: selectedColor.hex }}
            >
              {selectedEmoji}
            </div>
            <span className="text-[10px] text-slate-400 mt-1.5 font-bold select-none">아바타 미리보기</span>
          </div>

          <form onSubmit={handleGuestOnboardSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                사용할 닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setOnboardError(''); }}
                placeholder="닉네임 입력 (최대 10자)"
                maxLength={10}
                className="w-full glass-input rounded-2xl py-3 px-4 font-semibold text-slate-800 focus:outline-none transition-all text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                이모지 선택
              </label>
              <div className="grid grid-cols-8 gap-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/40">
                {EMOJIS.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center text-base transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                      selectedEmoji === emoji 
                        ? 'bg-white border-2 border-[#C00A4A] shadow-sm' 
                        : 'hover:bg-white/50'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                퍼스널 컬러 선택
              </label>
              <div className="flex flex-wrap gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/40 justify-center">
                {COLORS.map((color) => {
                  const isSelected = selectedColor.name === color.name;
                  return (
                    <button
                      type="button"
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className="w-6.5 h-6.5 rounded-full border-2 transition-all relative flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                      style={{ 
                        backgroundColor: color.hex,
                        borderColor: isSelected ? '#C00A4A' : '#ffffff'
                      }}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-slate-800 font-extrabold" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {onboardError && (
              <p className="text-[#C00A4A] text-[10px] font-bold text-center bg-rose-50 border border-rose-100 rounded-lg py-1 px-2">
                ⚠️ {onboardError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#C00A4A] hover:bg-[#a3083e] text-white text-xs font-bold rounded-2xl cursor-pointer shadow-md transition-all duration-200 active:scale-[0.98]"
            >
              프로필 설정 완료 및 입장하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Get active tab color based on current user's color
  const getUserColorClass = () => {
    const found = COLORS.find(c => c.name === currentUser.color);
    return found ? found.bg : 'bg-[#BAE6FD]/20 text-sky-700';
  };

  const getHexColor = (colorName) => {
    const found = COLORS.find(c => c.name === colorName);
    return found ? found.hex : '#BAE6FD';
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative bg-[#f8fafc]">
      {/* 🚀 Header */}
      <header className="glass-panel sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm border-b border-slate-100">
        <button
          onClick={() => setShowMembersModal(true)}
          className="flex items-center gap-2.5 text-left cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition-all border border-transparent hover:border-slate-200"
          title="참여자 목록 확인"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg select-none border border-slate-200/50">
            {roomInfo?.type?.split(' ')[0] || '📅'}
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800 text-sm leading-tight max-w-[180px] truncate select-none flex items-center gap-1.5">
              {roomInfo?.title}
              <span className="text-[8px] bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded-full font-bold select-none">멤버</span>
            </h1>
            <p className="text-[9px] font-bold font-mono text-slate-400 flex items-center gap-1 mt-0.5 select-all uppercase">
              CODE: {roomCode}
            </p>
          </div>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-2 relative">
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="w-8.5 h-8.5 rounded-xl bg-white border border-slate-200/60 hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer relative shadow-sm"
              title="초대장 공유"
            >
              {copied ? <Check className="w-4 h-4 text-[#C00A4A]" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* 👑 Dual-Share Dropdown Popover */}
            {showShareMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-fade-in-up">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2.5 py-1.5 border-b border-slate-100 select-none">
                  초대 공유 옵션
                </div>
                
                <button
                  onClick={handleKakaoShare}
                  className="w-full text-left py-2 px-2.5 hover:bg-[#FEE500]/10 text-slate-700 hover:text-slate-900 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer mt-1"
                >
                  <span className="w-5 h-5 rounded-lg bg-[#FEE500] flex items-center justify-center text-[10px]">💬</span>
                  카카오톡 초대하기
                </button>
                
                <button
                  onClick={handleCopyLink}
                  className="w-full text-left py-2 px-2.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-[10px]">🔗</span>
                  초대 링크 복사하기
                </button>
              </div>
            )}
          </div>

          <button
            onClick={leaveRoom}
            className="w-8.5 h-8.5 rounded-xl bg-rose-50 border border-rose-100 text-[#C00A4A] hover:bg-rose-100/70 flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title="방 나가기"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 👥 Participant Tray */}
      <section className="bg-slate-50/80 px-4 py-2 flex items-center justify-between border-b border-slate-100 overflow-hidden">
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 select-none tracking-widest">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>MEMBERS ({participants.length}/{roomInfo?.limit})</span>
        </div>
        <div className="flex -space-x-1.5 overflow-x-auto max-w-[200px] py-0.5">
          {participants.map((p) => (
            <div
              key={p.id}
              className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-xs border-2 border-white relative shadow-sm"
              style={{ 
                backgroundColor: getHexColor(p.color),
                zIndex: p.id === currentUser.id ? 10 : 1
              }}
              title={`${p.name} (${p.color})`}
            >
              {p.emoji}
              {p.isHost && (
                <span className="absolute -top-0.5 -right-0.5 text-[6px] bg-[#C00A4A] text-white rounded-full w-2.5 h-2.5 flex items-center justify-center font-bold">
                  ★
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 🚀 Active Screen/Tab Render */}
      <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col z-10 max-h-[calc(100vh-140px)] animate-fade-in-up">
        {activeTab === 'calendar' && <CalendarTab setActiveTab={setActiveTab} />}
        {activeTab === 'location' && <LocationTab />}
        {activeTab === 'chat' && <ChatTab setActiveTab={setActiveTab} />}
        {activeTab === 'roulette' && <RouletteTab />}
        {activeTab === 'wrapup' && <WrapupTab />}
      </main>

      {/* 📱 Bottom Navigation TabBar */}
      {roomInfo?.step !== 'wrapup' && (
        <nav className="glass-panel sticky bottom-0 z-40 px-2 py-2 flex items-center justify-around shadow-inner border-t border-slate-100">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all cursor-pointer select-none ${
              activeTab === 'calendar' ? getUserColorClass() : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar className={`w-5 h-5 ${activeTab === 'calendar' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold">일정 조율</span>
          </button>
          
          <button
            onClick={() => setActiveTab('location')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all cursor-pointer select-none ${
              activeTab === 'location' ? getUserColorClass() : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <MapPin className={`w-5 h-5 ${activeTab === 'location' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold">장소 조율</span>
          </button>
          
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all cursor-pointer select-none ${
              activeTab === 'chat' ? getUserColorClass() : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <MessageSquare className={`w-5 h-5 ${activeTab === 'chat' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold">실시간 소통</span>
          </button>
          
          <button
            onClick={() => setActiveTab('roulette')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all cursor-pointer select-none ${
              activeTab === 'roulette' ? getUserColorClass() : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Dices className={`w-5 h-5 ${activeTab === 'roulette' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold">결정 도우미</span>
          </button>
          
          <button
            onClick={() => setActiveTab('wrapup')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all cursor-pointer select-none ${
              activeTab === 'wrapup' ? getUserColorClass() : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Award className={`w-5 h-5 ${activeTab === 'wrapup' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold">마무리</span>
          </button>
        </nav>
      )}

      {/* 👥 Detailed Members Profiles Modal */}
      {showMembersModal && (
        <div 
          onClick={() => setShowMembersModal(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-3xl p-6 w-full max-w-md border border-slate-200/60 shadow-2xl relative overflow-hidden animate-fade-in-up cursor-default"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#C00A4A]/5 rounded-full blur-xl pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 select-none">
                <Users className="w-5 h-5 text-[#C00A4A]" />
                참여자 프로필 확인
              </h3>
              <button 
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-inner font-bold text-sm"
                title="닫기"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
              {participants.map((p) => {
                const isMe = p.id === currentUser.id;
                return (
                  <div 
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border border-white shadow-sm"
                        style={{ backgroundColor: getHexColor(p.color) }}
                      >
                        {p.emoji}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                          {p.name}
                          {isMe && (
                            <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full font-bold">
                              나
                            </span>
                          )}
                          {p.isHost && (
                            <span className="text-[9px] bg-[#C00A4A] text-white px-1.5 py-0.5 rounded-full font-bold">
                              방장
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold font-mono tracking-wider uppercase mt-0.5">
                          Color: {p.color}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomContainer;

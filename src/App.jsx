import React, { useState, useEffect } from 'react';
import { RoomProvider, useRoom } from './context/RoomContext';
import Dashboard from './views/Dashboard';
import CreateRoom from './views/CreateRoom';
import RoomContainer from './views/RoomContainer';
import { KeyRound, Sparkles, User, Check, Settings } from 'lucide-react';

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

const AppContent = () => {
  const { roomCode, currentUser, onboardUser, logoutUser } = useRoom();
  const [currentView, setCurrentView] = useState('landing'); // landing, profile-setup, dashboard, create-room
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Profile Wizard states
  const [wizardName, setWizardName] = useState('');
  const [wizardEmoji, setWizardEmoji] = useState(EMOJIS[0]);
  const [wizardColor, setWizardColor] = useState(COLORS[4]); // Blue default
  const [wizardError, setWizardError] = useState('');

  // My Page modal states
  const [showMyPage, setShowMyPage] = useState(false);
  const [myPageName, setMyPageName] = useState('');
  const [myPageEmoji, setMyPageEmoji] = useState(EMOJIS[0]);
  const [myPageColor, setMyPageColor] = useState(COLORS[4]);
  const [myPageError, setMyPageError] = useState('');
  const [myPageSuccess, setMyPageSuccess] = useState(false);

  const handleLogout = () => {
    logoutUser();
    setShowMyPage(false);
    setCurrentView('landing');
  };

  // Sync profile values when entering wizard
  useEffect(() => {
    if (currentUser && currentView === 'profile-setup') {
      setWizardName(currentUser.name);
      setWizardEmoji(currentUser.emoji);
      const matchedColor = COLORS.find(c => c.name === currentUser.color) || COLORS[4];
      setWizardColor(matchedColor);
    }
  }, [currentUser, currentView]);

  // Sync profile values when opening My Page modal
  useEffect(() => {
    if (currentUser && showMyPage) {
      setMyPageName(currentUser.name);
      setMyPageEmoji(currentUser.emoji);
      const matchedColor = COLORS.find(c => c.name === currentUser.color) || COLORS[4];
      setMyPageColor(matchedColor);
      setMyPageSuccess(false);
      setMyPageError('');
    }
  }, [currentUser, showMyPage]);

  // If already in a room, route immediately; if they leave, go back to dashboard/landing
  useEffect(() => {
    if (roomCode) {
      setCurrentView('room');
    } else {
      const savedUser = sessionStorage.getItem('baro_yaksok_user');
      if (savedUser) {
        setCurrentView('dashboard');
      } else {
        setCurrentView('landing');
      }
    }
  }, [roomCode]);

  const decodeJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("JWT decoding failed:", error);
      return null;
    }
  };

  const handleCredentialResponse = (response) => {
    setToastMessage('Google 계정으로 로그인 중...');
    setShowToast(true);
    
    setTimeout(() => {
      const payload = decodeJwt(response.credential);
      if (payload) {
        const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        
        onboardUser({
          name: payload.name || '구글 사용자',
          emoji: randomEmoji,
          color: randomColor.name,
          isHost: true
        });
      }
      setShowToast(false);
      setCurrentView('profile-setup');
    }, 1000);
  };

  useEffect(() => {
    if (currentView === 'landing') {
      const initGoogle = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: "605436856407-iem6vmklo8qmu275daaeojgssb6okbsu.apps.googleusercontent.com",
            callback: handleCredentialResponse
          });
          const btnParent = document.getElementById("google-login-btn");
          if (btnParent) {
            window.google.accounts.id.renderButton(
              btnParent,
              { 
                theme: "outline", 
                size: "large", 
                width: 380,
                text: "signup_with",
                shape: "rectangular"
              }
            );
          }
        } else {
          setTimeout(initGoogle, 150);
        }
      };
      initGoogle();
    }
  }, [currentView]);

  const handleSocialLogin = (provider) => {
    setToastMessage(`${provider} 계정으로 동기화 중...`);
    setShowToast(true);
    
    // Simulate API delay
    setTimeout(() => {
      // If no current user, initialize a default unique one
      if (!currentUser) {
        const randomNum = Math.floor(100 + Math.random() * 900); // 100-999
        const providerName = provider === 'Google' ? '구글' : '카카오';
        const nickname = `${providerName}_참여자_${randomNum}`;
        const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];

        onboardUser({
          name: nickname,
          emoji: randomEmoji,
          color: randomColor.name,
          isHost: true
        });
      }
      
      setShowToast(false);
      setCurrentView('profile-setup');
    }, 1200);
  };

  const handleGuestLogin = () => {
    setToastMessage('비회원 일회성 계정 생성 중...');
    setShowToast(true);
    
    setTimeout(() => {
      const guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
      const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      
      onboardUser({
        id: guestId,
        name: '비회원',
        emoji: randomEmoji,
        color: randomColor.name,
        isHost: false,
        isGuest: true
      });
      
      setShowToast(false);
      setCurrentView('profile-setup');
    }, 800);
  };

  const handleWizardSubmit = (e) => {
    e.preventDefault();
    if (!wizardName.trim()) {
      setWizardError('닉네임을 입력해주세요.');
      return;
    }
    setWizardError('');
    onboardUser({
      name: wizardName.trim(),
      emoji: wizardEmoji,
      color: wizardColor.name,
      isHost: currentUser?.isGuest ? false : true,
      isGuest: currentUser?.isGuest || false
    });
    setToastMessage('✓ 프로필 설정이 완료되었습니다!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
    setCurrentView('dashboard');
  };

  const handleMyPageSubmit = (e) => {
    e.preventDefault();
    if (!myPageName.trim()) {
      setMyPageError('닉네임을 입력해주세요.');
      return;
    }
    setMyPageError('');
    onboardUser({
      name: myPageName.trim(),
      emoji: myPageEmoji,
      color: myPageColor.name,
      isHost: currentUser?.isHost || false
    });
    setMyPageSuccess(true);
    setToastMessage('✓ 프로필 정보가 저장되었습니다!');
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setMyPageSuccess(false);
      setShowMyPage(false);
    }, 1200);
  };

  // Dynamic Routing based on Room Code
  if (roomCode) {
    return <RoomContainer />;
  }

  const getHexColor = (colorName) => {
    const found = COLORS.find(c => c.name === colorName);
    return found ? found.hex : '#BAE6FD';
  };

  return (
    <div className="min-h-screen flex flex-col justify-between py-6 px-4 bg-[#f8fafc] text-slate-800 transition-all duration-300 relative">
      {/* 🌸 Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-10 left-10 w-64 h-64 bg-rose-200/40 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-pink-100/50 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* 🍞 Notification Toast */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] glass-card px-5 py-3 rounded-full flex items-center gap-2.5 shadow-xl border border-rose-100 animate-fade-in-up">
          <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px]">
            ✓
          </div>
          <p className="text-xs font-bold text-slate-800">
            {toastMessage}
          </p>
        </div>
      )}

      {currentView === 'landing' ? (
        /* ⭐️ PREMIUM LANDING VIEW */
        <div className="flex-1 flex flex-col justify-center items-center max-w-md mx-auto w-full z-10 py-4 animate-fade-in-up">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 select-none">
              🤝 바로약속
            </h1>
            <p className="text-[10px] text-[#C00A4A] mt-1.5 font-bold tracking-widest uppercase">
              Premium Minimalist Scheduler
            </p>
          </div>

          {/* 🖼 Desk Setup Card */}
          <div className="w-full glass-card rounded-3xl overflow-hidden mb-6 shadow-xl border border-slate-200/50 transition-all duration-300 hover:scale-[1.01]">
            <div className="h-52 relative overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800&auto=format&fit=crop" 
                alt="Aesthetic Desk Setup" 
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="text-[9px] bg-[#C00A4A] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  REAL-TIME SYNC
                </span>
                <h3 className="text-lg font-bold mt-1 text-white leading-tight">
                  바쁜 일상 속,<br/>바로 잡는 우리의 시간
                </h3>
              </div>
            </div>

            <div className="p-5 text-center">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                가입 없이 간편하게 링크 공유만으로<br/>
                실시간 시간 조율과 위치 선정까지 한 번에.
              </p>
            </div>
          </div>

          {/* 🔑 Social Login Area */}
          <div className="w-full space-y-2.5">
            <div id="google-login-btn" className="w-full flex justify-center h-[50px] items-center mb-1 overflow-hidden"></div>

            <button
              onClick={() => handleSocialLogin('Kakao')}
              disabled={showToast}
              className="w-full py-3.5 px-4 bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#191919] rounded-2xl font-bold flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5 fill-[#191919]" viewBox="0 0 24 24">
                <path d="M12 3c-5.52 0-10 3.58-10 8 0 2.82 1.83 5.28 4.6 6.7-.18.66-.66 2.4-.76 2.76-.13.48.18.47.38.34.16-.1.2.14 2.83-1.92A11.36 11.36 0 0 0 12 19c5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              <span className="text-sm font-semibold text-[#191919]">카카오톡으로 시작</span>
            </button>

            {/* 설명 및 안내 */}
            <div className="pt-2 text-center select-none">
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                간편 로그인 시 자동으로 회원가입이 처리되어<br/>
                가장 빠르고 간편하게 모임을 시작할 수 있습니다.
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={handleGuestLogin}
                className="text-[11px] text-slate-400 hover:text-[#C00A4A] font-bold underline underline-offset-4 cursor-pointer transition-colors"
              >
                비회원 로그인으로 계속하기
              </button>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <KeyRound className="w-3 h-3 text-[#C00A4A]" />
            소셜 인증 시 비회원 초대 참여가 즉시 해제됩니다
          </div>
        </div>
      ) : currentView === 'profile-setup' ? (
        /* ⚙️ POST-LOGIN PROFILE WIZARD VIEW */
        <div className="flex-1 flex flex-col justify-center items-center max-w-md mx-auto w-full z-10 py-4 animate-fade-in-up">
          <div className="glass-card rounded-3xl p-6 w-full border border-slate-200/60 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#C00A4A]/5 rounded-full blur-xl pointer-events-none"></div>
            
            <div className="text-center mb-6">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center justify-center gap-1.5">
                <Sparkles className="w-5 h-5 text-[#C00A4A]" />
                프로필 설정
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                사용하실 이름과 나만의 이모지 아바타를 골라주세요!
              </p>
            </div>

            {/* Profile Avatar Preview */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl border-4 border-white shadow-md animate-bounce"
                style={{ backgroundColor: getHexColor(wizardColor.name) }}
              >
                {wizardEmoji}
              </div>
              <span className="text-[10px] text-slate-400 mt-2 font-bold select-none">아바타 미리보기</span>
            </div>

            <form onSubmit={handleWizardSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  닉네임
                </label>
                <input
                  type="text"
                  value={wizardName}
                  onChange={(e) => { setWizardName(e.target.value); setWizardError(''); }}
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
                      onClick={() => setWizardEmoji(emoji)}
                      className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center text-base transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                        wizardEmoji === emoji 
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
                    const isSelected = wizardColor.name === color.name;
                    return (
                      <button
                        type="button"
                        key={color.name}
                        onClick={() => setWizardColor(color)}
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

              {wizardError && (
                <p className="text-[#C00A4A] text-[10px] font-bold text-center bg-rose-50 border border-rose-100 rounded-lg py-1 px-2">
                  ⚠️ {wizardError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl cursor-pointer shadow-md transition-all active:scale-[0.98]"
              >
                설정 저장하고 모임 시작하기
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* 🏠 MAIN FLOW (DASHBOARD & CREATE ROOM) */
        <>
          <header className="text-center z-10 my-4 animate-fade-in-up relative flex flex-col items-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 select-none">
              🤝 바로약속
            </h1>
            <p className="text-[9px] text-[#C00A4A] mt-1.5 font-bold tracking-widest select-none">
              PREMIUM WHITE & SLATE MINIMALISM
            </p>
            {currentUser && (
              <button
                onClick={() => setShowMyPage(true)}
                className="absolute right-0 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:text-[#C00A4A] border border-slate-200 hover:border-[#C00A4A]/30 rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-sm select-none flex items-center gap-1"
              >
                <span>{currentUser.emoji}</span>
                <span>마이페이지</span>
              </button>
            )}
          </header>

          <main className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full z-10">
            {currentView === 'dashboard' ? (
              <Dashboard onCreateRoomClick={() => setCurrentView('create-room')} />
            ) : (
              <CreateRoom onBackClick={() => setCurrentView('dashboard')} />
            )}
          </main>

          {/* 👑 My Page Modal */}
          {showMyPage && (
            <div 
              onClick={() => setShowMyPage(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in cursor-pointer"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="glass-card rounded-3xl p-6 w-full max-w-md border border-slate-200/60 shadow-2xl relative overflow-hidden animate-fade-in-up cursor-default"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#C00A4A]/5 rounded-full blur-xl pointer-events-none"></div>
                
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 select-none">
                    <User className="w-5 h-5 text-[#C00A4A]" />
                    마이페이지
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setShowMyPage(false)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-inner font-bold text-sm"
                    title="닫기"
                  >
                    ✕
                  </button>
                </div>

                {/* Profile Preview */}
                <div className="flex flex-col items-center justify-center mb-4 select-none">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-4 border-white shadow-md transition-all hover:scale-105"
                    style={{ backgroundColor: getHexColor(myPageColor.name) }}
                  >
                    {myPageEmoji}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1.5 font-bold">아바타 미리보기</span>
                </div>

                <form onSubmit={handleMyPageSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 select-none">
                      닉네임 변경
                    </label>
                    <input
                      type="text"
                      value={myPageName}
                      onChange={(e) => { setMyPageName(e.target.value); setMyPageError(''); }}
                      placeholder="닉네임 입력"
                      maxLength={10}
                      className="w-full glass-input rounded-2xl py-2.5 px-4 font-semibold text-slate-800 focus:outline-none transition-all text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 select-none">
                      이모지 변경
                    </label>
                    <div className="grid grid-cols-8 gap-1 bg-slate-50/50 p-2 rounded-xl border border-slate-200/40">
                      {EMOJIS.map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => setMyPageEmoji(emoji)}
                          className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center text-base transition-all hover:scale-115 active:scale-90 cursor-pointer ${
                            myPageEmoji === emoji 
                              ? 'bg-white border border-[#C00A4A] shadow-sm scale-110' 
                              : 'hover:bg-white/50'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 select-none">
                      컬러 변경
                    </label>
                    <div className="flex flex-wrap gap-1.5 bg-slate-50/50 p-2 rounded-xl border border-slate-200/40 justify-center">
                      {COLORS.map((color) => {
                        const isSelected = myPageColor.name === color.name;
                        return (
                          <button
                            type="button"
                            key={color.name}
                            onClick={() => setMyPageColor(color)}
                            className="w-5.5 h-5.5 rounded-full border-2 transition-all relative flex items-center justify-center hover:scale-115 active:scale-90 cursor-pointer shadow-sm"
                            style={{ 
                              backgroundColor: color.hex,
                              borderColor: isSelected ? '#C00A4A' : '#ffffff'
                            }}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-slate-800 font-extrabold" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {myPageError && (
                    <p className="text-[#C00A4A] text-[10px] font-bold text-center bg-rose-50 border border-rose-100 rounded-lg py-1 px-2">
                      ⚠️ {myPageError}
                    </p>
                  )}

                  {myPageSuccess && (
                    <p className="text-emerald-700 text-[10px] font-bold text-center bg-emerald-50 border border-emerald-100 rounded-lg py-1 px-2 animate-pulse">
                      ✓ 프로필 수정이 완료되었습니다!
                    </p>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-[#C00A4A] text-xs font-bold rounded-xl cursor-pointer transition-all border border-rose-100"
                    >
                      로그아웃
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-[#C00A4A] hover:bg-[#a3083e] text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all"
                    >
                      저장하기
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      <footer className="text-center z-10 text-[9px] text-slate-400 font-semibold tracking-wider mt-8 select-none">
        &copy; 2026 BARO-YAKSOK Corp. Crafted with Elegance.
      </footer>
    </div>
  );
};

function App() {
  return (
    <RoomProvider>
      <div className="app-container">
        <AppContent />
      </div>
    </RoomProvider>
  );
}

export default App;

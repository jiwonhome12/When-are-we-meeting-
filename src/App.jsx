import React, { useState, useEffect } from 'react';
import { RoomProvider, useRoom } from './context/RoomContext';
import Dashboard from './views/Dashboard';
import CreateRoom from './views/CreateRoom';
import RoomContainer from './views/RoomContainer';
import { KeyRound, Sparkles } from 'lucide-react';

const AppContent = () => {
  const { roomCode, currentUser, onboardUser, logoutUser } = useRoom();
  const [currentView, setCurrentView] = useState('landing'); // landing, dashboard, create-room
  const [showToast, setShowToast] = useState(false);
  const [loginProvider, setLoginProvider] = useState('');

  const handleLogout = () => {
    logoutUser();
    setCurrentView('landing');
  };

  // Founder Login States
  const [showFounderLogin, setShowFounderLogin] = useState(false);
  const [founderEmail, setFounderEmail] = useState('');
  const [founderPassword, setFounderPassword] = useState('');
  const [founderError, setFounderError] = useState('');

  // If already in a room, route immediately
  useEffect(() => {
    if (roomCode) {
      setCurrentView('room');
    }
  }, [roomCode]);

  // If user is already logged in (saved in localStorage), they can skip landing,
  // but let's keep landing page as entry point or auto-skip. Let's auto-skip to dashboard if already logged in!
  useEffect(() => {
    const savedUser = localStorage.getItem('baro_yaksok_user');
    if (savedUser && !roomCode) {
      setCurrentView('dashboard');
    }
  }, [roomCode]);

  const handleSocialLogin = (provider) => {
    setLoginProvider(provider);
    setShowToast(true);
    
    // Simulate API delay
    setTimeout(() => {
      // If no current user, initialize a default one
      if (!currentUser) {
        onboardUser({
          name: '약속마스터',
          emoji: '✨',
          color: 'Purple',
          isHost: true
        });
      }
      
      setShowToast(false);
      setCurrentView('dashboard');
    }, 1200);
  };

  const handleFounderLoginSubmit = (e) => {
    e.preventDefault();
    if (!founderEmail.trim() || !founderPassword.trim()) {
      setFounderError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }
    
    setLoginProvider('방 설립자');
    setShowToast(true);
    
    setTimeout(() => {
      onboardUser({
        name: founderEmail.split('@')[0] || '방설립자',
        emoji: '👑',
        color: 'Red',
        isHost: true
      });
      
      setShowToast(false);
      setCurrentView('dashboard');
    }, 1200);
  };

  // Dynamic Routing based on Room Code
  if (roomCode) {
    return <RoomContainer />;
  }

  return (
    <div className="min-h-screen flex flex-col justify-between py-6 px-4 bg-[#f8fafc] text-slate-800 transition-all duration-300">
      {/* 🌸 Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-10 left-10 w-64 h-64 bg-rose-200/40 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-pink-100/50 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* 🍞 Notification Toast */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 glass-card px-5 py-3 rounded-full flex items-center gap-2.5 shadow-xl border border-rose-100 animate-fade-in-up">
          <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px]">
            ✓
          </div>
          <p className="text-xs font-bold text-slate-800">
            {loginProvider} 계정으로 동기화 중...
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
            <button
              onClick={() => handleSocialLogin('Google')}
              disabled={showToast}
              className="w-full py-3.5 px-4 bg-white border border-slate-200/80 rounded-2xl font-bold flex items-center justify-center gap-3 text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              <img 
                src="https://www.vectorlogo.zone/logos/google/google-icon.svg" 
                className="w-5 h-5" 
                alt="Google" 
              />
              <span className="text-sm font-semibold text-slate-700">Google 계정으로 시작</span>
            </button>

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

            {/* 👑 방 설립자 이메일 로그인 */}
            <div className="pt-2">
              <button
                onClick={() => setShowFounderLogin(!showFounderLogin)}
                className="w-full py-2.5 text-center text-xs text-slate-500 hover:text-[#C00A4A] font-bold border border-dashed border-slate-300 hover:border-[#C00A4A]/50 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5"
              >
                👑 방 설립자 이메일 로그인 창 열기
              </button>
              
              {showFounderLogin && (
                <form 
                  onSubmit={handleFounderLoginSubmit}
                  className="mt-3 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-inner space-y-3 animate-fade-in-up"
                >
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                      설립자 이메일 주소
                    </label>
                    <input
                      type="email"
                      value={founderEmail}
                      onChange={(e) => { setFounderEmail(e.target.value); setFounderError(''); }}
                      placeholder="founder@example.com"
                      className="w-full bg-slate-50/80 border border-slate-200 focus:border-[#C00A4A] rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none transition-colors text-slate-800"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                      비밀번호
                    </label>
                    <input
                      type="password"
                      value={founderPassword}
                      onChange={(e) => { setFounderPassword(e.target.value); setFounderError(''); }}
                      placeholder="••••••••"
                      className="w-full bg-slate-50/80 border border-slate-200 focus:border-[#C00A4A] rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none transition-colors text-slate-800"
                    />
                  </div>

                  {founderError && (
                    <p className="text-[10px] text-[#C00A4A] font-bold text-center bg-rose-50 border border-rose-100 rounded-lg py-1 px-2">
                      ⚠️ {founderError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#C00A4A] hover:bg-[#9e083d] text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all duration-200 active:scale-[0.98]"
                  >
                    설립자 계정으로 로그인 및 대시보드 입장
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <KeyRound className="w-3 h-3 text-[#C00A4A]" />
            소셜 인증 시 비회원 초대 참여가 즉시 해제됩니다
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
                onClick={handleLogout}
                className="absolute right-0 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:text-[#C00A4A] border border-slate-200 hover:border-[#C00A4A]/30 rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-sm select-none"
              >
                로그아웃
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

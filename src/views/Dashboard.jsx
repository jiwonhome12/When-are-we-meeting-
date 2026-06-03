import React, { useState, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { Plus, ArrowRight, Lock, Calendar, History, Hash, ShieldAlert } from 'lucide-react';

const Dashboard = ({ onCreateRoomClick }) => {
  const { joinRoom, currentUser } = useRoom();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [error, setError] = useState('');
  const [recentRooms, setRecentRooms] = useState([]);

  // Load recent rooms from local storage
  useEffect(() => {
    const saved = localStorage.getItem('baro_yaksok_active_rooms');
    if (saved) {
      // Show latest first, limit to 4
      const list = JSON.parse(saved).reverse().slice(0, 4);
      setRecentRooms(list);
    }
  }, []);

  // Format code to auto-insert dashes (e.g., ABCD-EFGH-12)
  const handleCodeChange = (e) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Automatically insert dashes: XXXX-XXXX-XX (4-4-2)
    if (value.length > 4 && value.length <= 8) {
      value = `${value.slice(0, 4)}-${value.slice(4)}`;
    } else if (value.length > 8) {
      value = `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 10)}`;
    }
    
    setCode(value.slice(0, 12)); // Keep length capped at 12 chars
    setError('');

    // Pre-check if password is required for this room
    if (value.length === 12) {
      const savedDb = localStorage.getItem(`room_db_${value}`);
      if (savedDb) {
        const db = JSON.parse(savedDb);
        const activeRooms = JSON.parse(localStorage.getItem('baro_yaksok_active_rooms') || '[]');
        const alreadyJoined = activeRooms.some(r => r.code === value);
        
        if (db.roomInfo.isPrivate && !alreadyJoined) {
          setShowPasswordInput(true);
        } else {
          setShowPasswordInput(false);
        }
      }
    } else {
      setShowPasswordInput(false);
      setPassword('');
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!code || code.length < 12) {
      setError('올바른 12자리 코드를 입력해주세요. (예: ABCD-EFGH-12)');
      return;
    }

    try {
      joinRoom(code, password);
    } catch (err) {
      setError(err.message || '방 입장에 실패했습니다.');
    }
  };

  const handleRecentClick = (room) => {
    const savedDb = localStorage.getItem(`room_db_${room.code}`);
    if (savedDb) {
      try {
        joinRoom(room.code);
      } catch (err) {
        setError(err.message);
      }
    } else {
      setError('로컬 데이터베이스에서 해당 방을 찾을 수 없습니다.');
    }
  };

  return (
    <div className="space-y-5 w-full px-2 animate-fade-in-up">
      {/* 🚀 Join Room Section (White Glassmorphic Card) */}
      <div className="glass-card rounded-3xl p-6 relative overflow-hidden border border-slate-200/60 shadow-lg">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#C00A4A]/5 rounded-full blur-xl"></div>
        
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-800">
          <Hash className="w-4 h-4 text-[#C00A4A]" />
          약속 참여 코드 입력
        </h2>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              12자리 고유 참여 코드
            </label>
            <input
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="ABCD-EFGH-12"
              maxLength={12}
              className="w-full glass-input rounded-2xl py-3.5 px-4 text-center text-xl font-extrabold tracking-widest placeholder:text-slate-300 transition-all text-slate-800"
            />
          </div>

          {showPasswordInput && (
            <div className="space-y-1.5 animate-fade-in-up">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-[#C00A4A]" />
                비밀번호 입력 (비공개 방)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••"
                className="w-full glass-input rounded-2xl py-3 px-4 text-center text-slate-800 tracking-widest transition-all"
              />
            </div>
          )}

          {error && (
            <p className="text-[#C00A4A] text-xs font-bold bg-[#C00A4A]/5 border border-[#C00A4A]/10 py-2.5 px-3 rounded-xl text-center animate-pulse">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            참여하기
            <ArrowRight className="w-4 h-4 text-[#C00A4A]" />
          </button>
        </form>
      </div>

      {/* ➕ Create Room CTA (Signature Crimson Background Card) */}
      {currentUser?.isGuest ? (
        <div
          className="w-full p-6 bg-slate-100 border border-slate-200/80 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-inner text-slate-400 relative overflow-hidden select-none"
        >
          <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="text-center z-10">
            <h3 className="font-extrabold text-sm text-slate-500">
              새로운 약속 방 개설 불가 <span className="italic font-light opacity-95 text-[11px]">(Sign-in Required)</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">
              비회원은 약속 방 입장만 가능합니다. 방을 만드시려면 소셜 로그인을 해주세요.
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={onCreateRoomClick}
          className="w-full p-6 bg-gradient-to-br from-[#C00A4A] to-[#a3083e] hover:from-[#b00943] hover:to-[#910737] rounded-3xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-pink-900/10 active:scale-[0.99] transition-all cursor-pointer text-white relative overflow-hidden group"
        >
          {/* Soft geometric design within the CTA card */}
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="absolute -top-8 -left-8 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>

          <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-center z-10">
            <h3 className="font-extrabold text-lg text-white select-none">
              새로운 약속 방 개설 <span className="italic font-light opacity-90 text-[13px]">(Start New Room)</span>
            </h3>
            <p className="text-[11px] text-pink-100/80 mt-1 select-none font-semibold">
              가입 없이 즉시 방을 만들어 친구들을 초대하세요
            </p>
          </div>
        </button>
      )}

      {/* 🕒 Recent Rooms Section */}
      {recentRooms.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1.5">
            <History className="w-3.5 h-3.5 text-[#C00A4A]" />
            최근 참여한 약속 방
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {recentRooms.map((room) => (
              <button
                key={room.code}
                onClick={() => handleRecentClick(room)}
                className="w-full text-left p-4 glass-card hover:bg-slate-100/50 rounded-2xl flex items-center justify-between group transition-all cursor-pointer border border-slate-200/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg select-none group-hover:scale-105 transition-transform">
                    {room.type?.split(' ')[0] || '📅'}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-700 text-sm group-hover:text-[#C00A4A] transition-colors">
                      {room.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 font-semibold">{room.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 group-hover:text-[#C00A4A] transition-colors">
                  진입
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform text-[#C00A4A]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

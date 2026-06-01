import React, { useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { User, Check } from 'lucide-react';

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

const ProfileTab = () => {
  const { currentUser, onboardUser } = useRoom();

  const [name, setName] = useState(currentUser?.name || '');
  const [selectedEmoji, setSelectedEmoji] = useState(currentUser?.emoji || EMOJIS[0]);
  const [selectedColor, setSelectedColor] = useState(currentUser?.color || COLORS[0].name);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('닉네임을 입력해주세요.');
      return;
    }
    setError('');
    
    onboardUser({
      name: name.trim(),
      emoji: selectedEmoji,
      color: selectedColor,
      isHost: currentUser?.isHost || false
    });
    
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const getHexColor = (colorName) => {
    const found = COLORS.find(c => c.name === colorName);
    return found ? found.hex : '#BAE6FD';
  };

  return (
    <div className="space-y-5 w-full max-w-md mx-auto animate-fade-in-up">
      <div className="glass-card rounded-3xl p-6 border border-slate-200/60 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#C00A4A]/5 rounded-full blur-xl"></div>
        
        <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-slate-800">
          <User className="w-5 h-5 text-[#C00A4A]" />
          내 프로필 편집
        </h2>

        {/* Profile Avatar Preview */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl border-4 border-white shadow-md relative"
            style={{ backgroundColor: getHexColor(selectedColor) }}
          >
            {selectedEmoji}
          </div>
          <span className="text-xs text-slate-400 mt-2 font-bold select-none">아바타 미리보기</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nickname Input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              닉네임 설정
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="자신의 닉네임을 입력하세요"
              maxLength={15}
              className="w-full glass-input rounded-2xl py-3 px-4 font-semibold text-slate-800 focus:border-[#C00A4A] transition-colors"
            />
          </div>

          {/* Emoji Selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              이모지 아바타 선택
            </label>
            <div className="grid grid-cols-8 gap-2 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/40">
              {EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95 cursor-pointer ${
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

          {/* Color Selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              퍼스널 컬러 선택
            </label>
            <div className="flex flex-wrap gap-2.5 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/40 justify-center">
              {COLORS.map((color) => {
                const isSelected = selectedColor === color.name;
                return (
                  <button
                    type="button"
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className="w-8 h-8 rounded-full border-2 transition-all relative flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                    style={{ 
                      backgroundColor: color.hex,
                      borderColor: isSelected ? '#C00A4A' : '#ffffff'
                    }}
                    title={color.name}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-slate-800 font-extrabold stroke-[3px]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-[#C00A4A] text-xs font-bold bg-[#C00A4A]/5 border border-[#C00A4A]/10 py-2.5 px-3 rounded-xl text-center">
              ⚠️ {error}
            </p>
          )}

          {success && (
            <p className="text-emerald-700 text-xs font-bold bg-emerald-50 border border-emerald-100 py-2.5 px-3 rounded-xl text-center animate-pulse">
              ✓ 프로필이 업데이트되었습니다! 다른 탭에 실시간 적용됩니다.
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-[#C00A4A] hover:bg-[#a3083e] text-white text-sm font-bold rounded-2xl cursor-pointer shadow-md transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1"
          >
            프로필 정보 저장하기
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileTab;

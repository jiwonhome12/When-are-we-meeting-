import React, { useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { ArrowLeft, Users, ShieldAlert, Check } from 'lucide-react';

const CATEGORIES = [
  { label: '카페', emoji: '☕' },
  { label: '맛집', emoji: '🍖' },
  { label: '스터디', emoji: '💻' },
  { label: '회식', emoji: '🍻' },
  { label: '문화생활', emoji: '🎪' },
  { label: '여행', emoji: '✈️' },
  { label: '기타', emoji: '❓' }
];

const CreateRoom = ({ onBackClick }) => {
  const { createRoom } = useRoom();
  
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [limit, setLimit] = useState(6);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleIncrement = () => {
    if (limit < 30) setLimit(prev => prev + 1);
  };

  const handleDecrement = () => {
    if (limit > 2) setLimit(prev => prev - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('약속 방 제목을 입력해주세요.');
      return;
    }
    if (isPrivate && !password.trim()) {
      setError('비공개 방을 위한 비밀번호를 입력해주세요.');
      return;
    }

    try {
      const roomCode = createRoom({
        title: title.trim(),
        type: `${selectedCategory.emoji} ${selectedCategory.label}`,
        limit,
        isPrivate,
        password
      });
      // The context will auto-update roomCode, transitioning App to the RoomContainer view.
    } catch (err) {
      setError('방 생성 도중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="w-full px-2 space-y-5 animate-fade-in-up">
      {/* Back button header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBackClick}
          className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-slate-200/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-extrabold text-slate-800 select-none">
          새로운 약속 개설
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 glass-card rounded-3xl p-6 border border-slate-200/60 shadow-lg">
        {/* 1. Room Title */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            약속 제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(''); }}
            placeholder="예) 맛집 투어, 캡스톤 미팅"
            maxLength={20}
            className="w-full glass-input rounded-2xl py-3.5 px-4 font-semibold text-slate-800 placeholder:text-slate-300 transition-colors"
          />
        </div>

        {/* 2. Room Category Chips */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            약속 성격 (카테고리)
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory.label === cat.label;
              return (
                <button
                  type="button"
                  key={cat.label}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#C00A4A] text-white border-[#C00A4A] scale-105 shadow-md shadow-pink-900/10'
                      : 'bg-slate-100/70 text-slate-600 border-slate-200/40 hover:bg-slate-200/30'
                  }`}
                >
                  <span className="text-sm select-none">{cat.emoji}</span>
                  <span>{cat.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 ml-0.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Capacity Limit */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            최대 조율 정원
          </label>
          <div className="flex items-center gap-4 bg-slate-100/50 border border-slate-200/60 rounded-2xl p-2 w-fit">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={limit <= 2}
              className="w-10 h-10 rounded-xl bg-white hover:bg-slate-200 flex items-center justify-center font-bold text-lg text-slate-700 disabled:opacity-40 disabled:pointer-events-none shadow-sm transition-all cursor-pointer"
            >
              -
            </button>
            <span className="text-lg font-extrabold text-slate-800 w-12 text-center select-none">
              {limit}명
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={limit >= 30}
              className="w-10 h-10 rounded-xl bg-white hover:bg-slate-200 flex items-center justify-center font-bold text-lg text-slate-700 disabled:opacity-40 disabled:pointer-events-none shadow-sm transition-all cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* 4. Privacy Toggle */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-700">비공개 모드</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">코드로 조율 참가 시 비밀번호를 요구합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => { setIsPrivate(!isPrivate); setError(''); }}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors cursor-pointer ${
                isPrivate ? 'bg-[#C00A4A]' : 'bg-slate-200'
              }`}
            >
              <div
                className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${
                  isPrivate ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>

          {isPrivate && (
            <div className="space-y-1.5 animate-fade-in-up">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                비밀번호 설정
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="4~12자리 영문/숫자 비밀번호"
                maxLength={12}
                className="w-full glass-input rounded-2xl py-3 px-4 font-semibold text-slate-800 text-sm tracking-wider focus:border-[#C00A4A] transition-colors"
              />
            </div>
          )}
        </div>

        {error && (
          <p className="text-[#C00A4A] text-xs font-bold bg-[#C00A4A]/5 border border-[#C00A4A]/10 py-2.5 px-3 rounded-xl text-center">
            ⚠️ {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full py-4 mt-2 bg-gradient-to-r from-[#C00A4A] to-[#a3083e] hover:from-[#b00943] hover:to-[#910737] text-white rounded-2xl font-extrabold tracking-wide flex items-center justify-center gap-1 shadow-lg shadow-pink-900/10 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
        >
          방 만들기 완료
        </button>
      </form>
    </div>
  );
};

export default CreateRoom;

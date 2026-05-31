import React, { useState, useEffect, useRef } from 'react';
import { useRoom } from '../context/RoomContext';
import { MapPin, Navigation, Search, Plus, Check, Star, RefreshCw } from 'lucide-react';

const MOCK_RECOMMENDATIONS = {
  '🍖': [
    { name: '대박삼겹살 본점', address: '서울 마포구 와우산로 45', rating: 4.8, distance: '340m' },
    { name: '정성초밥 홍대점', address: '서울 마포구 어울마당로 88', rating: 4.6, distance: '520m' },
    { name: '파스타 비스트로', address: '서울 마포구 독막로 12', rating: 4.5, distance: '820m' }
  ],
  '☕': [
    { name: '카페 글래스모피즘', address: '서울 마포구 와우산로 12길 3', rating: 4.9, distance: '120m' },
    { name: '브라운 레시피', address: '서울 마포구 독막로 5길 22', rating: 4.7, distance: '450m' },
    { name: '디저트 팩토리', address: '서울 마포구 어울마당로 33', rating: 4.4, distance: '600m' }
  ],
  '🚗': [
    { name: '홍대 공영주차장', address: '서울 마포구 어울마당로 41', rating: 4.2, distance: '280m' },
    { name: '마포 유료주차타워', address: '서울 마포구 독막로 24', rating: 4.0, distance: '640m' }
  ]
};

const LocationTab = () => {
  const { 
    participants, 
    currentUser, 
    locations, 
    addLocation, 
    toggleLocationVote 
  } = useRoom();

  const [activeCategory, setActiveCategory] = useState('🍖');
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infowindowsRef = useRef([]);

  // Initialize Kakao Maps
  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) {
      console.warn("Kakao Maps API is not loaded yet.");
      return;
    }

    const container = document.getElementById('kakao-map');
    if (!container) return;

    const options = {
      center: new window.kakao.maps.LatLng(37.5563, 126.9273), // Default: Hongdae
      level: 4
    };
    const map = new window.kakao.maps.Map(container, options);
    mapRef.current = map;

    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
    };
  }, []);

  // Update Markers when locations or participants change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.kakao || !window.kakao.maps) return;

    // Remove existing markers & info windows
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    infowindowsRef.current.forEach(iw => iw.close());
    infowindowsRef.current = [];

    const geocoder = new window.kakao.maps.services.Geocoder();
    const bounds = new window.kakao.maps.LatLngBounds();
    let boundsCount = 0;

    if (locations.length === 0) {
      const defaultCenter = new window.kakao.maps.LatLng(37.5563, 126.9273);
      map.setCenter(defaultCenter);
      return;
    }

    locations.forEach((loc, index) => {
      let searchQuery = loc.address;
      if (searchQuery === '사용자 지정 위치 정보' || !searchQuery) {
        searchQuery = '서울 마포구 홍대입구역';
      }

      geocoder.addressSearch(searchQuery, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          let coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          
          // Apply slight random offset if it's the fallback address
          if (loc.address === '사용자 지정 위치 정보' || !loc.address) {
            const latOffset = (Math.random() - 0.5) * 0.003;
            const lngOffset = (Math.random() - 0.5) * 0.003;
            coords = new window.kakao.maps.LatLng(37.5563 + latOffset, 126.9273 + lngOffset);
          }

          const marker = new window.kakao.maps.Marker({
            map: map,
            position: coords,
            title: loc.name
          });

          // Proposer info
          const proposer = participants.find(p => p.id === loc.proposedBy);
          const emoji = proposer ? proposer.emoji : '👤';
          const name = proposer ? proposer.name : '참여자';

          const iwContent = `
            <div style="padding:6px 8px; font-family:sans-serif; font-size:10px; border-radius:10px; background:#fff; border:1px solid #cbd5e1; min-width:120px; box-shadow:0 2px 4px rgba(0,0,0,0.06); text-align:left;">
              <div style="font-weight:bold; color:#0f172a; margin-bottom:2px;">📍 ${loc.name}</div>
              <div style="color:#64748b; display:flex; justify-content:between; width:100%;">
                <span>제안: ${emoji} ${name}</span>
                <span style="color:#C00A4A; font-weight:bold; margin-left:auto;">✓ ${loc.votes.length}명</span>
              </div>
            </div>
          `;

          const infowindow = new window.kakao.maps.InfoWindow({
            content: iwContent
          });

          infowindow.open(map, marker);

          markersRef.current.push(marker);
          infowindowsRef.current.push(infowindow);

          bounds.extend(coords);
          boundsCount++;

          // Adjust bounds if we processed all geocodes
          if (boundsCount === locations.length) {
            map.setBounds(bounds);
          }
        }
      });
    });
  }, [locations, participants]);

  const handleRecommend = (rec) => {
    addLocation(rec.name, rec.address, activeCategory === '🍖' ? '맛집' : activeCategory === '☕' ? '카페' : '주차장');
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!customPlaceName.trim()) return;
    addLocation(customPlaceName.trim(), '사용자 지정 위치 정보', '기타');
    setCustomPlaceName('');
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

  const getParticipantEmoji = (userId) => {
    const p = participants.find(part => part.id === userId);
    return p ? p.emoji : '👤';
  };

  // List of recommendations filtered by search
  const filteredRecs = (MOCK_RECOMMENDATIONS[activeCategory] || []).filter(item => 
    item.name.includes(searchQuery) || item.address.includes(searchQuery)
  );

  return (
    <div className="space-y-4 w-full flex-1 flex flex-col select-none">
      {/* 📍 Kakao Map Container */}
      <div id="kakao-map" className="relative h-48 rounded-2xl overflow-hidden border border-slate-200/60 shadow-md bg-slate-100"></div>

      {/* 🔍 Search & Categories Row */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {/* Quick Category Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 flex-1">
            {['🍖', '☕', '🚗'].map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSearchQuery(''); }}
                className={`flex-1 py-1.5 rounded-xl text-xs flex justify-center items-center cursor-pointer transition-all ${
                  activeCategory === cat 
                    ? 'bg-[#C00A4A] text-white font-bold shadow-md shadow-pink-900/10'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {cat} {cat === '🍖' ? '맛집' : cat === '☕' ? '카페' : '주차'}
              </button>
            ))}
          </div>

          {/* Refresh/Recenter */}
          <button className="px-3 rounded-2xl bg-slate-100 border border-slate-200/60 hover:bg-slate-200/30 text-slate-400 flex items-center justify-center cursor-pointer shadow-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="상점명 또는 주소 검색..."
            className="w-full glass-input rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold placeholder:text-slate-300 focus:border-[#C00A4A] transition-all text-slate-800"
          />
        </div>
      </div>

      {/* 🧭 Local Recommendation Slider */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
          💡 주변 {activeCategory === '🍖' ? '맛집' : activeCategory === '☕' ? '카페' : '주차장'} 추천 (추가 시 투표 자동 적용)
        </h4>
        <div className="flex gap-3 overflow-x-auto py-1.5 scroll-smooth max-w-full">
          {filteredRecs.map((rec, idx) => {
            const alreadyAdded = locations.some(loc => loc.name === rec.name);
            return (
              <div 
                key={idx}
                className="glass-card rounded-2xl p-3.5 border border-slate-200/60 min-w-[200px] flex flex-col justify-between space-y-3 bg-white shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h5 className="font-extrabold text-xs text-slate-800 truncate max-w-[130px]">{rec.name}</h5>
                    <span className="flex items-center gap-0.5 text-[10px] text-yellow-500 font-bold shrink-0">
                      <Star className="w-3 h-3 fill-yellow-500" />
                      {rec.rating}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-1">{rec.address}</p>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9px] font-bold text-[#C00A4A] bg-[#C00A4A]/5 px-2 py-0.5 rounded-lg border border-[#C00A4A]/10">
                    📍 {rec.distance}
                  </span>
                  <button
                    onClick={() => !alreadyAdded && handleRecommend(rec)}
                    disabled={alreadyAdded}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      alreadyAdded 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-[#C00A4A] hover:bg-[#9e083d] text-white shadow-sm shadow-pink-900/10'
                    }`}
                  >
                    {alreadyAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> 추천
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📃 Proposed Locations / Voting List */}
      <div className="space-y-2 flex-1 flex flex-col min-h-[160px] overflow-hidden">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
          👥 참여자 후보 장소 및 투표 ({locations.length}개)
        </h4>

        {locations.length === 0 ? (
          <div className="flex-1 glass-card rounded-2xl border border-slate-200/60 flex flex-col items-center justify-center p-6 text-center select-none bg-white">
            <MapPin className="w-8 h-8 text-slate-300 mb-2 animate-bounce" />
            <p className="text-[11px] text-slate-400 font-bold">아직 후보 장소가 없습니다.</p>
            <p className="text-[9px] text-slate-400 mt-0.5">상단의 추천 장소를 추가하거나 아래에 직접 등록해 보세요.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[220px]">
            {locations.map((loc) => {
              const hasVoted = currentUser ? loc.votes.includes(currentUser.id) : false;
              const proposer = participants.find(p => p.id === loc.proposedBy);
              
              return (
                <div 
                  key={loc.id}
                  className={`p-3.5 glass-card rounded-2xl border flex items-center justify-between transition-all bg-white shadow-sm ${
                    hasVoted ? 'border-[#C00A4A]/30 bg-[#C00A4A]/5' : 'border-slate-200/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-800">{loc.name}</span>
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-lg border border-slate-200/50">
                        {loc.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                      <span className="font-semibold">추천자: {proposer ? `${proposer.emoji} ${proposer.name}` : '참여자'}</span>
                      <span>•</span>
                      <span className="truncate max-w-[150px] font-medium">{loc.address}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Voters stacked */}
                    <div className="flex -space-x-1 max-w-[80px] overflow-hidden">
                      {loc.votes.slice(0, 3).map((voterId) => (
                        <div
                          key={voterId}
                          className="w-4.5 h-4.5 rounded-full border border-white flex items-center justify-center text-[9px] shadow-sm select-none"
                          style={{ backgroundColor: getParticipantColor(voterId) }}
                        >
                          {getParticipantEmoji(voterId)}
                        </div>
                      ))}
                      {loc.votes.length > 3 && (
                        <div className="w-4.5 h-4.5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[8px] font-bold text-slate-500">
                          +{loc.votes.length - 3}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => toggleLocationVote(loc.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        hasVoted 
                          ? 'bg-[#C00A4A] text-white shadow-md'
                          : 'bg-slate-100 text-slate-500 border border-slate-200/50 hover:bg-slate-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {loc.votes.length}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✍️ Custom Place Proposal Form */}
      <form onSubmit={handleAddCustom} className="flex gap-2">
        <input
          type="text"
          value={customPlaceName}
          onChange={(e) => setCustomPlaceName(e.target.value)}
          placeholder="가게명 직접 입력 및 등록..."
          maxLength={15}
          className="flex-1 glass-input rounded-2xl py-3 px-4 text-xs font-semibold placeholder:text-slate-300 focus:border-[#C00A4A] transition-all text-slate-800"
        />
        <button
          type="submit"
          className="px-4.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center shadow active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-0.5 text-[#C00A4A]" /> 등록
        </button>
      </form>
    </div>
  );
};

export default LocationTab;

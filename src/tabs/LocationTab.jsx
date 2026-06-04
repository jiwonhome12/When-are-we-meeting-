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
    toggleLocationVote,
    deleteLocation
  } = useRoom();

  const [activeCategory, setActiveCategory] = useState('🍖');
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedLatLng, setSelectedLatLng] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [tempPlaceName, setTempPlaceName] = useState('');
  const [tempComment, setTempComment] = useState('');
  const [tempCategory, setTempCategory] = useState('기타');
  const [tempPlaceUrl, setTempPlaceUrl] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [recommendationCenter, setRecommendationCenter] = useState(null);
  const [dynamicRecommendations, setDynamicRecommendations] = useState([]);

  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infowindowsRef = useRef([]);
  const clickMarkerRef = useRef(null);
  const coordsCacheRef = useRef({}); // Caches geocoding results to prevent lagging

  // Initialize Kakao Maps with robust polling
  useEffect(() => {
    let mapInstance = null;
    let intervalId = null;

    const initMap = () => {
      if (!window.kakao || !window.kakao.maps) {
        return false;
      }

      window.kakao.maps.load(() => {
        const container = document.getElementById('kakao-map');
        if (!container) return;

        const options = {
          center: new window.kakao.maps.LatLng(37.5563, 126.9273), // Default: Hongdae
          level: 4
        };
        mapInstance = new window.kakao.maps.Map(container, options);
        mapRef.current = mapInstance;
        setRecommendationCenter(options.center);

        const geocoder = new window.kakao.maps.services.Geocoder();

        // 핑 찍기 기능 추가: 지도 클릭 이벤트 리스너 등록
        window.kakao.maps.event.addListener(mapInstance, 'click', (mouseEvent) => {
          const latlng = mouseEvent.latLng;
          setSelectedLatLng(latlng);
          setTempComment(''); // Reset comment on new map click
          setTempCategory('기타');
          setRecommendationCenter(latlng);

          // 클릭한 위치에 임시 마커 표시
          if (clickMarkerRef.current) {
            clickMarkerRef.current.setMap(null);
          }

          // Use default Kakao Red Marker
          const tempMarker = new window.kakao.maps.Marker({
            position: latlng,
            map: mapInstance
          });
          clickMarkerRef.current = tempMarker;

          // 역지오코딩을 사용하여 좌표를 주소로 변환
          geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const roadAddr = result[0].road_address ? result[0].road_address.address_name : '';
              const lotAddr = result[0].address.address_name;
              setSelectedAddress(roadAddr || lotAddr || '주소 정보 없음');
            } else {
              setSelectedAddress('주소 정보 없음');
            }
          });
        });

        setMapLoaded(true);
      });
      return true;
    };

    if (!initMap()) {
      intervalId = setInterval(() => {
        if (initMap()) {
          clearInterval(intervalId);
        }
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      if (clickMarkerRef.current) {
        clickMarkerRef.current.setMap(null);
      }
    };
  }, []);

  // Update Markers when locations, participants or mapLoaded change
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

    const createMarkerAndWindow = (loc, coords) => {
      const marker = new window.kakao.maps.Marker({
        map: map,
        position: coords,
        title: loc.name
      });

      const proposer = participants.find(p => p.id === loc.proposedBy);
      const emoji = proposer ? proposer.emoji : '👤';
      const name = proposer ? proposer.name : '참여자';

      const detailLink = loc.placeUrl 
        ? `<div style="margin-top:4px; border-top:1px dashed #f1f5f9; padding-top:4px; text-align:right;"><a href="${loc.placeUrl}" target="_blank" style="color:#C00A4A; font-weight:bold; text-decoration:none; font-size:8px;">🔗 상세보기</a></div>` 
        : '';

      const iwContent = `
        <div style="padding:6px 8px; font-family:sans-serif; font-size:10px; border-radius:10px; background:#fff; border:1px solid #cbd5e1; min-width:120px; box-shadow:0 2px 4px rgba(0,0,0,0.06); text-align:left;">
          <div style="font-weight:bold; color:#0f172a; margin-bottom:2px;">📍 ${loc.name}</div>
          <div style="color:#64748b; display:flex; justify-content:between; width:100%;">
            <span>제안: ${emoji} ${name}</span>
            <span style="color:#C00A4A; font-weight:bold; margin-left:auto;">✓ ${loc.votes.length}명</span>
          </div>
          ${detailLink}
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

      if (boundsCount === locations.length) {
        map.setBounds(bounds);
      }
    };

    locations.forEach((loc) => {
      // Synchronously load marker if coordinates exist in the object
      if (loc.lat && loc.lng) {
        const coords = new window.kakao.maps.LatLng(loc.lat, loc.lng);
        createMarkerAndWindow(loc, coords);
        return;
      }

      let searchQuery = loc.address;
      if (searchQuery === '사용자 지정 위치 정보' || !searchQuery) {
        searchQuery = '서울 마포구 홍대입구역';
      }

      // Synchronously load marker if cached to prevent lagging
      if (coordsCacheRef.current[searchQuery]) {
        createMarkerAndWindow(loc, coordsCacheRef.current[searchQuery]);
        return;
      }

      geocoder.addressSearch(searchQuery, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          let coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          
          if (loc.address === '사용자 지정 위치 정보' || !loc.address) {
            const latOffset = (Math.random() - 0.5) * 0.003;
            const lngOffset = (Math.random() - 0.5) * 0.003;
            coords = new window.kakao.maps.LatLng(37.5563 + latOffset, 126.9273 + lngOffset);
          }

          coordsCacheRef.current[searchQuery] = coords; // Save to cache
          createMarkerAndWindow(loc, coords);
        }
      });
    });
  }, [locations, participants, mapLoaded]);

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      alert("GPS 기능을 지원하지 않는 브라우저입니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const latlng = new window.kakao.maps.LatLng(lat, lng);
        
        const map = mapRef.current;
        if (map && window.kakao && window.kakao.maps) {
          map.setCenter(latlng);
          map.setLevel(3);
          
          setSelectedLatLng(latlng);
          setTempComment(''); // Reset comment on new geolocation pin
          setTempCategory('기타');
          setRecommendationCenter(latlng);
          if (clickMarkerRef.current) {
            clickMarkerRef.current.setMap(null);
          }
          
          const tempMarker = new window.kakao.maps.Marker({
            position: latlng,
            map: map
          });
          clickMarkerRef.current = tempMarker;
          
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2Address(lng, lat, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const roadAddr = result[0].road_address ? result[0].road_address.address_name : '';
              const lotAddr = result[0].address.address_name;
              setSelectedAddress(roadAddr || lotAddr || '내 현위치');
            } else {
              setSelectedAddress('내 현위치');
            }
          });
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("현위치를 불러올 수 없습니다. 위치 권한 허용 상태를 확인해 주세요.");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleRecenterBounds = () => {
    const map = mapRef.current;
    if (!map || locations.length === 0 || !window.kakao || !window.kakao.maps) return;

    const geocoder = new window.kakao.maps.services.Geocoder();
    const bounds = new window.kakao.maps.LatLngBounds();
    let boundsCount = 0;

    locations.forEach((loc) => {
      let searchQuery = loc.address;
      if (searchQuery === '사용자 지정 위치 정보' || !searchQuery) {
        searchQuery = '서울 마포구 홍대입구역';
      }

      geocoder.addressSearch(searchQuery, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          bounds.extend(coords);
          boundsCount++;

          if (boundsCount === locations.length) {
            map.setBounds(bounds);
          }
        }
      });
    });
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      alert("지도 라이브러리가 아직 완전히 로드되지 않았습니다.");
      return;
    }

    setIsSearching(true);
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(searchQuery.trim(), (data, status) => {
      setIsSearching(false);
      if (status === window.kakao.maps.services.Status.OK) {
        setSearchResults(data); // List of actual Kakao place result objects
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        alert("검색 결과가 존재하지 않습니다.");
        setSearchResults([]);
      } else {
        alert("검색 중 오류가 발생했습니다.");
        setSearchResults([]);
      }
    });
  };

  const handleSelectSearchResult = (place) => {
    const latlng = new window.kakao.maps.LatLng(place.y, place.x);
    const map = mapRef.current;
    if (map) {
      map.setCenter(latlng);
      map.setLevel(3);

      setSelectedLatLng(latlng);
      setSelectedAddress(place.road_address_name || place.address_name || '주소 정보 없음');
      setTempPlaceName(place.place_name);
      setTempComment(''); // Reset comment on new search select
      setTempCategory('검색지');
      setTempPlaceUrl(place.place_url || '');

      if (clickMarkerRef.current) {
        clickMarkerRef.current.setMap(null);
      }

      const tempMarker = new window.kakao.maps.Marker({
        position: latlng,
        map: map
      });
      clickMarkerRef.current = tempMarker;
    }
  };

  const handleRecommend = (rec) => {
    if (!window.kakao || !window.kakao.maps) return;
    const latlng = new window.kakao.maps.LatLng(rec.y, rec.x);
    const map = mapRef.current;
    if (map) {
      map.setCenter(latlng);
      map.setLevel(3);
      
      setSelectedLatLng(latlng);
      setSelectedAddress(rec.address);
      setTempPlaceName(rec.name);
      setTempComment('');
      setTempCategory(activeCategory === '🍖' ? '맛집' : activeCategory === '☕' ? '카페' : '주차장');

      if (clickMarkerRef.current) {
        clickMarkerRef.current.setMap(null);
      }

      const tempMarker = new window.kakao.maps.Marker({
        position: latlng,
        map: map
      });
      clickMarkerRef.current = tempMarker;
    }
  };

  useEffect(() => {
    if (!mapLoaded || !window.kakao || !window.kakao.maps || !window.kakao.maps.services) return;

    const center = recommendationCenter || new window.kakao.maps.LatLng(37.5563, 126.9273);
    const ps = new window.kakao.maps.services.Places();
    const categoryCode = activeCategory === '🍖' ? 'FD6' : activeCategory === '☕' ? 'CE7' : 'PK6';

    ps.categorySearch(categoryCode, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const formatted = data.map(item => {
          const distNum = parseInt(item.distance);
          const distanceStr = distNum >= 1000 ? `${(distNum / 1000).toFixed(1)}km` : `${distNum}m`;
          return {
            name: item.place_name,
            address: item.road_address_name || item.address_name,
            rating: (4.5 + (parseInt(item.id) % 5) * 0.1).toFixed(1),
            distance: distanceStr,
            x: item.x,
            y: item.y,
            placeUrl: item.place_url
          };
        });
        setDynamicRecommendations(formatted);
      } else {
        // Fallback
        const mockList = (MOCK_RECOMMENDATIONS[activeCategory] || []).map(item => ({
          ...item,
          x: '126.9273',
          y: '37.5563'
        }));
        setDynamicRecommendations(mockList);
      }
    }, {
      location: center,
      radius: 1000,
      sort: window.kakao.maps.services.SortBy.DISTANCE
    });
  }, [activeCategory, recommendationCenter, mapLoaded]);

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!customPlaceName.trim()) return;
    addLocation(customPlaceName.trim(), '사용자 지정 위치 정보', '기타');
    setCustomPlaceName('');
  };

  const handleAddClickedLocation = (e) => {
    if (e) e.preventDefault();
    if (!tempPlaceName.trim()) return;
    addLocation(
      tempPlaceName.trim(), 
      selectedAddress || '지도 선택 위치', 
      tempCategory, 
      selectedLatLng ? selectedLatLng.getLat() : null, 
      selectedLatLng ? selectedLatLng.getLng() : null,
      tempComment.trim(), // Save comment
      tempPlaceUrl
    );
    
    // Clear temp state
    setTempPlaceName('');
    setTempComment('');
    setTempPlaceUrl('');
    setSelectedLatLng(null);
    if (clickMarkerRef.current) {
      clickMarkerRef.current.setMap(null);
      clickMarkerRef.current = null;
    }
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
  const filteredRecs = dynamicRecommendations.filter(item => 
    item.name.includes(searchQuery) || item.address.includes(searchQuery)
  );

  return (
    <div className="space-y-4 w-full flex-1 flex flex-col select-none">
      {/* 📍 Kakao Map Container */}
      <div id="kakao-map" className="relative h-48 rounded-2xl overflow-hidden border border-slate-200/60 shadow-md bg-slate-100"></div>

      {/* 💡 Map Pinning Tip Tooltip */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 text-left">
        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
          💡 **팁**: 지도 위를 마우스나 손가락으로 **직접 클릭**하면 원하는 위치에 빨간색 핀(핑)을 꽂아 새로운 후보지로 손쉽게 등록할 수 있습니다.
        </p>
      </div>

      {/* 📍 Pinned location popup */}
      {selectedLatLng && (
        <div className="p-4 bg-[#C00A4A]/5 border border-[#C00A4A]/25 rounded-2xl animate-fade-in space-y-2.5 shadow-sm">
          <div className="flex justify-between items-center select-none">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-[#C00A4A] tracking-wider uppercase">📍 지도 선택 위치</span>
              {tempPlaceUrl && (
                <a
                  href={tempPlaceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9.5px] font-extrabold text-slate-500 hover:text-slate-800 hover:underline"
                >
                  상세보기 🔗
                </a>
              )}
            </div>
            <button 
              type="button" 
              onClick={() => {
                setSelectedLatLng(null);
                if (clickMarkerRef.current) {
                  clickMarkerRef.current.setMap(null);
                  clickMarkerRef.current = null;
                }
              }}
              className="text-[10px] text-slate-400 font-extrabold hover:text-slate-600 cursor-pointer animate-pulse"
            >
              취소
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">{selectedAddress || '주소 정보 불러오는 중...'}</p>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={tempPlaceName}
                onChange={(e) => setTempPlaceName(e.target.value)}
                placeholder="장소의 이름을 입력해주세요 (예: 맛있는 고기집)"
                className="w-full glass-input rounded-xl py-2 px-3 text-xs font-semibold placeholder:text-slate-300 text-slate-800 focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempComment}
                  onChange={(e) => setTempComment(e.target.value)}
                  placeholder="상세 메모/코멘트 입력 (선택, 예: 여기 101호에서!)"
                  className="flex-1 glass-input rounded-xl py-2 px-3 text-xs font-semibold placeholder:text-slate-300 text-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddClickedLocation}
                  className="px-4.5 bg-[#C00A4A] hover:bg-[#a3083e] text-white font-bold rounded-xl text-xs flex items-center justify-center shadow active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  후보 등록
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 Search & Categories Row */}
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {/* Quick Category Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 flex-1 min-w-[150px]">
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

          {/* 현위치 버튼 */}
          <button
            type="button"
            onClick={handleMyLocation}
            className="px-3 py-2 rounded-2xl bg-rose-50 border border-rose-100/60 hover:bg-rose-100 text-[#C00A4A] flex items-center justify-center cursor-pointer shadow-sm gap-1 text-[10px] font-extrabold shrink-0"
            title="현재 내 GPS 위치로 지도 이동 및 핑 고정"
          >
            <Navigation className="w-3.5 h-3.5 fill-[#C00A4A]" />
            현위치
          </button>

          {/* 전체보기 버튼 */}
          <button
            type="button"
            onClick={handleRecenterBounds}
            className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer shadow-sm gap-1 text-[10px] font-extrabold shrink-0"
            title="모든 후보지가 다 보이게 지도 화면 재정렬"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            전체보기
          </button>
        </div>

        {/* Search input wrapped in form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) {
                  setSearchResults([]); // Reset search results if input is cleared
                }
              }}
              placeholder="학교, 상점명, 주소 검색 (예: 서울대학교, 홍대스타벅스)..."
              className="w-full glass-input rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold placeholder:text-slate-300 focus:border-[#C00A4A] transition-all text-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center shadow active:scale-95 transition-all cursor-pointer shrink-0"
          >
            {isSearching ? '검색중..' : '검색'}
          </button>
        </form>
      </div>

      {/* 🧭 Local Recommendation / Search Results Slider */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
          {searchResults.length > 0 
            ? `🔍 키워드 검색 결과 (${searchResults.length}개 - 카드 터치시 해당 위치로 지도 이동)` 
            : `💡 주변 ${activeCategory === '🍖' ? '맛집' : activeCategory === '☕' ? '카페' : '주차장'} 추천 (추가 시 투표 자동 적용)`
          }
        </h4>
        
        <div className="flex gap-3 overflow-x-auto py-1.5 scroll-smooth max-w-full">
          {searchResults.length > 0 ? (
            searchResults.map((rec) => {
              const alreadyAdded = locations.some(loc => loc.name === rec.place_name);
              return (
                <div 
                  key={rec.id}
                  onClick={() => handleSelectSearchResult(rec)}
                  className="glass-card rounded-2xl p-3.5 border border-slate-200/60 min-w-[210px] flex flex-col justify-between space-y-3 bg-white shadow-md cursor-pointer hover:border-[#C00A4A]/50 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h5 className="font-extrabold text-xs text-slate-800 truncate max-w-[140px]" title={rec.place_name}>
                        {rec.place_name}
                      </h5>
                      <span className="text-[7.5px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded font-extrabold shrink-0">
                        {rec.category_group_name || '장소'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-1" title={rec.road_address_name || rec.address_name}>
                      {rec.road_address_name || rec.address_name}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    {rec.place_url ? (
                      <a
                        href={rec.place_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[8.5px] font-extrabold text-[#C00A4A] bg-[#C00A4A]/5 px-2 py-0.5 rounded-lg border border-[#C00A4A]/10 hover:bg-[#C00A4A]/15 transition-colors"
                      >
                        🔗 상세보기
                      </a>
                    ) : (
                      <span className="text-[8.5px] font-extrabold text-[#C00A4A] bg-[#C00A4A]/5 px-2 py-0.5 rounded-lg border border-[#C00A4A]/10">
                        📍 지도보기
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!alreadyAdded) {
                          handleSelectSearchResult(rec);
                        }
                      }}
                      disabled={alreadyAdded}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        alreadyAdded 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-[#C00A4A] hover:bg-[#9e083d] text-white shadow-sm shadow-pink-900/10'
                      }`}
                    >
                      {alreadyAdded ? 'Added' : '추가'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            filteredRecs.map((rec, idx) => {
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
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-[#C00A4A] bg-[#C00A4A]/5 px-1.5 py-0.5 rounded-lg border border-[#C00A4A]/10">
                        📍 {rec.distance}
                      </span>
                      {rec.placeUrl && (
                        <a
                          href={rec.placeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors shrink-0"
                        >
                          상세보기
                        </a>
                      )}
                    </div>
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
            })
          )}
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
                      {loc.placeUrl && (
                        <a
                          href={loc.placeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] font-extrabold text-[#C00A4A] hover:underline"
                        >
                          상세보기 🔗
                        </a>
                      )}
                      {currentUser && loc.proposedBy === currentUser.id && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`'${loc.name}' 후보 장소를 삭제하시겠습니까?`)) {
                              deleteLocation(loc.id);
                            }
                          }}
                          className="text-[9px] font-extrabold text-slate-400 hover:text-rose-600 transition-colors ml-1.5 cursor-pointer"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                      <span className="font-semibold">추천자: {proposer ? `${proposer.emoji} ${proposer.name}` : '참여자'}</span>
                      <span>•</span>
                      <span className="truncate max-w-[150px] font-medium">{loc.address}</span>
                    </div>
                    {loc.comment && (
                      <p className="text-[9.5px] font-bold text-rose-600 bg-rose-50/70 border border-rose-100/50 px-2.5 py-0.5 rounded-lg w-fit mt-1 select-text">
                        💬 {loc.comment}
                      </p>
                    )}
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

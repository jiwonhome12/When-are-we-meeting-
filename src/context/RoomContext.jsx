import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const RoomContext = createContext(null);

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};

// 🎨 Helper for default colors and emojis
const DEFAULT_COLORS = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink'];
const DEFAULT_EMOJIS = ['🐶', '🐱', '🦊', '🦁', '🐸', '🐵', '🐼', '🐨', '🦖', '🦄', '🐳', '🌟', '🍕', '🎉'];

export const RoomProvider = ({ children }) => {
  const [roomCode, setRoomCode] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [calendarVotes, setCalendarVotes] = useState({}); // { "day_time": ["userId1", "userId2"] }
  const [locations, setLocations] = useState([]); // [ { id, name, address, category, proposedBy, votes: [] } ]
  const [chatMessages, setChatMessages] = useState([]);
  const [rouletteResult, setRouletteResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const broadcastChannelRef = useRef(null);

  // Load user session from SessionStorage on mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem('baro_yaksok_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Auto-join room from URL query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('roomCode') || params.get('code');
    if (codeParam) {
      setTimeout(() => {
        try {
          const savedDb = localStorage.getItem(`room_db_${codeParam}`);
          if (savedDb) {
            const db = JSON.parse(savedDb);
            setRoomCode(codeParam);
            setRoomInfo(db.roomInfo);
            setParticipants(db.participants || []);
            setCalendarVotes(db.calendarVotes || {});
            setLocations(db.locations || []);
            setChatMessages(db.chatMessages || []);
            setRouletteResult(db.rouletteResult || null);
            
            // Add to active rooms list
            const userSuffix = currentUser?.id || 'guest';
            const activeRooms = JSON.parse(localStorage.getItem(`baro_yaksok_active_rooms_${userSuffix}`) || '[]');
            if (!activeRooms.some(r => r.code === codeParam)) {
              activeRooms.push({ code: codeParam, title: db.roomInfo.title, type: db.roomInfo.type, createdAt: db.roomInfo.createdAt });
              localStorage.setItem(`baro_yaksok_active_rooms_${userSuffix}`, JSON.stringify(activeRooms));
            }
          } else {
            // No local DB found (guest entering via shared URL link on a different browser/tab)
            // Initialize roomCode and placeholder roomInfo to trigger BroadcastChannel sync!
            setRoomCode(codeParam);
            setRoomInfo({
              code: codeParam,
              title: '약속방 연결 중...',
              type: '☕ 모임',
              step: 'active',
              createdAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.warn("Auto-join from URL failed:", err);
        }
      }, 400);
    }
  }, []);

  // Broadcast state changes when local changes occur
  const broadcastState = (updatedData) => {
    if (broadcastChannelRef.current && roomCode) {
      broadcastChannelRef.current.postMessage({
        type: 'STATE_UPDATE',
        roomCode,
        payload: updatedData,
      });
    }
    // Also backup in LocalStorage for shared access on the same machine
    if (roomCode) {
      localStorage.setItem(`room_db_${roomCode}`, JSON.stringify(updatedData));
    }
  };

  // Set up Broadcast Channel for real-time synchronization between tabs
  useEffect(() => {
    if (!roomCode) {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
      return;
    }

    // Set up channel with the roomCode as channel name
    const channel = new BroadcastChannel(`room_sync_${roomCode}`);
    broadcastChannelRef.current = channel;

    // Load initial state from LocalStorage or mock DB
    const savedDb = localStorage.getItem(`room_db_${roomCode}`);
    if (savedDb) {
      const db = JSON.parse(savedDb);
      setRoomInfo(db.roomInfo || null);
      setParticipants(db.participants || []);
      setCalendarVotes(db.calendarVotes || {});
      setLocations(db.locations || []);
      setChatMessages(db.chatMessages || []);
      setRouletteResult(db.rouletteResult || null);
    }

    // Listener for messages
    channel.onmessage = (event) => {
      const { type, payload, senderId } = event.data;
      if (type === 'STATE_UPDATE') {
        setRoomInfo(payload.roomInfo);
        setParticipants(payload.participants);
        setCalendarVotes(payload.calendarVotes);
        setLocations(payload.locations);
        setChatMessages(payload.chatMessages);
        setRouletteResult(payload.rouletteResult);
      } else if (type === 'PING_REQUEST' && currentUser) {
        // Someone entered, reply with current data to sync up
        channel.postMessage({
          type: 'PING_RESPONSE',
          payload: {
            roomInfo,
            participants,
            calendarVotes,
            locations,
            chatMessages,
            rouletteResult
          }
        });
      } else if (type === 'PING_RESPONSE') {
        setRoomInfo(payload.roomInfo);
        setParticipants(payload.participants);
        setCalendarVotes(payload.calendarVotes);
        setLocations(payload.locations);
        setChatMessages(payload.chatMessages);
        setRouletteResult(payload.rouletteResult);
      } else if (type === 'SPIN_ROULETTE') {
        setIsSpinning(true);
        setTimeout(() => {
          setIsSpinning(false);
          setRouletteResult(payload.result);
        }, 3000);
      } else if (type === 'ROOM_EXPLODED') {
        alert("방장에 의해 방이 폭파되었습니다.");
        setRoomCode(null);
        setRoomInfo(null);
        setParticipants([]);
        setCalendarVotes({});
        setLocations([]);
        setChatMessages([]);
        setRouletteResult(null);
      }
    };

    // Broadcast a PING to find existing peers and fetch state
    channel.postMessage({ type: 'PING_REQUEST' });

    return () => {
      channel.close();
      broadcastChannelRef.current = null;
    };
  }, [roomCode]);

  // Sync state helper to construct state object
  const getFullState = (overrides = {}) => {
    return {
      roomInfo: overrides.roomInfo || roomInfo,
      participants: overrides.participants || participants,
      calendarVotes: overrides.calendarVotes || calendarVotes,
      locations: overrides.locations || locations,
      chatMessages: overrides.chatMessages || chatMessages,
      rouletteResult: overrides.hasOwnProperty('rouletteResult') ? overrides.rouletteResult : rouletteResult
    };
  };

  // 1. 방 생성 (Host)
  const createRoom = (info) => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + 
                 Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + 
                 Math.floor(10 + Math.random() * 90); // e.g. SKY-LARK-22
    const initialInfo = {
      code,
      title: info.title || '새로운 약속',
      type: info.type || '☕ 모임',
      limit: info.limit || 6,
      isPrivate: info.isPrivate || false,
      password: info.password || '',
      step: 'active', // active, wrapup
      finalYaksok: null,
      createdAt: new Date().toISOString()
    };

    setRoomCode(code);
    setRoomInfo(initialInfo);
    setParticipants([]);
    setCalendarVotes({});
    setLocations([]);
    setChatMessages([]);
    setRouletteResult(null);

    // Save mock room directory
    const userSuffix = currentUser?.id || 'guest';
    const activeRooms = JSON.parse(localStorage.getItem(`baro_yaksok_active_rooms_${userSuffix}`) || '[]');
    activeRooms.push({ code, title: initialInfo.title, type: initialInfo.type, createdAt: initialInfo.createdAt });
    localStorage.setItem(`baro_yaksok_active_rooms_${userSuffix}`, JSON.stringify(activeRooms));

    const initialDb = {
      roomInfo: initialInfo,
      participants: [],
      calendarVotes: {},
      locations: [],
      chatMessages: [],
      rouletteResult: null
    };
    localStorage.setItem(`room_db_${code}`, JSON.stringify(initialDb));
    return code;
  };

  // 2. 방 참여 (Guest/Host code entry)
  const joinRoom = (code, enteredPassword = '') => {
    const savedDb = localStorage.getItem(`room_db_${code}`);
    
    if (!savedDb) {
      const placeholderInfo = {
        code,
        title: '약속방 연결 중...',
        type: '☕ 모임',
        step: 'active',
        createdAt: new Date().toISOString()
      };
      
      setRoomCode(code);
      setRoomInfo(placeholderInfo);
      setParticipants([]);
      setCalendarVotes({});
      setLocations([]);
      setChatMessages([]);
      setRouletteResult(null);
      
      return placeholderInfo;
    }

    const db = JSON.parse(savedDb);
    const userSuffix = currentUser?.id || 'guest';
    const activeRooms = JSON.parse(localStorage.getItem(`baro_yaksok_active_rooms_${userSuffix}`) || '[]');
    const alreadyJoined = activeRooms.some(r => r.code === code);

    if (db.roomInfo.isPrivate && !alreadyJoined && db.roomInfo.password !== enteredPassword) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }

    setRoomCode(code);
    setRoomInfo(db.roomInfo);
    setParticipants(db.participants || []);
    setCalendarVotes(db.calendarVotes || {});
    setLocations(db.locations || []);
    setChatMessages(db.chatMessages || []);
    setRouletteResult(db.rouletteResult || null);

    // Add to user's recent rooms
    if (!alreadyJoined) {
      activeRooms.push({ code, title: db.roomInfo.title, type: db.roomInfo.type, createdAt: db.roomInfo.createdAt });
      localStorage.setItem(`baro_yaksok_active_rooms_${userSuffix}`, JSON.stringify(activeRooms));
    }
    return db.roomInfo;
  };

  // 3. 게스트 온보딩 (이름, 이모지, 퍼스널 컬러)
  const onboardUser = (profile) => {
    const userId = profile.id || currentUser?.id || `user_${Math.random().toString(36).substring(2, 9)}`;
    const isHost = participants.length === 0 && !roomInfo?.isPrivate && !profile.isGuest;
    
    const newUser = {
      id: userId,
      name: profile.name || '참여자',
      emoji: profile.emoji || DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)],
      color: profile.color || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      isHost: profile.isHost || (isHost && !profile.isGuest) || false,
      isGuest: profile.isGuest || currentUser?.isGuest || false
    };

    setCurrentUser(newUser);
    sessionStorage.setItem('baro_yaksok_user', JSON.stringify(newUser));

    // Copy rooms from guest list to user-specific list
    const guestRooms = JSON.parse(localStorage.getItem('baro_yaksok_active_rooms_guest') || '[]');
    const userSuffix = userId;
    const activeRooms = JSON.parse(localStorage.getItem(`baro_yaksok_active_rooms_${userSuffix}`) || '[]');
    guestRooms.forEach(gr => {
      if (!activeRooms.some(r => r.code === gr.code)) {
        activeRooms.push(gr);
      }
    });
    if (roomCode && roomInfo && !activeRooms.some(r => r.code === roomCode)) {
      activeRooms.push({ code: roomCode, title: roomInfo.title, type: roomInfo.type, createdAt: roomInfo.createdAt });
    }
    localStorage.setItem(`baro_yaksok_active_rooms_${userSuffix}`, JSON.stringify(activeRooms));

    setParticipants(prev => {
      const exists = prev.some(p => p.id === userId);
      let updated;
      if (exists) {
        updated = prev.map(p => p.id === userId ? newUser : p);
      } else {
        updated = [...prev, newUser];
      }

      // Add system message about guest joining
      const systemMsg = {
        id: `sys_${Date.now()}`,
        senderId: 'system',
        senderName: '시스템',
        text: `🎉 ${newUser.emoji} ${newUser.name}님이 약속 방에 입장하셨습니다!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'system'
      };

      const nextMessages = [...chatMessages, systemMsg];
      setChatMessages(nextMessages);

      const nextState = getFullState({ participants: updated, chatMessages: nextMessages });
      broadcastState(nextState);
      return updated;
    });
  };

  // 4. 일정 조율 투표 (드래그식 시간대들 선택)
  const toggleTimeVotes = (timeKeys, isAdding) => {
    if (!currentUser) return;
    setCalendarVotes(prev => {
      const next = { ...prev };
      timeKeys.forEach(key => {
        const votes = next[key] ? [...next[key]] : [];
        const index = votes.indexOf(currentUser.id);
        
        if (isAdding) {
          if (index === -1) votes.push(currentUser.id);
        } else {
          if (index !== -1) votes.splice(index, 1);
        }
        
        if (votes.length === 0) {
          delete next[key];
        } else {
          next[key] = votes;
        }
      });

      broadcastState(getFullState({ calendarVotes: next }));
      return next;
    });
  };

  // 5. 장소 추가
  const addLocation = (name, address = '', category = '기타', lat = null, lng = null, comment = '', placeUrl = '') => {
    if (!currentUser) return;
    const newLoc = {
      id: `loc_${Date.now()}`,
      name,
      address: address || '추천 장소 상세 주소',
      category,
      proposedBy: currentUser.id,
      votes: [currentUser.id], // Auto vote on proposal
      lat,
      lng,
      comment,
      placeUrl
    };

    setLocations(prev => {
      const next = [...prev, newLoc];
      broadcastState(getFullState({ locations: next }));
      return next;
    });
  };

  // 6-2. 장소 삭제
  const deleteLocation = (locId) => {
    if (!currentUser) return;
    setLocations(prev => {
      const next = prev.filter(loc => loc.id !== locId);
      broadcastState(getFullState({ locations: next }));
      return next;
    });
  };

  // 6. 장소 투표/취소
  const toggleLocationVote = (locId) => {
    if (!currentUser) return;
    setLocations(prev => {
      const next = prev.map(loc => {
        if (loc.id === locId) {
          const votes = [...loc.votes];
          const idx = votes.indexOf(currentUser.id);
          if (idx === -1) {
            votes.push(currentUser.id);
          } else {
            votes.splice(idx, 1);
          }
          return { ...loc, votes };
        }
        return loc;
      });

      broadcastState(getFullState({ locations: next }));
      return next;
    });
  };

  // 7. 실시간 소통 메시지 전송
  const sendChatMessage = (text, type = 'text', linkType = null) => {
    if (!currentUser) return;
    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderColor: currentUser.color,
      senderEmoji: currentUser.emoji,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      linkType
    };

    setChatMessages(prev => {
      const next = [...prev, newMsg];
      broadcastState(getFullState({ chatMessages: next }));
      return next;
    });
  };

  // 8. 결정 도우미 룰렛 구동
  const spinRoulette = (candidates, count = 1, type = 'location') => {
    if (!currentUser || candidates.length === 0) return;
    
    // Choose N unique random winners
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const winners = shuffled.slice(0, Math.min(count, candidates.length));
    const result = { type, winners };

    setIsSpinning(true);
    
    // Broadcast spin animation
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'SPIN_ROULETTE',
        payload: { result }
      });
    }

    setTimeout(() => {
      setIsSpinning(false);
      setRouletteResult(result);
      
      // Add chat result notification listing all winners
      const winnersText = winners.map(w => `[${w.name}]`).join(', ');
      const systemMsg = {
        id: `sys_${Date.now()}`,
        senderId: 'system',
        senderName: '시스템',
        text: `🎲 룰렛 결과 ${type === 'location' ? '최종 장소' : '최종 시간'} 후보로 ${winnersText}이(가) 최종 선정되었습니다! 🎉`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'link',
        linkType: 'roulette'
      };

      setChatMessages(prev => {
        const next = [...prev, systemMsg];
        broadcastState(getFullState({ rouletteResult: result, chatMessages: next }));
        return next;
      });
    }, 3000);
  };

  // 9. 최종 확정 약속 영수증 마감
  const finalizeYaksok = (finalData) => {
    if (!currentUser) return;
    const nextRoomInfo = {
      ...roomInfo,
      step: 'wrapup',
      finalYaksok: {
        date: finalData.date || '미정',
        time: finalData.time || '미정',
        location: finalData.location || '미정',
        placeUrl: finalData.placeUrl || '',
        comment: finalData.comment || '',
        attendees: participants.map(p => `${p.emoji} ${p.name}`),
        confirmedAt: new Date().toLocaleString()
      }
    };

    setRoomInfo(nextRoomInfo);
    
    const systemMsg = {
      id: `sys_${Date.now()}`,
      senderId: 'system',
      senderName: '시스템',
      text: `🏁 약속 조율이 완료되었습니다! 마무리 탭에서 최종 영수증을 확인하세요.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'link',
      linkType: 'wrapup'
    };

    const nextMessages = [...chatMessages, systemMsg];
    setChatMessages(nextMessages);
    broadcastState(getFullState({ roomInfo: nextRoomInfo, chatMessages: nextMessages }));
  };

  // 9.1. 약속 마감 해제 및 다시 편집 시작 (돌아가기 기능)
  const reopenRoom = () => {
    if (!currentUser) return;
    const nextRoomInfo = {
      ...roomInfo,
      step: 'active',
      finalYaksok: null
    };

    setRoomInfo(nextRoomInfo);

    const systemMsg = {
      id: `sys_${Date.now()}`,
      senderId: 'system',
      senderName: '시스템',
      text: `🔄 방장이 약속 마감을 취소하고 조율을 다시 개시했습니다. 이제 시간과 장소를 변경할 수 있습니다.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system'
    };

    const nextMessages = [...chatMessages, systemMsg];
    setChatMessages(nextMessages);
    broadcastState(getFullState({ roomInfo: nextRoomInfo, chatMessages: nextMessages }));
  };

  // 9.5. 조율 시작일 및 종료일 업데이트 (Date Range Picker 연동)
  const updateDateRange = (newStartDate, newEndDate) => {
    if (!currentUser || !roomCode || !roomInfo) return;
    
    let start = newStartDate;
    let end = newEndDate;
    
    // Ensure chronological order
    if (new Date(start) > new Date(end)) {
      end = start;
    }
    
    const nextRoomInfo = {
      ...roomInfo,
      startDate: start,
      endDate: end
    };
    setRoomInfo(nextRoomInfo);

    const systemMsg = {
      id: `sys_${Date.now()}`,
      senderId: 'system',
      senderName: '시스템',
      text: `📅 ${currentUser.name}님이 약속 조율 기간을 [${start} ~ ${end}]로 변경하였습니다.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'system'
    };

    const nextMessages = [...chatMessages, systemMsg];
    setChatMessages(nextMessages);
    broadcastState(getFullState({ roomInfo: nextRoomInfo, chatMessages: nextMessages }));
  };

  const updateStartDate = (newStartDate) => {
    const currentEnd = roomInfo?.endDate || (() => {
      const d = new Date(newStartDate);
      d.setDate(d.getDate() + 9);
      return d.toISOString().split('T')[0];
    })();
    updateDateRange(newStartDate, currentEnd);
  };

  // 10. 방 나가기 및 초기화
  const leaveRoom = () => {
    if (currentUser && roomCode) {
      const updatedParticipants = participants.filter(p => p.id !== currentUser.id);
      
      const systemMsg = {
        id: `sys_${Date.now()}`,
        senderId: 'system',
        senderName: '시스템',
        text: `🚪 ${currentUser.emoji} ${currentUser.name}님이 퇴장하셨습니다.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'system'
      };

      const nextMessages = [...chatMessages, systemMsg];
      
      broadcastState(getFullState({
        participants: updatedParticipants,
        chatMessages: nextMessages
      }));
    }
    
    setRoomCode(null);
    setRoomInfo(null);
    setParticipants([]);
    setCalendarVotes({});
    setLocations([]);
    setChatMessages([]);
    setRouletteResult(null);
  };

  // 10.5. 방 폭파하기
  const explodeRoom = () => {
    if (!currentUser || !roomCode) return;
    
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'ROOM_EXPLODED',
        roomCode
      });
    }

    localStorage.removeItem(`room_db_${roomCode}`);

    const activeRooms = JSON.parse(localStorage.getItem('baro_yaksok_active_rooms') || '[]');
    const nextActive = activeRooms.filter(r => r.code !== roomCode);
    localStorage.setItem('baro_yaksok_active_rooms', JSON.stringify(nextActive));

    setRoomCode(null);
    setRoomInfo(null);
    setParticipants([]);
    setCalendarVotes({});
    setLocations([]);
    setChatMessages([]);
    setRouletteResult(null);
  };

  // 11. 로그아웃 및 사용자 프로필 초기화
  const logoutUser = () => {
    sessionStorage.removeItem('baro_yaksok_user');
    setCurrentUser(null);
  };

  return (
    <RoomContext.Provider value={{
      roomCode,
      roomInfo,
      participants,
      currentUser,
      calendarVotes,
      locations,
      chatMessages,
      rouletteResult,
      isSpinning,
      createRoom,
      joinRoom,
      onboardUser,
      toggleTimeVotes,
      addLocation,
      toggleLocationVote,
      deleteLocation,
      sendChatMessage,
      spinRoulette,
      finalizeYaksok,
      reopenRoom,
      leaveRoom,
      logoutUser,
      explodeRoom,
      updateStartDate,
      updateDateRange
    }}>
      {children}
    </RoomContext.Provider>
  );
};

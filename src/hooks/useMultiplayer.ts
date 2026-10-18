import { useState, useEffect, useRef, useCallback } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
  sanitizeForFirestore,
} from '../firebase';
import {
  GameRoom,
  RoomPlayer,
  ChatMessage,
  MapTheme,
  GameMode,
  GameState,
  GameEventModalState,
  BuildModalState,
  RentModalState,
  AncientEventModalState,
  AiNoticeModalState,
} from '../types';

export interface UseMultiplayerReturn {
  isConnected: boolean;
  currentRoom: GameRoom | null;
  mySessionId: string;
  myPlayer: RoomPlayer | null;
  myPlayerIndex: number;
  isHost: boolean;
  isMyTurn: boolean;
  chatMessages: ChatMessage[];
  onlineError: string | null;
  clearError: () => void;
  createRoom: (
    playerName: string,
    avatarIcon: string,
    mapTheme: MapTheme,
    gameMode: GameMode,
    rounds: number
  ) => void;
  joinRoom: (roomId: string, playerName: string, avatarIcon: string) => void;
  addAi: () => void;
  removePlayer: (playerId: number) => void;
  updateSettings: (settings: {
    mapTheme?: MapTheme;
    gameMode?: GameMode;
    rounds?: number;
  }) => void;
  startGame: (initialGameState: GameState) => void;
  syncGame: (payload: {
    gameState?: GameState;
    eventModal?: GameEventModalState | null;
    buildModal?: BuildModalState | null;
    rentModal?: RentModalState | null;
    ancientEventModal?: AncientEventModalState | null;
    aiNoticeModal?: AiNoticeModalState | null;
    diceState?: { d1: number; d2: number; isRolling: boolean } | null;
    actionType?: string;
    actionDesc?: string;
  }) => void;
  sendChat: (text: string) => void;
  leaveRoom: () => void;
}

const colors = ['#E53935', '#1E88E5', '#2E7D32', '#8E24AA'];
const defaultAvatars = ['👨‍👩‍👧', '👦', '👧', '🤖'];

const getOrCreateSessionId = (): string => {
  try {
    let sId = sessionStorage.getItem('monopoly_tab_session_id');
    if (!sId) {
      sId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('monopoly_tab_session_id', sId);
    }
    return sId;
  } catch {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
};

export const useMultiplayer = (
  onRemoteRoomUpdate?: (room: GameRoom) => void
): UseMultiplayerReturn => {
  const [isConnected, setIsConnected] = useState(true);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const mySessionIdRef = useRef<string>(getOrCreateSessionId());
  const currentRoomRef = useRef<GameRoom | null>(null);
  const currentRoomIdRef = useRef<string | null>(null);
  const currentVersionRef = useRef<number>(0);

  // Delta optimization refs
  const lastSyncedSignatureRef = useRef<string>('');
  const lastSyncedTurnIdxRef = useRef<number>(-1);
  const pendingSyncPayloadRef = useRef<any>(null);
  const syncThrottleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onRemoteRoomUpdateRef = useRef(onRemoteRoomUpdate);
  useEffect(() => {
    onRemoteRoomUpdateRef.current = onRemoteRoomUpdate;
  }, [onRemoteRoomUpdate]);

  const clearError = useCallback(() => setOnlineError(null), []);

  const applyIncomingRoom = useCallback((room: GameRoom, isLocalAction = false) => {
    if (!room) return;
    const incomingVer = room.version || 0;
    if (!isLocalAction && incomingVer > 0 && incomingVer < currentVersionRef.current) {
      return;
    }

    // Normalize player indices so p.id always matches its seat index (0, 1, 2, 3)
    if (Array.isArray(room.players)) {
      room.players = room.players.map((p, idx) => ({
        ...p,
        id: idx,
        color: p.color || colors[idx % colors.length],
      }));
    }

    currentVersionRef.current = Math.max(currentVersionRef.current, incomingVer);
    currentRoomRef.current = room;
    currentRoomIdRef.current = room.id;
    setCurrentRoom(room);

    if (room.chatMessages) {
      setChatMessages(room.chatMessages);
    }

    if (!isLocalAction && room.lastUpdatedBy !== mySessionIdRef.current) {
      onRemoteRoomUpdateRef.current?.(room);
    }
  }, []);

  // Real-time Firestore listener for current room
  useEffect(() => {
    if (!currentRoom?.id) return;
    const roomId = currentRoom.id;
    const roomRef = doc(db, 'rooms', roomId);

    const unsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        setIsConnected(true);
        if (snapshot.exists()) {
          const roomData = snapshot.data() as GameRoom;
          applyIncomingRoom(roomData, false);
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, `rooms/${roomId}`);
        } catch {}
      }
    );

    return () => unsubscribe();
  }, [currentRoom?.id, applyIncomingRoom]);

  const createRoom = useCallback(
    async (
      playerName: string,
      avatarIcon: string,
      mapTheme: MapTheme,
      gameMode: GameMode,
      rounds: number
    ) => {
      setOnlineError(null);
      currentVersionRef.current = 0;
      lastSyncedSignatureRef.current = '';
      lastSyncedTurnIdxRef.current = -1;

      let roomId = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        let candidate = '';
        for (let i = 0; i < 6; i++) {
          candidate += Math.floor(Math.random() * 10).toString();
        }
        try {
          const snap = await getDoc(doc(db, 'rooms', candidate));
          if (!snap.exists()) {
            roomId = candidate;
            break;
          }
        } catch {
          roomId = candidate;
          break;
        }
      }
      if (!roomId) {
        roomId = Math.floor(100000 + Math.random() * 900000).toString();
      }

      const hostPlayer: RoomPlayer = {
        id: 0,
        sessionId: mySessionIdRef.current,
        name: (playerName || '房主').trim(),
        avatarIcon: avatarIcon || '👨‍👩‍👧',
        color: colors[0],
        isAI: false,
        isHost: true,
        isReady: true,
        isOnline: true,
      };

      const newRoom: GameRoom = {
        id: roomId,
        hostSessionId: mySessionIdRef.current,
        status: 'LOBBY',
        mapTheme: mapTheme || 'MODERN',
        gameMode: gameMode || 'ROUNDS',
        rounds: rounds || 15,
        players: [hostPlayer],
        chatMessages: [],
        version: 1,
        lastUpdatedBy: mySessionIdRef.current,
        createdAt: Date.now(),
      };

      try {
        const sanitized = sanitizeForFirestore(newRoom);
        await setDoc(doc(db, 'rooms', roomId), sanitized);
        setIsConnected(true);
        applyIncomingRoom(sanitized, true);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}`);
        } catch {
          setOnlineError('创建房间失败，请检查网络连接后重试');
        }
      }
    },
    [applyIncomingRoom]
  );

  const joinRoom = useCallback(
    async (roomId: string, playerName: string, avatarIcon: string) => {
      setOnlineError(null);
      currentVersionRef.current = 0;
      lastSyncedSignatureRef.current = '';
      lastSyncedTurnIdxRef.current = -1;

      const cleanId = String(roomId || '').replace(/\D/g, '').trim();
      if (!cleanId) {
        setOnlineError('请输入有效的 6 位数字房间码！');
        return;
      }

      try {
        const roomRef = doc(db, 'rooms', cleanId);
        const snap = await getDoc(roomRef);

        if (!snap.exists()) {
          setOnlineError(`房间 "${cleanId}" 不存在，请核对 6 位房间码或直接点击上方公开房间加入！`);
          return;
        }

        const room = snap.data() as GameRoom;
        const sessionId = mySessionIdRef.current;

        // Strictly match only by sessionId so two devices with the same nickname never overwrite each other!
        const existingIndex = room.players.findIndex((p) => p.sessionId === sessionId);

        if (existingIndex !== -1) {
          room.players[existingIndex].isOnline = true;
          if (playerName) room.players[existingIndex].name = playerName.trim();
          if (avatarIcon) room.players[existingIndex].avatarIcon = avatarIcon;
          room.version = (room.version || 1) + 1;
          room.lastUpdatedBy = sessionId;

          const sanitized = sanitizeForFirestore(room);
          await setDoc(roomRef, sanitized);
          setIsConnected(true);
          applyIncomingRoom(sanitized, true);
          if (sanitized.status === 'PLAYING' || sanitized.status === 'FINISHED') {
            onRemoteRoomUpdateRef.current?.(sanitized);
          }
          return;
        }

        if (room.status !== 'LOBBY') {
          setOnlineError('该房间对局已经开始，无法中途加入！');
          return;
        }

        if (room.players.length >= 4) {
          setOnlineError('房间人数已满（最多4人）！');
          return;
        }

        const newId = room.players.length;
        let finalName = (playerName || `玩家 ${newId + 1}`).trim();
        // If another player already has this exact display name, append seat number to keep names distinct
        if (room.players.some((p) => p.name === finalName)) {
          finalName = `${finalName} (${newId + 1}号)`;
        }

        const newPlayer: RoomPlayer = {
          id: newId,
          sessionId,
          name: finalName,
          avatarIcon: avatarIcon || defaultAvatars[newId % defaultAvatars.length],
          color: colors[newId % colors.length],
          isAI: false,
          isHost: false,
          isReady: true,
          isOnline: true,
        };

        room.players.push(newPlayer);
        room.players = room.players.map((p, idx) => ({
          ...p,
          id: idx,
          color: colors[idx % colors.length],
        }));
        room.version = (room.version || 1) + 1;
        room.lastUpdatedBy = sessionId;

        const sanitized = sanitizeForFirestore(room);
        await setDoc(roomRef, sanitized);
        setIsConnected(true);
        applyIncomingRoom(sanitized, true);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `rooms/${cleanId}`);
        } catch {
          setOnlineError('加入房间失败，请重试');
        }
      }
    },
    [applyIncomingRoom]
  );

  const addAi = useCallback(async () => {
    const roomId = currentRoomIdRef.current;
    if (!roomId) return;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;
      const room = snap.data() as GameRoom;
      if (room.status !== 'LOBBY' || room.players.length >= 4) return;

      const newId = room.players.length;
      const aiPlayer: RoomPlayer = {
        id: newId,
        sessionId: `ai-${Date.now()}-${newId}`,
        name: `智能伙伴 ${newId + 1}`,
        avatarIcon: '🤖',
        color: colors[newId % colors.length],
        isAI: true,
        isHost: false,
        isReady: true,
        isOnline: true,
      };

      room.players.push(aiPlayer);
      room.players = room.players.map((p, idx) => ({
        ...p,
        id: idx,
        color: colors[idx % colors.length],
      }));
      room.version = (room.version || 1) + 1;
      room.lastUpdatedBy = mySessionIdRef.current;

      const sanitized = sanitizeForFirestore(room);
      await setDoc(roomRef, sanitized);
      applyIncomingRoom(sanitized, true);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
      } catch {}
    }
  }, [applyIncomingRoom]);

  const removePlayer = useCallback(
    async (playerId: number) => {
      const roomId = currentRoomIdRef.current;
      if (!roomId) return;
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) return;
        const room = snap.data() as GameRoom;
        if (room.status !== 'LOBBY') return;

        room.players = room.players.filter((p) => p.id !== playerId);
        room.players.forEach((p, idx) => {
          p.id = idx;
          p.color = colors[idx % colors.length];
        });
        room.version = (room.version || 1) + 1;
        room.lastUpdatedBy = mySessionIdRef.current;

        const sanitized = sanitizeForFirestore(room);
        await setDoc(roomRef, sanitized);
        applyIncomingRoom(sanitized, true);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
        } catch {}
      }
    },
    [applyIncomingRoom]
  );

  const updateSettings = useCallback(
    async (settings: { mapTheme?: MapTheme; gameMode?: GameMode; rounds?: number }) => {
      const roomId = currentRoomIdRef.current;
      if (!roomId) return;
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) return;
        const room = snap.data() as GameRoom;
        if (room.status !== 'LOBBY') return;

        if (settings.mapTheme) room.mapTheme = settings.mapTheme;
        if (settings.gameMode) room.gameMode = settings.gameMode;
        if (settings.rounds) room.rounds = settings.rounds;
        room.version = (room.version || 1) + 1;
        room.lastUpdatedBy = mySessionIdRef.current;

        const sanitized = sanitizeForFirestore(room);
        await setDoc(roomRef, sanitized);
        applyIncomingRoom(sanitized, true);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
        } catch {}
      }
    },
    [applyIncomingRoom]
  );

  const startGame = useCallback(
    async (initialGameState: GameState) => {
      const roomId = currentRoomIdRef.current;
      if (!roomId) return;
      lastSyncedSignatureRef.current = '';
      lastSyncedTurnIdxRef.current = 0;
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) return;
        const room = snap.data() as GameRoom;

        room.players = room.players.map((p, idx) => ({
          ...p,
          id: idx,
          color: colors[idx % colors.length],
        }));
        room.status = 'PLAYING';
        room.gameState = initialGameState;
        room.eventModal = null;
        room.buildModal = null;
        room.rentModal = null;
        room.ancientEventModal = null;
        room.aiNoticeModal = null;
        room.diceState = null;
        room.version = (room.version || 1) + 1;
        room.lastUpdatedBy = mySessionIdRef.current;

        const sanitized = sanitizeForFirestore(room);
        await setDoc(roomRef, sanitized);
        applyIncomingRoom(sanitized, true);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
        } catch {}
      }
    },
    [applyIncomingRoom]
  );

  const flushSyncToFirestore = useCallback(async (latest: any) => {
    const roomId = currentRoomIdRef.current;
    const baseRoom = currentRoomRef.current;
    if (!latest || !roomId || !baseRoom) return;

    const nextVer = (currentVersionRef.current || 1) + 1;
    currentVersionRef.current = nextVer;

    const updatedRoom: GameRoom = {
      ...baseRoom,
      status: latest.gameState?.isGameOver ? 'FINISHED' : baseRoom.status,
      gameState: latest.gameState || baseRoom.gameState,
      eventModal: latest.eventModal !== undefined ? latest.eventModal : baseRoom.eventModal,
      buildModal: latest.buildModal !== undefined ? latest.buildModal : baseRoom.buildModal,
      rentModal: latest.rentModal !== undefined ? latest.rentModal : baseRoom.rentModal,
      ancientEventModal:
        latest.ancientEventModal !== undefined
          ? latest.ancientEventModal
          : baseRoom.ancientEventModal,
      aiNoticeModal:
        latest.aiNoticeModal !== undefined ? latest.aiNoticeModal : baseRoom.aiNoticeModal,
      diceState: latest.diceState !== undefined ? latest.diceState : baseRoom.diceState,
      version: nextVer,
      lastUpdatedBy: mySessionIdRef.current,
    };

    const sanitized = sanitizeForFirestore(updatedRoom);
    currentRoomRef.current = sanitized;
    setCurrentRoom(sanitized);

    try {
      await setDoc(doc(db, 'rooms', roomId), sanitized);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
      } catch {}
    }
  }, []);

  // Delta-optimized syncGame: flushes immediately on turn change, throttles 80ms otherwise
  const syncGame = useCallback(
    (payload: {
      gameState?: GameState;
      eventModal?: GameEventModalState | null;
      buildModal?: BuildModalState | null;
      rentModal?: RentModalState | null;
      ancientEventModal?: AncientEventModalState | null;
      aiNoticeModal?: AiNoticeModalState | null;
      diceState?: { d1: number; d2: number; isRolling: boolean } | null;
      actionType?: string;
      actionDesc?: string;
    }) => {
      if (!currentRoomIdRef.current) return;

      const sig = JSON.stringify({
        p: payload.gameState?.players.map((pl) => ({
          id: pl.id,
          m: pl.money,
          pos: pl.position,
          props: pl.properties,
          itms: pl.items,
          bank: pl.isBankrupt,
          jail: pl.jailTurns,
        })),
        cur: payload.gameState?.currentPlayerIndex,
        rnd: payload.gameState?.round,
        over: payload.gameState?.isGameOver,
        em: payload.eventModal?.show,
        bm: payload.buildModal?.show,
        rm: payload.rentModal?.show,
        am: payload.ancientEventModal?.show,
        aim: payload.aiNoticeModal?.show,
        anim: payload.gameState?.isMovingPawn,
        dice: payload.diceState,
      });

      if (sig === lastSyncedSignatureRef.current) {
        return;
      }
      lastSyncedSignatureRef.current = sig;
      pendingSyncPayloadRef.current = payload;

      const incomingTurnIdx = payload.gameState?.currentPlayerIndex ?? -1;
      const isTurnChange =
        incomingTurnIdx !== -1 && incomingTurnIdx !== lastSyncedTurnIdxRef.current;
      lastSyncedTurnIdxRef.current = incomingTurnIdx;

      // Flush immediately on turn transitions so the next player gets their turn right away!
      if (isTurnChange) {
        if (syncThrottleTimerRef.current) {
          clearTimeout(syncThrottleTimerRef.current);
          syncThrottleTimerRef.current = null;
        }
        flushSyncToFirestore(payload);
        return;
      }

      if (syncThrottleTimerRef.current) return;

      syncThrottleTimerRef.current = setTimeout(() => {
        syncThrottleTimerRef.current = null;
        const latest = pendingSyncPayloadRef.current;
        if (latest) {
          flushSyncToFirestore(latest);
        }
      }, 80);
    },
    [flushSyncToFirestore]
  );

  const sendChat = useCallback(
    async (text: string) => {
      const roomId = currentRoomIdRef.current;
      if (!roomId || !text.trim()) return;
      const myP = currentRoom?.players.find((p) => p.sessionId === mySessionIdRef.current);
      const chatMsg: ChatMessage = {
        id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderName: myP ? myP.name : '玩家',
        senderColor: myP ? myP.color : '#E53935',
        avatarIcon: myP ? myP.avatarIcon : '👤',
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      try {
        const roomRef = doc(db, 'rooms', roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) return;
        const room = snap.data() as GameRoom;

        if (!room.chatMessages) room.chatMessages = [];
        room.chatMessages.push(chatMsg);
        if (room.chatMessages.length > 40) {
          room.chatMessages = room.chatMessages.slice(-40);
        }
        room.version = (room.version || 1) + 1;
        room.lastUpdatedBy = mySessionIdRef.current;

        const sanitized = sanitizeForFirestore(room);
        await setDoc(roomRef, sanitized);
        applyIncomingRoom(sanitized, true);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
        } catch {}
      }
    },
    [currentRoom, applyIncomingRoom]
  );

  const leaveRoom = useCallback(async () => {
    const rId = currentRoomIdRef.current;
    currentRoomIdRef.current = null;
    currentRoomRef.current = null;
    currentVersionRef.current = 0;
    lastSyncedSignatureRef.current = '';
    lastSyncedTurnIdxRef.current = -1;
    setCurrentRoom(null);
    setChatMessages([]);
    if (rId) {
      try {
        const roomRef = doc(db, 'rooms', rId);
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
          const room = snap.data() as GameRoom;
          const pIdx = room.players.findIndex((p) => p.sessionId === mySessionIdRef.current);
          if (pIdx !== -1) {
            if (room.status === 'LOBBY') {
              room.players.splice(pIdx, 1);
              room.players.forEach((p, idx) => {
                p.id = idx;
                p.color = colors[idx % colors.length];
              });
              const humanPlayers = room.players.filter((p) => !p.isAI);
              if (humanPlayers.length === 0) {
                await deleteDoc(roomRef);
              } else {
                if (!room.players.some((p) => p.isHost)) {
                  humanPlayers[0].isHost = true;
                  room.hostSessionId = humanPlayers[0].sessionId;
                }
                room.version = (room.version || 1) + 1;
                await setDoc(roomRef, sanitizeForFirestore(room));
              }
            } else {
              room.players[pIdx].isOnline = false;
              room.version = (room.version || 1) + 1;
              await setDoc(roomRef, sanitizeForFirestore(room));
            }
          }
        }
      } catch {}
    }
  }, []);

  const myPlayerIndex = currentRoom
    ? currentRoom.players.findIndex((p) => p.sessionId === mySessionIdRef.current)
    : -1;
  const myPlayer =
    currentRoom && myPlayerIndex !== -1 ? currentRoom.players[myPlayerIndex] : null;
  const isHost = Boolean(
    myPlayer && (myPlayer.isHost || currentRoom?.hostSessionId === mySessionIdRef.current)
  );

  const isMyTurn = Boolean(
    currentRoom &&
      currentRoom.status === 'PLAYING' &&
      currentRoom.gameState &&
      myPlayerIndex !== -1 &&
      currentRoom.gameState.currentPlayerIndex === myPlayerIndex
  );

  return {
    isConnected,
    currentRoom,
    mySessionId: mySessionIdRef.current,
    myPlayer,
    myPlayerIndex,
    isHost,
    isMyTurn,
    chatMessages,
    onlineError,
    clearError,
    createRoom,
    joinRoom,
    addAi,
    removePlayer,
    updateSettings,
    startGame,
    syncGame,
    sendChat,
    leaveRoom,
  };
};

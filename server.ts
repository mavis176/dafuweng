import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GameRoom, RoomPlayer } from './src/types';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json({ limit: '5mb' }));

const ROOMS_FILE = '/tmp/monopoly_rooms.json';
const localRoomCache = new Map<string, GameRoom>();

try {
  if (fs.existsSync(ROOMS_FILE)) {
    const parsed = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf-8')) as Record<string, GameRoom>;
    for (const [k, v] of Object.entries(parsed)) {
      localRoomCache.set(k, v);
    }
  }
} catch {}

const persistLocalCache = () => {
  try {
    const obj: Record<string, GameRoom> = {};
    for (const [k, v] of localRoomCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(obj), 'utf-8');
  } catch {}
};

// Firestore async storage helpers with sanitization and local cache sync
const loadRoomFromFirestore = async (roomId: string): Promise<GameRoom | null> => {
  const cleanId = String(roomId || '').trim();
  if (!cleanId) return null;
  try {
    const snap = await getDoc(doc(db, 'rooms', cleanId));
    if (snap.exists()) {
      const room = snap.data() as GameRoom;
      localRoomCache.set(cleanId, room);
      persistLocalCache();
      return room;
    }
  } catch (e) {
    console.warn('Failed to load room from Firestore:', e);
  }
  return localRoomCache.get(cleanId) || null;
};

const saveRoomToFirestore = async (room: GameRoom) => {
  const sanitized = JSON.parse(JSON.stringify(room)) as GameRoom;
  localRoomCache.set(sanitized.id, sanitized);
  persistLocalCache();
  try {
    await setDoc(doc(db, 'rooms', sanitized.id), sanitized);
  } catch (e) {
    console.warn('Failed to save room to Firestore:', e);
  }
};

const deleteRoomFromFirestore = async (roomId: string) => {
  const cleanId = String(roomId || '').trim();
  localRoomCache.delete(cleanId);
  persistLocalCache();
  try {
    await deleteDoc(doc(db, 'rooms', cleanId));
  } catch (e) {
    console.warn('Failed to delete room from Firestore:', e);
  }
};

const loadAllRoomsFromFirestore = async (): Promise<Map<string, GameRoom>> => {
  const map = new Map<string, GameRoom>(localRoomCache);
  try {
    const snap = await getDocs(collection(db, 'rooms'));
    snap.forEach((d) => {
      const room = d.data() as GameRoom;
      if (room && room.id) {
        map.set(room.id, room);
        localRoomCache.set(room.id, room);
      }
    });
    persistLocalCache();
  } catch (e) {
    console.warn('Failed to load all rooms from Firestore:', e);
  }
  return map;
};

// Socket Metadata Map
interface SocketMeta {
  roomId?: string;
  sessionId?: string;
  isAlive: boolean;
}
const socketMeta = new Map<WebSocket, SocketMeta>();

const colors = ['#E53935', '#1E88E5', '#2E7D32', '#8E24AA'];
const defaultAvatars = ['👨‍👩‍👧', '👦', '👧', '🤖'];

// Broadcast message to all WebSocket clients in a room
const broadcastToRoom = (roomId: string, message: any, excludeWs?: WebSocket) => {
  const data = JSON.stringify(message);
  for (const [ws, meta] of socketMeta.entries()) {
    if (meta.roomId === roomId && ws.readyState === WebSocket.OPEN && ws !== excludeWs) {
      ws.send(data);
    }
  }
};

// Generate random 6-digit room code ensuring uniqueness across Firestore
const generateRoomId = async (): Promise<string> => {
  const rooms = await loadAllRoomsFromFirestore();
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return rooms.has(code) ? generateRoomId() : code;
};

// Periodic cleanup of stale rooms (older than 6 hours)
setInterval(async () => {
  const rooms = await loadAllRoomsFromFirestore();
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    if (now - room.createdAt > 6 * 60 * 60 * 1000) {
      await deleteRoomFromFirestore(id);
    }
  }
}, 30 * 60 * 1000);

// Core room action processor used by BOTH HTTP POST and WebSocket
const processRoomAction = async (
  msg: any,
  ws?: WebSocket
): Promise<{ ok: boolean; responseType?: string; room?: GameRoom; error?: string; extra?: any }> => {
  const meta = ws ? socketMeta.get(ws) : undefined;

  switch (msg.type) {
    case 'CREATE_ROOM': {
      const { playerName, avatarIcon, mapTheme, gameMode, rounds, sessionId } = msg;
      const roomId = await generateRoomId();

      const hostPlayer: RoomPlayer = {
        id: 0,
        sessionId,
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
        hostSessionId: sessionId,
        status: 'LOBBY',
        mapTheme: mapTheme || 'MODERN',
        gameMode: gameMode || 'ROUNDS',
        rounds: rounds || 15,
        players: [hostPlayer],
        chatMessages: [],
        version: 1,
        lastUpdatedBy: sessionId,
        createdAt: Date.now(),
      };

      await saveRoomToFirestore(newRoom);

      if (meta) {
        meta.roomId = roomId;
        meta.sessionId = sessionId;
      }

      return { ok: true, responseType: 'ROOM_CREATED', room: newRoom };
    }

    case 'JOIN_ROOM': {
      const { roomId, playerName, avatarIcon, sessionId } = msg;
      const cleanId = String(roomId || '').trim();
      const room = await loadRoomFromFirestore(cleanId);

      if (!room) {
        return { ok: false, error: `房间 "${cleanId}" 不存在，请核对 6 位房间码！` };
      }

      const existingIndex = room.players.findIndex((p) => p.sessionId === sessionId);
      if (existingIndex !== -1) {
        room.players[existingIndex].isOnline = true;
        if (playerName) room.players[existingIndex].name = playerName.trim();
        if (avatarIcon) room.players[existingIndex].avatarIcon = avatarIcon;
        room.version = (room.version || 1) + 1;
        room.lastUpdatedBy = sessionId;
        await saveRoomToFirestore(room);

        if (meta) {
          meta.roomId = cleanId;
          meta.sessionId = sessionId;
        }
        broadcastToRoom(cleanId, { type: 'ROOM_UPDATE', room }, ws);
        return { ok: true, responseType: 'JOIN_SUCCESS', room };
      }

      if (room.status !== 'LOBBY') {
        return { ok: false, error: '该房间对局已经开始，无法中途加入！' };
      }

      if (room.players.length >= 4) {
        return { ok: false, error: '房间人数已满（最多4人）！' };
      }

      const newId = room.players.length;
      let finalName = (playerName || `玩家 ${newId + 1}`).trim();
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
      room.version = (room.version || 1) + 1;
      room.lastUpdatedBy = sessionId;
      await saveRoomToFirestore(room);

      if (meta) {
        meta.roomId = cleanId;
        meta.sessionId = sessionId;
      }

      broadcastToRoom(cleanId, { type: 'ROOM_UPDATE', room }, ws);
      return { ok: true, responseType: 'JOIN_SUCCESS', room };
    }

    case 'BIND_SOCKET': {
      const { roomId, sessionId } = msg;
      const cleanId = String(roomId || '').trim();
      if (meta) {
        meta.roomId = cleanId;
        meta.sessionId = sessionId;
      }
      const room = await loadRoomFromFirestore(cleanId);
      if (room) {
        const p = room.players.find((pl) => pl.sessionId === sessionId);
        if (p && !p.isOnline) {
          p.isOnline = true;
          room.version = (room.version || 1) + 1;
          await saveRoomToFirestore(room);
          broadcastToRoom(cleanId, { type: 'ROOM_UPDATE', room }, ws);
        }
        return { ok: true, responseType: 'ROOM_UPDATE', room };
      }
      return { ok: false, error: '房间不存在' };
    }

    case 'ADD_AI': {
      const { roomId, sessionId } = msg;
      const room = await loadRoomFromFirestore(roomId);
      if (!room || room.status !== 'LOBBY' || room.players.length >= 4) {
        return { ok: false, error: '无法添加AI' };
      }

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
      room.version = (room.version || 1) + 1;
      room.lastUpdatedBy = sessionId;
      await saveRoomToFirestore(room);

      broadcastToRoom(roomId, { type: 'ROOM_UPDATE', room });
      return { ok: true, responseType: 'ROOM_UPDATE', room };
    }

    case 'REMOVE_PLAYER': {
      const { roomId, playerId, sessionId } = msg;
      const room = await loadRoomFromFirestore(roomId);
      if (!room || room.status !== 'LOBBY') {
        return { ok: false, error: '无法移除玩家' };
      }

      room.players = room.players.filter((p) => p.id !== playerId);
      room.players.forEach((p, idx) => {
        p.id = idx;
        p.color = colors[idx % colors.length];
      });
      room.version = (room.version || 1) + 1;
      room.lastUpdatedBy = sessionId;
      await saveRoomToFirestore(room);

      broadcastToRoom(roomId, { type: 'ROOM_UPDATE', room });
      return { ok: true, responseType: 'ROOM_UPDATE', room };
    }

    case 'UPDATE_ROOM_SETTINGS': {
      const { roomId, mapTheme, gameMode, rounds, sessionId } = msg;
      const room = await loadRoomFromFirestore(roomId);
      if (!room || room.status !== 'LOBBY') {
        return { ok: false, error: '无法修改设置' };
      }

      if (mapTheme) room.mapTheme = mapTheme;
      if (gameMode) room.gameMode = gameMode;
      if (rounds) room.rounds = rounds;
      room.version = (room.version || 1) + 1;
      room.lastUpdatedBy = sessionId;
      await saveRoomToFirestore(room);

      broadcastToRoom(roomId, { type: 'ROOM_UPDATE', room });
      return { ok: true, responseType: 'ROOM_UPDATE', room };
    }

    case 'START_GAME': {
      const { roomId, initialGameState, sessionId } = msg;
      const room = await loadRoomFromFirestore(roomId);
      if (!room) return { ok: false, error: '房间不存在' };

      room.status = 'PLAYING';
      room.gameState = initialGameState;
      room.version = (room.version || 1) + 1;
      room.lastUpdatedBy = sessionId;
      await saveRoomToFirestore(room);

      broadcastToRoom(roomId, { type: 'GAME_STARTED', room });
      return { ok: true, responseType: 'GAME_STARTED', room };
    }

    case 'SYNC_GAME': {
      const {
        roomId,
        sessionId,
        gameState,
        eventModal,
        buildModal,
        rentModal,
        ancientEventModal,
        aiNoticeModal,
        diceState,
        actionType,
        actionDesc,
      } = msg;
      const room = await loadRoomFromFirestore(roomId);
      if (!room) return { ok: false, error: '房间不存在' };

      if (gameState) room.gameState = gameState;
      room.eventModal = eventModal !== undefined ? eventModal : room.eventModal;
      room.buildModal = buildModal !== undefined ? buildModal : room.buildModal;
      room.rentModal = rentModal !== undefined ? rentModal : room.rentModal;
      room.ancientEventModal =
        ancientEventModal !== undefined ? ancientEventModal : room.ancientEventModal;
      room.aiNoticeModal = aiNoticeModal !== undefined ? aiNoticeModal : room.aiNoticeModal;
      room.diceState = diceState !== undefined ? diceState : room.diceState;

      if (gameState?.isGameOver) {
        room.status = 'FINISHED';
      }

      room.version = (room.version || 1) + 1;
      room.lastUpdatedBy = sessionId;
      await saveRoomToFirestore(room);

      broadcastToRoom(
        roomId,
        {
          type: 'GAME_SYNCED',
          room,
          actionType,
          actionDesc,
        },
        ws
      );
      return { ok: true, responseType: 'GAME_SYNCED', room };
    }

    case 'SEND_CHAT': {
      const { roomId, chatMessage, sessionId } = msg;
      const room = await loadRoomFromFirestore(roomId);
      if (!room || !chatMessage) return { ok: false, error: '发送失败' };

      if (!room.chatMessages) room.chatMessages = [];
      room.chatMessages.push(chatMessage);
      if (room.chatMessages.length > 40) {
        room.chatMessages = room.chatMessages.slice(-40);
      }
      room.version = (room.version || 1) + 1;
      room.lastUpdatedBy = sessionId;
      await saveRoomToFirestore(room);

      broadcastToRoom(roomId, { type: 'CHAT_BROADCAST', chatMessage, room });
      return { ok: true, responseType: 'CHAT_BROADCAST', room, extra: { chatMessage } };
    }

    case 'LEAVE_ROOM': {
      const { roomId, sessionId } = msg;
      const room = await loadRoomFromFirestore(roomId);
      if (room) {
        const pIdx = room.players.findIndex((p) => p.sessionId === sessionId);
        if (pIdx !== -1) {
          if (room.status === 'LOBBY') {
            room.players.splice(pIdx, 1);
            room.players.forEach((p, idx) => {
              p.id = idx;
              p.color = colors[idx % colors.length];
            });
            const humanPlayers = room.players.filter((p) => !p.isAI);
            if (humanPlayers.length === 0) {
              await deleteRoomFromFirestore(roomId);
            } else {
              if (!room.players.some((p) => p.isHost)) {
                humanPlayers[0].isHost = true;
                room.hostSessionId = humanPlayers[0].sessionId;
              }
              room.version = (room.version || 1) + 1;
              await saveRoomToFirestore(room);
              broadcastToRoom(roomId, { type: 'ROOM_UPDATE', room });
            }
          } else {
            room.players[pIdx].isOnline = false;
            room.version = (room.version || 1) + 1;
            await saveRoomToFirestore(room);
            broadcastToRoom(roomId, { type: 'ROOM_UPDATE', room });
          }
        }
      }
      if (meta) {
        meta.roomId = undefined;
      }
      return { ok: true, responseType: 'LEFT_ROOM' };
    }

    default:
      return { ok: false, error: '未知操作' };
  }
};

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  socketMeta.set(ws, { isAlive: true });

  ws.on('pong', () => {
    const meta = socketMeta.get(ws);
    if (meta) meta.isAlive = true;
  });

  ws.on('message', async (rawData: string) => {
    try {
      const msg = JSON.parse(rawData.toString());
      if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
        return;
      }

      const result = await processRoomAction(msg, ws);
      if (!result.ok) {
        ws.send(JSON.stringify({ type: 'ERROR', message: result.error || '操作失败' }));
      } else if (result.responseType) {
        ws.send(
          JSON.stringify({
            type: result.responseType,
            room: result.room,
            ...(result.extra || {}),
          })
        );
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', async () => {
    const meta = socketMeta.get(ws);
    socketMeta.delete(ws);
    if (meta && meta.roomId && meta.sessionId) {
      let stillConnected = false;
      for (const m of socketMeta.values()) {
        if (m.roomId === meta.roomId && m.sessionId === meta.sessionId) {
          stillConnected = true;
          break;
        }
      }
      if (!stillConnected) {
        const room = await loadRoomFromFirestore(meta.roomId);
        if (room && room.status !== 'LOBBY') {
          const p = room.players.find((player) => player.sessionId === meta.sessionId);
          if (p && p.isOnline) {
            p.isOnline = false;
            room.version = (room.version || 1) + 1;
            await saveRoomToFirestore(room);
            broadcastToRoom(meta.roomId, { type: 'ROOM_UPDATE', room });
          }
        }
      }
    }
  });
});

// Ping interval for connection health
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const meta = socketMeta.get(ws);
    if (!meta) return;
    if (!meta.isAlive) {
      ws.terminate();
      return;
    }
    meta.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(pingInterval);
});

// HTTP REST API endpoints
app.get('/api/health', async (_req, res) => {
  const rooms = await loadAllRoomsFromFirestore();
  res.json({ status: 'ok', roomsCount: rooms.size });
});

app.get('/api/rooms', async (_req, res) => {
  const rooms = await loadAllRoomsFromFirestore();
  const activeRooms: any[] = [];
  for (const [_id, room] of rooms.entries()) {
    if (room.status === 'LOBBY') {
      activeRooms.push({
        id: room.id,
        mapTheme: room.mapTheme,
        gameMode: room.gameMode,
        rounds: room.rounds,
        playersCount: room.players.length,
        hostName: room.players[0]?.name || '房主',
        createdAt: room.createdAt,
      });
    }
  }
  res.json({ ok: true, rooms: activeRooms });
});

app.get('/api/rooms/:id', async (req, res) => {
  const cleanId = String(req.params.id || '').trim();
  const room = await loadRoomFromFirestore(cleanId);
  if (!room) {
    res.status(404).json({ ok: false, error: '房间不存在' });
    return;
  }
  const sinceVersion = Number(req.query.sinceVersion || 0);
  if (sinceVersion > 0 && room.version === sinceVersion) {
    res.json({ ok: true, unchanged: true, version: room.version });
    return;
  }
  res.json({ ok: true, unchanged: false, room });
});

app.post('/api/rooms/action', async (req, res) => {
  const result = await processRoomAction(req.body);
  if (!result.ok) {
    res.status(400).json({ ok: false, error: result.error || '操作失败' });
    return;
  }
  res.json({
    ok: true,
    type: result.responseType,
    room: result.room,
    ...(result.extra || {}),
  });
});

// Setup Vite middleware in dev or static files in production
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Monopoly server running with Firestore Cloud at http://0.0.0.0:${PORT}`);
});

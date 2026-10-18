import React, { useState, useEffect } from 'react';
import { MapTheme, GameMode, GameRoom } from '../types';
import { PlusCircle, LogIn, Sparkles, AlertCircle, Users } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface OnlineRoomSetupProps {
  onCreateRoom: (
    playerName: string,
    avatarIcon: string,
    mapTheme: MapTheme,
    gameMode: GameMode,
    rounds: number
  ) => void;
  onJoinRoom: (roomId: string, playerName: string, avatarIcon: string) => void;
  onBackToLocal: () => void;
  errorMessage: string | null;
  onClearError: () => void;
}

const avatars = ['👨‍👩‍👧', '👦', '👧', '🧙‍♂️', '🏮', '👑', '🐱', '🦊'];

export const OnlineRoomSetup: React.FC<OnlineRoomSetupProps> = ({
  onCreateRoom,
  onJoinRoom,
  onBackToLocal,
  errorMessage,
  onClearError,
}) => {
  // Default to JOIN tab so secondary devices joining friends don't accidentally create new rooms!
  const [activeTab, setActiveTab] = useState<'CREATE' | 'JOIN'>('JOIN');

  // Create form states
  const [createName, setCreateName] = useState('房主大亨');
  const [createAvatar, setCreateAvatar] = useState('👨‍👩‍👧');
  const [mapTheme, setMapTheme] = useState<MapTheme>('ANCIENT');
  const [gameMode, setGameMode] = useState<GameMode>('ROUNDS');
  const [rounds, setRounds] = useState(15);

  // Join form states
  const [joinName, setJoinName] = useState('神秘掌柜');
  const [joinAvatar, setJoinAvatar] = useState('👦');
  const [joinCode, setJoinCode] = useState('');

  // Public rooms list for one-click join
  const [publicRooms, setPublicRooms] = useState<any[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setJoinCode(roomParam.trim());
      setActiveTab('JOIN');
    }
  }, []);

  useEffect(() => {
    const roomsQuery = query(collection(db, 'rooms'), where('status', '==', 'LOBBY'));
    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const room = docSnap.data() as GameRoom;
          if (room && room.id && room.status === 'LOBBY') {
            list.push({
              id: room.id,
              mapTheme: room.mapTheme,
              gameMode: room.gameMode,
              rounds: room.rounds,
              playersCount: room.players?.length || 1,
              hostName: room.players?.[0]?.name || '房主',
              createdAt: room.createdAt || 0,
            });
          }
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        setPublicRooms(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'rooms');
        } catch {}
      }
    );

    return () => unsubscribe();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onClearError();
    onCreateRoom(createName.trim() || '房主大亨', createAvatar, mapTheme, gameMode, rounds);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onClearError();
    onJoinRoom(joinCode.trim(), joinName.trim() || '挑战者', joinAvatar);
  };

  const handleInstantJoin = (rId: string) => {
    onClearError();
    onJoinRoom(rId, joinName.trim() || '挑战者', joinAvatar);
  };

  return (
    <div className="w-full max-w-lg rounded-[32px] p-6 sm:p-8 bg-[#fffdfa] shadow-[0_20px_60px_rgba(110,75,40,0.18)] border-4 border-[#ebdccb] animate-bounce-in relative">
      {/* Top Back and Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#f0e3d3]">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🌐</span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#5c3a1e] tracking-tight">
              多人在线联机大厅
            </h2>
            <p className="text-[11px] text-[#8c6f56]">跨设备多端实时对战 · 随时加入畅玩</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBackToLocal}
          className="text-xs text-[#8c6f56] hover:text-[#5c3a1e] font-bold underline cursor-pointer"
        >
          返回单机模式
        </button>
      </div>

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center justify-between gap-2 animate-shake">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="text-red-400 hover:text-red-700 font-black cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Friendly multi-device guide banner */}
      <div className="mb-4 p-3.5 bg-[#fff9ed] rounded-2xl border-2 border-[#f3d4a2] text-[11px] text-[#7a4820] leading-relaxed space-y-1">
        <strong className="text-[#bf360c] block text-xs">💡 联机对战必读指南：</strong>
        <p className="font-bold text-red-700 bg-red-50 p-1.5 rounded-lg border border-red-200">
          ⚠️ 必须确保两台设备打开的是<strong>完全相同的网址链接</strong>（建议直接复制房主创建房间后生成的「邀请链接」并在另一台设备打开）。
        </p>
        <div>1. 仅由<strong>1人（房主）</strong>点击<strong>「✨ 创建新房间」</strong>。</div>
        <div>2. <strong>其他玩家</strong>通过上方链接直接进入，或在下方输入 6 位房间码加入！</div>
      </div>

      {/* Mode Switch Tabs */}
      <div className="grid grid-cols-2 p-1 bg-[#f4ebe1] rounded-2xl mb-5 border border-[#ebd7c2]">
        <button
          type="button"
          onClick={() => {
            onClearError();
            setActiveTab('JOIN');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'JOIN'
              ? 'bg-[#d35400] text-white shadow-sm'
              : 'text-[#7a4820] hover:bg-[#ede0ce]'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>🔑 加入已有房间 (推荐)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onClearError();
            setActiveTab('CREATE');
          }}
          className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'CREATE'
              ? 'bg-[#d35400] text-white shadow-sm'
              : 'text-[#7a4820] hover:bg-[#ede0ce]'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>✨ 仅房主创建</span>
        </button>
      </div>

      {activeTab === 'CREATE' ? (
        /* CREATE ROOM FORM */
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-black text-[#5c3a1e] block mb-1">
              房主昵称：
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="请输入您的昵称..."
              maxLength={12}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#d5be9b] bg-[#fffcf7] text-xs font-bold text-[#422006] focus:outline-none focus:ring-2 focus:ring-[#d35400]"
            />
          </div>

          <div>
            <label className="text-xs font-black text-[#5c3a1e] block mb-1">
              选择您的棋子头像：
            </label>
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {avatars.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setCreateAvatar(av)}
                  className={`text-2xl p-2 rounded-xl border-2 transition cursor-pointer shrink-0 ${
                    createAvatar === av
                      ? 'border-[#d35400] bg-[#fff5ea] scale-110 shadow-xs'
                      : 'border-[#ebdcc8] bg-white hover:bg-gray-50'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-[#5c3a1e] block mb-1">
              选择对战地图：
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMapTheme('ANCIENT')}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                  mapTheme === 'ANCIENT'
                    ? 'border-[#b45309] bg-[#fff9ed] shadow-xs'
                    : 'border-[#ebdcc8] bg-white opacity-80'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-[#92400e]">
                  <span>🏮</span>
                  <span>古风市井地图</span>
                </div>
                <p className="text-[10px] text-[#8c6f56] mt-1 leading-snug">
                  当铺/商行/驿站/锦囊道具/宣纸古墨风
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMapTheme('MODERN')}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                  mapTheme === 'MODERN'
                    ? 'border-[#3b82f6] bg-[#eff6ff] shadow-xs'
                    : 'border-[#ebdcc8] bg-white opacity-80'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-[#1e40af]">
                  <span>🏰</span>
                  <span>现代乐园地图</span>
                </div>
                <p className="text-[10px] text-[#8c6f56] mt-1 leading-snug">
                  经典大富翁地皮买卖/旅馆升级/轻松欢乐
                </p>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-[#5c3a1e] block mb-1">
              游戏胜负规则：
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setGameMode('ROUNDS')}
                className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer ${
                  gameMode === 'ROUNDS'
                    ? 'border-[#2e7d32] bg-[#f0fdf4] font-black text-[#166534]'
                    : 'border-[#ebdcc8] bg-white text-[#7a4820]'
                }`}
              >
                <div className="text-xs font-bold">🏆 自定义轮数争霸</div>
                <div className="text-[10px] opacity-75 mt-0.5">资产总额最高者问鼎</div>
              </button>
              <button
                type="button"
                onClick={() => setGameMode('BANKRUPTCY')}
                className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer ${
                  gameMode === 'BANKRUPTCY'
                    ? 'border-[#be123c] bg-[#fff1f2] font-black text-[#9f1239]'
                    : 'border-[#ebdcc8] bg-white text-[#7a4820]'
                }`}
              >
                <div className="text-xs font-bold">💥 破产淘汰决胜</div>
                <div className="text-[10px] opacity-75 mt-0.5">战至最后一人幸存</div>
              </button>
            </div>
          </div>

          {gameMode === 'ROUNDS' && (
            <div>
              <label className="text-xs font-black text-[#5c3a1e] block mb-1">
                完赛总轮数：
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 20, 30].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRounds(r)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      rounds === r
                        ? 'bg-[#d35400] text-white border-[#d35400] shadow-2xs'
                        : 'bg-white text-[#7a4820] border-[#d5be9b] hover:bg-[#faf4ee]'
                    }`}
                  >
                    {r} 轮
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#d35400] to-[#e67e22] hover:from-[#c0392b] hover:to-[#d35400] text-white font-black text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>创建线上房间 · 生成邀请码 ➔</span>
          </button>
        </form>
      ) : (
        /* JOIN ROOM FORM */
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="text-xs font-black text-[#5c3a1e] block mb-1">
              你的游戏昵称：
            </label>
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="请输入您的昵称..."
              maxLength={12}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#d5be9b] bg-[#fffcf7] text-xs font-bold text-[#422006] focus:outline-none focus:ring-2 focus:ring-[#d35400]"
            />
          </div>

          <div>
            <label className="text-xs font-black text-[#5c3a1e] block mb-1">
              选择您的棋子头像：
            </label>
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {avatars.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setJoinAvatar(av)}
                  className={`text-2xl p-2 rounded-xl border-2 transition cursor-pointer shrink-0 ${
                    joinAvatar === av
                      ? 'border-[#d35400] bg-[#fff5ea] scale-110 shadow-xs'
                      : 'border-[#ebdcc8] bg-white hover:bg-gray-50'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Active Public Rooms list or empty notice */}
          <div className="bg-[#fcf8f2] p-3 rounded-2xl border border-[#ebdcc8] space-y-2">
            <div className="text-[11px] font-black text-[#8c6f56] flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#d35400]" />
                <span>当前候机公开房间 ({publicRooms.length})</span>
              </span>
              <span className="text-[9px] text-[#a88a6d]">房主建房后会自动显示</span>
            </div>
            {publicRooms.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {publicRooms.map((r) => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-xl border bg-white hover:bg-[#fff9ed] border-[#ebdcc8] flex items-center justify-between gap-2 transition shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-[#bf360c] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {r.id}
                        </span>
                        <span className="font-bold text-xs text-[#5c3a1e]">
                          房主：{r.hostName}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#8c6f56] mt-0.5">
                        {r.mapTheme === 'ANCIENT' ? '🏮 古风市井' : '🏰 现代乐园'} · 👥 {r.playersCount}/4人
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInstantJoin(r.id)}
                      className="px-3 py-1.5 bg-gradient-to-r from-[#2e7d32] to-[#43a047] hover:from-[#1b5e20] hover:to-[#2e7d32] text-white font-black text-xs rounded-xl transition cursor-pointer shadow-2xs active:scale-95 shrink-0"
                    >
                      一键加入 ➔
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-[11px] text-[#8c6f56] bg-white rounded-xl border border-dashed border-[#d5be9b]">
                暂无公开候机房间。请确认房主已点击左侧创建房间，或直接输入 6 位房间码加入！
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-black text-[#5c3a1e] block mb-1">
              或手动输入 6 位房间码：
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="请输入 6 位数字房间码 (如 688921)"
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl border-2 border-[#d5be9b] bg-[#fffcf7] text-center text-xl font-mono font-black tracking-widest text-[#bf360c] placeholder:text-gray-300 placeholder:text-sm placeholder:font-sans focus:outline-none focus:border-[#d35400] focus:ring-2 focus:ring-[#d35400]/20"
            />
          </div>

          <button
            type="submit"
            disabled={joinCode.length < 4}
            className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#2e7d32] to-[#43a047] hover:from-[#1b5e20] hover:to-[#2e7d32] disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 text-white font-black text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>输入房间码加入 ➔</span>
          </button>
        </form>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, MessageSquare, Wifi, WifiOff } from 'lucide-react';
import { soundManager } from './utils/audio';
import { useGameEngine } from './hooks/useGameEngine';
import { useMultiplayer } from './hooks/useMultiplayer';
import { GameBoard } from './components/GameBoard';
import { DiceModal } from './components/DiceModal';
import { AssetDistribution } from './components/AssetDistribution';
import { GameEventModal } from './components/GameEventModal';
import { OnlineRoomSetup } from './components/OnlineRoomSetup';
import { OnlineLobbyModal } from './components/OnlineLobbyModal';
import { GameMode, MapTheme, ItemId, getPropertyValue, GameLog, LogCategory } from './types';
import { GAME_ITEMS, BOARD_DATA, ANCIENT_BOARD_DATA } from './constants';

const categoryConfig: Record<
  LogCategory,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  交易: {
    label: '交易',
    icon: '🛒',
    bg: 'bg-[#ecfdf5]',
    text: 'text-[#065f46]',
    border: 'border-[#a7f3d0]',
  },
  租金: {
    label: '租金',
    icon: '💸',
    bg: 'bg-[#fff1f2]',
    text: 'text-[#be123c]',
    border: 'border-[#fecdd3]',
  },
  事件: {
    label: '事件',
    icon: '✨',
    bg: 'bg-[#faf5ff]',
    text: 'text-[#7e22ce]',
    border: 'border-[#e9d5ff]',
  },
  行动: {
    label: '行动',
    icon: '🎯',
    bg: 'bg-[#f0f9ff]',
    text: 'text-[#0369a1]',
    border: 'border-[#bae6fd]',
  },
  系统: {
    label: '系统',
    icon: '🔔',
    bg: 'bg-[#fffbeb]',
    text: 'text-[#b45309]',
    border: 'border-[#fde68a]',
  },
};

export default function App() {
  const lastRemoteSignatureRef = useRef<string>('');
  const prevTurnPlayerIndexRef = useRef<number>(0);
  const applyRemoteStateRef = useRef<(room: any) => void>(() => {});

  const computeStateSignature = (
    gs: any,
    em: any,
    bm: any,
    rm: any,
    am: any,
    aim: any,
    ds: any
  ) =>
    JSON.stringify({
      p: gs?.players?.map((pl: any) => ({
        id: pl.id,
        m: pl.money,
        pos: pl.position,
        props: pl.properties,
        itms: pl.items,
        bank: pl.isBankrupt,
        jail: pl.jailTurns,
      })),
      cur: gs?.currentPlayerIndex,
      rnd: gs?.round,
      over: gs?.isGameOver,
      em: em?.show,
      bm: bm?.show,
      rm: rm?.show,
      am: am?.show,
      aim: aim?.show,
      dice: ds,
    });

  const multiplayer = useMultiplayer((remoteRoom) => {
    if (remoteRoom.status === 'PLAYING' || remoteRoom.status === 'FINISHED') {
      if (remoteRoom.gameState) {
        prevTurnPlayerIndexRef.current = remoteRoom.gameState.currentPlayerIndex;
        lastRemoteSignatureRef.current = computeStateSignature(
          remoteRoom.gameState,
          remoteRoom.eventModal,
          remoteRoom.buildModal,
          remoteRoom.rentModal,
          remoteRoom.ancientEventModal,
          remoteRoom.aiNoticeModal,
          remoteRoom.diceState || null
        );
      }
      applyRemoteStateRef.current(remoteRoom);
    }
  });

  const isOnlineGame = Boolean(
    multiplayer.currentRoom &&
      (multiplayer.currentRoom.status === 'PLAYING' || multiplayer.currentRoom.status === 'FINISHED')
  );

  const canRunAi = !isOnlineGame || multiplayer.isHost;

  const {
    gameState,
    isSetup,
    setupGame,
    resetToSetup,
    applyRemoteState,
    dismissLocalInfoModal,
    showDiceModal,
    setShowDiceModal,
    executeMove,
    buildModal,
    confirmBuildHouse,
    skipBuildHouse,
    aiNoticeModal,
    confirmAiNotice,
    ancientEventModal,
    confirmAncientEvent,
    gameEventModal,
    closeGameEventModal,
    serveJailTurn,
    rentModal,
    confirmRent,
    shopModal,
    buyItem,
    closeShopModal,
    pawnModal,
    sellItem,
    mortgageProperty,
    redeemProperty,
    setPawnModalTab,
    closePawnModal,
    backpackModal,
    openBackpack,
    closeBackpack,
    requestUseItem,
    confirmUseItemModal,
    cancelUseItem,
    confirmExecuteUseItem,
    roadPassModal,
    executeRoadPass,
    closeRoadPassModal,
    activeChanceCard,
    setActiveChanceCard,
    isTurnProcessing,
  } = useGameEngine(canRunAi);

  useEffect(() => {
    applyRemoteStateRef.current = applyRemoteState;
  }, [applyRemoteState]);

  // Setup form state
  const [playerConfigs, setPlayerConfigs] = useState<
    Array<{ name: string; isAI: boolean }>
  >([
    { name: '妈妈', isAI: false },
    { name: '弟弟', isAI: false },
    { name: '智能伙伴 1', isAI: true },
    { name: '智能伙伴 2', isAI: true },
  ]);
  const [gameMode, setGameMode] = useState<GameMode>('ROUNDS');
  const [selectedMapTheme, setSelectedMapTheme] = useState<MapTheme>('MODERN');
  const [customRounds, setCustomRounds] = useState<number>(15);
  const [logCategoryFilter, setLogCategoryFilter] = useState<'ALL' | LogCategory>('ALL');
  const [bgmPlaying, setBgmPlaying] = useState<boolean>(false);
  const [gamePlatformMode, setGamePlatformMode] = useState<'LOCAL' | 'ONLINE'>('LOCAL');
  const [showInGameChat, setShowInGameChat] = useState<boolean>(false);
  const [inGameChatInput, setInGameChatInput] = useState<string>('');

  // Auto-switch to ONLINE mode if ?room=XXXXXX is in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('room')) {
      setGamePlatformMode('ONLINE');
    }
  }, []);

  // Sync local active player actions AND turn hand-offs to the room
  useEffect(() => {
    if (!isOnlineGame || isSetup) return;
    if (gameState.isMovingPawn) return;

    const currentDiceState =
      showDiceModal.show && showDiceModal.dice
        ? {
            d1: showDiceModal.dice[0],
            d2: showDiceModal.dice[1],
            isRolling: showDiceModal.isRolling,
          }
        : null;

    const currentSig = computeStateSignature(
      gameState,
      gameEventModal,
      buildModal,
      rentModal,
      ancientEventModal,
      aiNoticeModal,
      currentDiceState
    );

    if (currentSig === lastRemoteSignatureRef.current) {
      return;
    }

    const prevTurnIdx = prevTurnPlayerIndexRef.current;
    const currTurnIdx = gameState.currentPlayerIndex;
    prevTurnPlayerIndexRef.current = currTurnIdx;

    const mySeatIdx = multiplayer.myPlayerIndex;
    const currActivePlayer = gameState.players[currTurnIdx];
    const prevActivePlayer = gameState.players[prevTurnIdx];

    const isMyCurrentTurn =
      (mySeatIdx !== -1 && currTurnIdx === mySeatIdx) ||
      Boolean(currActivePlayer?.isAI && multiplayer.isHost);

    const wasMyPreviousTurn =
      (mySeatIdx !== -1 && prevTurnIdx === mySeatIdx) ||
      Boolean(prevActivePlayer?.isAI && multiplayer.isHost);

    if (isMyCurrentTurn || wasMyPreviousTurn) {
      multiplayer.syncGame({
        gameState,
        eventModal: gameEventModal,
        buildModal,
        rentModal,
        ancientEventModal,
        aiNoticeModal,
        diceState: currentDiceState,
      });
    }
  }, [
    isOnlineGame,
    isSetup,
    gameState,
    gameEventModal,
    buildModal,
    rentModal,
    ancientEventModal,
    aiNoticeModal,
    showDiceModal,
    multiplayer.myPlayerIndex,
    multiplayer.isHost,
  ]);

  const handleToggleBgm = () => {
    const isPlaying = soundManager.toggleBgm();
    setBgmPlaying(isPlaying);
  };

  const handleAddPlayer = () => {
    if (playerConfigs.length < 4) {
      setPlayerConfigs([
        ...playerConfigs,
        { name: `玩家 ${playerConfigs.length + 1}`, isAI: false },
      ]);
    }
  };

  const handleRemovePlayer = (index: number) => {
    if (playerConfigs.length > 2) {
      setPlayerConfigs(playerConfigs.filter((_, i) => i !== index));
    }
  };

  const handleUpdatePlayer = (index: number, name: string, isAI: boolean) => {
    const updated = [...playerConfigs];
    updated[index] = { name, isAI };
    setPlayerConfigs(updated);
  };

  const handlePreset = (type: 'solo' | 'family' | 'duo') => {
    if (type === 'solo') {
      setPlayerConfigs([
        { name: '我 (大富翁)', isAI: false },
        { name: '机智电脑', isAI: true },
        { name: '财迷电脑', isAI: true },
      ]);
    } else if (type === 'family') {
      setPlayerConfigs([
        { name: '妈妈', isAI: false },
        { name: '弟弟', isAI: false },
        { name: '爸爸', isAI: false },
        { name: '管家AI', isAI: true },
      ]);
    } else {
      setPlayerConfigs([
        { name: '玩家 1', isAI: false },
        { name: '玩家 2', isAI: false },
      ]);
    }
  };

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isAiTurn = currentPlayer ? currentPlayer.isAI : false;

  const filteredLogs = gameState.logs.filter((log) => {
    if (logCategoryFilter === 'ALL') return true;
    return log.category === logCategoryFilter;
  });

  const canActInTurn = !isOnlineGame || multiplayer.isMyTurn;
  const canControlCurrentTurn =
    !isOnlineGame || multiplayer.isMyTurn || (isAiTurn && multiplayer.isHost);

  // Start Online Game from Lobby (Host action)
  const handleStartOnlineGame = () => {
    const room = multiplayer.currentRoom;
    if (!room) return;

    const sourceBoard = room.mapTheme === 'ANCIENT' ? ANCIENT_BOARD_DATA : BOARD_DATA;
    const cleanBoard = sourceBoard.map((sq) => ({
      ...sq,
      owner: undefined,
      houseLevel: 0,
      isMortgaged: false,
      mortgageAmount: undefined,
    }));

    const initialPlayers = room.players.map((rp, idx) => ({
      id: idx,
      name: rp.name,
      money: 1000,
      position: 0,
      properties: [],
      isAI: rp.isAI,
      color: rp.color,
      avatarIcon: rp.avatarIcon,
      loans: 0,
      isBankrupt: false,
      items: [],
      activeDiscount: false,
      activeImmunity: false,
      jailTurns: 0,
    }));

    const initialGameState = {
      players: initialPlayers,
      currentPlayerIndex: 0,
      board: cleanBoard,
      logs: [
        {
          id: `log-start-${Date.now()}`,
          category: '系统' as LogCategory,
          text: `🌐 【联机房间 ${room.id}】对局正式开启！地图：${
            room.mapTheme === 'ANCIENT' ? '古风市井' : '现代乐园'
          }，第 1 位玩家【${initialPlayers[0]?.name}】请投骰！`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
      isGameOver: false,
      round: 1,
      maxRounds: room.rounds,
      gameMode: room.gameMode,
      mapTheme: room.mapTheme,
      isMovingPawn: false,
    };

    setupGame(
      room.players.map((p) => ({ name: p.name, isAI: p.isAI })),
      room.rounds,
      room.gameMode,
      room.mapTheme
    );
    multiplayer.startGame(initialGameState);
  };

  // Roll dice trigger for human player
  const handleRollDice = () => {
    if (!canActInTurn) return;
    if (showDiceModal.show || isAiTurn || isTurnProcessing || buildModal.show || gameEventModal.show) return;
    if (currentPlayer && currentPlayer.jailTurns && currentPlayer.jailTurns > 0) {
      serveJailTurn();
      return;
    }
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    soundManager.playDiceRoll();
    setShowDiceModal({ show: true, dice: [d1, d2], isRolling: true });
  };

  // Setup Screen
  if (isSetup) {
    return (
      <div className="min-h-screen bg-[#f7f2ea] flex flex-col items-center justify-center p-4 sm:p-6 text-[#4a3525]">
        {/* Platform Mode Top Switcher (单机本地 vs 多人在线联机) */}
        <div className="w-full max-w-lg grid grid-cols-2 p-1.5 bg-[#ede0ce] rounded-2xl mb-4 border-2 border-[#d5be9b] shadow-xs">
          <button
            type="button"
            onClick={() => setGamePlatformMode('LOCAL')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              gamePlatformMode === 'LOCAL'
                ? 'bg-[#d35400] text-white shadow-sm'
                : 'text-[#6e4e37] hover:bg-[#f7efe4]'
            }`}
          >
            <span>🎮</span>
            <span>本地单机 / 面对面</span>
          </button>
          <button
            type="button"
            onClick={() => setGamePlatformMode('ONLINE')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              gamePlatformMode === 'ONLINE'
                ? 'bg-[#d35400] text-white shadow-sm'
                : 'text-[#6e4e37] hover:bg-[#f7efe4]'
            }`}
          >
            <span>🌐</span>
            <span>多人在线联机</span>
            <span className="text-[9px] bg-red-500 text-white font-extrabold px-1.5 py-0.2 rounded-full">
              NEW
            </span>
          </button>
        </div>

        {gamePlatformMode === 'ONLINE' ? (
          multiplayer.currentRoom && multiplayer.currentRoom.status === 'LOBBY' ? (
            <OnlineLobbyModal
              room={multiplayer.currentRoom}
              mySessionId={multiplayer.mySessionId}
              isHost={multiplayer.isHost}
              onAddAi={multiplayer.addAi}
              onRemovePlayer={multiplayer.removePlayer}
              onStartGame={handleStartOnlineGame}
              onLeaveRoom={multiplayer.leaveRoom}
              chatMessages={multiplayer.chatMessages}
              onSendChat={multiplayer.sendChat}
            />
          ) : (
            <OnlineRoomSetup
              onCreateRoom={multiplayer.createRoom}
              onJoinRoom={multiplayer.joinRoom}
              onBackToLocal={() => setGamePlatformMode('LOCAL')}
              errorMessage={multiplayer.onlineError}
              onClearError={multiplayer.clearError}
            />
          )
        ) : (
          <div className="bg-[#fffdfa] w-full max-w-lg rounded-[32px] p-6 sm:p-8 shadow-[0_20px_60px_rgba(110,75,40,0.15)] border-4 border-[#ebdccb]">
            {/* Top Audio Control Bar */}
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={handleToggleBgm}
                className={`px-3 py-1.5 flex items-center gap-1.5 rounded-full text-xs font-bold border transition cursor-pointer select-none ${
                  bgmPlaying
                    ? 'bg-[#e8f5e9] text-[#2e7d32] border-[#a5d6a7] shadow-xs'
                    : 'bg-[#faf6ee] text-[#8c6f56] border-[#ebdccb] hover:bg-[#faede0]'
                }`}
                title={bgmPlaying ? '点击暂停背景音乐' : '点击开启轻柔休闲背景音乐'}
              >
                {bgmPlaying ? (
                  <Volume2 className="w-4 h-4 animate-pulse text-[#2e7d32]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#8c6f56]" />
                )}
                <span>{bgmPlaying ? '🎵 轻柔音乐播放中' : '🎵 音乐静音 (点击开启)'}</span>
              </button>
            </div>

            {/* Header */}
            <div className="text-center mb-6">
              <span className="text-4xl sm:text-5xl mb-2 inline-block">🏰</span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#5c3a1e] tracking-tight">
                家庭大富翁
              </h1>
              <p className="text-xs sm:text-sm text-[#8c6f56] mt-1">
                温馨休闲 · 多人同屏/单人AI · 轻松趣味桌游
              </p>
            </div>

            {/* Quick Presets */}
            <div className="mb-5">
              <label className="text-xs font-bold text-[#8c6f56] block mb-2">快速方案预设：</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handlePreset('solo')}
                className="py-1.5 px-2 bg-[#f4ebe1] hover:bg-[#ebdccb] rounded-xl text-xs font-bold text-[#5c3a1e] transition cursor-pointer"
              >
                单人对战AI
              </button>
              <button
                type="button"
                onClick={() => handlePreset('family')}
                className="py-1.5 px-2 bg-[#f4ebe1] hover:bg-[#ebdccb] rounded-xl text-xs font-bold text-[#5c3a1e] transition cursor-pointer"
              >
                一家四口
              </button>
              <button
                type="button"
                onClick={() => handlePreset('duo')}
                className="py-1.5 px-2 bg-[#f4ebe1] hover:bg-[#ebdccb] rounded-xl text-xs font-bold text-[#5c3a1e] transition cursor-pointer"
              >
                双人切磋
              </button>
            </div>
          </div>

          {/* Players List */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#8c6f56]">
                玩家席位设置 ({playerConfigs.length}/4人)：
              </label>
              <span className="text-[10px] text-[#a68263] font-medium hidden xs:inline sm:inline">
                🎨 专属房屋颜色：红 / 蓝 / 绿 / 紫
              </span>
            </div>
            {playerConfigs.map((cfg, index) => (
              <div
                key={index}
                className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-3 bg-[#fbf8f3] rounded-2xl border border-[#ede1d1]"
              >
                <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    title={`席位 #${index + 1} 专属房屋外观颜色`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white shadow-2xs shrink-0"
                      style={{
                        backgroundColor:
                          ['#E53935', '#1E88E5', '#2E7D32', '#8E24AA'][index % 4],
                      }}
                    />
                    <span className="text-sm font-black text-[#a68263] w-5 text-center">
                      #{index + 1}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={cfg.name}
                    onChange={(e) => handleUpdatePlayer(index, e.target.value, cfg.isAI)}
                    placeholder={`玩家 ${index + 1} 名字`}
                    className="flex-1 bg-white border border-[#dfceb7] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#d35400]"
                  />
                </div>

                <div className="flex items-center gap-2 justify-between w-full sm:w-auto">
                  <label className="flex items-center gap-2 bg-[#f2e7d8] px-3 py-2 rounded-xl cursor-pointer select-none min-h-[38px] flex-1 sm:flex-initial justify-center">
                    <input
                      type="checkbox"
                      checked={cfg.isAI}
                      onChange={(e) => handleUpdatePlayer(index, cfg.name, e.target.checked)}
                      className="accent-[#d35400] w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-[#6d4c41]">AI 控制</span>
                  </label>

                  {playerConfigs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(index)}
                      className="text-red-500 hover:text-red-700 font-bold p-2 rounded-xl text-base transition min-w-[38px] min-h-[38px] flex items-center justify-center bg-red-50 sm:bg-transparent shrink-0"
                      title="移除该玩家"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}

            {playerConfigs.length < 4 && (
              <button
                type="button"
                onClick={handleAddPlayer}
                className="w-full py-3 border-2 border-dashed border-[#d5be9b] hover:border-[#8b5a2b] text-[#8b5a2b] rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>＋</span>
                <span>添加一位玩家 (最多4人)</span>
              </button>
            )}
          </div>

          {/* Game Mode Selection (Mode A: Custom Rounds vs Mode B: Bankruptcy) */}
          <div className="mb-6 space-y-3">
            <label className="text-xs font-bold text-[#8c6f56] block">
              游戏结束模式选择 (二选一)：
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Mode A: Custom Rounds Mode */}
              <button
                type="button"
                onClick={() => setGameMode('ROUNDS')}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                  gameMode === 'ROUNDS'
                    ? 'border-[#d35400] bg-[#fff6ee] shadow-sm'
                    : 'border-[#dfceb7] bg-white hover:bg-[#faf4ec]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">🏆</span>
                  <span className={`text-xs font-black ${gameMode === 'ROUNDS' ? 'text-[#d35400]' : 'text-[#5c3a1e]'}`}>
                    模式A：自定义轮数
                  </span>
                </div>
                <p className="text-[10px] text-[#8c6f56] leading-tight">
                  所有人走完一轮算1回合，达到设定轮数结算总资产。
                </p>
              </button>

              {/* Mode B: Bankruptcy Elimination Mode */}
              <button
                type="button"
                onClick={() => setGameMode('BANKRUPTCY')}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                  gameMode === 'BANKRUPTCY'
                    ? 'border-[#d35400] bg-[#fff6ee] shadow-sm'
                    : 'border-[#dfceb7] bg-white hover:bg-[#faf4ec]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">💥</span>
                  <span className={`text-xs font-black ${gameMode === 'BANKRUPTCY' ? 'text-[#d35400]' : 'text-[#5c3a1e]'}`}>
                    模式B：破产淘汰
                  </span>
                </div>
                <p className="text-[10px] text-[#8c6f56] leading-tight">
                  无回合上限，资金耗尽即淘汰，战至最后一人胜出！
                </p>
              </button>
            </div>

            {/* Mode A Sub-Controls: Custom Rounds Input & Quick Presets */}
            {gameMode === 'ROUNDS' ? (
              <div className="bg-[#fbf8f3] p-3 rounded-2xl border border-[#ede1d1] space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#6d4c41]">设定总游玩轮数：</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={customRounds}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setCustomRounds(Math.max(1, Math.min(99, val)));
                        } else {
                          setCustomRounds(1);
                        }
                      }}
                      className="w-16 bg-white border border-[#dfceb7] rounded-xl px-2 py-1 text-xs sm:text-sm font-black text-center text-[#d35400] focus:outline-none focus:ring-2 focus:ring-[#d35400]"
                    />
                    <span className="text-xs font-bold text-[#8c6f56]">轮</span>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-2 pt-1 border-t border-[#f0e4d2]">
                  <span className="text-[10px] text-[#8c6f56] font-medium">推荐预设：</span>
                  <div className="flex gap-1.5 flex-1">
                    {[5, 10, 15, 20, 30].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCustomRounds(r)}
                        className={`flex-1 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                          customRounds === r
                            ? 'bg-[#d35400] text-white shadow-2xs'
                            : 'bg-white border border-[#dfceb7] text-[#6d4c41] hover:bg-[#f5ecdf]'
                        }`}
                      >
                        {r}轮
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#fbf8f3] p-3 rounded-2xl border border-[#ede1d1] text-xs text-[#8c6f56] leading-relaxed animate-fade-in flex items-start gap-2">
                <span className="text-base shrink-0">⚔️</span>
                <div>
                  <span className="font-bold text-[#6d4c41] block mb-0.5">破产淘汰规则：</span>
                  <span>玩家因交税、租金或罚款资金不足即破产淘汰出局，退回其名下全部地产供其他玩家争夺。持续游玩直至最后1名玩家独占鳌头！</span>
                </div>
              </div>
            )}
          </div>

          {/* Map Theme Selection (Dropdown requirement 5) */}
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#8c6f56] block">
                地图主题选择：
              </label>
              <span className="text-[10px] text-[#d35400] font-black">
                {selectedMapTheme === 'ANCIENT'
                  ? '🏮 古风特色：商行 · 当铺 · 锦囊妙物'
                  : '🏰 经典原版地图'}
              </span>
            </div>

            {/* Dropdown Selector */}
            <div className="relative">
              <select
                value={selectedMapTheme}
                onChange={(e) => setSelectedMapTheme(e.target.value as MapTheme)}
                className="w-full bg-[#fbf8f3] hover:bg-[#f5ecdf] border-2 border-[#dfceb7] focus:border-[#d35400] rounded-2xl px-3.5 py-3 text-xs sm:text-sm font-extrabold text-[#5c3a1e] focus:outline-none focus:ring-2 focus:ring-[#d35400] cursor-pointer appearance-none shadow-2xs transition-colors pr-10"
              >
                <option value="MODERN">🏰 现代乐园地图（原版经典）</option>
                <option value="ANCIENT">🏮 古风市井地图（新增 · 商行/当铺/锦囊道具）</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#8c6f56] text-xs">
                ▼
              </div>
            </div>

            {/* Map Theme Feature Description */}
            <div className="bg-[#fcf8f2] p-2.5 rounded-xl border border-[#ede1d1] text-[11px] text-[#7d5f3f] flex items-center gap-2">
              <span className="text-base shrink-0">
                {selectedMapTheme === 'ANCIENT' ? '🏮' : '🏰'}
              </span>
              <span className="leading-snug">
                {selectedMapTheme === 'ANCIENT'
                  ? '长安市井盛景：当铺、商行、十里驿站、汇通钱庄、悦来客栈、良田书院。走到【商行】可采买【路引/免罪符/契书/转运珠】，停留在【当铺】可典当换金！'
                  : '现代家庭乐园：小超市、小公园、甜品店、小农场、书屋，经典家庭桌游体验！'}
              </span>
            </div>
          </div>

          {/* Start Game Button */}
          <button
            type="button"
            onClick={() => setupGame(playerConfigs, customRounds, gameMode, selectedMapTheme)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#d35400] to-[#e67e22] text-white font-extrabold text-base shadow-[0_8px_20px_rgba(211,84,0,0.35)] hover:from-[#c0392b] hover:to-[#d35400] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
          >
            进入游戏 · 开始大富翁之旅 ➔
          </button>
          </div>
        )}
      </div>
    );
  }

  // Active Play Screen
  return (
    <div className="min-h-screen bg-[#f6f0e4] text-[#423122] flex flex-col items-center p-3 sm:p-6 select-none">
      {/* Top Bar */}
      <header className="w-full max-w-6xl flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-2xl sm:text-3xl">🏠</span>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-[#5c3a1e] tracking-tight">
              家庭大富翁
            </h1>
            <span className="text-[10px] sm:text-xs text-[#8c6f56]">
              休闲桌游 · 目标资产第一
            </span>
          </div>
        </div>

        {/* Current Turn Notification Pill */}
        {currentPlayer && (
          <div className="hidden sm:flex items-center gap-2 bg-[#fffbf2] border-2 border-[#d5be9b] px-4 py-1.5 rounded-full shadow-sm">
            <span
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: currentPlayer.color }}
            />
            <span className="text-xs font-black text-[#5c3a1e]">
              当前回合：{currentPlayer.name} {isAiTurn && '(AI思考中)'}
            </span>
            {isOnlineGame && (
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ml-1 ${
                  multiplayer.isMyTurn
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {multiplayer.isMyTurn ? '🟢 轮到你行动' : `⏳ 等待【${currentPlayer.name}】行动`}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap justify-end">
          {/* Online Room Status & Chat Button */}
          {isOnlineGame && multiplayer.currentRoom && (
            <>
              <div className="px-2.5 py-1 bg-[#eff6ff] border border-[#bfdbfe] rounded-full text-[11px] font-black text-[#1d4ed8] flex items-center gap-1 shadow-2xs">
                {multiplayer.isConnected ? (
                  <Wifi className="w-3 h-3 text-emerald-600" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-500" />
                )}
                <span>房间:{multiplayer.currentRoom.id}</span>
                {multiplayer.myPlayer && (
                  <span className="hidden md:inline text-[#3b82f6]">
                    ({multiplayer.myPlayer.name})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowInGameChat((v) => !v)}
                className="px-2.5 py-1 bg-[#fdf4ff] hover:bg-[#fae8ff] border border-[#f0abfc] text-[#86198f] rounded-full text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer relative"
                title="打开联机房间聊天"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">聊天</span>
                {multiplayer.chatMessages.length > 0 && (
                  <span className="bg-[#d946ef] text-white text-[9px] font-black px-1.5 rounded-full">
                    {multiplayer.chatMessages.length}
                  </span>
                )}
              </button>
            </>
          )}

          {/* BGM Toggle Button */}
          <button
            type="button"
            onClick={handleToggleBgm}
            className={`px-2.5 sm:px-3 py-1 flex items-center gap-1.5 rounded-full text-xs font-bold border transition cursor-pointer select-none ${
              bgmPlaying
                ? 'bg-[#e8f5e9] text-[#2e7d32] border-[#a5d6a7] shadow-2xs hover:bg-[#c8e6c9]'
                : 'bg-white text-[#8c6f56] border-[#d5be9b] shadow-2xs hover:bg-[#faede0]'
            }`}
            title={bgmPlaying ? '点击暂停背景音乐' : '点击开启轻柔休闲背景音乐'}
          >
            {bgmPlaying ? (
              <Volume2 className="w-3.5 h-3.5 animate-pulse text-[#2e7d32]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[#8c6f56]" />
            )}
            <span className="hidden xs:inline sm:inline">
              {bgmPlaying ? '音乐中' : '音乐静音'}
            </span>
          </button>

          {/* Quick Backpack Button */}
          <button
            type="button"
            onClick={() => {
              if (canActInTurn) openBackpack();
            }}
            disabled={!canActInTurn}
            className={`px-2.5 sm:px-3 py-1 bg-[#fff8e7] border border-[#d5be9b] text-xs font-bold text-[#7a4820] rounded-full shadow-2xs transition whitespace-nowrap flex items-center gap-1 ${
              canActInTurn
                ? 'hover:bg-[#faeed0] hover:shadow-xs cursor-pointer'
                : 'opacity-50 cursor-not-allowed'
            }`}
            title={canActInTurn ? '查看随身锦囊道具' : '等待轮到你的回合再使用锦囊'}
          >
            <span>🎒</span>
            <span className="hidden xs:inline sm:inline">
              {gameState.mapTheme === 'ANCIENT' ? '锦囊' : '背包'}
            </span>
            <span>({currentPlayer?.items?.length || 0})</span>
          </button>

          <div className="bg-[#ede0ce] px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold text-[#6d4c41] shadow-2xs whitespace-nowrap">
            {gameState.mapTheme === 'ANCIENT' ? '🏮 古风市井' : '🏰 现代乐园'} ·{' '}
            {gameState.gameMode === 'BANKRUPTCY'
              ? `第 ${gameState.round} 轮 · 淘汰决胜`
              : `第 ${gameState.round} / ${gameState.maxRounds} 轮`}
          </div>
          <button
            onClick={() => {
              if (isOnlineGame) multiplayer.leaveRoom();
              resetToSetup();
            }}
            className="px-2.5 sm:px-3 py-1 bg-white hover:bg-[#faede0] border border-[#d5be9b] text-xs font-bold text-[#8b5a2b] rounded-full shadow-2xs hover:shadow-xs transition cursor-pointer whitespace-nowrap"
          >
            {isOnlineGame ? '退出房间' : '重新开局'}
          </button>
        </div>
      </header>

      {/* Main Board & Side Panels Grid */}
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6">
        {/* Left: 24-Square Tabletop Board */}
        <div className="w-full flex justify-center">
          <GameBoard
            board={gameState.board}
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
            onRollDice={handleRollDice}
            canRoll={
              canActInTurn &&
              !showDiceModal.show &&
              !isTurnProcessing &&
              !buildModal.show &&
              !aiNoticeModal.show &&
              !rentModal.show &&
              !shopModal.show &&
              !pawnModal.show &&
              !backpackModal.show &&
              !confirmUseItemModal.show &&
              !ancientEventModal.show &&
              !gameEventModal.show &&
              !roadPassModal.show &&
              !gameState.isMovingPawn
            }
            isAiTurn={isAiTurn}
            round={gameState.round}
            maxRounds={gameState.maxRounds}
            gameMode={gameState.gameMode}
            mapTheme={gameState.mapTheme}
            isMovingPawn={gameState.isMovingPawn}
            onOpenBackpack={() => openBackpack()}
          />
        </div>

        {/* Right Sidebar: Asset Distribution & Retro Memo Game Log */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-4">
          {/* Asset Distribution Panel */}
          <AssetDistribution
            players={gameState.players}
            board={gameState.board}
            currentPlayerIndex={gameState.currentPlayerIndex}
          />

          {/* Retro Notepad Game Log */}
          <div className="bg-[#fffdf5] rounded-3xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.05)] border-2 border-[#eddcc7] relative overflow-hidden flex flex-col">
            {/* Top Notepad Bar */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-dashed border-[#e6d3bd]">
              <div className="flex items-center gap-1.5 font-bold text-xs text-[#6e4e37]">
                <span>📜</span>
                <span>家庭备忘录 · 事件日志</span>
              </div>
              <span className="text-[10px] text-[#a88a6d]">严格轮流</span>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 scrollbar-none text-[10px]">
              {(['ALL', '交易', '租金', '事件', '行动'] as const).map((cat) => {
                const isSelected = logCategoryFilter === cat;
                const count =
                  cat === 'ALL'
                    ? gameState.logs.length
                    : gameState.logs.filter((l) => l.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setLogCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#7a4820] text-white shadow-2xs'
                        : 'bg-[#f4ebe1] text-[#7a4820] hover:bg-[#ebd9c8]'
                    }`}
                  >
                    <span>{cat === 'ALL' ? '全部' : `[${cat}]`}</span>
                    <span
                      className={`text-[9px] px-1 rounded-full ${
                        isSelected ? 'bg-white/20' : 'bg-black/5'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Log Messages List */}
            <div className="h-44 sm:h-52 overflow-y-auto space-y-2 pr-1 text-xs">
              {filteredLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#a88a6d] text-xs py-8">
                  暂无此类事件日志记录
                </div>
              ) : (
                filteredLogs.map((log: GameLog, idx: number) => {
                  const conf = categoryConfig[log.category] || categoryConfig['系统'];
                  return (
                    <div
                      key={log.id || idx}
                      className={`p-2 rounded-xl text-[11px] sm:text-xs leading-relaxed transition flex flex-col gap-1 border ${
                        idx === 0
                          ? 'bg-[#faefe3] text-[#7a4820] font-medium border-l-4 border-l-[#d35400] border-t-[#ebd7c2] border-r-[#ebd7c2] border-b-[#ebd7c2] shadow-2xs'
                          : 'bg-[#fffcf7] text-[#6d5138] border-[#f0e3d3] hover:bg-[#fbf7ee]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-2xs shrink-0 ${conf.bg} ${conf.text} ${conf.border}`}
                        >
                          <span className="text-[11px] leading-none">{conf.icon}</span>
                          <span>[{conf.label}]</span>
                        </span>
                        {log.timestamp && (
                          <span className="text-[10px] text-[#a88a6d] font-mono">
                            {log.timestamp}
                          </span>
                        )}
                      </div>
                      <div className="pl-0.5 leading-snug">
                        {log.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dice Roll Popup */}
      {showDiceModal.show && showDiceModal.dice && (
        <DiceModal
          d1={showDiceModal.dice[0]}
          d2={showDiceModal.dice[1]}
          isAI={isAiTurn || (isOnlineGame && !canActInTurn)}
          playerName={currentPlayer?.name}
          onClose={() => {
            if (!canActInTurn) {
              dismissLocalInfoModal('dice');
              return;
            }
            if (!isAiTurn) {
              const sum = showDiceModal.dice![0] + showDiceModal.dice![1];
              setShowDiceModal({ show: false, dice: null, isRolling: false });
              executeMove(sum);
            }
          }}
        />
      )}

      {/* Automatic Build House Confirmation Modal (Triggered on Landing on ANY Property Tile) */}
      {buildModal.show && buildModal.property && currentPlayer && canActInTurn && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#fffef8] rounded-[32px] max-w-sm w-full p-6 sm:p-7 text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-[#e3d2ba] animate-bounce-in relative">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#edf7ed] border border-[#a5d6a7] px-3.5 py-1 rounded-full text-xs font-bold text-[#2e7d32] mb-3">
              <span>🏡</span>
              <span>停留在自家产业</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#5c3a1e] mb-1">
              是否在此地块建造房屋？
            </h3>
            <p className="text-xs text-[#8c6f56] mb-4">
              您停留在自己名下的地产【{buildModal.property.name}】
            </p>

            {/* Info Card */}
            <div className="bg-[#fcf7ee] rounded-2xl p-4 border border-[#eadaa6] mb-5 text-left text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-[#ebdcb9]">
                <span className="text-[#8c6f56]">当前状态：</span>
                <span className="font-bold text-[#5c3a1e]">
                  {buildModal.property.houseLevel === 0
                    ? '尚未建房'
                    : buildModal.property.houseLevel === 4
                    ? '4 栋房屋 (可升旅馆)'
                    : `${buildModal.property.houseLevel} 栋房屋`}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#ebdcb9]">
                <span className="text-[#8c6f56]">建造升级为：</span>
                <span className="font-extrabold text-[#d35400]">
                  {buildModal.nextLevelName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8c6f56]">建造成本：</span>
                <span className="font-extrabold text-[#2e7d32]">
                  {buildModal.cost} 金币 (当前现金: ${currentPlayer.money})
                </span>
              </div>
            </div>

            {/* Action Buttons: Confirm Build vs Skip */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmBuildHouse}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#2e7d32] to-[#43a047] hover:from-[#1b5e20] hover:to-[#2e7d32] text-white font-black text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
              >
                🔨 确认建造
              </button>
              <button
                type="button"
                onClick={skipBuildHouse}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#eee4d5] hover:bg-[#e4d6c2] text-[#6d4c41] font-bold text-sm shadow-xs hover:shadow-sm transition cursor-pointer"
              >
                ⏭️ 跳过
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Action Result Notice Modal (Pause flow until player clicks confirm) */}
      {aiNoticeModal.show && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#fffef8] rounded-[32px] max-w-sm w-full p-6 sm:p-7 text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-[#e3d2ba] animate-bounce-in relative">
            {/* Header Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold mb-3 ${
                aiNoticeModal.isBuild
                  ? 'bg-[#edf7ed] border border-[#a5d6a7] text-[#2e7d32]'
                  : 'bg-[#f5f5f5] border border-[#d6d6d6] text-[#616161]'
              }`}
            >
              <span>{aiNoticeModal.isBuild ? '🔨 AI建造决策' : '👀 AI决策通知'}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#5c3a1e] mb-2 leading-snug">
              {aiNoticeModal.actionText}
            </h3>

            <p className="text-xs text-[#8c6f56] mb-6 leading-relaxed bg-[#fcf7ee] p-3 rounded-2xl border border-[#eadaa6]">
              {aiNoticeModal.detailText}
            </p>

            {/* Single Confirm Button to conclude AI turn and proceed to next player */}
            <button
              type="button"
              onClick={() => {
                if (canControlCurrentTurn) {
                  confirmAiNotice();
                } else {
                  dismissLocalInfoModal('aiNotice');
                }
              }}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#d35400] to-[#e67e22] hover:from-[#c0392b] hover:to-[#d35400] text-white font-black text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
            >
              {canControlCurrentTurn ? '确定 ➔' : '我知道了 (关闭提示)'}
            </button>
          </div>
        </div>
      )}

      {/* Rent Settlement Modal (Triggered when landing on another player's property) */}
      {rentModal.show && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#fffef8] rounded-[32px] max-w-sm w-full p-6 sm:p-7 text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-[#e3d2ba] animate-bounce-in relative">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#fff1f2] border border-[#fecdd3] px-3.5 py-1 rounded-full text-xs font-bold text-[#be123c] mb-3">
              <span>💸</span>
              <span>地产租金结算</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#5c3a1e] mb-2 leading-snug">
              {rentModal.isBankrupt ? '💥 玩家不幸破产出局！' : '💸 支付地产租金'}
            </h3>

            <p className="text-xs text-[#8c6f56] mb-4 leading-relaxed bg-[#fcf7ee] p-3 rounded-2xl border border-[#eadaa6]">
              {rentModal.payerName} 需要支付 <strong className="text-[#be123c] font-black">{rentModal.amount}</strong> 金币给地产主人 {rentModal.receiverName}（地块：{rentModal.propertyName}）
            </p>

            {/* Single Confirm Button */}
            <button
              type="button"
              onClick={() => {
                if (canControlCurrentTurn) {
                  confirmRent();
                } else {
                  dismissLocalInfoModal('rent');
                }
              }}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#d35400] to-[#e67e22] hover:from-[#c0392b] hover:to-[#d35400] text-white font-black text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
            >
              {canControlCurrentTurn ? '确定 ➔' : '我知道了 (关闭提示)'}
            </button>
          </div>
        </div>
      )}

      {/* Game Event Notice Modal (触发机会卡、入狱、保释、罚款、奖励银两弹窗) */}
      <GameEventModal
        modalState={gameEventModal}
        onClose={() => {
          if (canControlCurrentTurn) {
            closeGameEventModal();
          } else {
            dismissLocalInfoModal('gameEvent');
          }
        }}
        mapTheme={gameState.mapTheme}
      />

      {/* Active Chance Card Popup Banner */}
      {activeChanceCard && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#fffbf2] border-2 border-[#f39c12] shadow-2xl rounded-2xl p-4 max-w-sm w-full mx-4 z-40 animate-bounce-in flex items-start gap-3">
          <span className="text-3xl">{gameState.mapTheme === 'ANCIENT' ? '🏮' : '✨'}</span>
          <div className="flex-1">
            <h4 className="font-extrabold text-sm text-[#8c5a1e]">
              【{gameState.mapTheme === 'ANCIENT' ? '江湖机缘' : '机会卡'}】{activeChanceCard.title}
            </h4>
            <p className="text-xs text-[#6e4d29] mt-0.5 leading-relaxed">
              {activeChanceCard.desc}
            </p>
          </div>
          <button
            onClick={() => setActiveChanceCard(null)}
            className="text-gray-400 hover:text-gray-600 font-bold text-sm px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Ancient Shop Modal (商行采买道具) */}
      {shopModal.show && canActInTurn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#fffef8] rounded-[32px] max-w-md w-full p-5 sm:p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)] border-4 border-[#e3a83b] animate-bounce-in relative my-auto">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#fef2f2] border border-[#fca5a5] px-3.5 py-1 rounded-full text-xs font-bold text-[#b91c1c] mb-2.5">
              <span>🏮</span>
              <span>市井商行 · 锦囊采买珍宝阁</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#5c3a1e] mb-1">
              踏足【{shopModal.squareName}】
            </h3>
            <p className="text-xs text-[#8c6f56] mb-3">
              阁下随身盘缠：<strong className="text-[#2e7d32] font-extrabold">${currentPlayer?.money || 0}</strong> 金币
            </p>

            {/* Items Shelf */}
            <div className="space-y-2 mb-4 text-left max-h-[50vh] overflow-y-auto pr-0.5">
              {Object.values(GAME_ITEMS).map((item) => {
                const canAfford = (currentPlayer?.money || 0) >= item.price;
                const ownedCount = currentPlayer?.items.filter((id) => id === item.id).length || 0;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[#fcf8f2] border border-[#ede1d1] flex items-center justify-between gap-2.5 hover:bg-[#faf3e8] transition"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="text-2xl sm:text-3xl p-1 bg-white rounded-xl border border-[#e8d7c2] shadow-2xs shrink-0">
                        {item.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs sm:text-sm text-[#5c3a1e]">
                            【{item.name}】
                          </span>
                          {ownedCount > 0 && (
                            <span className="text-[9px] font-bold bg-[#e8f5e9] text-[#2e7d32] px-1.5 py-0.2 rounded-full border border-[#c8e6c9]">
                              已持 {ownedCount} 件
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#8c6f56] mt-0.5 leading-snug">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-[#d35400] mb-1">
                        ${item.price}
                      </div>
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => buyItem(item.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-2xs cursor-pointer ${
                          canAfford
                            ? 'bg-gradient-to-r from-[#d35400] to-[#e67e22] text-white hover:from-[#c0392b] hover:to-[#d35400] active:scale-95'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? '采买' : '银两不足'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Finish Shopping Button */}
            <button
              type="button"
              onClick={closeShopModal}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#7a4820] to-[#8b5a2b] hover:from-[#5c3516] hover:to-[#7a4820] text-white font-black text-sm shadow-md hover:shadow-lg transition cursor-pointer"
            >
              采买完毕 · 离开商行 ➔
            </button>
          </div>
        </div>
      )}

      {/* Ancient Event Modal (古风特色事件：驿站、书院、庙会) */}
      {ancientEventModal.show && ancientEventModal.card && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#fcfaf2] rounded-[32px] max-w-md w-full p-5 sm:p-7 text-center shadow-[0_25px_60px_rgba(40,20,10,0.45)] border-4 border-[#b45309] animate-bounce-in relative my-auto">
            {/* Top Ancient Seal Header */}
            <div className="inline-flex items-center gap-1.5 bg-[#fef2f2] border border-[#fca5a5] px-4 py-1 rounded-full text-xs font-bold text-[#b91c1c] mb-3">
              <span>🏮</span>
              <span>{ancientEventModal.card.source}奇遇 · 盛世风华</span>
            </div>

            <div className="text-4xl sm:text-5xl mb-2">
              {ancientEventModal.card.source === '驿站'
                ? '🐎'
                : ancientEventModal.card.source === '书院'
                ? '📜'
                : '🎪'}
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#5c3a1e] mb-1">
              【{ancientEventModal.card.title}】
            </h3>
            <p className="text-xs text-[#8c6f56] mb-3">
              东家 <strong>{ancientEventModal.playerName}</strong> 驻足于此，偶遇江湖奇事
            </p>

            {/* Scroll Parchment Description Box */}
            <div className="p-3.5 sm:p-4 bg-[#f8f1e3] rounded-2xl border-2 border-[#e3d0b8] text-xs sm:text-sm text-[#4a3525] leading-relaxed mb-4 text-left shadow-inner">
              <span className="text-base font-serif block text-[#8b5a2b] mb-0.5">“</span>
              <p className="font-medium tracking-wide indent-3">
                {ancientEventModal.card.desc}
              </p>
              <span className="text-base font-serif block text-right text-[#8b5a2b] mt-0.5">”</span>
            </div>

            {/* Reward / Deduction Banner */}
            <div className="mb-4">
              {ancientEventModal.card.type === 'item' && (
                <div className="p-2.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-xs font-black text-[#065f46] flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <span>🎁 喜获锦囊至宝：</span>
                    <span className="underline decoration-2 text-sm">【{ancientEventModal.card.itemName}】</span>
                  </div>
                  {ancientEventModal.card.amount ? (
                    <span className="text-[11px] text-[#047857]">赏银进账 +{ancientEventModal.card.amount} 两</span>
                  ) : null}
                </div>
              )}
              {ancientEventModal.card.type === 'gain' && (
                <div className="p-2.5 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-xs font-black text-[#065f46] flex items-center justify-center gap-2">
                  <span>💰 银两进账：</span>
                  <span>+{ancientEventModal.card.amount} 两白银</span>
                </div>
              )}
              {ancientEventModal.card.type === 'loss' && (
                <div className="p-2.5 rounded-xl bg-[#fff1f2] border border-[#fecdd3] text-xs font-black text-[#be123c] flex items-center justify-center gap-2">
                  <span>💸 盘缠开销：</span>
                  <span>{ancientEventModal.card.amount} 两白银</span>
                </div>
              )}
              {ancientEventModal.card.type === 'neutral' && (
                <div className="p-2.5 rounded-xl bg-[#f0f9ff] border border-[#bae6fd] text-xs font-black text-[#0369a1] flex items-center justify-center gap-2">
                  <span>🍵 偷得浮生半日闲：品茗心静，心旷神怡</span>
                </div>
              )}
            </div>

            {/* Confirm Button */}
            <button
              type="button"
              onClick={() => {
                if (canControlCurrentTurn) {
                  confirmAncientEvent();
                } else {
                  dismissLocalInfoModal('ancientEvent');
                }
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#b45309] to-[#d97706] hover:from-[#92400e] hover:to-[#b45309] text-white font-black text-sm shadow-md hover:shadow-lg transition cursor-pointer active:scale-95"
            >
              {canControlCurrentTurn ? '欣然领受 · 继续前行 ➔' : '我知道了 (关闭提示)'}
            </button>
          </div>
        </div>
      )}

      {/* Ancient Pawnshop Modal (当铺典当换金 / 土地抵押 / 赎回地契) */}
      {pawnModal.show && canActInTurn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#fffef8] rounded-[32px] max-w-md w-full p-5 sm:p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)] border-4 border-[#b45309] animate-bounce-in relative my-auto">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#fffbeb] border border-[#fde68a] px-3.5 py-1 rounded-full text-xs font-bold text-[#b45309] mb-2">
              <span>⚖️</span>
              <span>四海当铺 · 典当 / 抵押 / 赎回</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#5c3a1e] mb-1">
              光临【{pawnModal.squareName}】
            </h3>
            <p className="text-xs text-[#8c6f56] mb-3">
              当前盘缠：<strong className="text-[#2e7d32] font-extrabold">${currentPlayer?.money || 0}</strong> {gameState.mapTheme === 'ANCIENT' ? '银两' : '金币'}
            </p>

            {/* 3 Tabs Header: 典当道具 / 土地抵押 / 赎回地契 */}
            <div className="grid grid-cols-3 gap-1.5 mb-3 p-1 bg-[#f4ebe1] rounded-2xl">
              <button
                type="button"
                onClick={() => setPawnModalTab('ITEMS')}
                className={`py-1.5 px-1 rounded-xl text-xs font-black transition cursor-pointer ${
                  pawnModal.activeTab === 'ITEMS'
                    ? 'bg-[#b45309] text-white shadow-xs'
                    : 'text-[#8c6f56] hover:text-[#5c3a1e]'
                }`}
              >
                ⚖️ 典当道具
              </button>
              <button
                type="button"
                onClick={() => setPawnModalTab('MORTGAGE')}
                className={`py-1.5 px-1 rounded-xl text-xs font-black transition cursor-pointer ${
                  pawnModal.activeTab === 'MORTGAGE'
                    ? 'bg-[#b45309] text-white shadow-xs'
                    : 'text-[#8c6f56] hover:text-[#5c3a1e]'
                }`}
              >
                📜 土地抵押
              </button>
              <button
                type="button"
                onClick={() => setPawnModalTab('REDEEM')}
                className={`py-1.5 px-1 rounded-xl text-xs font-black transition cursor-pointer ${
                  pawnModal.activeTab === 'REDEEM'
                    ? 'bg-[#b45309] text-white shadow-xs'
                    : 'text-[#8c6f56] hover:text-[#5c3a1e]'
                }`}
              >
                🏷️ 赎回地契
              </button>
            </div>

            {/* Tab 1: Held Items List for Selling */}
            {pawnModal.activeTab === 'ITEMS' && (
              <div className="space-y-2 mb-4 text-left max-h-[46vh] overflow-y-auto pr-0.5">
                {!currentPlayer?.items || currentPlayer.items.length === 0 ? (
                  <div className="p-6 bg-[#fcf8f2] rounded-2xl border border-[#ede1d1] text-center text-xs text-[#8c6f56] leading-relaxed">
                    <span className="text-3xl block mb-2">📦</span>
                    阁下手头暂无任何闲置道具可供典当！
                    <p className="text-[10px] text-[#a68263] mt-1">
                      （路过【商行】采买道具后，可在此典当变现救急）
                    </p>
                  </div>
                ) : (
                  currentPlayer.items.map((itemId, idx) => {
                    const item = GAME_ITEMS[itemId];
                    if (!item) return null;

                    return (
                      <div
                        key={`${itemId}-${idx}`}
                        className="p-3 rounded-2xl bg-[#fcf8f2] border border-[#ede1d1] flex items-center justify-between gap-2.5 hover:bg-[#faf3e8] transition"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="text-2xl p-1 bg-white rounded-xl border border-[#e8d7c2] shadow-2xs shrink-0">
                            {item.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-black text-xs sm:text-sm text-[#5c3a1e]">
                              【{item.name}】
                            </span>
                            <p className="text-[10px] text-[#8c6f56] mt-0.5 leading-snug truncate">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-[#2e7d32] mb-1">
                            +${item.sellPrice}
                          </div>
                          <button
                            type="button"
                            onClick={() => sellItem(item.id)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#b45309] to-[#d97706] hover:from-[#92400e] hover:to-[#b45309] text-white font-bold text-xs transition shadow-2xs cursor-pointer active:scale-95"
                          >
                            典当变现
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 2: Mortgage Unmortgaged Properties */}
            {pawnModal.activeTab === 'MORTGAGE' && (
              <div className="space-y-2 mb-4 text-left max-h-[46vh] overflow-y-auto pr-0.5">
                {(() => {
                  const unmortgagedProps = gameState.board.filter(
                    (sq) => sq.owner === currentPlayer?.id && !sq.isMortgaged
                  );
                  if (unmortgagedProps.length === 0) {
                    return (
                      <div className="p-6 bg-[#fcf8f2] rounded-2xl border border-[#ede1d1] text-center text-xs text-[#8c6f56] leading-relaxed">
                        <span className="text-3xl block mb-2">📜</span>
                        阁下名下暂无可供抵押的房产地产！
                        <p className="text-[10px] text-[#a68263] mt-1">
                          （购置地产后，若逢资金周转吃紧，可随时在此抵押借银）
                        </p>
                      </div>
                    );
                  }
                  return unmortgagedProps.map((prop) => {
                    const mortgageVal = Math.floor(prop.price * 0.6) + prop.houseLevel * 50;
                    return (
                      <div
                        key={prop.id}
                        className="p-3 rounded-2xl bg-[#fcf8f2] border border-[#ede1d1] flex items-center justify-between gap-2.5 hover:bg-[#faf3e8] transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs sm:text-sm text-[#5c3a1e]">
                              【{prop.name}】
                            </span>
                            <span className="text-[9px] bg-[#fff3e0] text-[#e65100] px-1.5 py-0.2 rounded-md font-bold">
                              {prop.houseLevel === 0 ? '地皮' : `${prop.houseLevel}栋/进`}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#8c6f56] mt-0.5">
                            估值: ${prop.price} · 抵押期间免收过路租金
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-[#2e7d32] mb-1">
                            可借: +${mortgageVal} 银两
                          </div>
                          <button
                            type="button"
                            onClick={() => mortgageProperty(prop.id)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#b45309] to-[#d97706] hover:from-[#92400e] hover:to-[#b45309] text-white font-bold text-xs transition shadow-2xs cursor-pointer active:scale-95"
                          >
                            抵押借款
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Tab 3: Redeem Mortgaged Properties */}
            {pawnModal.activeTab === 'REDEEM' && (
              <div className="space-y-2 mb-4 text-left max-h-[46vh] overflow-y-auto pr-0.5">
                {(() => {
                  const mortgagedProps = gameState.board.filter(
                    (sq) => sq.owner === currentPlayer?.id && sq.isMortgaged
                  );
                  if (mortgagedProps.length === 0) {
                    return (
                      <div className="p-6 bg-[#fcf8f2] rounded-2xl border border-[#ede1d1] text-center text-xs text-[#8c6f56] leading-relaxed">
                        <span className="text-3xl block mb-2">🏷️</span>
                        阁下名下暂无处于抵押状态的地契！
                        <p className="text-[10px] text-[#a68263] mt-1">
                          （所有名下地产均正常收取过路租金）
                        </p>
                      </div>
                    );
                  }
                  return mortgagedProps.map((prop) => {
                    const redeemCost = prop.mortgageAmount || Math.floor(prop.price * 0.6);
                    const canAfford = (currentPlayer?.money || 0) >= redeemCost;
                    return (
                      <div
                        key={prop.id}
                        className="p-3 rounded-2xl bg-[#fcf8f2] border border-[#ede1d1] flex items-center justify-between gap-2.5 hover:bg-[#faf3e8] transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs sm:text-sm text-[#5c3a1e]">
                              【{prop.name}】
                            </span>
                            <span className="text-[9px] bg-[#fef2f2] text-[#b91c1c] px-1.5 py-0.2 rounded-md font-bold">
                              已抵押·免租中
                            </span>
                          </div>
                          <p className="text-[10px] text-[#8c6f56] mt-0.5">
                            出资赎回地契后，即可恢复正常收租！
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-[#b45309] mb-1">
                            需付: ${redeemCost}
                          </div>
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => redeemProperty(prop.id)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-2xs cursor-pointer ${
                              canAfford
                                ? 'bg-gradient-to-r from-[#2e7d32] to-[#43a047] text-white hover:from-[#1b5e20] hover:to-[#2e7d32] active:scale-95'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {canAfford ? '出资赎回' : '银两不足'}
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Leave Pawnshop Button */}
            <button
              type="button"
              onClick={closePawnModal}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#7a4820] to-[#8b5a2b] hover:from-[#5c3516] hover:to-[#7a4820] text-white font-black text-sm shadow-md hover:shadow-lg transition cursor-pointer"
            >
              离开当铺 ➔
            </button>
          </div>
        </div>
      )}

      {/* Backpack Modal (玩家锦囊背包随身使用) */}
      {backpackModal.show && canActInTurn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#fffef8] rounded-[32px] max-w-md w-full p-5 sm:p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)] border-4 border-[#8b5a2b] animate-bounce-in relative my-auto">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#fef9c3] border border-[#fde047] px-3.5 py-1 rounded-full text-xs font-bold text-[#854d0e] mb-2.5">
              <span>🎒</span>
              <span>锦囊随身背包 · 道具库</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#5c3a1e] mb-1">
              {currentPlayer?.name} 的锦囊道具
            </h3>
            <p className="text-xs text-[#8c6f56] mb-3">
              在自己回合掷骰前，可主动使用锦囊妙计助战（点击附带效果说明与二次确认）
            </p>

            {/* Held Items List with Detailed Effects */}
            <div className="space-y-2.5 mb-4 text-left max-h-[50vh] overflow-y-auto pr-0.5">
              {!currentPlayer?.items || currentPlayer.items.length === 0 ? (
                <div className="p-6 bg-[#fcf8f2] rounded-2xl border border-[#ede1d1] text-center text-xs text-[#8c6f56] leading-relaxed">
                  <span className="text-3xl block mb-2">🎒</span>
                  当前锦囊背包空空如也！
                  <p className="text-[10px] text-[#a68263] mt-1">
                    停留在【商行】地块或在【驿站/书院/庙会】触发奇遇时，即可获得各种实用道具。
                  </p>
                </div>
              ) : (
                currentPlayer.items.map((itemId, idx) => {
                  const item = GAME_ITEMS[itemId];
                  if (!item) return null;

                  return (
                    <div
                      key={`${itemId}-${idx}`}
                      className="p-3 sm:p-3.5 rounded-2xl bg-[#fcf8f2] border-2 border-[#ede1d1] flex items-start justify-between gap-3 hover:bg-[#faf3e8] transition shadow-2xs"
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="text-2xl sm:text-3xl p-1.5 bg-white rounded-xl border border-[#e8d7c2] shadow-2xs shrink-0 mt-0.5">
                          {item.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-xs sm:text-sm text-[#5c3a1e]">
                              【{item.name}】
                            </span>
                            <span className="text-[9.5px] font-extrabold bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9] px-2 py-0.2 rounded-full">
                              {item.tag}
                            </span>
                          </div>
                          {/* Effect Explanation */}
                          <p className="text-[10.5px] sm:text-xs text-[#7d5f3f] mt-1 leading-relaxed bg-[#fffdf9] p-2 rounded-xl border border-[#ebdcc8]">
                            <strong className="text-[#5c3a1e]">效果说明：</strong>
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => requestUseItem(item.id)}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#2e7d32] to-[#43a047] hover:from-[#1b5e20] hover:to-[#2e7d32] text-white font-black text-xs transition shadow-md hover:shadow-lg cursor-pointer active:scale-95 shrink-0 self-center"
                      >
                        使用
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Close Backpack Button */}
            <button
              type="button"
              onClick={closeBackpack}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#eee4d5] hover:bg-[#e4d6c2] text-[#6d4c41] font-bold text-xs transition cursor-pointer"
            >
              关闭背包 ✕
            </button>
          </div>
        </div>
      )}

      {/* Confirm Use Item Modal (使用道具二次确认弹窗) */}
      {confirmUseItemModal.show && confirmUseItemModal.item && canActInTurn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#fffef8] rounded-[32px] max-w-sm w-full p-5 sm:p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)] border-4 border-[#b45309] animate-bounce-in relative my-auto">
            <div className="inline-flex items-center gap-1.5 bg-[#fef3c7] border border-[#fde68a] px-3.5 py-1 rounded-full text-xs font-bold text-[#b45309] mb-3">
              <span>🎒</span>
              <span>锦囊妙计 · 二次确认</span>
            </div>

            <div className="w-16 h-16 mx-auto rounded-2xl bg-white border-2 border-[#e8d7c2] shadow-sm flex items-center justify-center text-3xl mb-3">
              {confirmUseItemModal.item.icon}
            </div>

            <h3 className="text-xl font-black text-[#5c3a1e] mb-1">
              确认使用【{confirmUseItemModal.item.name}】？
            </h3>
            <span className="inline-block bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9] px-2.5 py-0.5 rounded-full text-[10px] font-extrabold mb-3">
              {confirmUseItemModal.item.tag}
            </span>

            <div className="p-3 bg-[#fcf8f2] rounded-2xl border border-[#ede1d1] text-xs text-[#6e4e37] leading-relaxed mb-4 text-left">
              <strong className="text-[#5c3a1e] block mb-1">使用后生效说明：</strong>
              {confirmUseItemModal.item.desc}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={cancelUseItem}
                className="py-2.5 px-4 rounded-xl bg-[#eee4d5] hover:bg-[#e4d6c2] text-[#6d4c41] font-bold text-xs transition cursor-pointer"
              >
                再想想 / 取消
              </button>
              <button
                type="button"
                onClick={confirmExecuteUseItem}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2e7d32] to-[#43a047] hover:from-[#1b5e20] hover:to-[#2e7d32] text-white font-black text-xs transition shadow-md hover:shadow-lg cursor-pointer active:scale-95"
              >
                确认使用 ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Road Pass Modal (自选掷骰步数 2~12) */}
      {roadPassModal.show && canActInTurn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#fffef8] rounded-[32px] max-w-sm w-full p-5 sm:p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)] border-4 border-[#d35400] animate-bounce-in relative my-auto">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 bg-[#fff7ed] border border-[#fed7aa] px-3.5 py-1 rounded-full text-xs font-bold text-[#c2410c] mb-2.5">
              <span>📜</span>
              <span>官府特许路引 · 指定步数</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#5c3a1e] mb-1">
              请自选本次前进步数
            </h3>
            <p className="text-xs text-[#8c6f56] mb-4">
              点击下方任意点数（2~12点），随心定点直达目标地块！
            </p>

            {/* 2 to 12 Numbers Grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => executeRoadPass(num)}
                  className="py-2.5 px-2 bg-gradient-to-b from-[#fffaf3] to-[#f5ead9] hover:from-[#d35400] hover:to-[#b03a2e] text-[#5c3a1e] hover:text-white rounded-xl border-2 border-[#dfceb7] hover:border-[#d35400] font-black text-sm shadow-2xs hover:shadow-md transition cursor-pointer active:scale-95"
                >
                  {num} 步
                </button>
              ))}
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={closeRoadPassModal}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#eee4d5] hover:bg-[#e4d6c2] text-[#6d4c41] font-bold text-xs transition cursor-pointer"
            >
              取消 ✕
            </button>
          </div>
        </div>
      )}

      {/* Game Over Settlement Modal (Displays all players' assets, properties, and house inventory) */}
      {gameState.isGameOver && gameState.winner && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#fffef8] rounded-[36px] max-w-xl w-full p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.35)] border-4 border-[#e5a83b] animate-bounce-in my-auto max-h-[92vh] flex flex-col">
            {/* Header Trophy Banner */}
            <div className="text-center pb-3 border-b border-[#eddcc7] shrink-0">
              <span className="text-4xl sm:text-5xl mb-1 inline-block animate-bounce">👑</span>
              <h2 className="text-xl sm:text-2xl font-black text-[#5c3a1e] tracking-tight">
                家庭大富翁 · 终局大结算
              </h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-[11px] font-bold text-[#8c6f56] bg-[#f5ebe1] px-3 py-0.5 rounded-full border border-[#e4d3c0]">
                  {gameState.gameMode === 'ROUNDS'
                    ? `🏆 自定义轮数争霸 (${gameState.maxRounds}轮完赛)`
                    : '💥 破产淘汰模式 (决胜到底)'}
                </span>
              </div>
            </div>

            {/* Winner Spotlight Card */}
            <div className="bg-gradient-to-r from-[#fff3e0] via-[#ffe0b2] to-[#ffcc80] p-3.5 sm:p-4 rounded-2xl border-2 border-[#ffb74d] my-3 shrink-0 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl">{gameState.winner.avatarIcon}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-[#e65100] text-white font-extrabold px-1.5 py-0.2 rounded-md">
                      冠军获胜
                    </span>
                    <span className="text-sm sm:text-base font-black text-[#bf360c]">
                      {gameState.winner.name}
                    </span>
                    {gameState.winner.isAI && (
                      <span className="text-[9px] bg-[#ffe0b2] text-[#e65100] font-bold px-1 rounded-sm">
                        AI
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#e65100] mt-0.5 font-medium">
                    荣登家庭首富宝座！商业版图傲视群雄
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-[#b26a00] font-bold">最终总资产</div>
                <div className="text-lg sm:text-xl font-black text-[#d35400]">
                  $
                  {gameState.winner.money +
                    gameState.winner.properties.reduce(
                      (sum, pid) => sum + getPropertyValue(gameState.board[pid]),
                      0
                    )}
                </div>
              </div>
            </div>

            {/* All Players Settlement Breakdown List */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-2.5 my-1">
              <div className="text-xs font-bold text-[#7d5f3f] flex items-center justify-between px-1">
                <span>📋 全员资产与房产清单排行榜</span>
                <span className="text-[10px] text-[#a68263]">按总资产排序</span>
              </div>

              {(() => {
                // Calculate standings
                const standings = gameState.players
                  .map((p) => {
                    const propertiesList = p.properties
                      .map((pid) => gameState.board[pid])
                      .filter(Boolean);
                    const propVal = propertiesList.reduce(
                      (sum, prop) => sum + getPropertyValue(prop),
                      0
                    );
                    const totalAssets = p.money + propVal;
                    const hotelCount = propertiesList.filter(
                      (prop) => prop.houseLevel >= 5
                    ).length;
                    const houseCount = propertiesList.reduce(
                      (sum, prop) => (prop.houseLevel < 5 ? sum + prop.houseLevel : sum),
                      0
                    );

                    return {
                      player: p,
                      totalAssets,
                      propVal,
                      propertiesList,
                      hotelCount,
                      houseCount,
                    };
                  })
                  .sort((a, b) => {
                    // Bankrupt players go to bottom in bankruptcy mode
                    if (gameState.gameMode === 'BANKRUPTCY') {
                      if (a.player.isBankrupt && !b.player.isBankrupt) return 1;
                      if (!a.player.isBankrupt && b.player.isBankrupt) return -1;
                    }
                    return b.totalAssets - a.totalAssets;
                  });

                const medals = ['🥇 冠军', '🥈 亚军', '🥉 季军', '🏅 第4名'];

                return standings.map((item, idx) => {
                  const { player, totalAssets, propertiesList, hotelCount, houseCount } = item;
                  const isWinner = player.id === gameState.winner?.id;

                  return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        isWinner
                          ? 'bg-[#fffaf0] border-[#f5b041] shadow-xs ring-2 ring-[#f5b041]/40'
                          : player.isBankrupt
                          ? 'bg-gray-50 border-gray-200 opacity-75'
                          : 'bg-white border-[#ecdcc8]'
                      }`}
                    >
                      {/* Top Row: Rank, Player Info, Total Assets */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#f0e3d2]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#d35400] bg-[#faefe3] px-2 py-0.5 rounded-lg border border-[#f2dfcb]">
                            {medals[idx] || `第 ${idx + 1} 名`}
                          </span>
                          <span className="text-base">{player.avatarIcon}</span>
                          <span className="text-xs sm:text-sm font-extrabold text-[#5c3a1e]">
                            {player.name}
                          </span>
                          {player.isAI && (
                            <span className="text-[9px] bg-[#e0f2f1] text-[#00695c] font-bold px-1.5 py-0.2 rounded-sm">
                              AI
                            </span>
                          )}
                          {player.isBankrupt && (
                            <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-0.2 rounded-sm">
                              💥 已破产出局
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-[#8c6f56]">总资产：</span>
                          <span
                            className={`text-xs sm:text-sm font-black ${
                              player.isBankrupt ? 'text-gray-400 line-through' : 'text-[#d35400]'
                            }`}
                          >
                            ${totalAssets}
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Cash & Overview */}
                      <div className="flex items-center justify-between text-[11px] text-[#7d5f3f] mt-1.5 pt-0.5">
                        <div className="flex items-center gap-3">
                          <span>
                            💵 现金余额: <strong className="text-[#2e7d32]">${player.money}</strong>
                          </span>
                          <span>
                            🏛️ 地产估值: <strong>${item.propVal}</strong>
                          </span>
                        </div>

                        <div className="text-[10px] text-[#8c6f56]">
                          {hotelCount > 0 && <span className="text-[#c62828] font-bold mr-1.5">🏨 {hotelCount}座旅馆</span>}
                          <span>🏠 {houseCount}栋房屋</span>
                        </div>
                      </div>

                      {/* Bottom Row: Detailed Property List Badges */}
                      <div className="mt-2 pt-1.5 border-t border-dashed border-[#ede1d1]">
                        <span className="text-[10px] font-bold text-[#8c6f56] block mb-1">
                          名下地产及建筑详情 ({propertiesList.length}处)：
                        </span>

                        {propertiesList.length === 0 ? (
                          <span className="text-[10px] text-gray-400 italic">
                            {player.isBankrupt ? '破产收缴全部地产' : '暂无持有任何地产'}
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {propertiesList.map((prop) => {
                              const levelText =
                                prop.houseLevel >= 5
                                  ? '🏨 旅馆'
                                  : prop.houseLevel > 0
                                  ? `🏠 ${prop.houseLevel}栋`
                                  : '地皮';

                              return (
                                <div
                                  key={prop.id}
                                  className="inline-flex items-center gap-1 bg-[#fcf8f2] border border-[#e8d7c2] px-2 py-0.5 rounded-lg text-[10px]"
                                >
                                  <span className="font-bold text-[#5c3a1e]">{prop.name}</span>
                                  <span
                                    className="px-1.5 py-0.2 rounded-md font-extrabold text-[9px] shadow-2xs"
                                    style={{
                                      backgroundColor:
                                        prop.houseLevel > 0 ? player.color : '#f3f4f6',
                                      color: prop.houseLevel > 0 ? '#ffffff' : '#4b5563',
                                    }}
                                  >
                                    {levelText}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Bottom Restart Button */}
            <div className="pt-3 border-t border-[#eddcc7] shrink-0 mt-2">
              <button
                type="button"
                onClick={() => {
                  if (isOnlineGame) multiplayer.leaveRoom();
                  resetToSetup();
                }}
                className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-[#d35400] to-[#e67e22] hover:from-[#c0392b] hover:to-[#d35400] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
              >
                {isOnlineGame ? '退出联机房间 · 返回大厅 ➔' : '再来一局家庭桌游 ➔'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-Game Online Chat Drawer */}
      {isOnlineGame && showInGameChat && (
        <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 bg-[#fffdfa] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-[#d5be9b] p-4 animate-bounce-in flex flex-col max-h-[70vh]">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#ebdccb]">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#5c3a1e]">
              <span>💬</span>
              <span>房间实时聊天 ({multiplayer.currentRoom?.id})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowInGameChat(false)}
              className="text-xs font-bold text-[#8c6f56] hover:text-[#5c3a1e] px-2 py-0.5 rounded-lg bg-[#f4ebe1] cursor-pointer"
            >
              关闭 ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[240px] mb-2.5">
            {multiplayer.chatMessages.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-[11px] text-[#a68263]">
                发送表情或文字与房间好友互动吧～
              </div>
            ) : (
              multiplayer.chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-[#fcf8f2] p-2 rounded-xl border border-[#ede1d1] text-xs"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-black flex items-center gap-1" style={{ color: msg.senderColor }}>
                      <span>{msg.avatarIcon}</span>
                      <span>{msg.senderName}</span>
                    </span>
                    <span className="text-[9px] text-[#a68263]">{msg.timestamp}</span>
                  </div>
                  <p className="text-[#4a3525] pl-1 break-words">{msg.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Quick Emotes */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 scrollbar-none">
            {['🎉 快投骰子！', '💸 手下留情呀', '🏰 我要买下这里', '😂 运气太好啦', '🤝 合作愉快'].map(
              (quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => multiplayer.sendChat(quick)}
                  className="px-2 py-1 bg-[#f4ebe1] hover:bg-[#ebdccb] text-[#5c3a1e] rounded-full text-[10px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
                >
                  {quick}
                </button>
              )
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!inGameChatInput.trim()) return;
              multiplayer.sendChat(inGameChatInput);
              setInGameChatInput('');
            }}
            className="flex gap-1.5"
          >
            <input
              type="text"
              value={inGameChatInput}
              onChange={(e) => setInGameChatInput(e.target.value)}
              placeholder="输入聊天消息..."
              maxLength={80}
              className="flex-1 bg-white border border-[#dfceb7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#d35400]"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-[#d35400] hover:bg-[#b03a2e] text-white rounded-xl text-xs font-black transition cursor-pointer shrink-0"
            >
              发送
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

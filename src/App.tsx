import React, { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { GameBoard } from './components/GameBoard';
import { DiceModal } from './components/DiceModal';
import { AssetDistribution } from './components/AssetDistribution';
import { GameMode, getPropertyValue, GameLog, LogCategory } from './types';

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
  const {
    gameState,
    isSetup,
    setupGame,
    resetToSetup,
    showDiceModal,
    setShowDiceModal,
    executeMove,
    buildModal,
    confirmBuildHouse,
    skipBuildHouse,
    aiNoticeModal,
    confirmAiNotice,
    rentModal,
    confirmRent,
    activeChanceCard,
    setActiveChanceCard,
    isTurnProcessing,
  } = useGameEngine();

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
  const [customRounds, setCustomRounds] = useState<number>(15);
  const [logCategoryFilter, setLogCategoryFilter] = useState<'ALL' | LogCategory>('ALL');

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

  // Roll dice trigger for human player
  const handleRollDice = () => {
    if (showDiceModal.show || isAiTurn || isTurnProcessing || buildModal.show) return;
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    setShowDiceModal({ show: true, dice: [d1, d2], isRolling: true });
  };

  // Setup Screen
  if (isSetup) {
    return (
      <div className="min-h-screen bg-[#f7f2ea] flex items-center justify-center p-4 sm:p-6 text-[#4a3525]">
        <div className="bg-[#fffdfa] w-full max-w-lg rounded-[32px] p-6 sm:p-8 shadow-[0_20px_60px_rgba(110,75,40,0.15)] border-4 border-[#ebdccb]">
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
            <label className="text-xs font-bold text-[#8c6f56] block">
              玩家席位设置 ({playerConfigs.length}/4人)：
            </label>
            {playerConfigs.map((cfg, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2.5 bg-[#fbf8f3] rounded-2xl border border-[#ede1d1]"
              >
                <span className="text-sm font-black text-[#a68263] w-5 text-center">
                  #{index + 1}
                </span>

                <input
                  type="text"
                  value={cfg.name}
                  onChange={(e) => handleUpdatePlayer(index, e.target.value, cfg.isAI)}
                  placeholder={`玩家 ${index + 1} 名字`}
                  className="flex-1 bg-white border border-[#dfceb7] rounded-xl px-3 py-1.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#d35400]"
                />

                <label className="flex items-center gap-1.5 bg-[#f2e7d8] px-2.5 py-1.5 rounded-xl cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={cfg.isAI}
                    onChange={(e) => handleUpdatePlayer(index, cfg.name, e.target.checked)}
                    className="accent-[#d35400] w-3.5 h-3.5 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#6d4c41]">AI 控制</span>
                </label>

                {playerConfigs.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePlayer(index)}
                    className="text-red-500 hover:text-red-700 font-bold p-1 rounded-lg text-sm transition"
                    title="移除该玩家"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {playerConfigs.length < 4 && (
              <button
                type="button"
                onClick={handleAddPlayer}
                className="w-full py-2 border-2 border-dashed border-[#d5be9b] hover:border-[#8b5a2b] text-[#8b5a2b] rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
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

          {/* Start Game Button */}
          <button
            type="button"
            onClick={() => setupGame(playerConfigs, customRounds, gameMode)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#d35400] to-[#e67e22] text-white font-extrabold text-base shadow-[0_8px_20px_rgba(211,84,0,0.35)] hover:from-[#c0392b] hover:to-[#d35400] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
          >
            进入游戏 · 开始大富翁之旅 ➔
          </button>
        </div>
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
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-[#ede0ce] px-3 py-1 rounded-full text-xs font-bold text-[#6d4c41] shadow-2xs">
            {gameState.gameMode === 'BANKRUPTCY'
              ? `第 ${gameState.round} 轮 · 淘汰决胜`
              : `第 ${gameState.round} / ${gameState.maxRounds} 轮`}
          </div>
          <button
            onClick={resetToSetup}
            className="px-3 py-1 bg-white hover:bg-[#faede0] border border-[#d5be9b] text-xs font-bold text-[#8b5a2b] rounded-full shadow-2xs hover:shadow-xs transition cursor-pointer"
          >
            重新开局
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
              !showDiceModal.show &&
              !isTurnProcessing &&
              !buildModal.show &&
              !aiNoticeModal.show &&
              !gameState.isMovingPawn
            }
            isAiTurn={isAiTurn}
            round={gameState.round}
            maxRounds={gameState.maxRounds}
            gameMode={gameState.gameMode}
            isMovingPawn={gameState.isMovingPawn}
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
          isAI={isAiTurn}
          playerName={currentPlayer?.name}
          onClose={() => {
            // For human players: clicking confirm executes the move
            if (!isAiTurn) {
              const sum = showDiceModal.dice![0] + showDiceModal.dice![1];
              setShowDiceModal({ show: false, dice: null, isRolling: false });
              executeMove(sum);
            }
          }}
        />
      )}

      {/* Automatic Build House Confirmation Modal (Triggered on Landing on ANY Property Tile) */}
      {buildModal.show && buildModal.property && currentPlayer && (
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
              onClick={confirmAiNotice}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#d35400] to-[#e67e22] hover:from-[#c0392b] hover:to-[#d35400] text-white font-black text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
            >
              确定 ➔
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
              onClick={confirmRent}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#d35400] to-[#e67e22] hover:from-[#c0392b] hover:to-[#d35400] text-white font-black text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
            >
              确定 ➔
            </button>
          </div>
        </div>
      )}

      {/* Active Chance Card Popup Banner */}
      {activeChanceCard && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#fffbf2] border-2 border-[#f39c12] shadow-2xl rounded-2xl p-4 max-w-sm w-full mx-4 z-40 animate-bounce-in flex items-start gap-3">
          <span className="text-3xl">✨</span>
          <div className="flex-1">
            <h4 className="font-extrabold text-sm text-[#8c5a1e]">
              【机会卡】{activeChanceCard.title}
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
                                    className={`px-1 py-0.2 rounded-md font-extrabold text-[9px] ${
                                      prop.houseLevel >= 5
                                        ? 'bg-[#ffebee] text-[#c62828]'
                                        : prop.houseLevel > 0
                                        ? 'bg-[#e8f5e9] text-[#2e7d32]'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
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
                onClick={resetToSetup}
                className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-[#d35400] to-[#e67e22] hover:from-[#c0392b] hover:to-[#d35400] text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
              >
                再来一局家庭桌游 ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

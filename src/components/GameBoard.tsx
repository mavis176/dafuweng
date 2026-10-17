import React, { useState } from 'react';
import { Player, Property, GameMode } from '../types';

interface BoardProps {
  board: Property[];
  players: Player[];
  currentPlayerIndex: number;
  onRollDice: () => void;
  canRoll: boolean;
  isAiTurn: boolean;
  round: number;
  maxRounds: number;
  gameMode?: GameMode;
  isMovingPawn?: boolean;
  onBuildHouse?: (propertyIndex: number) => void;
}

// Pure CSS Single House Item
const SingleCssHouse: React.FC<{ index: number }> = ({ index }) => (
  <div className="flex flex-col items-center" title={`第 ${index + 1} 栋房屋`}>
    {/* Gable Roof */}
    <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[3.5px] border-b-[#1b5e20]" />
    {/* House Body */}
    <div className="w-2.5 h-2.5 bg-gradient-to-b from-[#43a047] to-[#2e7d32] rounded-2xs border border-[#e8f5e9] shadow-2xs relative flex items-end justify-center">
      {/* Tiny Door */}
      <div className="w-0.5 h-1 bg-[#1b5e20] rounded-t-2xs" />
    </div>
  </div>
);

// Pure CSS Exclusive Hotel Item
const ExclusiveCssHotel: React.FC = () => (
  <div className="flex flex-col items-center" title="超级豪华旅馆">
    {/* Hotel Roof */}
    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[5px] border-b-[#b71c1c]" />
    {/* Hotel Body */}
    <div className="w-4 h-3.5 bg-gradient-to-b from-[#e53935] to-[#b71c1c] rounded-2xs border border-[#ffcdd2] shadow-2xs flex items-center justify-center">
      <span className="text-[7.5px] text-white font-black leading-none tracking-tighter">H</span>
    </div>
  </div>
);

// Dedicated Dynamic House Area in Top-Right Corner of Property Tiles
export const PropertyHouseArea: React.FC<{ level: number }> = ({ level }) => {
  if (level <= 0) return null;

  // Level 5+ is Exclusive Hotel
  if (level >= 5) {
    return (
      <div
        className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-20 flex items-center gap-0.5 
                   bg-[#fff1f0]/95 backdrop-blur-2xs border border-[#ff7875] px-1 py-0.5 rounded-md 
                   shadow-[0_1px_3px_rgba(229,57,53,0.3)] animate-bounce-in"
        title="五星豪华旅馆"
      >
        <ExclusiveCssHotel />
        <span className="text-[7px] sm:text-[8px] font-black text-[#c62828] leading-none">
          旅馆
        </span>
      </div>
    );
  }

  // Levels 1-4: Side-by-side 1 to 4 Houses
  const count = Math.min(Math.max(level, 1), 4);

  return (
    <div
      className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-20 flex items-center gap-0.5 
                 bg-white/95 backdrop-blur-2xs border border-[#81c784] px-0.5 sm:px-1 py-0.5 rounded-md 
                 shadow-[0_1px_3px_rgba(46,125,50,0.25)]"
      title={`已建房屋: ${count} 栋`}
    >
      <div className="flex items-end gap-0.5">
        {Array.from({ length: count }).map((_, i) => (
          <SingleCssHouse key={i} index={i} />
        ))}
      </div>
      <span className="text-[6.5px] sm:text-[7.5px] font-black text-[#1b5e20] leading-none ml-0.5">
        {count}栋
      </span>
    </div>
  );
};

// Pure CSS 3D Game Pawn
export const CssPawn: React.FC<{
  color: string;
  isCurrent: boolean;
  name: string;
  isMoving?: boolean;
}> = ({
  color,
  isCurrent,
  name,
  isMoving,
}) => {
  return (
    <div
      className={`relative flex flex-col items-center justify-center transition-all duration-200 ease-out z-30 ${
        isCurrent
          ? isMoving
            ? 'scale-125 -translate-y-2.5 animate-bounce'
            : 'scale-115 -translate-y-1'
          : 'scale-90 hover:scale-100 opacity-90'
      }`}
      title={name}
    >
      {/* Active turn glow ring */}
      {isCurrent && (
        <div
          className="absolute -inset-1 rounded-full animate-ping opacity-60"
          style={{ backgroundColor: color }}
        />
      )}

      {/* Pawn Head */}
      <div
        className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white/90 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.7)]"
        style={{
          background: `radial-gradient(circle at 35% 35%, #fff 0%, ${color} 60%, #1a1a1a 100%)`,
        }}
      />
      {/* Pawn Neck & Body */}
      <div
        className="w-2 h-1.5 sm:w-2.5 sm:h-2 -mt-0.5 rounded-t-xs border-x border-white/60"
        style={{ backgroundColor: color }}
      />
      {/* Pawn Base */}
      <div
        className="w-4 h-1.5 sm:w-5 sm:h-2 -mt-0.5 rounded-full border border-white/80 shadow-[0_2px_3px_rgba(0,0,0,0.4)]"
        style={{
          background: `linear-gradient(to bottom, ${color}, #222)`,
        }}
      />
    </div>
  );
};

export const GameBoard: React.FC<BoardProps> = ({
  board,
  players,
  currentPlayerIndex,
  onRollDice,
  canRoll,
  isAiTurn,
  round,
  maxRounds,
  gameMode = 'ROUNDS',
  isMovingPawn = false,
  onBuildHouse,
}) => {
  const activePlayer = players[currentPlayerIndex];

  // Tile category visual themes
  const getSquareTheme = (type: Property['type']) => {
    switch (type) {
      case 'start':
        return {
          banner: 'bg-[#43a047] text-white',
          cardBg: 'bg-[#edf7ed]',
          border: 'border-[#a5d6a7]',
          icon: '🚩',
        };
      case 'shop':
        return {
          banner: 'bg-[#fb8c00] text-white',
          cardBg: 'bg-[#fff8e1]',
          border: 'border-[#ffe082]',
          icon: '🛒',
        };
      case 'dessert':
        return {
          banner: 'bg-[#ec407a] text-white',
          cardBg: 'bg-[#fce4ec]',
          border: 'border-[#f48fb1]',
          icon: '🍰',
        };
      case 'bookstore':
        return {
          banner: 'bg-[#5c6bc0] text-white',
          cardBg: 'bg-[#e8eaf6]',
          border: 'border-[#9fa8da]',
          icon: '📚',
        };
      case 'farm':
        return {
          banner: 'bg-[#8d6e63] text-white',
          cardBg: 'bg-[#efebe9]',
          border: 'border-[#bcaaa4]',
          icon: '🌾',
        };
      case 'park':
        return {
          banner: 'bg-[#26a69a] text-white',
          cardBg: 'bg-[#e0f2f1]',
          border: 'border-[#80cbc4]',
          icon: '🌳',
        };
      case 'chance':
        return {
          banner: 'bg-[#ab47bc] text-white',
          cardBg: 'bg-[#f3e5f5]',
          border: 'border-[#ce93d8]',
          icon: '✨',
        };
      case 'tax':
        return {
          banner: 'bg-[#78909c] text-white',
          cardBg: 'bg-[#eceff1]',
          border: 'border-[#b0bec5]',
          icon: '🏛️',
        };
      case 'empty':
      default:
        return {
          banner: 'bg-[#8d7966] text-white',
          cardBg: 'bg-[#faf6ee]',
          border: 'border-[#e0d6c8]',
          icon: '📍',
        };
    }
  };

  const [hoveredPropertyIndex, setHoveredPropertyIndex] = useState<number | null>(null);

  // Check if current player can build or upgrade on current square
  const currentPos = activePlayer ? activePlayer.position : 0;
  const currentSquare = board[currentPos];
  const canBuildOnCurrentSquare =
    activePlayer &&
    !activePlayer.isAI &&
    currentSquare &&
    currentSquare.owner === activePlayer.id &&
    currentSquare.houseLevel < 5 &&
    activePlayer.money >= 100;

  // Smart floating card position anchored adjacent to hovered perimeter tile
  const getCardPosition = (index: number | null): React.CSSProperties => {
    if (index === null) return {};
    let col = 1;
    let row = 1;
    if (index < 7) {
      col = index + 1;
      row = 1;
    } else if (index < 13) {
      col = 7;
      row = index - 6 + 1;
    } else if (index < 19) {
      col = 7 - (index - 12);
      row = 7;
    } else {
      col = 1;
      row = 7 - (index - 18);
    }

    if (row === 1) {
      return {
        top: '15.5%',
        left: col <= 3 ? '15.5%' : col >= 5 ? 'auto' : '50%',
        right: col >= 5 ? '15.5%' : 'auto',
        transform: col === 4 ? 'translateX(-50%)' : 'none',
      };
    } else if (row === 7) {
      return {
        bottom: '15.5%',
        left: col <= 3 ? '15.5%' : col >= 5 ? 'auto' : '50%',
        right: col >= 5 ? '15.5%' : 'auto',
        transform: col === 4 ? 'translateX(-50%)' : 'none',
      };
    } else if (col === 1) {
      return {
        left: '15.5%',
        top: row <= 3 ? '15.5%' : row >= 5 ? 'auto' : '50%',
        bottom: row >= 5 ? '15.5%' : 'auto',
        transform: row === 4 ? 'translateY(-50%)' : 'none',
      };
    } else {
      return {
        right: '15.5%',
        top: row <= 3 ? '15.5%' : row >= 5 ? 'auto' : '50%',
        bottom: row >= 5 ? '15.5%' : 'auto',
        transform: row === 4 ? 'translateY(-50%)' : 'none',
      };
    }
  };

  const hoveredProperty =
    hoveredPropertyIndex !== null && board[hoveredPropertyIndex]?.price > 0
      ? board[hoveredPropertyIndex]
      : null;

  return (
    <div
      className="relative w-full max-w-[620px] sm:max-w-[640px] aspect-square rounded-[36px] p-2.5 sm:p-3.5 
                 bg-[#cbb390] shadow-[0_20px_50px_rgba(75,46,20,0.35),inset_0_4px_10px_rgba(255,255,255,0.4)] 
                 border-[12px] sm:border-[16px] border-[#7a4820] select-none"
      style={{
        backgroundImage: `
          radial-gradient(#b89d75 1.5px, transparent 1.5px),
          linear-gradient(135deg, #dfcaa9 0%, #c4ab85 100%)
        `,
        backgroundSize: '16px 16px, 100% 100%',
      }}
    >
      {/* 7x7 Grid encompassing the 24 perimeter squares and center hub */}
      <div className="grid grid-cols-7 grid-rows-7 gap-1 sm:gap-1.5 w-full h-full">
        {board.map((square, index) => {
          let col = 1;
          let row = 1;
          if (index < 7) {
            col = index + 1;
            row = 1;
          } else if (index < 13) {
            col = 7;
            row = index - 6 + 1;
          } else if (index < 19) {
            col = 7 - (index - 12);
            row = 7;
          } else {
            col = 1;
            row = 7 - (index - 18);
          }

          const theme = getSquareTheme(square.type);
          const owner = square.owner !== undefined ? players[square.owner] : null;
          const isProperty = square.price > 0;

          return (
            <div
              key={square.id}
              style={{ gridColumn: col, gridRow: row }}
              onMouseEnter={() => {
                if (isProperty) setHoveredPropertyIndex(index);
              }}
              onMouseLeave={() => {
                if (isProperty) setHoveredPropertyIndex(null);
              }}
              className={`relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border-2 ${theme.border} ${theme.cardBg}
                shadow-[0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(255,255,255,0.7)]
                transition-all duration-300 p-0.5 sm:p-1 group ${
                  isProperty ? 'hover:brightness-105 cursor-pointer' : ''
                }`}
            >
              {/* Owner Translucent Tint Overlay */}
              {owner && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-25"
                  style={{ backgroundColor: owner.color }}
                />
              )}

              {/* Dedicated Dynamic CSS House / Hotel Area in the Top-Right Corner */}
              <PropertyHouseArea level={square.houseLevel} />

              {/* Square Header Bar (Left aligned title, icon hides when houses take top-right) */}
              <div
                className={`w-full py-0.5 px-1 rounded-t-md sm:rounded-t-lg flex items-center justify-between text-[8px] sm:text-[10px] font-bold ${theme.banner} shadow-2xs`}
              >
                <span className="truncate max-w-[34px] sm:max-w-[42px]">{square.name}</span>
                {square.houseLevel === 0 && (
                  <span className="text-[9px] sm:text-[11px] leading-none">{theme.icon}</span>
                )}
              </div>

              {/* Center Info: Owner Badge */}
              <div className="flex-1 flex flex-col items-center justify-center my-0.5 relative z-10">
                {owner && (
                  <div
                    className="text-[7px] sm:text-[7.5px] font-bold text-white px-1.5 py-0.2 rounded-full shadow-2xs truncate max-w-[54px]"
                    style={{ backgroundColor: owner.color }}
                  >
                    {owner.name}
                  </div>
                )}
              </div>

              {/* Square Bottom: Price is anchored at the bottom, never obscured */}
              <div className="w-full flex items-center justify-center relative z-10 pb-0.5">
                {square.price > 0 ? (
                  <div className="flex items-center gap-0.5 text-[8px] sm:text-[9.5px] font-extrabold text-[#795548] leading-none">
                    <span>${square.price}</span>
                  </div>
                ) : (
                  <span className="text-[7px] sm:text-[8px] text-gray-500 font-medium leading-none">
                    {square.type === 'start'
                      ? '+150金'
                      : square.type === 'chance'
                      ? '随机事件'
                      : square.type === 'tax'
                      ? '税收60'
                      : '休憩地'}
                  </span>
                )}
              </div>

              {/* Player Pawns on this tile */}
              <div className="absolute inset-0 flex items-center justify-center gap-1 z-30 pointer-events-none">
                {players
                  .filter((p) => p.position === index && !p.isBankrupt)
                  .map((p) => (
                    <CssPawn
                      key={p.id}
                      color={p.color}
                      isCurrent={p.id === currentPlayerIndex}
                      name={p.name}
                      isMoving={p.id === currentPlayerIndex && isMovingPawn}
                    />
                  ))}
              </div>
            </div>
          );
        })}

        {/* Central Tabletop Hub (occupying 5x5 center grid) */}
        <div
          className="col-start-2 col-end-7 row-start-2 row-end-7 m-1 sm:m-2 rounded-2xl sm:rounded-3xl 
                     bg-gradient-to-br from-[#f8f2e6] via-[#f1e5cf] to-[#e4d1b4] 
                     border-4 border-[#d5be9b] shadow-[inset_0_4px_12px_rgba(255,255,255,0.8),0_10px_25px_rgba(90,55,25,0.2)] 
                     p-3 sm:p-5 flex flex-col items-center justify-between text-center relative overflow-hidden"
        >
          {/* Subtle concentric rings like reference image */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-56 h-56 rounded-full border border-[#8b5a2b]" />
            <div className="w-40 h-40 rounded-full border border-[#8b5a2b] absolute" />
            <div className="w-24 h-24 rounded-full border border-[#8b5a2b] absolute" />
          </div>

          {/* Top Info Banner */}
          <div className="z-10 w-full flex items-center justify-between px-2">
            <div className="text-left">
              <span className="text-[10px] sm:text-xs text-[#8c6d48] font-bold">
                {gameMode === 'BANKRUPTCY' ? '淘汰决胜模式' : '家庭大富翁'}
              </span>
              <div className="text-xs sm:text-sm font-extrabold text-[#5c3a1e]">
                {gameMode === 'BANKRUPTCY'
                  ? `第 ${round} 轮 · 决战到底`
                  : `第 ${round} / ${maxRounds} 轮`}
              </div>
            </div>

            {activePlayer && (
              <div className="flex items-center gap-1.5 bg-white/70 backdrop-blur-xs py-1 px-3 rounded-full border border-[#dfceb5] shadow-xs">
                <span className="text-base leading-none">{activePlayer.avatarIcon}</span>
                <span className="text-xs sm:text-sm font-bold text-[#4e342e]">
                  {activePlayer.name} 回合
                </span>
              </div>
            )}
          </div>

          {/* Centerpiece Pedestal & Roll Button */}
          <div className="z-10 my-auto flex flex-col items-center">
            {/* Raised Circular Base */}
            <div className="relative p-2 rounded-full bg-gradient-to-b from-[#f5ebd9] to-[#d6c0a0] shadow-[0_6px_12px_rgba(0,0,0,0.15)] border-2 border-[#e6d7c3]">
              <button
                disabled={!canRoll || isAiTurn}
                onClick={onRollDice}
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full font-black text-white text-base sm:text-lg flex flex-col items-center justify-center 
                  shadow-[0_8px_20px_rgba(211,84,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.6)] 
                  border-4 border-white transition-all duration-300 ${
                    !canRoll || isAiTurn
                      ? 'bg-gradient-to-b from-gray-400 to-gray-500 cursor-not-allowed opacity-80'
                      : 'bg-gradient-to-b from-[#e67e22] via-[#d35400] to-[#b03a2e] hover:scale-105 active:scale-95 hover:shadow-[0_12px_24px_rgba(211,84,0,0.5)] cursor-pointer'
                  }`}
              >
                <span className="text-2xl sm:text-3xl mb-0.5">🎲</span>
                <span>{isAiTurn ? 'AI思考' : '掷骰子'}</span>
              </button>
            </div>

            <p className="text-[11px] sm:text-xs text-[#7d5f3f] font-semibold mt-2">
              {isAiTurn ? '🤖 智能伙伴正在计算与掷骰...' : '👉 点击大按钮开始投掷两颗骰子'}
            </p>
          </div>

          {/* Bottom Action Strip: Quick House Build / Hotel Upgrade prompt */}
          <div className="z-10 w-full flex items-center justify-center gap-2">
            {canBuildOnCurrentSquare && onBuildHouse && (
              <button
                onClick={() => onBuildHouse(currentPos)}
                className="bg-gradient-to-r from-[#2e7d32] to-[#43a047] text-white text-xs font-bold py-1.5 px-4 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-pointer flex items-center gap-1 border border-white"
              >
                <span>🔨</span>
                <span>
                  {currentSquare.houseLevel === 4
                    ? '升级为豪华旅馆 (100金)'
                    : `在此建房 (第${currentSquare.houseLevel + 1}栋·100金)`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Property Hover Detail Card (Floating Tooltip) */}
      {hoveredProperty && (
        <div
          style={getCardPosition(hoveredPropertyIndex)}
          className="absolute z-50 pointer-events-none w-[205px] sm:w-[225px] 
                     bg-[#fffdf9]/98 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 
                     border-2 border-[#b8956e] shadow-[0_14px_32px_rgba(50,25,10,0.38)] 
                     transition-all duration-150 text-[#4a3525] animate-in fade-in zoom-in-95"
        >
          {/* Card Header: Name + Price */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#ebdcb9]">
            <div className="flex items-center gap-1.5 truncate pr-1">
              <span className="text-sm leading-none shrink-0">
                {getSquareTheme(hoveredProperty.type).icon}
              </span>
              <span className="font-black text-xs sm:text-sm text-[#5c3a1e] truncate">
                {hoveredProperty.name}
              </span>
            </div>
            <span className="text-[10px] font-extrabold text-[#d35400] bg-[#fbebe1] px-1.5 py-0.5 rounded-md border border-[#f5cbb0] shrink-0">
              ${hoveredProperty.price}
            </span>
          </div>

          {/* Owner & Status Rows */}
          <div className="space-y-1 mb-2 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-[#8c6f56]">所有者：</span>
              {hoveredProperty.owner !== undefined && players[hoveredProperty.owner] ? (
                <span
                  className="font-bold text-white px-2 py-0.5 rounded-full text-[9px] shadow-2xs flex items-center gap-1"
                  style={{ backgroundColor: players[hoveredProperty.owner].color }}
                >
                  <span>{players[hoveredProperty.owner].avatarIcon}</span>
                  <span className="truncate max-w-[70px]">{players[hoveredProperty.owner].name}</span>
                </span>
              ) : (
                <span className="font-bold text-[#2e7d32] bg-[#edf7ed] px-1.5 py-0.2 rounded-md border border-[#c8e6c9]">
                  待售中 · 无人拥有
                </span>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#8c6f56]">房屋等级：</span>
              <span className="font-extrabold text-[#795548]">
                {hoveredProperty.houseLevel === 0
                  ? '基础地皮 (未建房)'
                  : hoveredProperty.houseLevel >= 5
                  ? '五星豪华旅馆 🏨'
                  : `${hoveredProperty.houseLevel} 栋房屋 🏠`}
              </span>
            </div>
          </div>

          {/* Rent Schedule Table (各级租金) */}
          <div className="bg-[#f7efe3] rounded-xl p-1.5 border border-[#e6d6c0]">
            <div className="text-[9px] font-black text-[#7a5839] mb-1 px-1 flex justify-between items-center">
              <span>各级租金标准</span>
              <span className="text-[8px] font-normal text-[#9c7d5c]">(到访应付)</span>
            </div>
            <div className="space-y-0.5 text-[8.5px] sm:text-[9.5px]">
              {[
                { lvl: 0, label: '无房地皮', rent: hoveredProperty.rent },
                { lvl: 1, label: '1 栋房屋', rent: hoveredProperty.rent + 45 },
                { lvl: 2, label: '2 栋房屋', rent: hoveredProperty.rent + 90 },
                { lvl: 3, label: '3 栋房屋', rent: hoveredProperty.rent + 135 },
                { lvl: 4, label: '4 栋房屋', rent: hoveredProperty.rent + 180 },
                { lvl: 5, label: '五星旅馆', rent: hoveredProperty.rent + 225 },
              ].map((item) => {
                const isCurrent = hoveredProperty.houseLevel === item.lvl;
                return (
                  <div
                    key={item.lvl}
                    className={`flex justify-between items-center px-1.5 py-0.5 rounded-md ${
                      isCurrent
                        ? 'bg-[#d35400] text-white font-black shadow-xs'
                        : 'text-[#5d4037] font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{item.label}</span>
                      {isCurrent && (
                        <span className="text-[7px] bg-white text-[#d35400] font-black px-1 rounded-xs leading-none">
                          当前
                        </span>
                      )}
                    </div>
                    <span className={isCurrent ? 'text-white font-black' : 'font-bold text-[#8c6f56]'}>
                      ${item.rent}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

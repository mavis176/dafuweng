import React, { useState } from 'react';
import { Player, Property, GameMode, MapTheme } from '../types';

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
  mapTheme?: MapTheme;
  isMovingPawn?: boolean;
  onBuildHouse?: (propertyIndex: number) => void;
  onOpenBackpack?: () => void;
}

// House Color Theme based on property owner
export interface HouseTheme {
  roofColor: string;
  bodyGradient: string;
  borderColor: string;
  doorColor: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  hotelRoof: string;
  hotelGradient: string;
  hotelBorder: string;
  hotelLetterColor: string;
}

export const getPlayerHouseTheme = (player?: Player | null): HouseTheme => {
  if (!player) {
    return {
      roofColor: '#1b5e20',
      bodyGradient: 'linear-gradient(to bottom, #43a047, #2e7d32)',
      borderColor: '#e8f5e9',
      doorColor: '#1b5e20',
      badgeBg: 'rgba(255, 255, 255, 0.95)',
      badgeBorder: '#81c784',
      textColor: '#1b5e20',
      hotelRoof: '#b71c1c',
      hotelGradient: 'linear-gradient(to bottom, #e53935, #b71c1c)',
      hotelBorder: '#ffcdd2',
      hotelLetterColor: '#ffffff',
    };
  }

  const hex = (player.color || '').toUpperCase();

  // Red theme (Player 1)
  if (
    hex.includes('E53935') ||
    hex.includes('D32F2F') ||
    hex.includes('EF4444') ||
    player.id === 0
  ) {
    return {
      roofColor: '#991b1b',
      bodyGradient: 'linear-gradient(to bottom, #ef4444, #b91c1c)',
      borderColor: '#fecaca',
      doorColor: '#7f1d1d',
      badgeBg: 'rgba(254, 242, 242, 0.96)',
      badgeBorder: '#f87171',
      textColor: '#b91c1c',
      hotelRoof: '#7f1d1d',
      hotelGradient: 'linear-gradient(to bottom, #ef4444, #991b1b)',
      hotelBorder: '#fca5a5',
      hotelLetterColor: '#ffffff',
    };
  }

  // Blue theme (Player 2)
  if (
    hex.includes('0288D1') ||
    hex.includes('1E88E5') ||
    hex.includes('2563EB') ||
    hex.includes('1976D2') ||
    player.id === 1
  ) {
    return {
      roofColor: '#1e3a8a',
      bodyGradient: 'linear-gradient(to bottom, #3b82f6, #1d4ed8)',
      borderColor: '#bfdbfe',
      doorColor: '#172554',
      badgeBg: 'rgba(239, 246, 255, 0.96)',
      badgeBorder: '#60a5fa',
      textColor: '#1d4ed8',
      hotelRoof: '#172554',
      hotelGradient: 'linear-gradient(to bottom, #3b82f6, #1e3a8a)',
      hotelBorder: '#93c5fd',
      hotelLetterColor: '#ffffff',
    };
  }

  // Green theme (Player 3 / AI 1)
  if (
    hex.includes('43A047') ||
    hex.includes('2E7D32') ||
    hex.includes('16A34A') ||
    player.id === 2
  ) {
    return {
      roofColor: '#14532d',
      bodyGradient: 'linear-gradient(to bottom, #22c55e, #15803d)',
      borderColor: '#bbf7d0',
      doorColor: '#052e16',
      badgeBg: 'rgba(240, 253, 244, 0.96)',
      badgeBorder: '#4ade80',
      textColor: '#15803d',
      hotelRoof: '#052e16',
      hotelGradient: 'linear-gradient(to bottom, #22c55e, #14532d)',
      hotelBorder: '#86efac',
      hotelLetterColor: '#ffffff',
    };
  }

  // Purple theme (Player 4 / AI 2)
  if (
    hex.includes('8E24AA') ||
    hex.includes('7B1FA2') ||
    hex.includes('9333EA') ||
    player.id === 3
  ) {
    return {
      roofColor: '#581c87',
      bodyGradient: 'linear-gradient(to bottom, #a855f7, #7e22ce)',
      borderColor: '#e9d5ff',
      doorColor: '#3b0764',
      badgeBg: 'rgba(250, 245, 255, 0.96)',
      badgeBorder: '#c084fc',
      textColor: '#7e22ce',
      hotelRoof: '#3b0764',
      hotelGradient: 'linear-gradient(to bottom, #a855f7, #581c87)',
      hotelBorder: '#d8b4fe',
      hotelLetterColor: '#ffffff',
    };
  }

  // Fallback for custom player colors
  return {
    roofColor: player.color,
    bodyGradient: `linear-gradient(to bottom, ${player.color}, #1f2937)`,
    borderColor: '#ffffff',
    doorColor: '#111827',
    badgeBg: 'rgba(255, 255, 255, 0.96)',
    badgeBorder: player.color,
    textColor: player.color,
    hotelRoof: player.color,
    hotelGradient: `linear-gradient(to bottom, ${player.color}, #111827)`,
    hotelBorder: '#ffffff',
    hotelLetterColor: '#ffffff',
  };
};

// Pure CSS Single House Item styled with player's color
const SingleCssHouse: React.FC<{ index: number; theme: HouseTheme; ownerName?: string }> = ({
  index,
  theme,
  ownerName,
}) => (
  <div
    className="flex flex-col items-center"
    title={`${ownerName ? `${ownerName}的` : ''}第 ${index + 1} 栋房屋`}
  >
    {/* Gable Roof */}
    <div
      className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[3.5px]"
      style={{ borderBottomColor: theme.roofColor }}
    />
    {/* House Body */}
    <div
      className="w-2.5 h-2.5 rounded-2xs border shadow-2xs relative flex items-end justify-center"
      style={{
        background: theme.bodyGradient,
        borderColor: theme.borderColor,
      }}
    >
      {/* Tiny Door */}
      <div
        className="w-0.5 h-1 rounded-t-2xs"
        style={{ backgroundColor: theme.doorColor }}
      />
    </div>
  </div>
);

// Pure CSS Exclusive Hotel Item styled with player's color
const ExclusiveCssHotel: React.FC<{ theme: HouseTheme; ownerName?: string }> = ({
  theme,
  ownerName,
}) => (
  <div
    className="flex flex-col items-center"
    title={`${ownerName ? `${ownerName}的` : ''}五星超级豪华旅馆`}
  >
    {/* Hotel Roof */}
    <div
      className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[5px]"
      style={{ borderBottomColor: theme.hotelRoof }}
    />
    {/* Hotel Body */}
    <div
      className="w-4 h-3.5 rounded-2xs border shadow-2xs flex items-center justify-center"
      style={{
        background: theme.hotelGradient,
        borderColor: theme.hotelBorder,
      }}
    >
      <span
        className="text-[7.5px] font-black leading-none tracking-tighter"
        style={{ color: theme.hotelLetterColor }}
      >
        H
      </span>
    </div>
  </div>
);

// Dedicated Dynamic House Area in Top-Right Corner of Property Tiles
export const PropertyHouseArea: React.FC<{
  level: number;
  owner?: Player | null;
}> = ({ level, owner }) => {
  if (level <= 0) return null;

  const theme = getPlayerHouseTheme(owner);

  // Level 5+ is Exclusive Hotel
  if (level >= 5) {
    return (
      <div
        className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-20 flex items-center gap-0.5 
                   backdrop-blur-2xs px-1 py-0.5 rounded-md 
                   shadow-[0_1px_4px_rgba(0,0,0,0.18)] animate-bounce-in"
        style={{
          backgroundColor: theme.badgeBg,
          borderColor: theme.badgeBorder,
          borderWidth: 1.5,
        }}
        title={`${owner ? `${owner.name}的` : ''}五星豪华旅馆`}
      >
        <ExclusiveCssHotel theme={theme} ownerName={owner?.name} />
        <span
          className="text-[7px] sm:text-[8px] font-black leading-none"
          style={{ color: theme.textColor }}
        >
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
                 backdrop-blur-2xs px-0.5 sm:px-1 py-0.5 rounded-md 
                 shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
      style={{
        backgroundColor: theme.badgeBg,
        borderColor: theme.badgeBorder,
        borderWidth: 1.2,
      }}
      title={`${owner ? `${owner.name}已建房屋` : '已建房屋'}: ${count} 栋`}
    >
      <div className="flex items-end gap-0.5">
        {Array.from({ length: count }).map((_, i) => (
          <SingleCssHouse key={i} index={i} theme={theme} ownerName={owner?.name} />
        ))}
      </div>
      <span
        className="text-[6.5px] sm:text-[7.5px] font-black leading-none ml-0.5"
        style={{ color: theme.textColor }}
      >
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
  isJailed?: boolean;
}> = ({
  color,
  isCurrent,
  name,
  isMoving,
  isJailed,
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
      title={isJailed ? `${name} (服刑中)` : name}
    >
      {/* Jail Icon Indicator */}
      {isJailed && (
        <span className="absolute -top-3.5 z-40 text-[10px] filter drop-shadow animate-bounce">
          ⛓️
        </span>
      )}

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
  mapTheme = 'MODERN',
  isMovingPawn = false,
  onBuildHouse,
  onOpenBackpack,
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
          icon: mapTheme === 'ANCIENT' ? '⛩️' : '🚩',
        };
      case 'ancient_shop':
        return {
          banner: 'bg-[#c0392b] text-white',
          cardBg: 'bg-[#fff5f5]',
          border: 'border-[#ef9a9a]',
          icon: '🏮',
        };
      case 'pawn':
        return {
          banner: 'bg-[#b45309] text-white',
          cardBg: 'bg-[#fffbeb]',
          border: 'border-[#fcd34d]',
          icon: '⚖️',
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
          icon: mapTheme === 'ANCIENT' ? '🍶' : '🍰',
        };
      case 'bookstore':
        return {
          banner: 'bg-[#5c6bc0] text-white',
          cardBg: 'bg-[#e8eaf6]',
          border: 'border-[#9fa8da]',
          icon: mapTheme === 'ANCIENT' ? '📜' : '📚',
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
          icon: mapTheme === 'ANCIENT' ? '🏮' : '🌳',
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
          icon: mapTheme === 'ANCIENT' ? '📜' : '🏛️',
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

  const isAncient = mapTheme === 'ANCIENT';

  return (
    <div
      className={`relative w-full max-w-[620px] sm:max-w-[640px] aspect-square rounded-[36px] p-2.5 sm:p-3.5 select-none transition-all duration-300 ${
        isAncient
          ? 'bg-[#2b180d] shadow-[0_22px_55px_rgba(25,12,5,0.55),inset_0_4px_10px_rgba(255,235,200,0.2)] border-[12px] sm:border-[16px] border-[#221309]'
          : 'bg-[#cbb390] shadow-[0_20px_50px_rgba(75,46,20,0.35),inset_0_4px_10px_rgba(255,255,255,0.4)] border-[12px] sm:border-[16px] border-[#7a4820]'
      }`}
      style={
        isAncient
          ? {
              backgroundColor: '#f6f0e2',
              backgroundImage: `
                radial-gradient(#cbbba0 1.2px, transparent 1.2px),
                linear-gradient(135deg, #faf5eb 0%, #ede3cb 50%, #f5eee0 100%)
              `,
              backgroundSize: '16px 16px, 100% 100%',
            }
          : {
              backgroundImage: `
                radial-gradient(#b89d75 1.5px, transparent 1.5px),
                linear-gradient(135deg, #dfcaa9 0%, #c4ab85 100%)
              `,
              backgroundSize: '16px 16px, 100% 100%',
            }
      }
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
          const isMortgaged = square.isMortgaged;

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
              className={`relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border-2 ${
                isMortgaged ? 'border-dashed border-[#b45309] opacity-90' : theme.border
              } ${isMortgaged ? 'bg-[#faf5ec]' : theme.cardBg}
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
              <PropertyHouseArea level={square.houseLevel} owner={owner} />

              {/* Mortgaged Stamp Overlay */}
              {isMortgaged && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/10 backdrop-blur-[0.5px]">
                  <div className="px-1.5 py-0.5 rounded-sm border-2 border-[#b45309] bg-[#fffbeb]/95 text-[#92400e] text-[7.5px] sm:text-[8.5px] font-black shadow-xs -rotate-12 tracking-wider">
                    {isAncient ? '已抵押·免租' : '抵押中'}
                  </div>
                </div>
              )}

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
                {isMortgaged ? (
                  <span className="text-[7px] sm:text-[8px] text-[#b45309] font-black leading-none bg-[#fef3c7] px-1 rounded">
                    抵押免租
                  </span>
                ) : square.price > 0 ? (
                  <div className="flex items-center gap-0.5 text-[8px] sm:text-[9.5px] font-extrabold text-[#795548] leading-none">
                    <span>{isAncient ? `${square.price}两` : `$${square.price}`}</span>
                  </div>
                ) : (
                  <span className="text-[7px] sm:text-[8px] text-gray-500 font-medium leading-none">
                    {square.type === 'start'
                      ? isAncient
                        ? '+100俸禄'
                        : '+150金'
                      : square.type === 'ancient_shop'
                      ? '商行采买'
                      : square.type === 'pawn'
                      ? '典当借银'
                      : square.type === 'chance'
                      ? isAncient
                        ? '庙会机缘'
                        : '随机事件'
                      : square.type === 'tax'
                      ? isAncient
                        ? '税司60两'
                        : '税收60'
                      : isAncient
                      ? '十里驿站'
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
                      isJailed={(p.jailTurns || 0) > 0}
                    />
                  ))}
              </div>
            </div>
          );
        })}

        {/* Central Tabletop Hub (occupying 5x5 center grid) */}
        <div
          className={`col-start-2 col-end-7 row-start-2 row-end-7 m-1 sm:m-2 rounded-2xl sm:rounded-3xl 
                     border-4 p-2.5 sm:p-5 flex flex-col items-center justify-between text-center relative overflow-hidden transition-all duration-300 ${
                       isAncient
                         ? 'bg-gradient-to-br from-[#faf4e6] via-[#f4ecd6] to-[#e8dcb9] border-[#cbb390] shadow-[inset_0_4px_14px_rgba(255,255,255,0.9),0_10px_25px_rgba(60,35,15,0.25)]'
                         : 'bg-gradient-to-br from-[#f8f2e6] via-[#f1e5cf] to-[#e4d1b4] border-[#d5be9b] shadow-[inset_0_4px_12px_rgba(255,255,255,0.8),0_10px_25px_rgba(90,55,25,0.2)]'
                     }`}
        >
          {/* Subtle concentric rings like reference image */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-56 h-56 rounded-full border border-[#8b5a2b]" />
            <div className="w-40 h-40 rounded-full border border-[#8b5a2b] absolute" />
            <div className="w-24 h-24 rounded-full border border-[#8b5a2b] absolute" />
          </div>

          {/* Ancient Theme Decorative Seal / Background Watermark */}
          {isAncient && (
            <div className="absolute -top-3 -right-3 pointer-events-none opacity-25 rotate-12">
              <div className="border-2 border-[#b91c1c] text-[#b91c1c] text-[9px] font-black p-1.5 rounded-sm tracking-widest flex flex-col items-center leading-none">
                <span>盛世</span>
                <span>通宝</span>
              </div>
            </div>
          )}

          {/* Top Info Banner */}
          <div className="z-10 w-full flex items-center justify-between px-1 sm:px-2">
            <div className="text-left">
              <span className="text-[10px] sm:text-xs text-[#8c6d48] font-bold">
                {isAncient ? '🏮 盛世市井' : '🏰 现代乐园'} ·{' '}
                {gameMode === 'BANKRUPTCY' ? (isAncient ? '破产决胜' : '淘汰决胜') : (isAncient ? '商战争霸' : '轮数争霸')}
              </span>
              <div className="text-xs sm:text-sm font-extrabold text-[#5c3a1e]">
                {gameMode === 'BANKRUPTCY'
                  ? isAncient
                    ? `第 ${round} 巡 · 决胜到底`
                    : `第 ${round} 轮 · 决战到底`
                  : isAncient
                  ? `第 ${round} / ${maxRounds} 巡 · 万贯争雄`
                  : `第 ${round} / ${maxRounds} 轮`}
              </div>
            </div>

            {activePlayer && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Backpack Button */}
                {onOpenBackpack && (
                  <button
                    type="button"
                    onClick={onOpenBackpack}
                    className="flex items-center gap-1 bg-[#fff8e7] hover:bg-[#faeed0] border border-[#d5be9b] text-[#7a4820] font-extrabold px-2 sm:px-2.5 py-1 rounded-full text-[9px] sm:text-xs shadow-2xs hover:shadow-xs transition cursor-pointer"
                    title={isAncient ? '打开随身锦囊查看与使用道具' : '打开锦囊背包查看与使用道具'}
                  >
                    <span>🎒</span>
                    <span>{isAncient ? '随身锦囊' : '背包'} ({activePlayer.items?.length || 0})</span>
                  </button>
                )}

                <div className="flex items-center gap-1 sm:gap-1.5 bg-white/75 backdrop-blur-xs py-1 px-2.5 sm:px-3 rounded-full border border-[#dfceb5] shadow-xs">
                  <span className="text-base leading-none">{activePlayer.avatarIcon}</span>
                  <span className="text-xs sm:text-sm font-bold text-[#4e342e]">
                    {isAncient ? `轮至【${activePlayer.name}】东家` : `${activePlayer.name} 回合`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Active Buffs Bar */}
          {activePlayer && (activePlayer.activeDiscount || activePlayer.activeImmunity || (activePlayer.jailTurns || 0) > 0) && (
            <div className="z-10 flex flex-wrap items-center justify-center gap-1.5 mt-0.5 animate-pulse">
              {(activePlayer.jailTurns || 0) > 0 && (
                <span className="bg-[#fef2f2] border border-[#fca5a5] text-[#b91c1c] text-[8.5px] sm:text-[9.5px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                  ⛓️ 官府收监服刑中 (余{activePlayer.jailTurns}回合)
                </span>
              )}
              {activePlayer.activeDiscount && (
                <span className="bg-[#fff3e0] border border-[#ffb74d] text-[#e65100] text-[8.5px] sm:text-[9.5px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                  {isAncient ? '📑 置地半价契书生效中' : '📑 5折购地优惠中'}
                </span>
              )}
              {activePlayer.activeImmunity && (
                <span className="bg-[#e8f5e9] border border-[#81c784] text-[#2e7d32] text-[8.5px] sm:text-[9.5px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                  {isAncient ? '🛡️ 免罪符庇佑生效中' : '🛡️ 免租免税保护中'}
                </span>
              )}
            </div>
          )}

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
                      : (activePlayer?.jailTurns || 0) > 0
                      ? 'bg-gradient-to-b from-[#b91c1c] via-[#dc2626] to-[#991b1b] hover:scale-105 active:scale-95 hover:shadow-[0_12px_24px_rgba(185,28,28,0.5)] cursor-pointer'
                      : 'bg-gradient-to-b from-[#e67e22] via-[#d35400] to-[#b03a2e] hover:scale-105 active:scale-95 hover:shadow-[0_12px_24px_rgba(211,84,0,0.5)] cursor-pointer'
                  }`}
              >
                <span className="text-2xl sm:text-3xl mb-0.5">
                  {(activePlayer?.jailTurns || 0) > 0 ? '⛓️' : '🎲'}
                </span>
                <span>
                  {isAiTurn
                    ? (isAncient ? '东家推演' : 'AI思考')
                    : (activePlayer?.jailTurns || 0) > 0
                    ? '服刑停留'
                    : (isAncient ? '投掷骨骰' : '掷骰子')}
                </span>
              </button>
            </div>

            <p className="text-[11px] sm:text-xs text-[#7d5f3f] font-semibold mt-2">
              {isAiTurn
                ? isAncient
                  ? '🤖 智能东家正在推演商略与掷骰...'
                  : '🤖 智能伙伴正在计算与掷骰...'
                : (activePlayer?.jailTurns || 0) > 0
                ? '⛓️ 涉案羁押服刑中 · 点击跳过本回合行动'
                : isAncient
                ? '👉 执骰定乾坤 · 步步生财'
                : '👉 点击大按钮开始投掷两颗骰子'}
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
                  {isAncient
                    ? currentSquare.houseLevel === 4
                      ? '晋升五星豪华别苑 (100两)'
                      : `起造府邸 (起造第${currentSquare.houseLevel + 1}进·100两)`
                    : currentSquare.houseLevel === 4
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
          className="absolute z-50 pointer-events-none w-[215px] sm:w-[235px] 
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
              {isAncient ? `${hoveredProperty.price}两` : `$${hoveredProperty.price}`}
            </span>
          </div>

          {/* Owner & Status Rows */}
          <div className="space-y-1 mb-2 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-[#8c6f56]">{isAncient ? '当朝东家：' : '所有者：'}</span>
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
                  {isAncient ? '官府官产 · 待购置' : '待售中 · 无人拥有'}
                </span>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#8c6f56]">{isAncient ? '庭院进深：' : '房屋等级：'}</span>
              <span className="font-extrabold text-[#795548] flex items-center gap-1">
                {hoveredProperty.houseLevel === 0 ? (
                  isAncient ? '基础产业 (未建院落)' : '基础地皮 (未建房)'
                ) : (
                  <span
                    className="px-1.5 py-0.2 rounded-md text-[9px] font-black text-white shadow-2xs"
                    style={{
                      backgroundColor:
                        hoveredProperty.owner !== undefined && players[hoveredProperty.owner]
                          ? players[hoveredProperty.owner].color
                          : '#2e7d32',
                    }}
                  >
                    {hoveredProperty.houseLevel >= 5
                      ? isAncient
                        ? '🏯 五星豪华别苑'
                        : '🏨 五星豪华旅馆'
                      : isAncient
                      ? `🏡 ${hoveredProperty.houseLevel} 进深庭院`
                      : `🏠 ${hoveredProperty.houseLevel} 栋房屋`}
                  </span>
                )}
              </span>
            </div>

            {/* Mortgage Status if applicable */}
            {hoveredProperty.isMortgaged && (
              <div className="flex justify-between items-center bg-[#fffbeb] p-1 rounded border border-[#fde68a]">
                <span className="text-[#b45309] font-bold">地产状态：</span>
                <span className="font-extrabold text-[#b45309]">
                  【已在当铺抵押 · 暂免收租】
                </span>
              </div>
            )}
          </div>

          {/* Rent Schedule Table (各级租金) */}
          <div className="bg-[#f7efe3] rounded-xl p-1.5 border border-[#e6d6c0]">
            <div className="text-[9px] font-black text-[#7a5839] mb-1 px-1 flex justify-between items-center">
              <span>{isAncient ? '各级规费茶资标准' : '各级租金标准'}</span>
              <span className="text-[8px] font-normal text-[#9c7d5c]">(到访应付)</span>
            </div>
            <div className="space-y-0.5 text-[8.5px] sm:text-[9.5px]">
              {[
                { lvl: 0, label: isAncient ? '地皮规费' : '无房地皮', rent: hoveredProperty.rent },
                { lvl: 1, label: isAncient ? '1 进院落' : '1 栋房屋', rent: hoveredProperty.rent + 45 },
                { lvl: 2, label: isAncient ? '2 进院落' : '2 栋房屋', rent: hoveredProperty.rent + 90 },
                { lvl: 3, label: isAncient ? '3 进院落' : '3 栋房屋', rent: hoveredProperty.rent + 135 },
                { lvl: 4, label: isAncient ? '4 进院落' : '4 栋房屋', rent: hoveredProperty.rent + 180 },
                { lvl: 5, label: isAncient ? '豪华别苑' : '五星旅馆', rent: hoveredProperty.rent + 225 },
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
                      {hoveredProperty.isMortgaged ? '免收' : isAncient ? `${item.rent}两` : `$${item.rent}`}
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

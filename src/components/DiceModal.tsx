import React, { useEffect, useState } from 'react';
import { soundManager } from '../utils/audio';

interface DiceProps {
  value: number;
  rolling: boolean;
}

export const RealDie: React.FC<DiceProps> = ({ value, rolling }) => {
  // 3x3 grid mapping: [row (1-3), col (1-3)]
  const getDotCoordinates = (val: number): [number, number][] => {
    switch (val) {
      case 1:
        return [[2, 2]];
      case 2:
        return [
          [1, 1],
          [3, 3],
        ];
      case 3:
        return [
          [1, 1],
          [2, 2],
          [3, 3],
        ];
      case 4:
        return [
          [1, 1],
          [1, 3],
          [3, 1],
          [3, 3],
        ];
      case 5:
        return [
          [1, 1],
          [1, 3],
          [2, 2],
          [3, 1],
          [3, 3],
        ];
      case 6:
        return [
          [1, 1],
          [2, 1],
          [3, 1],
          [1, 3],
          [2, 3],
          [3, 3],
        ];
      default:
        return [[2, 2]];
    }
  };

  const dots = getDotCoordinates(value);

  return (
    <div
      className={`relative w-20 h-20 bg-gradient-to-br from-white via-[#faf9f6] to-[#ece7de] rounded-2xl p-2.5 
        border-2 border-[#e0d6c3] shadow-[0_8px_16px_rgba(0,0,0,0.18),inset_0_2px_4px_rgba(255,255,255,0.9)] 
        transition-all duration-200 select-none ${rolling ? 'animate-shake' : 'hover:scale-105'}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        alignItems: 'center',
        justifyItems: 'center',
      }}
    >
      {dots.map(([r, c], i) => (
        <div
          key={i}
          className={`w-3.5 h-3.5 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.4)] ${
            value === 1 ? 'bg-[#d32f2f] w-4 h-4' : 'bg-[#1e1b18]'
          }`}
          style={{
            gridRow: r,
            gridColumn: c,
          }}
        />
      ))}
    </div>
  );
};

interface DiceModalProps {
  d1: number;
  d2: number;
  isAI?: boolean;
  playerName?: string;
  onClose: () => void;
}

export const DiceModal: React.FC<DiceModalProps> = ({ d1, d2, isAI, playerName, onClose }) => {
  const [rolling, setRolling] = useState(true);
  const [displayD1, setDisplayD1] = useState(d1);
  const [displayD2, setDisplayD2] = useState(d2);

  useEffect(() => {
    // Play realistic dice clatter sound effect
    soundManager.playDiceRoll();

    // Initial rattle effect
    let interval: NodeJS.Timeout | null = null;
    interval = setInterval(() => {
      setDisplayD1(Math.floor(Math.random() * 6) + 1);
      setDisplayD2(Math.floor(Math.random() * 6) + 1);
    }, 80);

    const timer = setTimeout(() => {
      if (interval) clearInterval(interval);
      setDisplayD1(d1);
      setDisplayD2(d2);
      setRolling(false);
    }, 600);

    return () => {
      if (interval) clearInterval(interval);
      clearTimeout(timer);
    };
  }, [d1, d2]);

  const total = d1 + d2;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-[#fbf7f0] w-full max-w-sm p-6 sm:p-8 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.25)] text-center border-4 border-[#e3d3bd] relative overflow-hidden">
        {/* Decorative corner tag */}
        <div className="text-xs font-semibold text-[#8b5a2b] bg-[#f0e3ce] py-1 px-4 rounded-full inline-block mb-3 shadow-xs">
          {playerName ? `${playerName} 的行动回合` : '家庭大富翁'}
        </div>

        <h2 className="text-2xl font-bold text-[#5c3a1e] mb-1">
          {rolling ? '🎲 骰子飞速翻滚中...' : '🎉 本次掷出的点数'}
        </h2>
        <p className="text-xs text-[#8c745d] mb-6">
          {rolling ? '愿幸运之神眷顾你！' : `两个骰子点数合计 ${total} 点`}
        </p>

        {/* Dice container */}
        <div className="flex gap-6 justify-center items-center py-4 mb-6 bg-[#eedfc8]/50 rounded-2xl border border-[#dfceb5] shadow-inner">
          <RealDie value={displayD1} rolling={rolling} />
          <div className="text-2xl font-bold text-[#8b5a2b]">+</div>
          <RealDie value={displayD2} rolling={rolling} />
        </div>

        {/* Total number callout */}
        <div className="mb-6">
          <span className="text-sm text-[#735235]">前进步数：</span>
          <span className="text-3xl font-extrabold text-[#d35400] ml-2 tracking-tight">
            {rolling ? '?' : `${total} 格`}
          </span>
        </div>

        {/* Confirm button */}
        <button
          disabled={rolling}
          onClick={onClose}
          className={`w-full py-3.5 px-6 rounded-2xl font-bold text-base shadow-lg transition-all duration-200 ${
            rolling
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#d35400] to-[#e67e22] text-white hover:from-[#c0392b] hover:to-[#d35400] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
          }`}
        >
          {rolling ? '摇号中...' : isAI ? 'AI 确认前行 ➔' : '确认并开始移动棋子 ➔'}
        </button>
      </div>
    </div>
  );
};

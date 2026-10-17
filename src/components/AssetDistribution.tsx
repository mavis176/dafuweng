import React from 'react';
import { Player, Property, getPropertyValue } from '../types';

interface AssetDistributionProps {
  players: Player[];
  board: Property[];
  currentPlayerIndex: number;
}

export const AssetDistribution: React.FC<AssetDistributionProps> = ({
  players,
  board,
  currentPlayerIndex,
}) => {
  // Compute wealth for all players
  const playerStats = players.map((p) => {
    const propertyValue = p.properties.reduce((sum, propId) => sum + getPropertyValue(board[propId]), 0);
    const houseCount = p.properties.reduce((sum, propId) => sum + (board[propId]?.houseLevel || 0), 0);
    const totalAssets = p.money + propertyValue;
    return {
      ...p,
      propertyValue,
      houseCount,
      propertyCount: p.properties.length,
      totalAssets,
    };
  });

  const maxAssets = Math.max(...playerStats.map((p) => p.totalAssets), 1200);

  return (
    <div className="bg-[#fcf8f2] rounded-3xl p-5 shadow-[0_10px_25px_rgba(0,0,0,0.06)] border border-[#e8dac7] w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#eedfc9]">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h2 className="text-base font-extrabold text-[#5c3a1e]">家庭财产分布图</h2>
        </div>
        <span className="text-xs text-[#8c6d48] font-medium">总资产 = 现金 + 地产价值</span>
      </div>

      {/* Bar Chart Visualization */}
      <div className="flex items-end justify-around gap-3 h-44 px-2 py-2 bg-gradient-to-t from-[#f5ede1] to-[#fbf8f3] rounded-2xl border border-[#ede0cf] shadow-inner mb-4">
        {playerStats.map((p) => {
          const heightPercent = Math.max(Math.round((p.totalAssets / maxAssets) * 100), 18);
          const isCurrent = p.id === currentPlayerIndex;

          return (
            <div key={p.id} className="flex-1 flex flex-col items-center h-full justify-end group">
              {/* Value Label on Top of Bar */}
              <div
                className={`text-[10px] sm:text-xs font-black mb-1 transition-transform group-hover:scale-110 ${
                  isCurrent ? 'text-[#d35400]' : 'text-[#6d4c41]'
                }`}
              >
                ${p.totalAssets}
              </div>

              {/* Bar Column */}
              <div className="w-full max-w-[42px] flex flex-col justify-end h-full">
                <div
                  className={`w-full rounded-t-xl transition-all duration-700 ease-out shadow-md relative overflow-hidden ${
                    isCurrent ? 'ring-2 ring-[#e67e22] ring-offset-1' : ''
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    background: `linear-gradient(to top, ${p.color}, ${p.color}dd)`,
                  }}
                >
                  {/* Subtle gloss highlight */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent w-1/2" />
                </div>
              </div>

              {/* Player Tag at bottom */}
              <div className="mt-2 text-center w-full">
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-1 border border-white shadow-2xs"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-[10px] font-bold text-[#5d4037] truncate block max-w-full">
                  {p.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed breakdown list */}
      <div className="space-y-2">
        {playerStats.map((p) => {
          const isCurrent = p.id === currentPlayerIndex;
          return (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl transition-all duration-200 border flex items-center justify-between text-xs ${
                isCurrent
                  ? 'bg-[#fff5e6] border-[#f5b041] shadow-xs'
                  : 'bg-white/80 border-[#eee2d3] hover:bg-[#faf4ec]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{p.avatarIcon}</span>
                <div>
                  <div className="font-bold text-[#4e342e] flex items-center gap-1">
                    <span>{p.name}</span>
                    {p.isAI && (
                      <span className="text-[9px] bg-[#e0f2f1] text-[#00695c] font-normal px-1 rounded-sm">
                        AI
                      </span>
                    )}
                    {p.isBankrupt && (
                      <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-sm">
                        已破产
                      </span>
                    )}
                    {p.loans > 0 && !p.isBankrupt && (
                      <span className="text-[9px] bg-[#ffebee] text-[#c62828] font-normal px-1 rounded-sm">
                        借款{p.loans}次
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#8d6e63]">
                    {p.isBankrupt ? (
                      <span className="text-red-500 font-medium">已退出本次角逐</span>
                    ) : (
                      `现金: $${p.money} · 地产: ${p.propertyCount}处 · 房屋: ${p.houseCount}栋`
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-sm font-black ${p.isBankrupt ? 'text-gray-400 line-through' : 'text-[#d35400]'}`}>
                  ${p.totalAssets}
                </div>
                <div className="text-[9px] text-[#a1887f]">房产估值 ${p.propertyValue}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

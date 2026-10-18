import React from 'react';
import { GameEventModalState, MapTheme } from '../types';

interface GameEventModalProps {
  modalState: GameEventModalState;
  onClose: () => void;
  mapTheme: MapTheme;
}

export const GameEventModal: React.FC<GameEventModalProps> = ({
  modalState,
  onClose,
  mapTheme,
}) => {
  if (!modalState.show) return null;

  const isAncient = mapTheme === 'ANCIENT';
  const unit = isAncient ? '银两' : '金币';

  // Thematic config based on event type
  const eventConfig = {
    jail: {
      badgeBg: 'bg-[#fef2f2] border-[#fca5a5] text-[#b91c1c]',
      iconBg: 'bg-red-50 border-red-200 text-red-600',
      highlightBox: 'bg-[#fff5f5] border-[#fecaca] text-[#991b1b]',
      btnBg: 'from-[#b91c1c] to-[#dc2626] hover:from-[#991b1b] hover:to-[#b91c1c]',
      defaultIcon: '⛓️',
      typeLabel: isAncient ? '官府收监' : '被捕入狱',
    },
    bail: {
      badgeBg: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]',
      iconBg: 'bg-green-50 border-green-200 text-green-600',
      highlightBox: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]',
      btnBg: 'from-[#15803d] to-[#16a34a] hover:from-[#166534] hover:to-[#15803d]',
      defaultIcon: '🕊️',
      typeLabel: isAncient ? '恩准脱罪' : '取保出狱',
    },
    fine: {
      badgeBg: 'bg-[#fff1f2] border-[#fecdd3] text-[#be123c]',
      iconBg: 'bg-rose-50 border-rose-200 text-rose-600',
      highlightBox: 'bg-[#fff1f2] border-[#fecdd3] text-[#9f1239]',
      btnBg: 'from-[#be123c] to-[#e11d48] hover:from-[#9f1239] hover:to-[#be123c]',
      defaultIcon: '💸',
      typeLabel: isAncient ? '课税罚款' : '交管罚金',
    },
    reward: {
      badgeBg: 'bg-[#fefce8] border-[#fef08a] text-[#854d0e]',
      iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
      highlightBox: 'bg-[#fffdf0] border-[#fde68a] text-[#92400e]',
      btnBg: 'from-[#d97706] to-[#f59e0b] hover:from-[#b45309] hover:to-[#d97706]',
      defaultIcon: '💰',
      typeLabel: isAncient ? '赏赐银两' : '奖励资金',
    },
    chance: {
      badgeBg: 'bg-[#f5f3ff] border-[#ddd6fe] text-[#6d28d9]',
      iconBg: 'bg-purple-50 border-purple-200 text-purple-600',
      highlightBox: 'bg-[#faf5ff] border-[#e9d5ff] text-[#581c87]',
      btnBg: 'from-[#7c3aed] to-[#8b5cf6] hover:from-[#6d28d9] hover:to-[#7c3aed]',
      defaultIcon: '✨',
      typeLabel: isAncient ? '江湖机缘' : '机会卡',
    },
  }[modalState.eventType] || {
    badgeBg: 'bg-[#fef3c7] border-[#fde68a] text-[#b45309]',
    iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
    highlightBox: 'bg-[#fffdf0] border-[#fde68a] text-[#92400e]',
    btnBg: 'from-[#d35400] to-[#e67e22] hover:from-[#c0392b] hover:to-[#d35400]',
    defaultIcon: '✨',
    typeLabel: '游戏事件',
  };

  const displayIcon = modalState.icon || eventConfig.defaultIcon;

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div
        className={`rounded-[32px] max-w-sm sm:max-w-md w-full p-5 sm:p-7 text-center shadow-[0_25px_60px_rgba(20,10,5,0.45)] border-4 animate-bounce-in relative my-auto transition-all ${
          isAncient
            ? 'bg-[#fcfaf2] border-[#b45309]'
            : 'bg-[#fffef8] border-[#3b82f6]'
        }`}
      >
        {/* Top Close Button (✕) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭弹窗"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-gray-500 hover:text-gray-800 flex items-center justify-center text-sm font-bold transition cursor-pointer"
        >
          ✕
        </button>

        {/* Top Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black border shadow-2xs mb-3.5">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${eventConfig.badgeBg}`}>
            <span>{isAncient ? '🏮' : '📢'}</span>
            <span>{modalState.badge || eventConfig.typeLabel}</span>
          </span>
          {modalState.isAI ? (
            <span className="text-[10px] bg-purple-100 text-purple-700 font-extrabold px-2 py-0.5 rounded-full border border-purple-200">
              🤖 AI事件
            </span>
          ) : (
            <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
              👤 玩家事件
            </span>
          )}
        </div>

        {/* Prominent Animated Event Icon */}
        <div
          className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl border-2 flex items-center justify-center text-3xl sm:text-4xl shadow-inner mb-3 transition transform hover:scale-105 ${eventConfig.iconBg}`}
        >
          {displayIcon}
        </div>

        {/* Title & Player attribution */}
        <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
          {modalState.playerAvatar && (
            <span className="text-xl sm:text-2xl p-1 bg-white rounded-full border border-gray-200 shadow-2xs">
              {modalState.playerAvatar}
            </span>
          )}
          <h3 className="text-lg sm:text-xl font-black text-[#422006] tracking-tight">
            【{modalState.playerName}】{modalState.title || '触发事件'}
          </h3>
        </div>

        {/* Main Highlight Text Box (明确醒目突出事件核心，比如：「你被捕入狱，停留2回合」「官府赏赐银两，获得200」) */}
        <div
          className={`my-3.5 py-3 px-4 rounded-2xl border-2 shadow-inner text-center ${eventConfig.highlightBox}`}
        >
          <p className="text-base sm:text-lg font-black tracking-tight leading-snug">
            {modalState.highlightText}
          </p>
        </div>

        {/* Amount or Turns Badge Indicator */}
        {modalState.amount !== undefined && modalState.amount !== 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-extrabold text-xs mb-3 shadow-2xs border">
            {modalState.amount > 0 ? (
              <span className="bg-emerald-50 text-emerald-700 border-emerald-300 px-2 py-0.5 rounded-lg border font-black">
                💰 增益入账：+{modalState.amount} {unit}
              </span>
            ) : (
              <span className="bg-rose-50 text-rose-700 border-rose-300 px-2 py-0.5 rounded-lg border font-black">
                💸 损失支出：{modalState.amount} {unit}
              </span>
            )}
          </div>
        )}

        {modalState.jailTurns !== undefined && modalState.jailTurns > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-extrabold text-xs mb-3 shadow-2xs border bg-purple-50 text-purple-700 border-purple-300">
            <span>⛓️ 服刑期限：停留 {modalState.jailTurns} 回合</span>
          </div>
        )}

        {/* Detailed Narrative Explanation */}
        {modalState.details && (
          <p className="text-xs sm:text-[13px] text-[#5c3a21] leading-relaxed mb-5 bg-[#faf4ec] p-3 sm:p-3.5 rounded-2xl border border-[#ebdcc8] text-left">
            <span className="font-bold text-[#8c4b12] mr-1">详情说明：</span>
            {modalState.details}
          </p>
        )}

        {/* Action Button: Click to close and resume game */}
        <button
          type="button"
          onClick={onClose}
          className={`w-full py-3 sm:py-3.5 px-6 rounded-2xl bg-gradient-to-r ${eventConfig.btnBg} text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer flex items-center justify-center gap-2`}
        >
          <span>关闭并继续游戏</span>
          <span className="text-base">➔</span>
        </button>
      </div>
    </div>
  );
};

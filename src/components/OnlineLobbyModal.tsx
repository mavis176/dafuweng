import React, { useState } from 'react';
import { GameRoom, RoomPlayer, MapTheme, GameMode, ChatMessage } from '../types';
import { Copy, Check, Users, MessageSquare, Bot, LogOut, Play, ShieldAlert, Sparkles } from 'lucide-react';

interface OnlineLobbyModalProps {
  room: GameRoom;
  mySessionId: string;
  isHost: boolean;
  onAddAi: () => void;
  onRemovePlayer: (playerId: number) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
}

const avatars = ['👨‍👩‍👧', '👦', '👧', '🧙‍♂️', '🏮', '👑', '🐱', '🦊'];

const quickPhrases = [
  '大家好！请多关照～',
  '准备好了，随时开局！',
  '我是大富翁之王！💰',
  '今天手气特别好！🎲',
  '来一场紧张刺激的商战！🏮',
];

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  room,
  mySessionId,
  isHost,
  onAddAi,
  onRemovePlayer,
  onStartGame,
  onLeaveRoom,
  chatMessages,
  onSendChat,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const isAncient = room.mapTheme === 'ANCIENT';
  const myPlayer = room.players.find((p) => p.sessionId === mySessionId);
  const canStart = isHost && room.players.length >= 2;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${room.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5 animate-fade-in overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-[32px] p-5 sm:p-7 shadow-[0_25px_60px_rgba(20,10,5,0.4)] border-4 animate-bounce-in relative my-auto flex flex-col max-h-[92vh] ${
          isAncient
            ? 'bg-[#fcfaf2] border-[#b45309]'
            : 'bg-[#fffdf9] border-[#3b82f6]'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#eddcc7] shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl sm:text-4xl">{isAncient ? '🏮' : '🌐'}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#422006]">
                  多人联机对战大厅
                </h2>
                <span className="text-[10px] sm:text-xs bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>实时联机中</span>
                </span>
              </div>
              <p className="text-xs text-[#8c6f56] mt-0.5">
                {isAncient ? '盛世市井 · 邀各路商贾掌柜同台较量' : '现代乐园 · 邀请好友输入房间码即可加入'}
              </p>
            </div>
          </div>

          {/* Leave Button */}
          <button
            type="button"
            onClick={onLeaveRoom}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>退出房间</span>
          </button>
        </div>

        {/* Room Code Spotlight Banner */}
        <div className="my-3.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#fff3e0] via-[#ffe0b2] to-[#ffcc80] border-2 border-[#ffb74d] flex items-center justify-between flex-wrap gap-3 shrink-0 shadow-xs">
          <div>
            <div className="text-[10px] text-[#e65100] font-black tracking-wider uppercase mb-0.5">
              ROOM CODE · 房间识别码
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-widest text-[#bf360c] font-mono">
              {room.id}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-white hover:bg-[#fff8e7] text-[#bf360c] rounded-xl text-xs font-extrabold border border-[#ffb74d] shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? '已复制房间码' : '复制房间码'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-[#bf360c] hover:bg-[#a02c09] text-white rounded-xl text-xs font-extrabold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '已复制链接' : '复制邀请链接'}</span>
            </button>
          </div>
        </div>

        {/* Room Info Pills */}
        <div className="flex items-center gap-2 mb-3.5 flex-wrap text-xs">
          <span className="px-2.5 py-1 rounded-full bg-[#f5ebe1] border border-[#e4d3c0] text-[#6d4c41] font-bold">
            {isAncient ? '🏮 古风市井地图' : '🏰 现代乐园地图'}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[#f5ebe1] border border-[#e4d3c0] text-[#6d4c41] font-bold">
            {room.gameMode === 'ROUNDS' ? `🏆 轮数争霸 (${room.rounds}轮完赛)` : '💥 破产淘汰决胜'}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[#e8f5e9] border border-[#c8e6c9] text-[#2e7d32] font-black">
            👥 席位已入：{room.players.length} / 4 人
          </span>
        </div>

        {/* Players Seats 4-Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5 shrink-0">
          {[0, 1, 2, 3].map((slotIdx) => {
            const player = room.players[slotIdx];

            if (player) {
              const isMe = player.sessionId === mySessionId;
              return (
                <div
                  key={player.id}
                  className="p-3 rounded-2xl border-2 flex flex-col items-center justify-between text-center relative overflow-hidden transition shadow-2xs"
                  style={{
                    backgroundColor: `${player.color}10`,
                    borderColor: player.color,
                  }}
                >
                  {/* Top badges */}
                  <div className="w-full flex items-center justify-between mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: player.color }}
                      title={`棋子颜色：席位 ${slotIdx + 1}`}
                    />
                    {player.isHost && (
                      <span className="text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-1.5 rounded-full flex items-center gap-0.5">
                        <span>👑</span>
                        <span>房主</span>
                      </span>
                    )}
                    {player.isAI && (
                      <span className="text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300 px-1.5 rounded-full flex items-center gap-0.5">
                        <Bot className="w-2.5 h-2.5" />
                        <span>AI</span>
                      </span>
                    )}
                  </div>

                  <span className="text-3xl my-1">{player.avatarIcon}</span>

                  <div className="w-full">
                    <p className="font-black text-xs text-[#422006] truncate">
                      {player.name}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      {isMe && (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 rounded-md">
                          你自己
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-extrabold ${
                          player.isOnline ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                      >
                        {player.isOnline ? '🟢 在线就绪' : '⚪ 暂离'}
                      </span>
                    </div>
                  </div>

                  {/* Host kick AI button */}
                  {isHost && player.isAI && (
                    <button
                      type="button"
                      onClick={() => onRemovePlayer(player.id)}
                      className="mt-2 text-[10px] text-red-500 hover:text-red-700 font-bold underline cursor-pointer"
                    >
                      移除AI
                    </button>
                  )}
                </div>
              );
            }

            // Empty Slot
            return (
              <div
                key={`empty-${slotIdx}`}
                className="p-3 rounded-2xl border-2 border-dashed border-[#d5be9b] bg-white/40 flex flex-col items-center justify-center text-center text-[#8c6f56] min-h-[120px]"
              >
                <Users className="w-6 h-6 mb-1 opacity-40 text-[#8c6f56]" />
                <span className="text-xs font-bold text-[#8c6f56]">
                  席位 {slotIdx + 1}
                </span>
                <span className="text-[10px] text-[#a88a6d] mt-0.5">
                  等待玩家加入...
                </span>

                {isHost && (
                  <button
                    type="button"
                    onClick={onAddAi}
                    className="mt-2 px-2 py-1 bg-[#f4ebe1] hover:bg-[#ebd9c8] text-[#7a4820] text-[10px] font-extrabold rounded-lg border border-[#d5be9b] transition cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    <Bot className="w-3 h-3 text-purple-600" />
                    <span>添加AI补位</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Chat & Quick Phrases Section */}
        <div className="flex-1 min-h-[120px] max-h-[180px] bg-[#fffef8] rounded-2xl border border-[#ebdcc8] p-2.5 flex flex-col overflow-hidden mb-3.5">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#f0e3d3] text-[11px] font-black text-[#6d4c41]">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-[#b45309]" />
              <span>房间即时互动</span>
            </span>
            <span className="text-[10px] text-gray-400">所有成员可见</span>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                快点击下方快捷用语或打字与房间玩家互动吧！💬
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-1.5 text-[11px]">
                  <span className="font-extrabold shrink-0" style={{ color: msg.senderColor }}>
                    {msg.avatarIcon} 【{msg.senderName}】：
                  </span>
                  <span className="text-[#4e342e] break-all">{msg.text}</span>
                  <span className="text-[9px] text-gray-400 font-mono ml-auto shrink-0">
                    {msg.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Quick Phrase Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none shrink-0 border-t border-[#f4ede4]">
            {quickPhrases.map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSendChat(phrase)}
                className="px-2 py-0.5 rounded-full bg-[#fdf5ea] hover:bg-[#faebd7] text-[#8c4b12] text-[10px] font-bold border border-[#f3d4a2] whitespace-nowrap cursor-pointer transition active:scale-95 shrink-0"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendChat} className="flex items-center gap-1.5 pt-1.5 shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="输入聊天内容与房间伙伴交流..."
              maxLength={40}
              className="flex-1 px-3 py-1.5 bg-[#fbf7f0] rounded-xl border border-[#d5be9b] text-xs text-[#422006] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#d35400]"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="px-3 py-1.5 bg-[#b45309] hover:bg-[#92400e] disabled:bg-gray-300 text-white font-black text-xs rounded-xl transition cursor-pointer"
            >
              发送
            </button>
          </form>
        </div>

        {/* Bottom Action Footer */}
        <div className="pt-2 border-t border-[#eddcc7] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#8c6f56]">
            {isHost ? (
              canStart ? (
                <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>人员已齐备，点击右侧立即开局！</span>
                </span>
              ) : (
                <span className="text-amber-700 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>还需至少 1 名玩家或 AI 伙伴加入方可开局</span>
                </span>
              )
            ) : (
              <span className="text-blue-700 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>等待房主开启对战中...</span>
              </span>
            )}
          </div>

          {isHost ? (
            <button
              type="button"
              disabled={!canStart}
              onClick={onStartGame}
              className={`py-3 px-6 rounded-2xl font-black text-sm transition shadow-md flex items-center gap-2 ${
                canStart
                  ? 'bg-gradient-to-r from-[#d35400] to-[#e67e22] hover:from-[#c0392b] hover:to-[#d35400] text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>开始在线对战 ➔</span>
            </button>
          ) : (
            <div className="text-xs font-black text-[#5c3a1e] bg-[#f4ebe1] px-4 py-2.5 rounded-xl border border-[#d5be9b]">
              已就绪 · 静候开赛
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

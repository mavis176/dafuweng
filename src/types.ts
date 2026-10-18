export type SquareType =
  | 'start'
  | 'empty'
  | 'shop'
  | 'park'
  | 'chance'
  | 'tax'
  | 'farm'
  | 'bookstore'
  | 'dessert'
  | 'ancient_shop'
  | 'pawn';

export type GameMode = 'ROUNDS' | 'BANKRUPTCY';
export type MapTheme = 'MODERN' | 'ANCIENT';

export type ItemId = 'road_pass' | 'pardon_talisman' | 'land_deed' | 'lucky_bead';

export interface GameItem {
  id: ItemId;
  name: string;
  tag: string;
  icon: string;
  desc: string;
  price: number; // 购买价格
  sellPrice: number; // 当铺典当回收金币
}

export interface Property {
  id: number;
  name: string;
  type: SquareType;
  price: number;
  rent: number;
  owner?: number;
  houseLevel: number; // 0: no house, 1-4: houses, 5: hotel
  isMortgaged?: boolean; // 当铺土地抵押状态
  mortgageAmount?: number; // 抵押借得银两
}

export const getPropertyValue = (property: Property): number => {
  if (property.owner === undefined) return 0;
  if (property.isMortgaged) return Math.floor(property.price * 0.4);
  return property.price + property.houseLevel * 100;
};

export interface Player {
  id: number;
  name: string;
  money: number;
  position: number;
  properties: number[];
  isAI: boolean;
  color: string;
  avatarIcon: string;
  loans: number;
  isBankrupt: boolean;
  items: ItemId[];
  activeDiscount?: boolean; // 【置地契书】激活状态：下次买地或建房立享5折
  activeImmunity?: boolean; // 【免罪符】激活状态：下次税收或到访他人领地免租
  jailTurns?: number; // 剩余被捕入狱停留回合数 (0为自由身)
}

export interface BuildModalState {
  show: boolean;
  property: Property | null;
  propertyIndex: number;
  cost: number;
  nextLevel: number;
  nextLevelName: string;
}

export interface AiNoticeModalState {
  show: boolean;
  aiName: string;
  actionText: string;
  detailText: string;
  isBuild: boolean;
}

export interface RentModalState {
  show: boolean;
  payerName: string;
  payerAvatar?: string;
  payerColor?: string;
  receiverName: string;
  receiverAvatar?: string;
  receiverColor?: string;
  amount: number;
  propertyName: string;
  houseLevel: number;
  isBankrupt?: boolean;
}

export interface ShopModalState {
  show: boolean;
  playerIndex: number;
  squareName: string;
}

export interface PawnModalState {
  show: boolean;
  playerIndex: number;
  squareName: string;
  activeTab: 'ITEMS' | 'MORTGAGE' | 'REDEEM';
}

export interface BackpackModalState {
  show: boolean;
  playerIndex: number;
}

export interface ConfirmUseItemModalState {
  show: boolean;
  item: GameItem | null;
}

export interface RoadPassModalState {
  show: boolean;
  playerIndex: number;
}

export interface AncientEventCard {
  title: string;
  source: '驿站' | '书院' | '庙会' | '机缘';
  desc: string;
  type: 'gain' | 'loss' | 'neutral' | 'item';
  amount?: number;
  itemId?: ItemId;
  itemName?: string;
}

export interface AncientEventModalState {
  show: boolean;
  card: AncientEventCard | null;
  playerName: string;
}

export type GameEventType = 'chance' | 'jail' | 'bail' | 'fine' | 'reward';

export interface GameEventModalState {
  show: boolean;
  eventType: GameEventType;
  title: string;
  badge: string;
  icon: string;
  highlightText: string; // 核心提示文字，如：「你被捕入狱，停留2回合」「官府赏赐银两，获得200」
  details: string; // 详细文字说明
  amount?: number;
  jailTurns?: number;
  playerName: string;
  isAI: boolean;
  playerAvatar?: string;
  playerColor?: string;
  onConfirmAdvance?: boolean; // 点击关闭后是否推进回合
}

export interface JailActionModalState {
  show: boolean;
  playerIndex: number;
  playerName: string;
  jailTurns: number;
  bailCost: number;
  canAffordBail: boolean;
  hasPardonTalisman: boolean;
}

export type LogCategory = '交易' | '租金' | '事件' | '行动' | '系统';

export interface GameLog {
  id: string;
  category: LogCategory;
  text: string;
  timestamp?: string;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  board: Property[];
  logs: GameLog[];
  isGameOver: boolean;
  round: number;
  maxRounds: number;
  gameMode: GameMode;
  mapTheme: MapTheme;
  isMovingPawn: boolean;
  winner?: Player;
}

export interface RoomPlayer {
  id: number;
  sessionId: string;
  name: string;
  avatarIcon: string;
  color: string;
  isAI: boolean;
  isHost: boolean;
  isReady: boolean;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderColor: string;
  avatarIcon: string;
  text: string;
  timestamp: string;
}

export interface GameRoom {
  id: string; // 6-digit room code
  hostSessionId: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  mapTheme: MapTheme;
  gameMode: GameMode;
  rounds: number;
  players: RoomPlayer[];
  gameState?: GameState;
  eventModal?: GameEventModalState | null;
  buildModal?: BuildModalState | null;
  rentModal?: RentModalState | null;
  ancientEventModal?: AncientEventModalState | null;
  aiNoticeModal?: AiNoticeModalState | null;
  diceState?: { d1: number; d2: number; isRolling: boolean } | null;
  chatMessages?: ChatMessage[];
  version?: number;
  lastUpdatedBy?: string;
  createdAt: number;
}


export type SquareType = 'start' | 'empty' | 'shop' | 'park' | 'chance' | 'tax' | 'farm' | 'bookstore' | 'dessert';

export type GameMode = 'ROUNDS' | 'BANKRUPTCY';

export interface Property {
  id: number;
  name: string;
  type: SquareType;
  price: number;
  rent: number;
  owner?: number;
  houseLevel: number; // 0: no house, 1-4: houses, 5: hotel
}

export const getPropertyValue = (property: Property): number => {
  if (property.owner === undefined) return 0;
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
  isMovingPawn: boolean;
  winner?: Player;
}


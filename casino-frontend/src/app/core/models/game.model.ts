export interface Game {
  id: string;
  name: string;
  type: 'slot' | 'roulette' | 'blackjack' | 'poker';
  minBet: number;
  maxBet: number;
  rtp: number;
  isActive: boolean;
  description: string;
  rules: any;
  createdAt: string;
  updatedAt: string;
}

export interface GamePlayRequest {
  gameId: string;
  amount: number;
  bet?: string; // Para roleta
}

export interface SlotResult {
  result: string[];
  isWin: boolean;
  winAmount: number;
  multiplier: number;
  newBalance: number;
  betTransaction: string;
}

export interface RouletteResult {
  result: {
    number: number;
    color: string;
    isRed: boolean;
    isBlack: boolean;
    isEven: boolean;
    isOdd: boolean;
    isLow: boolean;
    isHigh: boolean;
  };
  bet: string;
  isWin: boolean;
  winAmount: number;
  multiplier: number;
  newBalance: number;
  betTransaction: string;
}
export type Asset = {
  id: string;
  name: string;
  price: number;
  change: number;
};

export type User = {
  id: string;
  email: string;
  balance: number;
  totalProfit: number;
  status: 'Verified' | 'Banned';
  winRate: number; // 0-100
};

export type MarketSettings = {
  trend: 'UP' | 'DOWN' | 'RANDOM';
  volatility: number;
  isPaused: boolean;
  targetAssetId: string;
  duration: {
    days: number;
    hours: number;
  };
  startTime?: number;
  endTime?: number;
};

export type Trade = {
  id: string;
  assetId: string;
  amount: number;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  timestamp: number;
  status: 'OPEN' | 'WIN' | 'LOSS';
};

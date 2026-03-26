export interface UserProfile {
  uid: string;
  email?: string; // <-- Добавлено поле для хранения почты
  nickname: string;
  balance: number;
  rank: 'user' | 'vip' | 'admin';
  xp: number;
  level: number;
  avatar: string;
  cardStyle: {
    background: string;
    border: string;
    color: string;
    pattern: string;
  };
  socialLinks: {
    vk?: string;
    tg?: string;
  };
  banned: boolean;
  password?: string;
  totalDeposits: number;
  totalWithdrawals: number;
  wagerRequirement: number;
  lastDailyBonus?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  amount: number;
  maxActivations: number;
  activations: number;
  wager: number;
  createdAt: string;
}

export interface GameSession {
  id: string;
  userId: string;
  gameType: 'dice' | 'mines' | 'keno' | 'jackpot';
  bet: number;
  multiplier: number;
  payout: number;
  timestamp: string;
}

export interface Achievement {
  id: string;
  userId: string;
  type: string;
  category: 'dice' | 'mines' | 'keno' | 'jackpot' | 'general';
  progress: number;
  completed: boolean;
  rewarded: boolean;
}
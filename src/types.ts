// src/types.ts
export interface UserProfile {
  uid: string;
  email?: string;
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
  unlockedAvatars?: string[];
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
  gameType: 'dice' | 'mines' | 'keno' | 'wheelx'; // <-- изменено jackpot на wheelx
  bet: number;
  multiplier: number;
  payout: number;
  timestamp: string;
}

export interface Achievement {
  id: string;
  userId: string;
  type: string;
  category: 'dice' | 'mines' | 'keno' | 'wheelx' | 'general'; // <-- изменено jackpot на wheelx
  progress: number;
  completed: boolean;
  rewarded: boolean;
}
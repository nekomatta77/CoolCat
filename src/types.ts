export interface UserProfile {
  uid: string;
  email?: string;
  nickname: string;
  balance: number;
  rank: string;
  xp: number;
  level: number;
  avatar: string;
  cardStyle: {
    background: string;
    border: string;
    color: string;
    pattern: string;
  };
  socialLinks?: Record<string, string>;
  banned?: boolean;
  totalDeposits?: number;
  totalWithdrawals?: number;
  wagerRequirement?: number;
  unlockedAvatars?: string[];
  
  // Добавленные поля для новых механик
  lastDailyBonus?: string;
  password?: string;
  claimedRanks?: number[]; // <-- Вот это поле исправит ошибку в Admin.tsx
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

export interface Achievement {
  id: string;
  userId: string;
  type: string;
  progress: number;
  completed: boolean;
  rewarded: boolean;
}
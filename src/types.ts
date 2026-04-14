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
  
  // МАССИВЫ РАЗБЛОКИРОВАННЫХ ПРЕДМЕТОВ
  unlockedAvatars?: string[];
  unlockedFrames?: string[];
  unlockedPrefixes?: string[];
  unlockedBackgrounds?: string[];
  
  lastDailyBonus?: string;
  password?: string;
  claimedRanks?: number[];
  
  // НАДЕТЫЕ ПРЕДМЕТЫ ИНВЕНТАРЯ:
  equippedFrame?: string;
  equippedPrefix?: string;
  equippedBg?: string;

  // ТРЕКЕРЫ ДЛЯ АЧИВОК
  wxSequence?: number[];
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
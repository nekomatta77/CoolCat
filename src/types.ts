// src/types.ts

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface ReferralData {
  status: 'none' | 'pending' | 'approved' | 'rejected' | 'disabled';
  plan?: 'revshare' | 'special';
  telegram?: string;
  source?: string;
  appliedAt?: string;
  balance: number;
  code?: string;
  
  registeredCount?: number;
  
  // Статистика RevShare
  rsDeposits?: number;
  rsWithdrawals?: number;
  rsCommissions?: number;
  rsBalances?: number;
  
  // Статистика Special
  spTier1Count?: number;
  spTier2Count?: number;
  spTier3Count?: number;
  spTier1Profit?: number;
  spTier2Profit?: number;
  spTier3Profit?: number;
}

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

  // РЕФЕРАЛЬНАЯ СИСТЕМА
  referralData?: ReferralData;
  invitedBy?: string; 

  // УВЕДОМЛЕНИЯ
  notifications?: UserNotification[];
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
// Добавить в src/types.ts (или в конец файла)
export interface JackpotPlayer {
  uid: string;
  nickname: string;
  avatar: string;
  betAmount: number;
  ticketsStart: number;
  ticketsEnd: number;
  color: string;
}

export interface JackpotRoom {
  id: string; // 'small' | 'medium' | 'high' | 'unlimited'
  name: string;
  minBet: number;
  maxBet: number;
  status: 'waiting' | 'countdown' | 'rolling' | 'finished';
  players: JackpotPlayer[];
  totalPool: number;
  totalTickets: number;
  countdownStartedAt?: number; // timestamp
  winnerUid?: string;
  winnerNickname?: string;
  winnerAvatar?: string;
  winningTicket?: number;
  winAmount?: number;
  lastWinnerTime?: number;
}
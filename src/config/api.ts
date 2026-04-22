// src/config/api.ts

// Если это локальная разработка (DEV), используем прямой IP.
// Если это Vercel (PROD), используем наш созданный мост /proxy/api.
export const AGGREGATOR_API_URL = import.meta.env.DEV 
  ? 'http://193.124.66.221:22777/api' 
  : '/proxy/api';

export const ENDPOINTS = {
  GAMES_LIST: '/public-games',
  GAME_INIT: '/real-session',
};
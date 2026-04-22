// src/config/api.ts

// Если это Vercel, используем безопасный мост /backend-api
export const AGGREGATOR_API_URL = import.meta.env.DEV 
  ? 'http://193.124.66.221:22777/api' 
  : '/backend-api';

export const ENDPOINTS = {
  GAMES_LIST: '/public-games',
  GAME_INIT: '/real-session',
};
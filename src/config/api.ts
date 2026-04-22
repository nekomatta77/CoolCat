// src/config/api.ts

// Теперь Vercel сам перехватывает /api и шлет куда надо
export const AGGREGATOR_API_URL = import.meta.env.DEV 
  ? 'http://193.124.66.221:22777/api' 
  : '/api'; 

export const ENDPOINTS = {
  GAMES_LIST: '/public-games',
  GAME_INIT: '/real-session',
};
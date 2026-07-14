// src/lib/vpsSocket.ts
import { io } from 'socket.io-client';

// Теперь мы ВСЕГДА стучимся на боевой сервер (и при разработке на ПК, и на Vercel)
const VPS_URL = 'https://coolcat-api.duckdns.org';

export const vpsSocket = io(VPS_URL, {
  // Меняем порядок! Сначала polling (чтобы не было красных ошибок), затем мягкий апгрейд до websocket
  transports: ['polling', 'websocket'],
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity
});
// src/lib/vpsSocket.ts
import { io } from 'socket.io-client';

// Определяем, где мы находимся: на локальном компьютере или в интернете
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Если мы на компьютере - стучимся в локальный бэкенд. Если в интернете - стучимся на наш VPS!
const VPS_URL = isLocalhost 
  ? 'http://localhost:3001' 
  : 'https://coolcat-api.duckdns.org';

export const vpsSocket = io(VPS_URL, {
  transports: ['websocket', 'polling'],
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity
});
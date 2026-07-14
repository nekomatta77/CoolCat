// src/lib/vpsSocket.ts
import { io } from 'socket.io-client';

// НОВЫЙ ЗАЩИЩЕННЫЙ АДРЕС ТВОЕГО СЕРВЕРА
const VPS_URL = 'https://coolcat-api.duckdns.org';

export const vpsSocket = io(VPS_URL, {
  transports: ['websocket', 'polling'],
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity
});
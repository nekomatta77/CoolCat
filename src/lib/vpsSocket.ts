// src/lib/vpsSocket.ts
import { io } from 'socket.io-client';

// НОВЫЙ IP АДРЕС ТВОЕГО СЕРВЕРА
const VPS_URL = 'http://83.217.212.219:3001';

export const vpsSocket = io(VPS_URL, {
  transports: ['websocket', 'polling'],
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity
});
// src/lib/vpsSocket.ts
import { io } from 'socket.io-client';

// Теперь мы подключаемся по защищенному HTTPS (порт 3001 писать больше не нужно, Nginx сделает всё сам)
export const vpsSocket = io('https://coolcat-server.duckdns.org', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
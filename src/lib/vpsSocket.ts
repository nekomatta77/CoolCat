import { io } from 'socket.io-client';

// Раскомментируй эту строку для работы на компьютере:
const VPS_URL = 'http://localhost:3001'; 

// А эту строку закомментируй (поставь // в начале), пока тестируешь локально:
// const VPS_URL = 'https://coolcat-api.duckdns.org';

export const vpsSocket = io(VPS_URL, {
  transports: ['websocket', 'polling'],
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity
});
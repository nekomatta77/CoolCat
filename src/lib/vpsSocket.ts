// src/lib/vpsSocket.ts
import { io } from 'socket.io-client';

// Подключаемся к твоему новому VPS серверу для лайв-игр (WheelX)
export const vpsSocket = io('http://138.16.177.43:3001', {
  autoConnect: true, // Автоматическое подключение при загрузке
  reconnection: true, // Пытаться переподключиться, если связь пропадет
});

vpsSocket.on('connect', () => {
  console.log('✅ Успешно подключились к VPS серверу!');
});

// Добавили тип Error для параметра err
vpsSocket.on('connect_error', (err: Error) => {
  console.error('❌ Ошибка подключения к VPS:', err.message);
});
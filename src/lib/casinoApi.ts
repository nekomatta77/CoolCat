// src/lib/casinoApi.ts
import axios from 'axios';

// URL твоего развернутого PHP-агрегатора (измени на свой адрес)
const AGGREGATOR_URL = import.meta.env.VITE_AGGREGATOR_URL || 'http://your-vps-ip:8000';

export interface GameInfo {
  id: string;
  slug: string;
  name: string;
  provider: string;
  category: string;
  image: string;
}

/**
 * 1. Получаем список всех игр, которые PHP-бэкенд импортировал из CasinoDog
 */
export const getGamesList = async (): Promise<GameInfo[]> => {
  try {
    // В репозитории агрегатора за это отвечает контроллер GameController
    const response = await axios.get(`${AGGREGATOR_URL}/api/games`);
    return response.data; 
  } catch (error) {
    console.error("Ошибка при получении списка игр:", error);
    // Возвращаем тестовые данные, если бэкенд еще не запущен
    return [
      { id: '1', slug: 'sweet-bonanza', name: 'Sweet Bonanza', provider: 'Pragmatic Play', category: 'Slots', image: 'https://cdn.softswiss.net/i/s3/pragmaticexternal/SweetBonanza.png' },
      { id: '2', slug: 'dog-house', name: 'The Dog House', provider: 'Pragmatic Play', category: 'Slots', image: 'https://cdn.softswiss.net/i/s3/pragmaticexternal/TheDogHouse.png' },
    ];
  }
};

/**
 * 2. Создаем сессию и получаем ссылку на Iframe
 */
export const getGameUrl = async (gameSlug: string, userId: string): Promise<string> => {
  try {
    // Этот запрос вызывает метод в бэкенде, который генерирует Entry URL через CasinoDog SDK
    const response = await axios.post(`${AGGREGATOR_URL}/api/create-session`, {
      game_slug: gameSlug,
      user_id: userId
    });
    return response.data.launch_url;
  } catch (error) {
    console.error("Ошибка создания сессии:", error);
    // Для теста возвращаем демо-ссылку
    return `https://demo.pragmaticplay.net/gs2c/openGame.do?gameSymbol=${gameSlug}`;
  }
};
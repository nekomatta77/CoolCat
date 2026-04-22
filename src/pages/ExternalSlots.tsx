import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Play, X, AlertCircle, Search } from 'lucide-react';
import { AGGREGATOR_API_URL, ENDPOINTS } from '../config/api';

interface ExternalSlotsProps {
  user: UserProfile;
}

interface ProviderGame {
  id?: number | string;
  gid?: string;
  name?: string | null;
  provider?: string | null;
  image?: string | null;
  demolink?: string | null;
}

export default function ExternalSlots({ user }: ExternalSlotsProps) {
  const [games, setGames] = useState<ProviderGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGameUrl, setActiveGameUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Загрузка списка игр
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${AGGREGATOR_API_URL}${ENDPOINTS.GAMES_LIST}`);
        
        if (!response.ok) {
           throw new Error('Ошибка сервера агрегатора. Проверьте IP и CORS.');
        }
        
        const data = await response.json();
        console.log("📦 Данные от сервера агрегатора:", data); // Отладочная информация
        
        let parsedGames: ProviderGame[] = [];

        // Умная распаковка данных (защита от разных форматов Laravel)
        if (Array.isArray(data)) {
          parsedGames = data;
        } else if (data && typeof data === 'object') {
          // Если данные обернуты в поле data (стандартная пагинация/ответ API)
          if (data.data && Array.isArray(data.data)) {
            parsedGames = data.data;
          } else if (data.original && Array.isArray(data.original)) {
            parsedGames = data.original;
          } else {
            // Если это просто объект с объектами (как было в сидере)
            parsedGames = Object.values(data);
          }
        }

        if (parsedGames.length === 0) {
           console.warn("Внимание: массив игр пуст. Возможно, в базе нет игр со статусом enabled=1");
        }

        setGames(parsedGames);
      } catch (err: any) {
        console.error("❌ Ошибка загрузки:", err);
        setError(err.message || 'Не удалось загрузить игры.');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  // 2. Логика запуска демо-версии
  const launchGame = (game: ProviderGame) => {
    if (game.demolink) {
       setActiveGameUrl(game.demolink);
    } else {
       alert("У этой игры временно нет демо-ссылки.");
    }
  };

  // Безопасная фильтрация (защита от игр без имени)
  const filteredGames = games.filter(game => {
    const gameName = game.name || '';
    const gameProvider = game.provider || '';
    const search = searchTerm.toLowerCase();

    return gameName.toLowerCase().includes(search) ||
           gameProvider.toLowerCase().includes(search);
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* Заголовок и поиск */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Игровой Зал</h1>
          <p className="text-slate-500 font-medium mt-1">Официальные провайдеры слотов</p>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Поиск игры или провайдера..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white border-2 border-slate-100 rounded-2xl py-3 pl-12 pr-6 w-full md:w-80 outline-none focus:border-brand-300 transition-all font-bold text-slate-700 shadow-sm"
          />
        </div>
      </div>

      {/* Вывод ошибки */}
      {error && (
        <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl flex flex-col items-center text-center gap-3 mb-10 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-black text-red-600 uppercase">Ошибка агрегатора</h2>
          <p className="text-red-700/70 font-medium">{error}</p>
        </div>
      )}

      {/* Сетка игр (Лоадер или Контент) */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {[...Array(15)].map((_, i) => (
            <div key={`skeleton-${i}`} className="aspect-[3/4] bg-slate-200 animate-pulse rounded-[2rem]" />
          ))}
        </div>
      ) : (
        <>
          {filteredGames.length === 0 && !error && (
            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-slate-100 border-dashed">
              <p className="text-slate-500 font-bold text-lg">Игры не найдены.</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {filteredGames.map((game, index) => (
              <div 
                // Гарантированно уникальный ключ
                key={`game-${game.id || game.gid || index}`} 
                className="group bg-white rounded-[2rem] overflow-hidden border-2 border-slate-100 hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-200/50 transition-all duration-300 cursor-pointer relative flex flex-col"
                onClick={() => launchGame(game)}
              >
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                  <img 
                    src={game.image || `https://ui-avatars.com/api/?name=${game.name || 'Slot'}&background=random&color=fff&size=200`} 
                    alt={game.name || 'Casino Game'} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/assets/slot_cat_original.webp' }}
                  />
                  <div className="absolute inset-0 bg-brand-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white text-brand-600 rounded-full p-4 transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-xl flex items-center justify-center">
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-center bg-white border-t border-slate-50 z-10">
                  <h3 className="font-black text-slate-800 leading-tight truncate text-sm md:text-base uppercase tracking-tighter" title={game.name || 'Unknown'}>
                    {game.name || 'Unknown Game'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                      {game.provider || 'Provider'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Модалка с игрой (Iframe) */}
      {activeGameUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
           <div className="w-full h-16 bg-slate-900 flex items-center justify-between px-4 md:px-6 border-b border-white/5">
              <div className="flex items-center gap-4">
                 <img src="/assets/CoolCat_logo.webp" className="h-8" alt="logo" />
                 <div className="h-8 w-px bg-white/10 hidden md:block" />
                 <span className="text-white/50 text-xs font-black uppercase tracking-widest hidden md:block">Сейчас играет: <span className="text-brand-400">{user.nickname}</span></span>
                 <span className="bg-brand-500/20 text-brand-400 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest">DEMO</span>
              </div>

              <button 
                onClick={() => setActiveGameUrl(null)}
                className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl font-black transition-all active:scale-95 shadow-lg shadow-red-500/20"
              >
                <X className="w-5 h-5" />
                <span className="hidden md:inline">ЗАКРЫТЬ</span>
              </button>
           </div>

           <div className="flex-1 w-full relative bg-black flex items-center justify-center">
              <iframe 
                src={activeGameUrl} 
                className="w-full h-full max-w-5xl max-h-[85vh] border-none shadow-2xl"
                allow="autoplay; fullscreen"
                title="Casino Game Session"
              />
           </div>
        </div>
      )}
    </div>
  );
}
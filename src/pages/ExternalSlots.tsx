import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Play, X, AlertCircle, Search, Coins } from 'lucide-react';
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
  const [launching, setLaunching] = useState(false); // Состояние загрузки самой игры
  const [error, setError] = useState<string | null>(null);
  const [activeGameUrl, setActiveGameUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${AGGREGATOR_API_URL}${ENDPOINTS.GAMES_LIST}`);
        const data = await response.json();
        
        let parsedGames: ProviderGame[] = [];
        if (Array.isArray(data)) parsedGames = data;
        else if (data && typeof data === 'object') parsedGames = Object.values(data);
        
        setGames(parsedGames);
      } catch (err: any) {
        setError('Не удалось загрузить игры.');
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, []);

  // ЛОГИКА ЗАПУСКА НА РЕАЛЬНЫЕ ДЕНЬГИ
  const launchRealGame = async (game: ProviderGame) => {
    try {
      setLaunching(true);
      const res = await fetch(`${AGGREGATOR_API_URL}/real-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: game.gid,
          player: user.uid // Отправляем UID твоего игрока
        })
      });

      const data = await res.json();
      
      // Агрегатор обычно отдает ссылку в поле url или session_url
      if (data.url || data.session_url) {
        setActiveGameUrl(data.url || data.session_url);
      } else {
        alert("Ошибка создания сессии. Открываем демо-версию.");
        setActiveGameUrl(game.demolink || null);
      }
    } catch (e) {
      alert("Сервер не отвечает. Открываем демо-версию.");
      setActiveGameUrl(game.demolink || null);
    } finally {
      setLaunching(false);
    }
  };

  const filteredGames = games.filter(game => {
    const search = searchTerm.toLowerCase();
    return (game.name || '').toLowerCase().includes(search) || (game.provider || '').toLowerCase().includes(search);
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            Игровой Зал
            {launching && <div className="w-6 h-6 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>}
          </h1>
          <p className="text-slate-500 font-medium mt-1">Игра на реальный баланс</p>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white border-2 border-slate-100 rounded-2xl py-3 pl-12 pr-6 w-full md:w-80 outline-none focus:border-brand-300 font-bold text-slate-700 shadow-sm"
          />
        </div>
      </div>

      {error && <div className="text-red-500 font-bold">{error}</div>}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {loading ? [...Array(15)].map((_, i) => <div key={i} className="aspect-[3/4] bg-slate-200 animate-pulse rounded-[2rem]" />) 
        : filteredGames.map((game, i) => (
          <div 
            key={`game-${i}`} 
            className="group bg-white rounded-[2rem] overflow-hidden border-2 border-slate-100 hover:border-brand-500 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col relative"
            onClick={() => launchRealGame(game)}
          >
            <div className="absolute top-3 right-3 z-20 bg-slate-900/80 backdrop-blur-sm text-brand-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase flex items-center gap-1 shadow-lg">
               <Coins className="w-3 h-3" /> REAL
            </div>
            <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden flex items-center justify-center">
              <img 
                src={game.image || `https://ui-avatars.com/api/?name=${game.name || 'Slot'}&background=random&color=fff&size=200`} 
                alt={game.name || 'Game'} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                onError={(e) => { (e.target as HTMLImageElement).src = '/assets/slot_cat_original.webp' }}
              />
              <div className="absolute inset-0 bg-brand-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <Play className="w-12 h-12 text-white fill-brand-500 drop-shadow-2xl transform scale-75 group-hover:scale-100 transition-all duration-300" />
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-center bg-white z-10">
              <h3 className="font-black text-slate-800 leading-tight truncate text-sm md:text-base uppercase tracking-tighter">{game.name || 'Unknown Game'}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate mt-1">{game.provider || 'Provider'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Iframe Modal */}
      {activeGameUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
           <div className="w-full h-16 bg-slate-900 flex items-center justify-between px-4 md:px-6 border-b border-white/5">
              <div className="flex items-center gap-4">
                 <img src="/assets/CoolCat_logo.webp" className="h-8" alt="logo" />
                 <div className="h-8 w-px bg-white/10 hidden md:block" />
                 <div className="bg-brand-500/20 border border-brand-500/30 px-3 py-1 rounded-lg flex items-center gap-2">
                    <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">Баланс</span>
                    <span className="text-brand-400 font-black">{user.balance.toFixed(2)} 🪙</span>
                 </div>
              </div>

              <button 
                onClick={() => setActiveGameUrl(null)}
                className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl font-black transition-all active:scale-95 shadow-lg shadow-red-500/20"
              >
                <X className="w-5 h-5" />
                <span className="hidden md:inline">ВЫХОД</span>
              </button>
           </div>
           <div className="flex-1 w-full relative bg-black flex items-center justify-center">
              <iframe src={activeGameUrl} className="w-full h-full max-w-6xl max-h-[90vh] border-none shadow-2xl" allow="autoplay; fullscreen" />
           </div>
        </div>
      )}
    </div>
  );
}
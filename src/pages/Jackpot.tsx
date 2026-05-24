// src/pages/Jackpot.tsx
import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Coins, Users, Timer, Trophy, Play, ShieldCheck, HelpCircle, LayoutGrid, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import io from 'socket.io-client';

// Подключение к вашему Node.js игровому серверу
const socket = io('http://localhost:3001');

interface JackpotProps {
  user: UserProfile;
}

const ROOMS_CONFIG = [
  { id: 'small', name: '🐱 Small Room', minBet: 1, maxBet: 100, gradient: 'from-cyan-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  { id: 'medium', name: '🦁 Medium Room', minBet: 100, maxBet: 1000, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
  { id: 'high', name: '👑 High Room', minBet: 1000, maxBet: 10000, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
  { id: 'unlimited', name: '🌋 Unlimited', minBet: 10, maxBet: 1000000, gradient: 'from-rose-500 to-purple-600', shadow: 'shadow-rose-500/20' },
];

export default function Jackpot({ user }: JackpotProps) {
  const [activeRoomId, setActiveRoomId] = useState('small');
  const [viewMode, setViewMode] = useState<'wheel' | 'tape'>('wheel'); // Переключатель режимов Jackpot
  const [room, setRoom] = useState<any>({
    gameState: 'waiting', timeLeft: 20, players: [], totalPool: 0, totalTickets: 0, winner: null, history: []
  });
  const [betInput, setBetInput] = useState('10');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Анимационные состояния
  const [wheelRotation, setWheelRotation] = useState(0);
  const [tapeTranslateX, setTapeTranslateX] = useState(0);
  const [extendedTapePlayers, setExtendedTapePlayers] = useState<any[]>([]);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);

  const activeConfig = ROOMS_CONFIG.find(r => r.id === activeRoomId)!;

  // Вход/выход из комнат при переключении табов
  useEffect(() => {
    socket.emit('joinRoom', activeRoomId);
    setShowWinnerOverlay(false);
    setWheelRotation(0);
    setTapeTranslateX(0);

    socket.on('jackpotState', (updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on('jackpotError', (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    // Обработка синхронного запуска вращения для ОБОИХ режимов
    socket.on('jackpotSpin', ({ winner, totalTickets }) => {
      if (!winner || totalTickets === 0) return;

      // --- 1. Логика расчета для Колеса ---
      // Находим объект игрока в текущем стейте раунда
      const winnerPlayerObj = room.players?.find((p: any) => p.uid === winner.uid) || winner;
      const playerMidTicket = (winnerPlayerObj.ticketsStart + winnerPlayerObj.ticketsEnd) / 2;
      const winnerPercentage = playerMidTicket / totalTickets;
      const targetDegrees = winnerPercentage * 360;
      
      // 6 полных оборотов рулетки + докрутка до нужного сектора
      const finalWheelRotation = (360 * 6) + targetDegrees;
      setWheelRotation(finalWheelRotation);

      // --- 2. Логика расчета для Горизонтальной Ленты аватарок ---
      const itemWidth = 90; // ширина ячейки аватарки (px)
      const gap = 8; // отступ между ячейками (px)
      const totalItemWidth = itemWidth + gap;

      // Создаем наполнение ленты (повторяем список игроков, чтобы заполнить трек)
      let calculatedTrack: any[] = [];
      if (room.players && room.players.length > 0) {
        for (let i = 0; i < 8; i++) {
          room.players.forEach((p: any) => {
            calculatedTrack.push(p);
          });
        }
      } else {
        // Защитная заглушка, если стейт не успел обновиться
        calculatedTrack = Array(50).fill(winnerPlayerObj);
      }
      
      // Вставляем аватарку реального победителя в зону фиксации (45-й элемент)
      const winningIndexInTrack = 45;
      calculatedTrack[winningIndexInTrack] = winnerPlayerObj;
      setExtendedTapePlayers(calculatedTrack);

      // Расчет сдвига ленты влево, чтобы 45-й элемент встал строго по центру контейнера (ширина контейнера 560px)
      const containerWidth = 560;
      const finalTapeTranslation = -(winningIndexInTrack * totalItemWidth) + (containerWidth / 2 - itemWidth / 2);
      setTapeTranslateX(finalTapeTranslation);

      // Через 8 секунд (когда колесо и лента одновременно остановятся) показываем окно победителя
      setTimeout(() => {
        setShowWinnerOverlay(true);
      }, 8000);
    });

    return () => {
      socket.emit('leaveRoom', activeRoomId);
      socket.off('jackpotState');
      socket.off('jackpotError');
      socket.off('jackpotSpin');
    };
  }, [activeRoomId, room.players]);

  const handlePlaceBet = () => {
    const amount = parseFloat(betInput);
    if (isNaN(amount) || amount < activeConfig.minBet || amount > activeConfig.maxBet) return;
    
    socket.emit('placeJackpotBet', {
      userId: user.uid,
      nickname: user.nickname,
      avatar: user.avatar,
      amount,
      roomId: activeRoomId
    });
  };

  // Вспомогательная функция сборки градиента для кругового сектора Колеса Jackpot
  const getConicGradient = () => {
    if (!room.players || room.players.length === 0) return '#1e293b';
    let gradientParts: string[] = [];
    let currentAccumulator = 0;

    room.players.forEach((player: any) => {
      const playerChance = player.betAmount / room.totalPool;
      const startDeg = currentAccumulator * 360;
      const endDeg = (currentAccumulator + playerChance) * 360;
      gradientParts.push(`${playerColorToHex(player.color)} ${startDeg}deg ${endDeg}deg`);
      currentAccumulator += playerChance;
    });

    return `conic-gradient(${gradientParts.join(', ')})`;
  };

  const playerColorToHex = (color: string) => color || '#cbd5e1';

  return (
    <div className="space-y-6 lg:space-y-8 pb-12 font-mono">
      {/* Кнопки переключения комнат */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ROOMS_CONFIG.map((roomTab) => {
          const isActive = roomTab.id === activeRoomId;
          return (
            <button
              key={roomTab.id}
              onClick={() => {
                setActiveRoomId(roomTab.id);
                setExtendedTapePlayers([]);
                setWheelRotation(0);
                setTapeTranslateX(0);
                setShowWinnerOverlay(false);
              }}
              className={cn(
                "relative p-4 sm:p-5 rounded-[2rem] border text-left transition-all overflow-hidden group active:scale-95",
                isActive 
                  ? "bg-slate-900 border-slate-800 text-white shadow-xl " + roomTab.shadow
                  : "bg-white border-slate-100 text-slate-800 hover:border-slate-200 shadow-sm"
              )}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity", roomTab.gradient)} />
              <h3 className="font-black text-sm sm:text-base tracking-tight mb-1">{roomTab.name}</h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400">
                Лимиты: {roomTab.minBet}-{roomTab.maxBet} CAT
              </p>
              {isActive && (
                <div className={cn("absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r", roomTab.gradient)} />
              )}
            </button>
          );
        })}
      </div>

      {/* Ошибки списания / лимитов */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold text-center">
            ⚠ {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Панель Управления и Списка Ставок */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Coins className="w-5 h-5 text-brand-500" /> Ваша ставка
              </h2>
              {/* Переключатель стилей отображения рулетки Jackpot */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button 
                  onClick={() => setViewMode('wheel')}
                  className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'wheel' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('tape')}
                  className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'tape' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase pl-1">CAT</span>
                <input
                  type="number"
                  value={betInput}
                  onChange={(e) => setBetInput(e.target.value)}
                  disabled={room.gameState === 'rolling'}
                  className="bg-transparent text-right font-black text-slate-900 outline-none w-32 text-base"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[10, 50, 100, 500].map((v) => (
                  <button
                    key={v}
                    onClick={() => setBetInput(v.toString())}
                    disabled={room.gameState === 'rolling'}
                    className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-black text-slate-600 transition-all active:scale-95"
                  >
                    +{v}
                  </button>
                ))}
              </div>

              <button
                onClick={handlePlaceBet}
                disabled={room.gameState === 'rolling' || user.balance < parseFloat(betInput)}
                className={cn(
                  "w-full py-4 bg-gradient-to-r text-white font-black rounded-2xl shadow-lg uppercase tracking-widest transition-transform active:scale-95 text-xs flex items-center justify-center gap-2",
                  activeConfig.gradient,
                  room.gameState === 'rolling' && "opacity-50 pointer-events-none"
                )}
              >
                <Play className="w-4 h-4 fill-current" /> Купить билеты
              </button>
            </div>
          </div>

          {/* Живой Банк игроков */}
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" /> Участники ({room.players?.length || 0})
              </h3>
              <span className="text-[11px] font-black text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                Банк: {room.totalPool?.toFixed(0) || '0'} CAT
              </span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
              {room.players?.map((player: any) => {
                const percentage = room.totalPool > 0 ? ((player.betAmount / room.totalPool) * 100).toFixed(1) : '0';
                return (
                  <div key={player.uid} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100/50 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white p-0.5 shadow-inner border relative flex items-center justify-center">
                        <img src={player.avatar} alt="avatar" className="w-full h-full object-contain" />
                        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: player.color }} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 truncate max-w-[100px]">{player.nickname}</p>
                        <p className="text-[9px] text-slate-400 font-bold">Билеты: #{player.ticketsStart}-{player.ticketsEnd}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">{player.betAmount} CAT</p>
                      <p className="text-[10px] font-black text-brand-500">{percentage}%</p>
                    </div>
                  </div>
                );
              })}
              {(!room.players || room.players.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-xs font-bold">
                  Купите билеты первым, чтобы открыть комнату раунда!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Интерактивная Синхронная Рулетка двух видов */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white relative overflow-hidden flex flex-col items-center justify-center min-h-[440px] border border-slate-800 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/30 via-transparent to-transparent -z-10" />

            {/* Статус раунда с бэкенда */}
            <div className="absolute top-6 left-6 flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 px-4 py-2 rounded-xl backdrop-blur-sm z-20">
              <Timer className="w-4 h-4 text-brand-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">
                {room.gameState === 'waiting' && 'Ожинение оппонентов (мин. 2 котика)'}
                {room.gameState === 'countdown' && `До прокрутки: ${room.timeLeft}с`}
                {room.gameState === 'rolling' && 'Синхронизация прокрутки...'}
                {room.gameState === 'finished' && 'Раунд закрыт'}
              </span>
            </div>

            {/* ВИД ОТОБРАЖЕНИЯ 1: Классическое круговое колесо */}
            {viewMode === 'wheel' && (
              <div className="relative w-60 h-60 sm:w-64 h-64 rounded-full border-4 border-slate-700 flex items-center justify-center shadow-2xl overflow-hidden mt-6 bg-slate-950">
                {/* Фиксированный маркер указателя сверху */}
                <div className="absolute top-0 z-30 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-rose-500 drop-shadow-md" />
                
                <motion.div
                  className="w-full h-full rounded-full relative"
                  animate={{ rotate: -wheelRotation }}
                  transition={room.gameState === 'rolling' || showWinnerOverlay ? { duration: 8, ease: [0.1, 0.8, 0.1, 1] } : { duration: 0 }}
                  style={{ background: getConicGradient() }}
                >
                  {/* Заглушка центральной оси */}
                  <div className="absolute inset-12 bg-slate-900 rounded-full border-4 border-slate-700 flex flex-col items-center justify-center z-10 shadow-inner">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Банк</span>
                    <span className="text-xl font-black text-white leading-none my-0.5">{room.totalPool?.toFixed(0) || 0}</span>
                    <span className="text-[9px] font-black text-brand-400 uppercase">CAT</span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* ВИД ОТОБРАЖЕНИЯ 2: Горизонтальная лента с аватарками */}
            {viewMode === 'tape' && (
              <div className="w-full max-w-[560px] h-[130px] bg-slate-950 border-2 border-slate-800 rounded-3xl mt-12 relative overflow-hidden flex items-center shadow-inner">
                {/* Центровой маркер выигрыша */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-rose-500 z-20 shadow-[0_0_8px_#f43f5e]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-rose-500 z-20" />

                <motion.div
                  className="flex gap-2 px-4 items-center h-full"
                  animate={{ translateX: tapeTranslateX }}
                  transition={room.gameState === 'rolling' || showWinnerOverlay ? { duration: 8, ease: [0.1, 0.8, 0.1, 1] } : { duration: 0 }}
                >
                  {extendedTapePlayers.length > 0 ? (
                    extendedTapePlayers.map((player: any, idx: number) => (
                      <div 
                        key={idx}
                        className="w-[90px] h-[90px] rounded-2xl bg-slate-900 border-2 flex flex-col items-center justify-center shrink-0 p-1 transition-all"
                        style={{ borderColor: playerColorToHex(player.color) }}
                      >
                        <img src={player.avatar} alt="avatar" className="w-10 h-10 object-contain mb-1" />
                        <span className="text-[8px] font-black text-slate-300 truncate w-full text-center">{player.nickname}</span>
                      </div>
                    ))
                  ) : (
                    /* Заглушка ленты до старта игры */
                    room.players?.map((player: any, idx: number) => (
                      <div 
                        key={idx}
                        className="w-[90px] h-[90px] rounded-2xl bg-slate-900 border-2 flex flex-col items-center justify-center shrink-0 p-1"
                        style={{ borderColor: playerColorToHex(player.color) }}
                      >
                        <img src={player.avatar} alt="avatar" className="w-10 h-10 object-contain mb-1" />
                        <span className="text-[8px] font-black text-slate-300 truncate w-full text-center">{player.nickname}</span>
                      </div>
                    ))
                  )}
                </motion.div>
              </div>
            )}

            {/* Выигрышное модальное оверлей-окно раунда */}
            <AnimatePresence>
              {showWinnerOverlay && room.winner && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-40"
                >
                  <div
                    className="w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-[2rem] p-1.5 relative flex items-center justify-center mb-3 animate-bounce"
                    style={{ boxShadow: `0 0 25px ${room.winner.color || '#eab308'}66` }}
                  >
                    <img src={room.winner.avatar} alt="winner" className="w-full h-full object-contain" />
                    <Trophy className="w-7 h-7 text-white absolute -bottom-1 -right-1 bg-slate-900 p-1.5 rounded-xl border border-slate-700" />
                  </div>
                  
                  <h3 className="text-2xl font-black text-white tracking-tight mb-0.5">
                    Котик {room.winner.nickname} забирает куш!
                  </h3>
                  <p className="text-slate-400 text-xs font-bold mb-4">
                    Выигрышный билет раунда: <span className="text-yellow-400">#{room.winner.winningTicket}</span>
                  </p>

                  <div className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-2xl">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Чистый куш (-10% комиссия сайта)</span>
                    <span className="text-2xl font-black text-emerald-400">+{room.winner.winAmount?.toFixed(2)} CAT</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Информационная панель Provably Fair */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-3 items-start">
              <HelpCircle className="w-10 h-10 text-brand-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-black text-slate-900 text-xs tracking-tight">Как рассчитывается раунд Jackpot?</h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-md">
                  Каждый внесенный 1 CAT гарантирует покупку 1 билета. Чем больше билетов в вашем диапазоне, тем шире ваш сектор на колесе и тем выше математический шанс остановить ленту аватарок на вашем котике.
                </p>
              </div>
            </div>
            <div className="flex gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 items-center text-[10px] font-black uppercase tracking-wider shrink-0">
              <ShieldCheck className="w-4 h-4" /> 100% Верифицировано
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
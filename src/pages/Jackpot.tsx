// src/pages/Jackpot.tsx
import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Coins, Users, Timer, Trophy, Play, ShieldCheck, HelpCircle, LayoutGrid, RotateCw, Crown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { vpsSocket as socket } from '../lib/vpsSocket';

interface JackpotProps {
  user: UserProfile;
}

const ROOMS_CONFIG = [
  { id: 'small', name: 'Small Room', minBet: 1, maxBet: 100, gradient: 'from-cyan-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  { id: 'medium', name: 'Medium Room', minBet: 100, maxBet: 1000, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
  { id: 'high', name: 'High Room', minBet: 1000, maxBet: 10000, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
  { id: 'unlimited', name: 'Unlimited', minBet: 10, maxBet: 1000000, gradient: 'from-rose-500 to-purple-600', shadow: 'shadow-rose-500/20' },
];

export default function Jackpot({ user }: JackpotProps) {
  const [activeRoomId, setActiveRoomId] = useState('small');
  // Изменен режим по умолчанию на 'tape'
  const [viewMode, setViewMode] = useState<'wheel' | 'tape'>('tape');
  const [room, setRoom] = useState<any>({
    gameState: 'waiting', timeLeft: 20, players: [], totalPool: 0, totalTickets: 0, winner: null, history: []
  });
  const [betInput, setBetInput] = useState('10');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [wheelRotation, setWheelRotation] = useState(0);
  const [tapeTranslateX, setTapeTranslateX] = useState(0);
  const [extendedTapePlayers, setExtendedTapePlayers] = useState<any[]>([]);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [localWinner, setLocalWinner] = useState<any>(null);

  const activeConfig = ROOMS_CONFIG.find(r => r.id === activeRoomId)!;

  useEffect(() => {
    socket.emit('joinRoom', activeRoomId);

    setShowWinnerOverlay(false);
    setIsAnimating(false);
    setWheelRotation(0);
    setTapeTranslateX(0);
    setExtendedTapePlayers([]);
    setLocalWinner(null);

    socket.on('jackpotState', (updatedRoom) => {
      setRoom(updatedRoom);
      
      if (updatedRoom.gameState === 'finished') {
        setShowWinnerOverlay(true);
      } 
      else if (updatedRoom.gameState === 'waiting') {
        setShowWinnerOverlay(false);
        setIsAnimating(false);
        setWheelRotation(0);
        setTapeTranslateX(0);
        setExtendedTapePlayers([]);
        setLocalWinner(null);
      }
    });

    socket.on('jackpotError', (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    socket.on('jackpotSpin', ({ winner, totalTickets, winningTicket, spinOffset, players }) => {
      if (!winner || totalTickets === 0) return;

      setLocalWinner({ ...winner, winningTicket });
      setIsAnimating(true);
      
      // === КОЛЕСО ===
      const startPercentage = (winner.ticketsStart - 1) / totalTickets;
      const endPercentage = winner.ticketsEnd / totalTickets;
      const targetPercentage = startPercentage + ((endPercentage - startPercentage) * spinOffset);
      
      const finalWheelRotation = (360 * 8) + (targetPercentage * 360);
      setWheelRotation(finalWheelRotation);

      // === ЛЕНТА ===
      // Умный расчет размеров: проверяем, мобилка ли это, чтобы сдвиг был точным
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      const itemWidth = isMobile ? 80 : 100; // На телефонах карточка 80px, на ПК 100px
      const gap = isMobile ? 8 : 12; // gap-2 (8px) на мобильных, gap-3 (12px) на ПК
      const totalItemWidth = itemWidth + gap;

      let calculatedTrack: any[] = [];
      const basePlayers = players || [];
      if (basePlayers.length > 0) {
        for (let i = 0; i < 100; i++) {
          calculatedTrack.push(basePlayers[i % basePlayers.length]);
        }
      } else {
        calculatedTrack = Array(100).fill(winner);
      }
      
      const winningIndex = 85;
      calculatedTrack[winningIndex] = winner;
      setExtendedTapePlayers(calculatedTrack);

      const cardInnerOffset = (spinOffset - 0.5) * (itemWidth - 10);
      const distanceToWinnerCenter = (winningIndex * totalItemWidth) + (itemWidth / 2);
      
      const containerWidth = typeof window !== 'undefined' && window.innerWidth < 560 ? window.innerWidth - 32 : 560;
      const finalTapeTranslation = -distanceToWinnerCenter + (containerWidth / 2) - cardInnerOffset;
      
      setTapeTranslateX(finalTapeTranslation);
    });

    return () => {
      socket.emit('leaveRoom', activeRoomId);
      socket.off('jackpotState');
      socket.off('jackpotError');
      socket.off('jackpotSpin');
    };
  }, [activeRoomId]);

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
    <div className="space-y-3 sm:space-y-8 pb-12 font-mono">
      {/* Навигация комнат - ультракомпактная на мобильных */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-3">
        {ROOMS_CONFIG.map((roomTab) => {
          const isActive = roomTab.id === activeRoomId;
          return (
            <button
              key={roomTab.id}
              onClick={() => setActiveRoomId(roomTab.id)}
              className={cn(
                "relative p-2 sm:p-5 rounded-[1rem] sm:rounded-[2rem] border text-left transition-all overflow-hidden group active:scale-95",
                isActive 
                  ? "bg-slate-900 border-slate-800 text-white shadow-lg sm:shadow-xl " + roomTab.shadow
                  : "bg-white border-slate-100 text-slate-800 hover:border-slate-200 shadow-sm"
              )}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity", roomTab.gradient)} />
              <h3 className="font-black text-[10px] sm:text-base tracking-tight mb-0.5 sm:mb-1">{roomTab.name}</h3>
              <p className="text-[8px] sm:text-xs font-bold text-slate-400 truncate">
                {roomTab.minBet}-{roomTab.maxBet} CAT
              </p>
              {isActive && (
                <div className={cn("absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r", roomTab.gradient)} />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {errorMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-2 sm:p-4 bg-rose-50 border border-rose-100 rounded-xl sm:rounded-2xl text-rose-600 text-[10px] sm:text-xs font-bold text-center">
            ⚠ {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 items-start">
        
        {/* Управление и участники */}
        <div className="lg:col-span-1 space-y-3 sm:space-y-6">
          <div className="bg-white border border-slate-100 rounded-[1.5rem] sm:rounded-[2.5rem] p-3 sm:p-6 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-xs sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5 sm:gap-2">
                <Coins className="w-3.5 sm:w-5 h-3.5 sm:h-5 text-brand-500" /> Ставка
              </h2>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shadow-inner">
                <button 
                  onClick={() => setViewMode('tape')}
                  className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'tape' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >
                  <LayoutGrid className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('wheel')}
                  className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'wheel' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >
                  <RotateCw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-4">
              <div className="bg-slate-50 border border-slate-100 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-between transition-all focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
                <span className="text-[9px] sm:text-xs font-black text-slate-400 uppercase pl-1">CAT</span>
                <input
                  type="number"
                  value={betInput}
                  onChange={(e) => setBetInput(e.target.value)}
                  disabled={room.gameState === 'rolling' || room.gameState === 'finished'}
                  className="bg-transparent text-right font-black text-slate-900 outline-none w-20 sm:w-32 text-xs sm:text-base"
                />
              </div>

              <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                {[10, 50, 100, 500].map((v) => (
                  <button
                    key={v}
                    onClick={() => setBetInput(v.toString())}
                    disabled={room.gameState === 'rolling' || room.gameState === 'finished'}
                    className="py-1.5 sm:py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black text-slate-600 transition-all active:scale-95"
                  >
                    +{v}
                  </button>
                ))}
              </div>

              <button
                onClick={handlePlaceBet}
                disabled={room.gameState === 'rolling' || room.gameState === 'finished' || user.balance < parseFloat(betInput)}
                className={cn(
                  "w-full py-2.5 sm:py-4 bg-gradient-to-r text-white font-black rounded-xl sm:rounded-2xl shadow-lg uppercase tracking-widest transition-transform active:scale-95 text-[9px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 mt-1",
                  activeConfig.gradient,
                  (room.gameState === 'rolling' || room.gameState === 'finished') && "opacity-50 pointer-events-none"
                )}
              >
                <Play className="w-3 sm:w-4 h-3 sm:h-4 fill-current" /> Внести
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-[1.5rem] sm:rounded-[2.5rem] p-3 sm:p-6 shadow-xl shadow-slate-200/40 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs sm:text-sm text-slate-900 tracking-tight flex items-center gap-1.5 sm:gap-2">
                <Users className="w-3.5 sm:w-5 h-3.5 sm:h-5 text-slate-400" /> Игроки ({room.players?.length || 0})
              </h3>
              <span className="text-[8px] sm:text-[11px] font-black text-brand-600 bg-brand-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-brand-100">
                Банк: {room.totalPool?.toFixed(0) || '0'} CAT
              </span>
            </div>

            <div className="space-y-1.5 sm:space-y-2 max-h-[160px] sm:max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
              <AnimatePresence>
                {room.players?.map((player: any) => {
                  const percentage = room.totalPool > 0 ? ((player.betAmount / room.totalPool) * 100).toFixed(1) : '0';
                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      key={player.uid} 
                      className="flex items-center justify-between p-2 sm:p-3 bg-slate-50 border border-slate-100/50 rounded-xl sm:rounded-2xl hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="w-7 sm:w-10 h-7 sm:h-10 rounded-lg sm:rounded-xl bg-white p-0.5 shadow-sm border border-slate-100 relative flex items-center justify-center shrink-0">
                          <img src={player.avatar} alt="avatar" className="w-full h-full object-contain" />
                          <div className="absolute -bottom-1 -right-1 w-2 sm:w-3.5 h-2 sm:h-3.5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: player.color }} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[9px] sm:text-xs font-black text-slate-800 truncate max-w-[60px] sm:max-w-[90px]">{player.nickname}</p>
                          <p className="text-[7px] sm:text-[9px] text-slate-400 font-bold truncate">Билеты: #{player.ticketsStart}-{player.ticketsEnd}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] sm:text-xs font-black text-slate-900">{player.betAmount} CAT</p>
                        <p className="text-[7px] sm:text-[10px] font-black" style={{ color: player.color }}>{percentage}%</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {(!room.players || room.players.length === 0) && (
                <div className="text-center py-4 sm:py-8 text-slate-400 text-[9px] sm:text-xs font-bold">
                  Сделайте ставку первым!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Интерактивная Рулетка */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-6">
          <div className="bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] p-3 sm:p-8 text-white relative overflow-hidden flex flex-col items-center justify-center min-h-[260px] sm:min-h-[440px] border border-slate-800 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/40 via-transparent to-transparent -z-10" />

            <div className="absolute top-3 sm:top-6 left-3 sm:left-6 flex items-center gap-1 sm:gap-2 bg-slate-800/80 border border-slate-700/50 px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl backdrop-blur-sm z-20 shadow-lg">
              <Timer className="w-3 sm:w-4 h-3 sm:h-4 text-brand-400 animate-pulse" />
              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-200">
                {room.gameState === 'waiting' && 'Ожидание оппонентов'}
                {room.gameState === 'countdown' && `До старта: ${room.timeLeft}с`}
                {room.gameState === 'rolling' && 'Определяем котика...'}
                {room.gameState === 'finished' && 'Раунд закрыт'}
              </span>
            </div>

            {/* КЛАССИЧЕСКОЕ КОЛЕСО */}
            {viewMode === 'wheel' && (
              <div className="relative w-44 h-44 sm:w-64 sm:h-64 lg:w-72 lg:h-72 rounded-full border-[4px] sm:border-[6px] border-slate-800 flex items-center justify-center shadow-2xl overflow-hidden mt-6 sm:mt-6 bg-slate-950">
                <div className="absolute top-0 z-30 w-0 h-0 border-l-[8px] sm:border-l-[14px] border-l-transparent border-r-[8px] sm:border-r-[14px] border-r-transparent border-t-[14px] sm:border-t-[24px] border-t-rose-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" />
                
                <motion.div
                  className="w-full h-full rounded-full relative"
                  animate={{ rotate: -wheelRotation }}
                  transition={{ duration: isAnimating ? 8 : 0, ease: isAnimating ? [0.15, 0.85, 0.15, 1] : "linear" }}
                  style={{ background: getConicGradient() }}
                >
                  <div className="absolute inset-[2rem] sm:inset-[3.5rem] bg-slate-900 rounded-full border-[3px] sm:border-[6px] border-slate-800 flex flex-col items-center justify-center z-10 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                    <span className="text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Банк</span>
                    <span className="text-lg sm:text-2xl font-black text-white leading-none my-0.5">{room.totalPool?.toFixed(0) || 0}</span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* ГОРИЗОНТАЛЬНАЯ ЛЕНТА */}
            {viewMode === 'tape' && (
              <div 
                className="w-full max-w-[560px] h-[100px] sm:h-[150px] bg-slate-950/60 border border-slate-800/80 rounded-[1.25rem] sm:rounded-3xl mt-10 sm:mt-12 relative overflow-hidden flex items-center shadow-inner"
                style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}
              >
                {room.gameState === 'waiting' || room.gameState === 'countdown' ? (
                  <div className="flex gap-2 sm:gap-3 items-center justify-center w-full h-full px-2 sm:px-4 overflow-x-auto z-10">
                    <AnimatePresence>
                      {room.players?.map((player: any, idx: number) => (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          key={idx}
                          className="w-[60px] sm:w-[100px] h-[70px] sm:h-[110px] rounded-xl sm:rounded-2xl bg-slate-800/80 border sm:border-2 flex flex-col items-center justify-center shrink-0 p-1.5 sm:p-2 shadow-[0_0_10px_rgba(0,0,0,0.3)] sm:shadow-[0_0_15px_rgba(0,0,0,0.3)] relative overflow-hidden"
                          style={{ borderColor: playerColorToHex(player.color) }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                          <img src={player.avatar} alt="avatar" className="w-8 sm:w-12 h-8 sm:h-12 object-contain mb-1 sm:mb-2 drop-shadow-md relative z-10" />
                          <span className="text-[7px] sm:text-[10px] font-black text-white truncate w-full text-center relative z-10">{player.nickname}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {(!room.players || room.players.length === 0) && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-500 text-[8px] sm:text-xs font-black uppercase tracking-widest animate-pulse">
                        Ожидаем игроков...
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 sm:w-1.5 bg-rose-500/80 z-20 shadow-[0_0_10px_#f43f5e] sm:shadow-[0_0_15px_#f43f5e]" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] sm:border-l-[8px] border-l-transparent border-r-[5px] sm:border-r-[8px] border-r-transparent border-t-[8px] sm:border-t-[12px] border-t-rose-500 z-20" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] sm:border-l-[8px] border-l-transparent border-r-[5px] sm:border-r-[8px] border-r-transparent border-b-[8px] sm:border-b-[12px] border-b-rose-500 z-20" />

                    <motion.div
                      className="flex gap-2 sm:gap-3 items-center h-full absolute left-0"
                      animate={{ x: tapeTranslateX }}
                      transition={{ duration: isAnimating ? 8 : 0, ease: isAnimating ? [0.15, 0.85, 0.15, 1] : "linear" }}
                    >
                      {extendedTapePlayers.map((player: any, idx: number) => (
                        <div 
                          key={idx}
                          className="w-[80px] sm:w-[100px] h-[90px] sm:h-[110px] rounded-xl sm:rounded-2xl bg-slate-900/90 border sm:border-2 flex flex-col items-center justify-center shrink-0 p-1.5 sm:p-2 shadow-md sm:shadow-lg relative overflow-hidden"
                          style={{ borderColor: playerColorToHex(player.color) }}
                        >
                           <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
                          <img src={player.avatar} alt="avatar" className="w-10 sm:w-12 h-10 sm:h-12 object-contain mb-1.5 sm:mb-2 drop-shadow-md z-10" />
                          <span className="text-[8px] sm:text-[10px] font-black text-white truncate w-full text-center z-10">{player.nickname}</span>
                        </div>
                      ))}
                    </motion.div>
                  </>
                )}
              </div>
            )}

            <AnimatePresence>
              {showWinnerOverlay && localWinner && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 text-center z-40 overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem]"
                >
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0.2 }}
                    transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }}
                    className="absolute w-32 sm:w-64 h-32 sm:h-64 rounded-full blur-[30px] sm:blur-[60px]"
                    style={{ backgroundColor: localWinner.color || '#eab308' }}
                  />

                  <motion.div
                    initial={{ scale: 0.5, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="relative z-10 flex flex-col items-center"
                  >
                    <div className="relative mb-3 sm:mb-6">
                      <Sparkles className="absolute -top-2 sm:-top-4 -left-2 sm:-left-4 w-5 sm:w-8 h-5 sm:h-8 text-yellow-400 animate-pulse" />
                      <Sparkles className="absolute -bottom-2 sm:-bottom-4 -right-2 sm:-right-4 w-3 sm:w-6 h-3 sm:h-6 text-yellow-500 animate-pulse delay-100" />
                      
                      <div
                        className="w-16 h-16 sm:w-28 sm:h-28 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[1.25rem] sm:rounded-[2.5rem] p-1.5 sm:p-2 relative flex items-center justify-center border-2 sm:border-4"
                        style={{ borderColor: localWinner.color || '#eab308', boxShadow: `0 0 20px ${localWinner.color || '#eab308'}80` }}
                      >
                        <img src={localWinner.avatar} alt="winner" className="w-full h-full object-contain drop-shadow-xl" />
                        <div className="absolute -top-3 sm:-top-5 bg-gradient-to-r from-yellow-400 to-amber-500 p-1 sm:p-2 rounded-full border sm:border-2 border-slate-900 shadow-md sm:shadow-lg">
                           <Crown className="w-3 sm:w-6 h-3 sm:h-6 text-slate-900" />
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight mb-0.5 sm:mb-1 drop-shadow-lg">
                      {localWinner.nickname}
                    </h3>
                    <p className="text-slate-300 text-[8px] sm:text-xs font-bold mb-3 sm:mb-6 bg-slate-900/50 px-2 sm:px-4 py-0.5 sm:py-1.5 rounded-full border border-slate-700">
                      Билет: <span className="text-yellow-400">#{localWinner.winningTicket}</span>
                    </p>

                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 border border-emerald-500/30 px-4 sm:px-8 py-2 sm:py-4 rounded-xl sm:rounded-3xl backdrop-blur-sm"
                    >
                      <span className="text-[7px] sm:text-[10px] text-emerald-200/70 font-bold block uppercase tracking-widest mb-0.5 sm:mb-1">Выигрыш</span>
                      <span className="text-2xl sm:text-4xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]">
                        +{localWinner.winAmount?.toFixed(2)} CAT
                      </span>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-[1.5rem] sm:rounded-[2.5rem] p-3 sm:p-6 shadow-xl flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2 sm:gap-3 items-start">
              <HelpCircle className="w-6 sm:w-10 h-6 sm:h-10 text-brand-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-black text-slate-900 text-[10px] sm:text-xs tracking-tight">Честная игра</h4>
                <p className="text-[8px] sm:text-[11px] text-slate-400 font-medium leading-relaxed max-w-md mt-0.5">
                  Победитель определяется случайным билетом. Система 100% синхронизирована: каждый пиксель рулетки рассчитывается сервером.
                </p>
              </div>
            </div>
            <div className="flex w-full sm:w-auto justify-center gap-1.5 sm:gap-2 bg-emerald-50 text-emerald-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-2xl border border-emerald-100 items-center text-[8px] sm:text-[10px] font-black uppercase tracking-wider shrink-0">
              <ShieldCheck className="w-3 sm:w-4 h-3 sm:h-4" /> Provably Fair
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
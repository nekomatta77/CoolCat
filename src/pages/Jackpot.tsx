// src/pages/Jackpot.tsx
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, JackpotPlayer } from '../types';
import { Coins, Users, Timer, Play, ShieldCheck, HelpCircle, LayoutGrid, RotateCw, Crown, Sparkles, AlertTriangle, History, Trophy, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { vpsSocket as socket } from '../lib/vpsSocket';
import { FRAMES, BACKGROUNDS } from '../lib/customization';

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
  const isAnimatingRef = useRef(false);

  const [localWinner, setLocalWinner] = useState<any>(null);
  const [isBetting, setIsBetting] = useState(false);

  const activeConfig = ROOMS_CONFIG.find(r => r.id === activeRoomId)!;

  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

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
      else if (updatedRoom.gameState === 'rolling') {
        if (!isAnimatingRef.current && updatedRoom.winner) {
           setLocalWinner(updatedRoom.winner);
           setIsAnimating(true);
           
           const basePlayers = updatedRoom.players || [];
           let calculatedTrack = Array(80).fill(updatedRoom.winner);
           if (basePlayers.length > 0) {
             calculatedTrack = Array.from({length: 80}, (_, i) => basePlayers[i % basePlayers.length]);
           }
           const winningIndex = 70;
           calculatedTrack[winningIndex] = updatedRoom.winner;
           setExtendedTapePlayers(calculatedTrack);
           
           const isMobile = window.innerWidth < 640;
           const itemWidth = isMobile ? 80 : 100;
           const gap = isMobile ? 12 : 16;
           const totalItemWidth = itemWidth + gap;
           
           const containerEl = document.getElementById('roulette-container');
           const containerWidth = containerEl ? containerEl.clientWidth : window.innerWidth;
           
           const distance = (winningIndex * totalItemWidth) + (itemWidth / 2);
           setTapeTranslateX(-distance + (containerWidth / 2));
        }
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
      setIsBetting(false); 
    });

    socket.on('jackpotSpin', ({ winner, totalTickets, winningTicket, spinOffset, players }) => {
      if (!winner || totalTickets === 0) return;

      setLocalWinner({ ...winner, winningTicket });
      setIsAnimating(true);
      
      const startPercentage = (winner.ticketsStart - 1) / totalTickets;
      const endPercentage = winner.ticketsEnd / totalTickets;
      const targetPercentage = startPercentage + ((endPercentage - startPercentage) * spinOffset);
      const finalWheelRotation = (360 * 10) + (targetPercentage * 360);
      setWheelRotation(finalWheelRotation);

      const isMobile = window.innerWidth < 640;
      const itemWidth = isMobile ? 80 : 100;
      const gap = isMobile ? 12 : 16;
      const totalItemWidth = itemWidth + gap;

      let calculatedTrack: any[] = [];
      const basePlayers = players || [];
      if (basePlayers.length > 0) {
        for (let i = 0; i < 80; i++) {
          calculatedTrack.push(basePlayers[i % basePlayers.length]);
        }
      } else {
        calculatedTrack = Array(80).fill(winner);
      }
      
      const winningIndex = 70; 
      calculatedTrack[winningIndex] = winner;
      setExtendedTapePlayers(calculatedTrack);

      const cardInnerOffset = (spinOffset - 0.5) * (itemWidth - 10);
      const distanceToWinnerCenter = (winningIndex * totalItemWidth) + (itemWidth / 2);
      
      const containerEl = document.getElementById('roulette-container');
      const containerWidth = containerEl ? containerEl.clientWidth : window.innerWidth;
      
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

  const currentPlayer = room.players?.find((p: any) => p.uid === user.uid);
  const currentTotalBet = currentPlayer ? currentPlayer.betAmount : 0;
  const isBetOverLimit = activeRoomId !== 'unlimited' && (currentTotalBet + parseFloat(betInput || '0') > activeConfig.maxBet);

  const handlePlaceBet = () => {
    if (isBetting) return; 

    const amount = parseFloat(betInput);
    if (isNaN(amount) || amount <= 0) return;

    if (amount < activeConfig.minBet) {
      setErrorMessage(`Минимальная ставка ${activeConfig.minBet} CAT`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    
    if (activeRoomId !== 'unlimited' && (currentTotalBet + amount > activeConfig.maxBet)) {
      setErrorMessage(`Лимит ${activeConfig.maxBet} CAT. Ваша текущая ставка: ${currentTotalBet} CAT`);
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    
    setIsBetting(true);
    socket.emit('placeJackpotBet', {
      userId: user.uid,
      nickname: user.nickname,
      avatar: user.avatar,
      amount,
      roomId: activeRoomId,
      cardStyle: user.cardStyle,
      equippedFrame: user.equippedFrame,
      equippedPrefix: user.equippedPrefix,
      equippedBg: user.equippedBg
    });

    setTimeout(() => {
      setIsBetting(false);
    }, 500);
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

  const renderCustomAvatar = (player: any, sizeClass: string, innerChildren?: React.ReactNode, mode: 'avatar' | 'card' = 'avatar') => {
    const frameObj = FRAMES.find(f => f.id === player.equippedFrame) || FRAMES[0];
    const bgObj = BACKGROUNDS.find(b => b.id === player.equippedBg);
    const cardBg = player.cardStyle?.background || '#ffffff';
    const cardBorder = player.cardStyle?.border || playerColorToHex(player.color);
    const safeAvatar = player.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback';

    return (
      <div className={cn("relative flex-shrink-0 flex items-center justify-center group", sizeClass)}>
        <div 
          className={cn(
            "absolute inset-0 overflow-hidden transition-all duration-300 shadow-md",
            mode === 'avatar' ? "rounded-[30%] sm:rounded-[35%] border-2 sm:border-4" : "rounded-[1rem] sm:rounded-[1.25rem] border-2 sm:border-[3px]",
            frameObj.css
          )}
          style={{ 
            backgroundColor: cardBg, 
            borderColor: frameObj.id === 'none' ? cardBorder : undefined 
          }}
        >
          <div className={cn("absolute inset-0 opacity-40 z-0", bgObj?.gradient)} />
          
          <img 
            src={safeAvatar} 
            alt="avatar" 
            className={cn(
              "absolute inset-0 w-full h-full z-10 transition-transform duration-500",
              mode === 'card' 
                ? "object-contain p-2 sm:p-3 pb-8 sm:pb-10 group-hover:scale-110 drop-shadow-md" 
                : "object-cover"
            )} 
          />
          
          {innerChildren}
        </div>
        
        {frameObj.img && (
          <img 
            src={frameObj.img} 
            alt="frame" 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[125%] h-[125%] object-contain pointer-events-none z-30 drop-shadow-lg" 
          />
        )}
      </div>
    );
  };

  const topWins = room.history ? [...room.history].sort((a: any, b: any) => b.winAmount - a.winAmount).slice(0, 3) : [];

  return (
    <div className="space-y-4 sm:space-y-8 pb-12 font-sans">
      {/* КНОПКИ ВЫБОРА КОМНАТ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {ROOMS_CONFIG.map((roomTab) => {
          const isActive = roomTab.id === activeRoomId;
          return (
            <button
              key={roomTab.id}
              onClick={() => setActiveRoomId(roomTab.id)}
              className={cn(
                "relative p-3 sm:p-5 rounded-2xl sm:rounded-[2rem] border text-left transition-all overflow-hidden group active:scale-95",
                isActive 
                  ? "bg-slate-900 border-slate-800 text-white shadow-xl " + roomTab.shadow
                  : "bg-white border-slate-100 text-slate-800 hover:border-slate-200 shadow-sm"
              )}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity", roomTab.gradient)} />
              <h3 className="font-black text-xs sm:text-base uppercase tracking-widest mb-1 drop-shadow-sm">
                {roomTab.name}
              </h3>
              <p className="text-[10px] sm:text-sm font-bold text-slate-400 truncate">
                {roomTab.minBet}-{roomTab.maxBet} CAT
              </p>
              {isActive && (
                <div className={cn("absolute bottom-0 left-0 h-1 sm:h-1.5 w-full bg-gradient-to-r", roomTab.gradient)} />
              )}
            </button>
          );
        })}
      </div>

      {/* ИСТОРИЯ ИГР */}
      {room.history && room.history.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-white border border-slate-100 rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-5 shadow-lg shadow-slate-200/40">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest">Последние игры</h3>
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">Комната: {activeConfig.name}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 pt-1">
            <AnimatePresence>
              {room.history.map((hist: any, i: number) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  key={i} 
                  className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2 sm:p-3 rounded-2xl shrink-0 min-w-[200px] sm:min-w-[240px] hover:border-slate-200 transition-colors shadow-sm"
                >
                  <div className="relative">
                     {renderCustomAvatar(hist, "w-10 sm:w-12 h-10 sm:h-12", undefined, 'avatar')}
                     <div className="absolute -bottom-1 -right-1 w-3 sm:w-4 h-3 sm:h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: playerColorToHex(hist.color) }} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-wide truncate mb-0.5">{hist.nickname || hist.winner}</span>
                    <span className="text-sm sm:text-base font-extrabold text-emerald-500 drop-shadow-sm leading-none">+{hist.winAmount?.toFixed(0)} CAT</span>
                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-1">Шанс: <span className="font-bold" style={{ color: playerColorToHex(hist.color) }}>{hist.chance}%</span></span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* УВЕДОМЛЕНИЯ ОБ ОШИБКАХ */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
            className="flex items-center justify-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-rose-100/90 to-rose-50/90 border border-rose-200 rounded-xl sm:rounded-2xl text-rose-700 shadow-md shadow-rose-200/50 backdrop-blur-sm mx-auto w-full"
          >
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-rose-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-black tracking-wide uppercase">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        
        {/* 1. БЛОК СО СТАВКОЙ (Mobile: Order 2 | Desktop: Order 1) */}
        <div className="order-2 lg:order-1 lg:col-span-1 w-full space-y-4 sm:space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <h2 className="text-sm sm:text-lg font-black text-slate-900 tracking-wider flex items-center gap-2">
                <Coins className="w-4 sm:w-6 h-4 sm:h-6 text-brand-500" /> Ставка
              </h2>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shadow-inner">
                <button onClick={() => setViewMode('tape')} className={cn("p-2 rounded-lg transition-colors", viewMode === 'tape' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}><LayoutGrid className="w-4 sm:w-5 h-4 sm:h-5" /></button>
                <button onClick={() => setViewMode('wheel')} className={cn("p-2 rounded-lg transition-colors", viewMode === 'wheel' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}><RotateCw className="w-4 sm:w-5 h-4 sm:h-5" /></button>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <div className="bg-slate-50 border border-slate-100 p-3 sm:p-4 rounded-2xl flex items-center justify-between transition-all focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
                <span className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest pl-1">CAT</span>
                <input
                  type="number" value={betInput} onChange={(e) => setBetInput(e.target.value)}
                  disabled={room.gameState === 'rolling' || room.gameState === 'finished' || isBetting}
                  className="bg-transparent text-right font-black text-slate-900 outline-none w-24 sm:w-32 text-base sm:text-xl"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[10, 50, 100, 500].map((v) => (
                  <button key={v} onClick={() => setBetInput(v.toString())} disabled={room.gameState === 'rolling' || room.gameState === 'finished' || isBetting} className="py-2 sm:py-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-xs sm:text-sm font-black text-slate-600 transition-all active:scale-95">+{v}</button>
                ))}
              </div>

              <button
                onClick={handlePlaceBet}
                disabled={room.gameState === 'rolling' || room.gameState === 'finished' || user.balance < parseFloat(betInput) || isBetOverLimit || isBetting}
                className={cn(
                  "w-full py-4 sm:py-5 bg-gradient-to-r text-white font-black rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 uppercase tracking-widest transition-all active:scale-95 text-sm sm:text-lg flex items-center justify-center gap-2 mt-2",
                  activeConfig.gradient,
                  (room.gameState === 'rolling' || room.gameState === 'finished' || isBetOverLimit || isBetting) && "opacity-50 pointer-events-none hover:transform-none hover:shadow-xl"
                )}
              >
                <Play className="w-5 sm:w-6 h-5 sm:h-6 fill-current" /> Внести
              </button>
            </div>
          </div>
        </div>

        {/* 2. БЛОК РУЛЕТКИ (Mobile: Order 1 | Desktop: Order 2) */}
        <div className="order-1 lg:order-2 lg:col-span-2 w-full space-y-4 sm:space-y-6">
          <div className="bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-8 text-white relative overflow-hidden flex flex-col items-center justify-center min-h-[280px] sm:min-h-[460px] border border-slate-800 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/40 via-transparent to-transparent -z-10" />

            <div className="absolute top-4 sm:top-6 left-4 sm:left-6 flex items-center gap-2 sm:gap-3 bg-slate-800/80 border border-slate-700/50 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl backdrop-blur-sm z-20 shadow-lg">
              <Timer className="w-4 sm:w-5 h-4 sm:h-5 text-brand-400 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-200">
                {room.gameState === 'waiting' && 'Ожидание игроков'}
                {room.gameState === 'countdown' && `До старта: ${room.timeLeft}с`}
                {room.gameState === 'rolling' && 'Крутим рулетку...'}
                {room.gameState === 'finished' && 'Раунд закрыт'}
              </span>
            </div>

            {/* КОЛЕСО */}
            {viewMode === 'wheel' && (
              <div className="relative w-52 h-52 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-full border-[6px] sm:border-[8px] border-slate-800 flex items-center justify-center shadow-2xl overflow-hidden mt-8 sm:mt-6 bg-slate-950">
                <div className="absolute top-0 z-30 w-0 h-0 border-l-[10px] sm:border-l-[16px] border-l-transparent border-r-[10px] sm:border-r-[16px] border-r-transparent border-t-[18px] sm:border-t-[28px] border-t-rose-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" />
                <motion.div 
                  className="w-full h-full rounded-full relative" 
                  initial={{ rotate: 0 }}
                  animate={{ rotate: -wheelRotation }} 
                  transition={{ type: "tween", duration: isAnimating ? 15 : 0, ease: isAnimating ? [0.15, 0.85, 0.05, 1] : "linear" }} 
                  style={{ background: getConicGradient(), willChange: "transform" }}
                >
                  <div className="absolute inset-[2.5rem] sm:inset-[4.5rem] bg-slate-900 rounded-full border-[4px] sm:border-[8px] border-slate-800 flex flex-col items-center justify-center z-10 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                    <span className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Джекпот</span>
                    <span className="text-xl sm:text-3xl font-black text-white leading-none my-1">{((room.totalPool || 0) * 0.9).toFixed(0)}</span>
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">CAT</span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* ЛЕНТА */}
            {viewMode === 'tape' && (
              <div 
                id="roulette-container" 
                className="w-[calc(100%+32px)] sm:w-[calc(100%+64px)] -mx-4 sm:-mx-8 h-[120px] sm:h-[140px] bg-slate-950/80 border-y border-slate-800/80 mt-10 sm:mt-12 relative flex items-center shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]" 
                style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
              >
                {room.gameState === 'waiting' || room.gameState === 'countdown' ? (
                  <div className="flex gap-3 sm:gap-4 items-center justify-center w-full h-full px-4 overflow-x-auto z-10">
                    <AnimatePresence>
                      {room.players?.map((player: any, idx: number) => {
                        const percentage = room.totalPool > 0 ? ((player.betAmount / room.totalPool) * 100).toFixed(1) : '0';
                        return (
                          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} key={idx} className="shrink-0">
                            {renderCustomAvatar(
                              player, 
                              "w-[80px] sm:w-[100px] h-[100px] sm:h-[120px]", 
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent pt-6 pb-1.5 px-1 flex flex-col items-center justify-end z-20">
                                <span className="text-[9px] sm:text-[11px] font-black text-white truncate w-full text-center drop-shadow-md leading-tight mb-0.5">{player.nickname}</span>
                                <div className="flex items-center justify-center gap-1 bg-slate-900/60 rounded-full px-1.5 py-0.5 border border-white/10 backdrop-blur-sm shadow-sm">
                                  <span className="text-[8px] sm:text-[9px] font-black tracking-wider" style={{ color: playerColorToHex(player.color), textShadow: `0 0 10px ${playerColorToHex(player.color)}80` }}>{percentage}%</span>
                                </div>
                              </div>,
                              'card'
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {(!room.players || room.players.length === 0) && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-500 text-[10px] sm:text-sm font-black uppercase tracking-widest animate-pulse">Ожидаем игроков...</motion.div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 sm:w-1.5 bg-rose-500 z-20 shadow-[0_0_20px_#f43f5e]" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] sm:border-l-[14px] border-l-transparent border-r-[10px] sm:border-r-[14px] border-r-transparent border-t-[14px] sm:border-t-[20px] border-t-rose-500 z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] sm:border-l-[14px] border-l-transparent border-r-[10px] sm:border-r-[14px] border-r-transparent border-b-[14px] sm:border-b-[20px] border-b-rose-500 z-20 drop-shadow-[0_-2px_4px_rgba(0,0,0,0.5)]" />
                    <motion.div 
                      className="flex gap-3 sm:gap-4 items-center h-full absolute left-0" 
                      initial={{ x: 0 }} 
                      animate={{ x: tapeTranslateX }} 
                      transition={{ type: "tween", duration: isAnimating ? 15 : 0, ease: isAnimating ? [0.15, 0.85, 0.05, 1] : "linear" }}
                      style={{ willChange: "transform" }}
                    >
                      {extendedTapePlayers.map((player: any, idx: number) => {
                        const percentage = room.totalPool > 0 ? ((player.betAmount / room.totalPool) * 100).toFixed(1) : '0';
                        return (
                          <div key={idx} className="shrink-0">
                            {renderCustomAvatar(
                              player, 
                              "w-[80px] sm:w-[100px] h-[100px] sm:h-[120px]", 
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent pt-6 pb-1.5 px-1 flex flex-col items-center justify-end z-20">
                                <span className="text-[9px] sm:text-[11px] font-black text-white truncate w-full text-center drop-shadow-md leading-tight mb-0.5">{player.nickname}</span>
                                <div className="flex items-center justify-center gap-1 bg-slate-900/60 rounded-full px-1.5 py-0.5 border border-white/10 backdrop-blur-sm shadow-sm">
                                  <span className="text-[8px] sm:text-[9px] font-black tracking-wider" style={{ color: playerColorToHex(player.color), textShadow: `0 0 10px ${playerColorToHex(player.color)}80` }}>{percentage}%</span>
                                </div>
                              </div>,
                              'card'
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </div>
            )}

            {/* КОМПАКТНОЕ ОКОШКО ПОБЕДИТЕЛЯ ДЛЯ МОБИЛОК */}
            <AnimatePresence>
              {showWinnerOverlay && localWinner && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-40">
                  
                  {/* Карточка победителя (Уменьшенные размеры на мобилках) */}
                  <motion.div 
                    initial={{ scale: 0.5, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 15 }} 
                    className="relative z-10 flex flex-col items-center bg-slate-900 border border-slate-700/50 p-5 sm:p-8 rounded-3xl sm:rounded-[2rem] shadow-2xl min-w-[200px] max-w-[85%] sm:max-w-none sm:min-w-[340px]"
                  >
                    {/* Внутреннее свечение */}
                    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1.5, opacity: 0.15 }} transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }} className="absolute w-24 sm:w-56 h-24 sm:h-56 rounded-full blur-[25px] sm:blur-[50px] pointer-events-none" style={{ backgroundColor: localWinner.color || '#eab308' }} />

                    <div className="relative mb-3 sm:mb-6">
                      <Sparkles className="absolute -top-2 sm:-top-5 -left-2 sm:-left-5 w-4 sm:w-8 h-4 sm:h-8 text-yellow-400 animate-pulse" />
                      <Sparkles className="absolute -bottom-1 sm:-bottom-4 -right-1 sm:-right-4 w-3 sm:w-6 h-3 sm:h-6 text-yellow-500 animate-pulse delay-100" />
                      <div className="relative">
                        {renderCustomAvatar(localWinner, "w-16 sm:w-28 h-16 sm:h-28", undefined, 'avatar')}
                        <div className="absolute -top-3 sm:-top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 p-1 sm:p-2 rounded-full border-2 border-slate-900 shadow-xl z-30">
                           <Crown className="w-3 sm:w-6 h-3 sm:h-6 text-slate-900" />
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-lg sm:text-3xl font-black text-white tracking-wider mb-1.5 sm:mb-2 drop-shadow-lg uppercase text-center w-full truncate px-2">{localWinner.nickname}</h3>
                    <p className="text-slate-300 text-[8px] sm:text-xs font-black mb-3 sm:mb-6 bg-slate-950/50 px-3 sm:px-5 py-0.5 sm:py-1.5 rounded-full border border-slate-800 tracking-widest whitespace-nowrap">
                      БИЛЕТ: <span className="text-yellow-400">#{localWinner.winningTicket}</span>
                    </p>
                    
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 border border-emerald-500/30 px-4 sm:px-8 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl backdrop-blur-sm w-full text-center">
                      <span className="text-[8px] sm:text-[10px] text-emerald-200/70 font-black block uppercase tracking-widest mb-0.5 sm:mb-1">Выигрыш</span>
                      <span className="text-xl sm:text-4xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)] leading-none">+{localWinner.winAmount?.toFixed(2)} CAT</span>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 3. СПИСОК ИГРОКОВ (Mobile: Order 3 | Desktop: Order 3) */}
        <div className="order-3 lg:order-3 lg:col-span-1 w-full space-y-4 sm:space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-xl shadow-slate-200/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm sm:text-lg text-slate-900 tracking-wider flex items-center gap-2">
                <Users className="w-4 sm:w-6 h-4 sm:h-6 text-slate-400" /> Игроки ({room.players?.length || 0})
              </h3>
              <span className="text-[10px] sm:text-xs font-black text-brand-600 bg-brand-50 px-3 py-1 sm:py-1.5 rounded-full border border-brand-100 tracking-widest">
                Пул: {room.totalPool?.toFixed(0) || '0'}
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] sm:max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
              <AnimatePresence>
                {room.players?.map((player: any) => {
                  const percentage = room.totalPool > 0 ? ((player.betAmount / room.totalPool) * 100).toFixed(1) : '0';
                  return (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} key={player.uid} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 border border-slate-100/50 rounded-2xl hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative">
                          {renderCustomAvatar(player, "w-10 sm:w-14 h-10 sm:h-14", undefined, 'avatar')}
                          <div className="absolute -bottom-1 -right-1 w-3 sm:w-4 h-3 sm:h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: player.color }} />
                        </div>
                        <div className="overflow-hidden space-y-0.5">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide truncate max-w-[80px] sm:max-w-[120px]">{player.nickname}</p>
                          <p className="text-[10px] sm:text-xs font-bold tracking-widest" style={{ color: player.color }}>{percentage}% ШАНС</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm sm:text-base font-extrabold text-slate-900">{player.betAmount} CAT</p>
                        <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest"># {player.ticketsStart}-{player.ticketsEnd}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {(!room.players || room.players.length === 0) && (
                <div className="text-center py-6 sm:py-10 text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-widest">
                  Сделайте ставку первым!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. ЗАЛ СЛАВЫ И ЧЕСТНАЯ ИГРА (Mobile: Order 4 | Desktop: Order 4) */}
        <div className="order-4 lg:order-4 lg:col-span-2 w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-xl relative overflow-hidden flex flex-col">
            <div className="absolute -top-10 -right-10 opacity-10">
              <Trophy className="w-40 h-40 text-amber-500" />
            </div>
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
              <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-widest">Зал Славы</h3>
            </div>
            <div className="space-y-3 relative z-10 flex-1">
              {topWins.length > 0 ? topWins.map((top: any, index: number) => {
                const medalColors = ['text-yellow-500', 'text-slate-400', 'text-amber-700'];
                const bgColors = ['bg-yellow-100/50 border-yellow-200', 'bg-slate-100 border-slate-200', 'bg-amber-100/50 border-amber-200'];
                return (
                  <div key={index} className={cn("flex items-center justify-between p-2 sm:p-3 rounded-2xl border backdrop-blur-sm transition-transform hover:scale-[1.02]", bgColors[index] || 'bg-white/50 border-white/50')}>
                    <div className="flex items-center gap-3">
                      <div className={cn("flex items-center justify-center w-6 sm:w-8 font-black text-lg sm:text-xl shrink-0 drop-shadow-sm", medalColors[index] || 'text-slate-400')}>
                        #{index + 1}
                      </div>
                      <div className="relative">
                         {renderCustomAvatar(top, "w-8 sm:w-10 h-8 sm:h-10", undefined, 'avatar')}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm sm:text-base font-bold text-slate-800 tracking-wide truncate max-w-[80px] sm:max-w-[120px]">{top.nickname || top.winner}</span>
                        <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5">{top.chance}% шанс</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base sm:text-lg font-extrabold text-emerald-500 block leading-none">+{top.winAmount?.toFixed(0)}</span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">CAT</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="h-full flex items-center justify-center text-xs sm:text-sm font-bold text-amber-500/50 uppercase tracking-widest text-center py-6">
                  Станьте первым в<br/>этой комнате!
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-xl flex flex-col justify-center items-start">
            <div className="flex gap-3 sm:gap-4 items-start mb-4">
              <HelpCircle className="w-8 sm:w-10 h-8 sm:h-10 text-brand-500 shrink-0 mt-1" />
              <div>
                <h4 className="font-black text-slate-900 text-xs sm:text-sm tracking-wider uppercase">Честная игра</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold leading-relaxed max-w-sm mt-1">
                  Победитель определяется случайным билетом. Система 100% синхронизирована: каждый пиксель рулетки рассчитывается сервером.
                </p>
              </div>
            </div>
            <div className="w-full flex justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl border border-emerald-100 items-center text-[10px] sm:text-xs font-black uppercase tracking-widest">
              <ShieldCheck className="w-4 sm:w-5 h-4 sm:h-5" /> Provably Fair
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
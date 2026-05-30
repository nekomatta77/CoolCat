// src/pages/Arena.tsx
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { Coins, Users, Play, Crosshair, Sparkles, Crown, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { vpsSocket as socket } from '../lib/vpsSocket';

interface ArenaProps {
  user: UserProfile;
}

const ARENA_CONFIG = [
  { id: 'arena_small', name: 'Micro Arena', minBet: 1, maxBet: 100, gradient: 'from-fuchsia-500 to-pink-600', shadow: 'shadow-pink-500/20' },
  { id: 'arena_medium', name: 'Neon Arena', minBet: 100, maxBet: 1000, gradient: 'from-violet-500 to-indigo-600', shadow: 'shadow-violet-500/20' },
  { id: 'arena_high', name: 'Cyber Arena', minBet: 1000, maxBet: 10000, gradient: 'from-cyan-500 to-blue-600', shadow: 'shadow-cyan-500/20' },
  { id: 'arena_unlimited', name: 'Cosmic Arena', minBet: 10, maxBet: 1000000, gradient: 'from-rose-500 to-orange-600', shadow: 'shadow-rose-500/20' },
];

export default function Arena({ user }: ArenaProps) {
  const [activeRoomId, setActiveRoomId] = useState('arena_small');
  const [room, setRoom] = useState<any>({ gameState: 'waiting', timeLeft: 20, players: [], totalPool: 0, totalTickets: 0, winner: null, history: [] });
  const [betInput, setBetInput] = useState('10');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBetting, setIsBetting] = useState(false);

  // Физика и Анимация Арены
  const [isAnimating, setIsAnimating] = useState(false);
  const [localWinner, setLocalWinner] = useState<any>(null);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  
  const [playerBlobs, setPlayerBlobs] = useState<Record<string, any>>({});
  const playerBlobsRef = useRef<Record<string, any>>({});
  
  const [ballPath, setBallPath] = useState<{ left: string[], top: string[] }>({ left: ['50%'], top: ['50%'] });
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  // Генерация уникальной геометрии для игрока
  const generateBlob = (percent: number) => {
    // Размер от 60px до 220px в зависимости от % ставки
    const size = 60 + (percent / 100) * 160; 
    return {
      top: `${5 + Math.random() * 60}%`, // Разброс по Арене
      left: `${5 + Math.random() * 70}%`,
      rotate: `${-40 + Math.random() * 80}deg`,
      borderRadius: `${40 + Math.random()*20}% ${40 + Math.random()*20}% ${40 + Math.random()*20}% ${40 + Math.random()*20}%`, // Эффект кривой фигуры
      size
    };
  };

  useEffect(() => {
    socket.emit('joinRoom', activeRoomId);

    setShowWinnerOverlay(false);
    setIsAnimating(false);
    setPlayerBlobs({});
    playerBlobsRef.current = {};
    setLocalWinner(null);

    socket.on('jackpotState', (updatedRoom) => {
      setRoom(updatedRoom);

      // Обновляем фигуры игроков
      if (updatedRoom.gameState === 'waiting' || updatedRoom.gameState === 'countdown') {
        const newBlobs = { ...playerBlobsRef.current };
        updatedRoom.players.forEach((p: any) => {
          const percent = updatedRoom.totalPool > 0 ? (p.betAmount / updatedRoom.totalPool) * 100 : 0;
          if (!newBlobs[p.uid]) {
            newBlobs[p.uid] = generateBlob(percent);
          } else {
            // Динамически меняем размер, если игрок докинул ставку
            newBlobs[p.uid].size = 60 + (percent / 100) * 160;
          }
        });
        playerBlobsRef.current = newBlobs;
        setPlayerBlobs(newBlobs);
      }

      if (updatedRoom.gameState === 'finished') {
        if (!isAnimatingRef.current) {
          if (updatedRoom.winner) setLocalWinner(updatedRoom.winner);
          setShowWinnerOverlay(true);
        }
      } 
      else if (updatedRoom.gameState === 'waiting') {
        setShowWinnerOverlay(false);
        setIsAnimating(false);
        setLocalWinner(null);
        setPlayerBlobs({});
        playerBlobsRef.current = {};
      }
    });

    socket.on('jackpotError', (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
      setIsBetting(false); 
    });

    socket.on('jackpotSpin', ({ winner }) => {
      if (!winner) return;

      setLocalWinner(winner);
      
      const targetBlob = playerBlobsRef.current[winner.uid];
      if (targetBlob) {
        const lefts = ['50%'];
        const tops = ['50%'];
        
        // Генерируем случайные точки для бешеного отскока от стен
        for (let i = 0; i < 10; i++) {
          lefts.push(`${Math.floor(Math.random() * 90)}%`);
          tops.push(`${Math.floor(Math.random() * 90)}%`);
        }
        
        // Последняя точка - центр фигуры победителя
        lefts.push(`calc(${targetBlob.left} + ${targetBlob.size / 2}px - 16px)`); // 16px = радиус шарика
        tops.push(`calc(${targetBlob.top} + ${targetBlob.size / 2}px - 16px)`);

        setBallPath({ left: lefts, top: tops });
        setIsAnimating(true);
      }
    });

    return () => {
      socket.emit('leaveRoom', activeRoomId);
      socket.off('jackpotState');
      socket.off('jackpotError');
      socket.off('jackpotSpin');
    };
  }, [activeRoomId]);

  // Таймер окончания анимации
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAnimating) {
      timer = setTimeout(() => {
        setIsAnimating(false);
        setShowWinnerOverlay(true);
      }, 15000); 
    }
    return () => clearTimeout(timer);
  }, [isAnimating]);

  const activeConfig = ARENA_CONFIG.find(r => r.id === activeRoomId)!;
  const currentPlayer = room.players?.find((p: any) => p.uid === user.uid);
  const currentTotalBet = currentPlayer ? currentPlayer.betAmount : 0;
  const isBetOverLimit = currentTotalBet + parseFloat(betInput || '0') > activeConfig.maxBet;

  const handlePlaceBet = () => {
    if (isBetting) return; 
    const amount = parseFloat(betInput);
    if (isNaN(amount) || amount <= 0) return;
    if (amount < activeConfig.minBet || isBetOverLimit) return;
    
    setIsBetting(true);
    socket.emit('placeJackpotBet', {
      userId: user.uid, nickname: user.nickname, avatar: user.avatar,
      amount, roomId: activeRoomId,
      cardStyle: user.cardStyle, equippedFrame: user.equippedFrame, equippedBg: user.equippedBg
    });
    setTimeout(() => setIsBetting(false), 500);
  };

  return (
    <div className="space-y-4 sm:space-y-8 pb-12 font-sans">
      
      {/* Выбор Арен */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {ARENA_CONFIG.map((roomTab) => {
          const isActive = roomTab.id === activeRoomId;
          return (
            <button
              key={roomTab.id}
              onClick={() => setActiveRoomId(roomTab.id)}
              className={cn("relative p-3 sm:p-5 rounded-2xl sm:rounded-[2rem] border text-left transition-all overflow-hidden group active:scale-95",
                isActive ? "bg-slate-900 border-slate-800 text-white shadow-xl " + roomTab.shadow : "bg-white border-slate-100 text-slate-800 hover:border-slate-200"
              )}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity", roomTab.gradient)} />
              <h3 className="font-black text-xs sm:text-base uppercase tracking-widest mb-1">{roomTab.name}</h3>
              <p className="text-[10px] sm:text-sm font-bold text-slate-400">{roomTab.minBet}-{roomTab.maxBet} CAT</p>
              {isActive && <div className={cn("absolute bottom-0 left-0 h-1 sm:h-1.5 w-full bg-gradient-to-r", roomTab.gradient)} />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        
        {/* ИГРОВОЕ ПОЛЕ АРЕНЫ */}
        <div className="order-1 lg:col-span-2 w-full space-y-4 sm:space-y-6">
          <div className="bg-slate-950 rounded-[2rem] sm:rounded-[2.5rem] p-2 sm:p-4 text-white relative overflow-hidden flex flex-col items-center justify-center min-h-[350px] sm:min-h-[550px] border-2 border-slate-800 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
            
            {/* Сетка на фоне */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 border border-slate-700/50 px-4 py-2 rounded-2xl backdrop-blur-sm z-20">
              <Crosshair className="w-4 h-4 text-brand-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-200">
                {room.gameState === 'waiting' && 'Ждем бойцов'}
                {room.gameState === 'countdown' && `До старта: ${room.timeLeft}с`}
                {room.gameState === 'rolling' && 'Огонь!'}
              </span>
            </div>

            <div className="absolute top-4 right-4 bg-slate-900/80 border border-slate-700/50 px-4 py-2 rounded-2xl backdrop-blur-sm z-20">
                <span className="text-sm font-black text-brand-400 tracking-widest">{room.totalPool.toFixed(0)} CAT</span>
            </div>

            {/* ГЕНЕРАЦИЯ ФИГУР ИГРОКОВ */}
            {room.players?.map((player: any) => {
              const blob = playerBlobs[player.uid];
              if (!blob) return null;
              const percent = room.totalPool > 0 ? (player.betAmount / room.totalPool) * 100 : 0;

              return (
                <motion.div
                  key={player.uid}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, rotate: blob.rotate }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="absolute flex flex-col items-center justify-center overflow-hidden border-[3px] sm:border-[4px] shadow-2xl transition-all duration-500"
                  style={{
                    width: blob.size, height: blob.size,
                    top: blob.top, left: blob.left,
                    borderRadius: blob.borderRadius,
                    borderColor: player.color,
                    backgroundColor: player.cardStyle?.background || '#fff'
                  }}
                >
                  <img src={player.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" />
                  <span className="relative z-10 font-black text-white text-[10px] sm:text-xs truncate w-full text-center px-1 bg-black/40 py-0.5 rounded-full">{player.nickname}</span>
                  <span className="relative z-10 font-black text-xs sm:text-sm mt-1" style={{ color: player.color, textShadow: '0 0 8px rgba(0,0,0,0.9)' }}>
                    {percent.toFixed(1)}%
                  </span>
                </motion.div>
              );
            })}

            {/* ЛЕТАЮЩИЙ СНАРЯД */}
            <AnimatePresence>
              {isAnimating && (
                <motion.div
                  className="absolute w-8 h-8 sm:w-10 sm:h-10 z-50 flex items-center justify-center pointer-events-none"
                  initial={{ top: '50%', left: '50%', scale: 0 }}
                  animate={{ top: ballPath.top, left: ballPath.left, scale: 1 }}
                  transition={{ 
                    duration: 15, 
                    ease: "linear",
                    // Задаем тайминги: первые 8 отскоков быстрые, последний рывок к победителю медленный
                    times: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.35, 0.5, 0.7, 1] 
                  }}
                >
                  <div className="w-full h-full rounded-full bg-white shadow-[0_0_30px_#fff,0_0_60px_#fff] flex items-center justify-center">
                     <div className="w-4 h-4 bg-brand-500 rounded-full animate-pulse" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ОКОШКО ПОБЕДИТЕЛЯ АРЕНЫ */}
            <AnimatePresence>
              {showWinnerOverlay && localWinner && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 z-40">
                  <motion.div 
                    initial={{ scale: 0.5, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 15 }} 
                    className="relative z-10 flex flex-col items-center bg-slate-900 border border-slate-700/50 p-6 sm:p-8 rounded-[2rem] shadow-2xl min-w-[280px]"
                  >
                    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1.5, opacity: 0.2 }} transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }} className="absolute w-40 sm:w-56 h-40 sm:h-56 rounded-full blur-[40px] sm:blur-[50px] pointer-events-none" style={{ backgroundColor: localWinner.color || '#eab308' }} />
                    <div className="relative mb-4 sm:mb-6">
                      <Sparkles className="absolute -top-3 sm:-top-5 -left-3 sm:-left-5 w-6 sm:w-8 h-6 sm:h-8 text-yellow-400 animate-pulse" />
                      <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-[30%] border-4 overflow-hidden shadow-lg" style={{ borderColor: localWinner.color }}>
                        <img src={localWinner.avatar} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 p-1.5 sm:p-2 rounded-full border-2 border-slate-900 shadow-xl z-30">
                         <Crown className="w-4 sm:w-6 h-4 sm:h-6 text-slate-900" />
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-3xl font-black text-white tracking-wider mb-2 drop-shadow-lg uppercase">{localWinner.nickname}</h3>
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 border border-emerald-500/30 px-6 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl backdrop-blur-sm w-full text-center">
                      <span className="text-[10px] text-emerald-200/70 font-black block uppercase tracking-widest mb-1">Выигрыш Арены</span>
                      <span className="text-3xl sm:text-4xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">+{localWinner.winAmount?.toFixed(2)}</span>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ (Ставка) */}
        <div className="order-2 lg:col-span-1 w-full space-y-4 sm:space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40">
            <h2 className="text-lg font-black text-slate-900 tracking-wider flex items-center gap-2 mb-5">
              <Coins className="w-6 h-6 text-brand-500" /> Ставка
            </h2>
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between transition-all focus-within:border-brand-300">
                <span className="text-sm font-black text-slate-400 uppercase tracking-widest pl-1">CAT</span>
                <input
                  type="number" value={betInput} onChange={(e) => setBetInput(e.target.value)}
                  disabled={room.gameState === 'rolling' || room.gameState === 'finished' || isBetting}
                  className="bg-transparent text-right font-black text-slate-900 outline-none w-32 text-xl"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[10, 50, 100, 500].map((v) => (
                  <button key={v} onClick={() => setBetInput(v.toString())} disabled={room.gameState === 'rolling' || room.gameState === 'finished'} className="py-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-sm font-black text-slate-600 active:scale-95">+{v}</button>
                ))}
              </div>
              <AnimatePresence>
                {errorMessage && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-bold uppercase w-full">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={handlePlaceBet}
                disabled={room.gameState === 'rolling' || room.gameState === 'finished' || user.balance < parseFloat(betInput) || isBetOverLimit || isBetting}
                className={cn("w-full py-5 bg-gradient-to-r text-white font-black rounded-2xl shadow-xl hover:-translate-y-0.5 uppercase tracking-widest active:scale-95 text-lg flex items-center justify-center gap-2", activeConfig.gradient, (room.gameState === 'rolling' || room.gameState === 'finished' || isBetOverLimit) && "opacity-50 pointer-events-none")}
              >
                <Play className="w-6 h-6 fill-current" /> В бой
              </button>
            </div>
          </div>
          
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40">
             <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-slate-400" /> Участники ({room.players?.length || 0})
              </h3>
            </div>
            <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
              <AnimatePresence>
                {room.players?.map((player: any) => (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={player.uid} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[30%] overflow-hidden border-2" style={{ borderColor: player.color }}>
                         <img src={player.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{player.nickname}</span>
                        <span className="text-[10px] font-bold tracking-widest" style={{ color: player.color }}>{player.betAmount} CAT</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
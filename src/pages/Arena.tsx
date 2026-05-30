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

// Грубые, рубленые фигуры (создают эффект разбитого стекла/прямых линий)
const SHAPES = [
  'polygon(2% 0%, 100% 2%, 98% 100%, 0% 98%)',
  'polygon(0% 2%, 98% 0%, 100% 100%, 2% 98%)',
  'polygon(0% 0%, 100% 2%, 98% 98%, 2% 100%)',
  'polygon(2% 2%, 100% 0%, 100% 98%, 0% 100%)',
  'polygon(0% 0%, 98% 2%, 100% 100%, 2% 98%)',
  'polygon(4% 0%, 96% 0%, 100% 100%, 0% 100%)', // Трапеция
  'polygon(0% 0%, 100% 4%, 96% 100%, 4% 96%)'
];

export default function Arena({ user }: ArenaProps) {
  const [activeRoomId, setActiveRoomId] = useState('arena_small');
  const [room, setRoom] = useState<any>({ gameState: 'waiting', timeLeft: 20, players: [], totalPool: 0, totalTickets: 0, winner: null, history: [] });
  const [betInput, setBetInput] = useState('10');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBetting, setIsBetting] = useState(false);

  const [isAnimating, setIsAnimating] = useState(false);
  const [localWinner, setLocalWinner] = useState<any>(null);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const shapeMap = useRef<Record<string, string>>({});
  const isAnimatingRef = useRef(false);
  
  const [ballAnim, setBallAnim] = useState<{ tops: string[], lefts: string[], times: number[] }>({ tops: ['50%'], lefts: ['50%'], times: [0] });

  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  useEffect(() => {
    socket.emit('joinRoom', activeRoomId);

    setShowWinnerOverlay(false);
    setIsAnimating(false);
    setLocalWinner(null);
    shapeMap.current = {};

    socket.on('jackpotState', (updatedRoom) => {
      setRoom(updatedRoom);

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
        shapeMap.current = {};
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
      
      // Идеальная физика отскоков шайбы
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        const ballRadius = 16; 
        const margin = ballRadius; 
        
        const points = [{ x: cw / 2, y: ch / 2 }]; // Старт из центра
        const sides = ['top', 'right', 'bottom', 'left'];
        let currentSide = sides[Math.floor(Math.random() * sides.length)];

        // Генерируем 10 ударов СТРОГО о стенки
        for (let i = 0; i < 10; i++) {
          let nextSide;
          do { nextSide = sides[Math.floor(Math.random() * sides.length)]; } while (nextSide === currentSide);
          currentSide = nextSide;

          let nx = 0, ny = 0;
          if (currentSide === 'top') { ny = margin; nx = margin + Math.random() * (cw - margin * 2); }
          else if (currentSide === 'bottom') { ny = ch - margin; nx = margin + Math.random() * (cw - margin * 2); }
          else if (currentSide === 'left') { nx = margin; ny = margin + Math.random() * (ch - margin * 2); }
          else if (currentSide === 'right') { nx = cw - margin; ny = margin + Math.random() * (ch - margin * 2); }

          points.push({ x: nx, y: ny });
        }

        // Финальная точка - ровно в центр фигуры победителя
        const cb = containerRef.current.getBoundingClientRect();
        const wb = playerRefs.current[winner.uid]?.getBoundingClientRect();
        
        if (cb && wb) {
          const targetX = (wb.left - cb.left) + wb.width / 2;
          const targetY = (wb.top - cb.top) + wb.height / 2;
          points.push({ x: targetX, y: targetY });
        } else {
          points.push({ x: cw / 2, y: ch / 2 });
        }

        // РАСЧЕТ РАВНОМЕРНОЙ СКОРОСТИ И ФИНАЛЬНОГО ЗАМЕДЛЕНИЯ
        let totalTimeWeight = 0;
        const dists = [];
        const timeWeights = [];
        
        for(let i = 1; i < points.length; i++) {
           const dx = points[i].x - points[i-1].x;
           const dy = points[i].y - points[i-1].y;
           const d = Math.sqrt(dx * dx + dy * dy);
           dists.push(d);
           
           // Скорость шайбы быстрая и константная, замедляется только на последнем отрезке
           const isLastStretch = i === points.length - 1;
           const speed = isLastStretch ? 0.15 : 1; 
           
           const weight = d / speed;
           timeWeights.push(weight);
           totalTimeWeight += weight;
        }

        const times = [0];
        let currT = 0;
        for(let i = 0; i < timeWeights.length; i++) {
           currT += timeWeights[i] / totalTimeWeight;
           times.push(currT);
        }

        const lefts = points.map(p => `${(p.x / cw) * 100}%`);
        const tops = points.map(p => `${(p.y / ch) * 100}%`);

        setBallAnim({ tops, lefts, times });
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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAnimating) {
      timer = setTimeout(() => {
        setIsAnimating(false);
        setShowWinnerOverlay(true);
      }, 15000); // 12 секунд полета + 3 секунды паузы
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

  const renderCustomAvatar = (player: any) => {
    const safeAvatar = player.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback';
    return (
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay flex items-center justify-center">
        <img src={safeAvatar} className="w-full h-full object-cover" />
      </div>
    );
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

            <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 border border-slate-700/50 px-4 py-2 rounded-2xl backdrop-blur-sm z-30">
              <Crosshair className="w-4 h-4 text-brand-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-200">
                {room.gameState === 'waiting' && 'Ждем бойцов'}
                {room.gameState === 'countdown' && `До старта: ${room.timeLeft}с`}
                {room.gameState === 'rolling' && 'Огонь!'}
              </span>
            </div>

            <div className="absolute top-4 right-4 bg-slate-900/80 border border-slate-700/50 px-4 py-2 rounded-2xl backdrop-blur-sm z-30">
                <span className="text-sm font-black text-brand-400 tracking-widest">{room.totalPool.toFixed(0)} CAT</span>
            </div>

            {/* ПРОСТРАНСТВО АРЕНЫ: Идеальное заполнение */}
            <div ref={containerRef} className="absolute inset-0 p-1 sm:p-2 flex flex-wrap content-stretch items-stretch gap-1 sm:gap-2 z-10">
                <AnimatePresence>
                  {room.players?.map((player: any) => {
                    if (!shapeMap.current[player.uid]) {
                      shapeMap.current[player.uid] = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    }
                    const shapeClip = shapeMap.current[player.uid];
                    const percent = room.totalPool > 0 ? (player.betAmount / room.totalPool) * 100 : 0;

                    return (
                      <motion.div
                        key={player.uid}
                        ref={(el) => { playerRefs.current[player.uid] = el; }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", bounce: 0.4 }}
                        className="relative flex flex-col items-center justify-center overflow-hidden transition-all duration-500 shadow-xl"
                        style={{
                          // Flex-grow позволяет элементам заполнять 100% ширины/высоты арены пропорционально ставке!
                          flex: `${player.betAmount} 1 ${percent}%`, 
                          clipPath: shapeClip,
                          backgroundColor: player.color, 
                        }}
                      >
                        {renderCustomAvatar(player)}
                        
                        <div className="relative z-20 flex flex-col items-center p-2 text-center bg-slate-950/40 backdrop-blur-sm px-3 py-1.5 rounded-2xl border border-white/10">
                          <span className="font-bold text-white text-[10px] sm:text-xs tracking-wide truncate max-w-[80px] sm:max-w-[120px] drop-shadow-md">
                            {player.nickname}
                          </span>
                          <span className="font-black text-xs sm:text-lg text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] mt-0.5 leading-none">
                            {percent.toFixed(1)}%
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
            </div>

            {/* ЛЕТАЮЩАЯ ШАЙБА (Инерция и удары о стенки) */}
            <AnimatePresence>
              {isAnimating && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute z-40 top-0 left-0 w-full h-full pointer-events-none">
                  <motion.div
                    className="absolute w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
                    animate={{ top: ballAnim.tops, left: ballAnim.lefts }}
                    style={{ translateX: '-50%', translateY: '-50%' }}
                    transition={{ 
                      duration: 12, 
                      ease: "linear", 
                      times: ballAnim.times 
                    }}
                  >
                    <div className="w-full h-full rounded-full bg-white shadow-[0_0_30px_#fff,0_0_60px_#fff] flex items-center justify-center border-4 border-slate-900">
                       <div className="w-3 h-3 bg-brand-500 rounded-full animate-pulse" />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ОКОШКО ПОБЕДИТЕЛЯ АРЕНЫ */}
            <AnimatePresence>
              {showWinnerOverlay && localWinner && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 z-50">
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
                <Users className="w-6 h-6 text-slate-400" /> Бойцы ({room.players?.length || 0})
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
// src/pages/Arena.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { vpsSocket as socket } from '../lib/vpsSocket';
import { UserProfile } from '../types';
import { Users, Swords, AlertCircle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { FRAMES, BACKGROUNDS } from '../lib/customization';

const ROOMS = [
  { id: 'small', name: 'Small', min: 1, max: 100 },
  { id: 'medium', name: 'Medium', min: 100, max: 1000 },
  { id: 'high', name: 'High', min: 1000, max: 10000 },
  { id: 'unlimited', name: 'Unlimited', min: 10, max: 1000000 },
];

interface Player {
  uid: string;
  nickname: string;
  avatar: string;
  color: string;
  betAmount: number;
  ticketsStart: number;
  ticketsEnd: number;
  cardStyle?: any;
  equippedFrame?: string;
  equippedBg?: string;
}

interface RoomState {
  id: string;
  gameState: 'waiting' | 'countdown' | 'rolling' | 'finished';
  timeLeft: number;
  players: Player[];
  totalPool: number;
  totalTickets: number;
  winner: any;
  history: any[];
}

// Математика 100% заполнения поля полигонами
const getPointForArea = (targetArea: number, xc: number, yc: number) => {
  const V = [
    { x: 100, y: yc }, { x: 100, y: 100 }, { x: 0, y: 100 },
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: yc }
  ];
  const A = [0];
  A.push(A[0] + 0.5 * (100 - yc) * (100 - xc));
  A.push(A[1] + 0.5 * 100 * (100 - yc));
  A.push(A[2] + 0.5 * 100 * xc);
  A.push(A[3] + 0.5 * 100 * yc);
  A.push(10000); 

  let tA = targetArea;
  while (tA < 0) tA += 10000;
  tA = tA % 10000;

  if (tA <= 0) return { x: V[0].x, y: V[0].y };
  if (tA >= 10000) return { x: V[5].x, y: V[5].y };
  
  for (let i = 0; i < 5; i++) {
    if (tA >= A[i] && tA <= A[i+1]) {
      if (A[i+1] === A[i]) continue;
      const t = (tA - A[i]) / (A[i+1] - A[i]);
      return {
        x: V[i].x + t * (V[i+1].x - V[i].x),
        y: V[i].y + t * (V[i+1].y - V[i].y)
      };
    }
  }
  return { x: V[5].x, y: V[5].y };
};

const renderCustomAvatar = (player: any, sizeClass: string) => {
  const frameObj = FRAMES.find(f => f.id === player.equippedFrame) || FRAMES[0];
  const bgObj = BACKGROUNDS.find(b => b.id === player.equippedBg);
  const cardBg = player.cardStyle?.background || '#ffffff';
  const cardBorder = player.cardStyle?.border || player.color;
  const safeAvatar = player.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback';

  return (
    <div className={cn("relative flex items-center justify-center", sizeClass)}>
      <div 
        className={cn("absolute inset-0 overflow-hidden shadow-md rounded-[30%] sm:rounded-[35%] border-[3px]", frameObj.css)}
        style={{ backgroundColor: cardBg, borderColor: frameObj.id === 'none' ? cardBorder : undefined }}
      >
        <div className={cn("absolute inset-0 opacity-40 z-0", bgObj?.gradient)} />
        <img src={safeAvatar} alt="avatar" className="absolute inset-0 w-full h-full z-10 object-cover" />
      </div>
      {frameObj.img && (
        <img src={frameObj.img} alt="frame" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[125%] h-[125%] object-contain pointer-events-none z-30 drop-shadow-lg" />
      )}
    </div>
  );
};

// =========================================================
// ИГРОВОЕ ПОЛЕ С ФИЗИКОЙ И ШАЙБОЙ
// =========================================================
const ArenaField = ({ roomState, spinData }: { roomState: RoomState | null, spinData: any }) => {
  // Состояние физики шайбы
  const [ball, setBall] = useState({ x: 50, y: 50 });
  const [ballTrail, setBallTrail] = useState<{x: number, y: number}[]>([]);
  
  // Рефы для хранения текущих физических параметров без ререндера
  const physicsRef = useRef({
    x: 50, y: 50,
    vx: 1.2, vy: 1.5,
    isRolling: false,
    rollStartTime: 0
  });

  // ИСПРАВЛЕНИЕ: Явное указание null как стартового значения
  const reqRef = useRef<number | null>(null);

  // Игровой цикл физики шайбы (60 FPS)
  useEffect(() => {
    const loop = () => {
      const p = physicsRef.current;
      
      if (p.isRolling) {
        const elapsed = Date.now() - p.rollStartTime;
        const remaining = 15000 - elapsed; // 15 секунд прокрутки
        
        // Нормальные отскоки от стен арены (радиус шайбы ~3%)
        if (p.x <= 3 || p.x >= 97) p.vx *= -1;
        if (p.y <= 3 || p.y >= 97) p.vy *= -1;

        if (remaining > 3000) {
          // Активная фаза отскоков (небольшое ускорение, чтобы шайба не застревала)
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (speed < 1.5) { p.vx *= 1.05; p.vy *= 1.05; }
          if (speed > 2.5) { p.vx *= 0.95; p.vy *= 0.95; }
          
          p.x += p.vx;
          p.y += p.vy;
        } else if (remaining > 0 && (window as any).winnerCentroid) {
          // Фаза магнита (последние 3 секунды) - шайбу притягивает в центр победителя
          const target = (window as any).winnerCentroid;
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          
          // Трение и магнетизм
          p.vx = (p.vx * 0.9) + (dx * 0.03);
          p.vy = (p.vy * 0.9) + (dy * 0.03);
          
          p.x += p.vx;
          p.y += p.vy;
        }

        // Ограничители, чтобы шайба не вылетела за пределы
        p.x = Math.max(3, Math.min(97, p.x));
        p.y = Math.max(3, Math.min(97, p.y));

        setBall({ x: p.x, y: p.y });
        
        // След от шайбы (Trail)
        setBallTrail(prev => {
          const newTrail = [...prev, { x: p.x, y: p.y }];
          if (newTrail.length > 10) newTrail.shift();
          return newTrail;
        });

      } else {
        // Если игра не крутится, плавно возвращаем шайбу в центр
        if (p.x !== 50 || p.y !== 50) {
          p.x += (50 - p.x) * 0.1;
          p.y += (50 - p.y) * 0.1;
          setBall({ x: p.x, y: p.y });
          setBallTrail([]);
        }
      }

      reqRef.current = requestAnimationFrame(loop);
    };
    
    reqRef.current = requestAnimationFrame(loop);
    
    return () => {
      if (reqRef.current !== null) {
        cancelAnimationFrame(reqRef.current);
      }
    };
  }, []);

  // Синхронизация состояний из пропсов в физику
  useEffect(() => {
    if (roomState?.gameState === 'rolling' && !physicsRef.current.isRolling) {
      physicsRef.current.isRolling = true;
      physicsRef.current.rollStartTime = Date.now();
      // Рандомизируем начальный толчок шайбы
      physicsRef.current.vx = (Math.random() > 0.5 ? 1.5 : -1.5) * (Math.random() * 0.5 + 0.8);
      physicsRef.current.vy = (Math.random() > 0.5 ? 1.5 : -1.5) * (Math.random() * 0.5 + 0.8);
    } else if (roomState?.gameState !== 'rolling') {
      physicsRef.current.isRolling = false;
    }
  }, [roomState?.gameState]);

  // СТАТИЧНЫЙ ЦЕНТР (Фигуры меняются только при новых ставках)
  const { xc, yc } = useMemo(() => {
    if (!roomState || !roomState.players || roomState.players.length === 0) return { xc: 50, yc: 50 };
    // Центр, из которого делятся полигоны, теперь зависит от размера банка и количества игроков.
    // При добавлении нового игрока поле перестроится случайным, но строго статичным образом.
    const seed = (roomState.totalPool || 1) + (roomState.players.length * 73);
    return {
      xc: 35 + (seed % 30),
      yc: 35 + ((seed * 17) % 30)
    };
  }, [roomState?.players?.length, roomState?.totalPool]);

  // Генерация полигонов
  const layout = useMemo(() => {
    if (!roomState || !roomState.players || roomState.players.length === 0) return [];
    
    const players = roomState.players;
    const totalPool = roomState.totalPool || 0;

    const V = [
      { x: 100, y: yc }, { x: 100, y: 100 }, { x: 0, y: 100 }, 
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: yc }
    ];

    const A = [0];
    A.push(A[0] + 0.5 * (100 - yc) * (100 - xc));
    A.push(A[1] + 0.5 * 100 * (100 - yc));
    A.push(A[2] + 0.5 * 100 * xc);
    A.push(A[3] + 0.5 * 100 * yc);
    A.push(10000); 

    let currentArea = 0;
    const lyt = players.map((p) => {
      const playerArea = totalPool > 0 ? (p.betAmount / totalPool) * 10000 : 0;
      const startArea = currentArea;
      const endArea = currentArea + playerArea;
      
      if (playerArea <= 0) {
        return { ...p, pointsStr: "", cx: xc, cy: yc, startArea, endArea, percentage: 0 };
      }

      const pStart = getPointForArea(startArea, xc, yc);
      const pEnd = getPointForArea(endArea, xc, yc);
      
      const points = [{ x: xc, y: yc }, pStart];
      for (let i = 1; i <= 4; i++) {
        if (A[i] > startArea && A[i] < endArea) {
          points.push({ x: V[i].x, y: V[i].y });
        }
      }
      points.push(pEnd);
      currentArea = endArea;
      
      const pointsStr = points.map(pt => `${pt.x},${pt.y}`).join(' ');
      
      let cx = 0, cy = 0, signedArea = 0;
      for(let i = 0; i < points.length; i++) {
         const p1 = points[i];
         const p2 = points[(i+1) % points.length];
         const a = p1.x * p2.y - p2.x * p1.y;
         signedArea += a;
         cx += (p1.x + p2.x) * a;
         cy += (p1.y + p2.y) * a;
      }
      signedArea *= 0.5;
      
      if (Math.abs(signedArea) > 0.1) {
        cx = cx / (6 * signedArea);
        cy = cy / (6 * signedArea);
      } else {
        cx = (xc + pStart.x + pEnd.x) / 3;
        cy = (yc + pStart.y + pEnd.y) / 3;
      }

      // Глобально сохраняем центр победителя для физики шайбы
      if (spinData && roomState.gameState === 'rolling' && spinData.winner?.uid === p.uid) {
        (window as any).winnerCentroid = { x: cx, y: cy };
      }

      return {
        ...p, pointsStr, cx, cy, startArea, endArea,
        percentage: totalPool > 0 ? (p.betAmount / totalPool) * 100 : 0
      };
    });
    
    return lyt;
  }, [roomState?.players, roomState?.totalPool, xc, yc, spinData, roomState?.gameState]);

  if (!layout.length) {
    return (
      <div className="w-full h-full relative rounded-[3rem] bg-slate-950 border-8 border-slate-900 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-[3rem] bg-slate-950 shadow-[0_0_50px_rgba(0,0,0,0.5)_inset] border-8 border-slate-900 overflow-hidden group">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Базовый радиальный фон Арены */}
        <rect width="100" height="100" fill="#020617" />
        
        {/* Сетка Арены (только концентрические круги, без луча) */}
        <g stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" fill="none">
          <circle cx="50" cy="50" r="20" />
          <circle cx="50" cy="50" r="40" />
          <circle cx="50" cy="50" r="60" />
          <circle cx="50" cy="50" r="80" />
          <line x1="0" y1="50" x2="100" y2="50" />
          <line x1="50" y1="0" x2="50" y2="100" />
          <line x1="15" y1="15" x2="85" y2="85" />
          <line x1="15" y1="85" x2="85" y2="15" />
        </g>

        {/* ПОЛИГОНЫ ИГРОКОВ (Голографический эффект) */}
        {layout.map((p, i) => {
          if (!p.pointsStr) return null;
          const isWinner = roomState?.gameState === 'finished' && roomState.winner?.uid === p.uid;
          
          let opacity = 0.5;
          let strokeWidth = "0.2";
          let filter = "none";

          if (roomState?.gameState === 'finished') {
             opacity = isWinner ? 0.9 : 0.1;
             strokeWidth = isWinner ? "0.8" : "0.1";
             filter = isWinner ? "url(#glow)" : "none";
          } else if (roomState?.gameState === 'rolling') {
             // Фигура подсвечивается (реагирует), если шайба пролетает близко к её центру
             const dx = p.cx - ball.x;
             const dy = p.cy - ball.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist < 30) {
               opacity = 0.8;
               filter = "url(#glow)";
             }
          }

          return (
            <polygon 
              key={`poly-${i}`}
              points={p.pointsStr} 
              fill={p.color} 
              stroke="#ffffff" 
              strokeWidth={strokeWidth}
              style={{ filter, opacity, transition: 'opacity 0.2s ease, stroke-width 0.2s ease' }}
            />
          );
        })}

        {/* СЛЕД ОТ ШАЙБЫ */}
        {roomState?.gameState === 'rolling' && ballTrail.length > 1 && (
          <polyline 
            points={ballTrail.map(pt => `${pt.x},${pt.y}`).join(' ')}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
            filter="url(#glow)"
          />
        )}
        
        {/* ШАЙБА (PUCK) */}
        {roomState?.gameState === 'rolling' && (
          <g transform={`translate(${ball.x}, ${ball.y})`}>
             <circle r="3.5" fill="#818cf8" filter="url(#glow)" opacity="0.6" />
             <circle r="2.5" fill="#e0e7ff" />
             <circle r="1" fill="#ffffff" />
          </g>
        )}
        
        {/* Статичное Ядро (Центр пересечения лучей) */}
        <circle cx={xc} cy={yc} r="1" fill="#ffffff" filter="url(#glow)" />
      </svg>

      {/* АВАТАРКИ ИГРОКОВ (HTML слой) */}
      {layout.map((p, i) => {
        if (!p.pointsStr) return null;
        const sizePx = Math.max(35, Math.min(110, 25 + Math.sqrt(p.percentage) * 10));
        const isWinner = roomState?.gameState === 'finished' && roomState.winner?.uid === p.uid;
        
        let opacity = 1;
        if (roomState?.gameState === 'finished' && !isWinner) opacity = 0.2;

        return (
          <div 
            key={`ava-${i}`}
            className="absolute transition-all duration-300 pointer-events-none drop-shadow-2xl"
            style={{ 
              left: `${p.cx}%`, 
              top: `${p.cy}%`, 
              transform: 'translate(-50%, -50%)',
              opacity,
              width: `${sizePx}px`,
              height: `${sizePx}px`,
              zIndex: isWinner ? 40 : 10
            }}
          >
            {renderCustomAvatar(p, "w-full h-full")}
          </div>
        );
      })}
    </div>
  );
};

export default function Arena({ user }: { user: UserProfile | null }) {
  const [activeRoom, setActiveRoom] = useState('small');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [spinData, setSpinData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBetting, setIsBetting] = useState(false);

  useEffect(() => {
    const handleState = (state: RoomState) => setRoomState(state);
    const handleSpin = (data: any) => setSpinData(data);
    const handleError = (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
      setIsBetting(false);
    };

    socket.on('jackpotState', handleState);
    socket.on('jackpotSpin', handleSpin);
    socket.on('jackpotError', handleError);

    return () => {
      socket.off('jackpotState', handleState);
      socket.off('jackpotSpin', handleSpin);
      socket.off('jackpotError', handleError);
    };
  }, []);

  useEffect(() => {
    socket.emit('joinRoom', activeRoom);
    return () => {
      socket.emit('leaveRoom', activeRoom);
    };
  }, [activeRoom]);

  const handleBet = () => {
    if (!user || isBetting) return;
    if (user.balance < betAmount) {
       setErrorMsg("Недостаточно средств");
       setTimeout(() => setErrorMsg(null), 3000);
       return;
    }
    setIsBetting(true);
    socket.emit('placeJackpotBet', {
      userId: user.uid,
      nickname: user.nickname,
      avatar: user.avatar,
      amount: betAmount,
      roomId: activeRoom,
      cardStyle: user.cardStyle, 
      equippedFrame: user.equippedFrame,
      equippedPrefix: user.equippedPrefix,
      equippedBg: user.equippedBg
    });
    setTimeout(() => { setIsBetting(false); }, 500);
  };

  const isGameRunning = roomState?.gameState === 'rolling' || roomState?.gameState === 'finished';

  return (
    <div className="pb-12 max-w-7xl mx-auto px-4 lg:px-8 space-y-6">
       <header className="flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-3">
           <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center">
             <Swords className="w-6 h-6 text-brand-600" />
           </div>
           <div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Arena</h1>
             <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Неоновая битва</p>
           </div>
         </div>
         
         <div className="flex flex-wrap items-center justify-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
            {ROOMS.map(room => (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                  activeRoom === room.id 
                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/30" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {room.name}
              </button>
            ))}
         </div>
       </header>

       <AnimatePresence>
         {errorMsg && (
           <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm">
             <AlertCircle className="w-5 h-5" />
             {errorMsg}
           </motion.div>
         )}
       </AnimatePresence>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
         <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm">
               <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full animate-pulse",
                    roomState?.gameState === 'waiting' ? "bg-amber-400" :
                    roomState?.gameState === 'countdown' ? "bg-brand-500" :
                    roomState?.gameState === 'rolling' ? "bg-purple-500" : "bg-emerald-500"
                  )} />
                  <span className="font-black text-slate-700 uppercase tracking-widest text-sm">
                    {roomState?.gameState === 'waiting' && 'Ожидание соперников'}
                    {roomState?.gameState === 'countdown' && `Битва через ${roomState.timeLeft}с`}
                    {roomState?.gameState === 'rolling' && 'Шайба на поле!'}
                    {roomState?.gameState === 'finished' && 'Раунд завершен'}
                    {!roomState && 'Подключение к Арене...'}
                  </span>
               </div>
               <div className="text-right">
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Банк арены</p>
                  <p className="text-xl font-black text-slate-900">{roomState?.totalPool || 0} CAT</p>
               </div>
            </div>

            <div className="w-full aspect-square relative drop-shadow-2xl">
               <ArenaField roomState={roomState} spinData={spinData} />
               
               <AnimatePresence>
                 {roomState?.gameState === 'finished' && roomState.winner && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.8, y: 20 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.8 }}
                     className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                   >
                     <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-8 rounded-[3rem] text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                       {renderCustomAvatar(roomState.winner, "w-24 h-24 mx-auto mb-4")}
                       <h3 className="text-3xl font-black text-white mb-1">{roomState.winner.nickname}</h3>
                       <p className="text-brand-400 font-bold uppercase tracking-widest text-xs">Забирает банк</p>
                       <p className="text-white font-black text-4xl mt-4">+{roomState.winner.winAmount?.toFixed(0)} CAT</p>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Внести ставку</h3>
               <div className="space-y-4">
                 <div className="relative">
                   <input 
                     type="number" 
                     value={betAmount}
                     onChange={(e) => setBetAmount(Number(e.target.value))}
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 text-2xl font-black text-slate-900 focus:outline-none focus:border-brand-500 transition-colors"
                   />
                   <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300">CAT</span>
                 </div>
                 
                 <div className="grid grid-cols-4 gap-2">
                   {[10, 50, 100, 1000].map(val => (
                     <button 
                       key={val}
                       onClick={() => setBetAmount(prev => prev + val)}
                       className="py-2 bg-slate-50 hover:bg-brand-50 rounded-xl font-bold text-slate-600 hover:text-brand-600 transition-colors text-xs lg:text-sm"
                     >
                       +{val}
                     </button>
                   ))}
                 </div>
                 
                 <button 
                   onClick={handleBet}
                   disabled={!user || isGameRunning || isBetting || user.balance < betAmount}
                   className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-brand-500/30 active:scale-95 flex items-center justify-center gap-2"
                 >
                   {!user ? 'Войдите для игры' : isGameRunning ? 'Раунд идет...' : 'Сделать ставку'}
                 </button>
               </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Участники ({roomState?.players?.length || 0})</h3>
                 <Users className="w-5 h-5 text-slate-300" />
               </div>
               
               <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                 <AnimatePresence>
                   {roomState?.players?.map((p) => (
                     <motion.div 
                       key={p.uid}
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl"
                       style={{ borderLeft: `4px solid ${p.color}` }}
                     >
                       <div className="flex items-center gap-3">
                         {renderCustomAvatar(p, "w-10 h-10")}
                         <div>
                           <p className="font-bold text-slate-900 text-sm max-w-[100px] truncate">{p.nickname}</p>
                           <p className="text-xs font-bold text-slate-400">{((p.betAmount / (roomState.totalPool || 1)) * 100).toFixed(1)}% шанс</p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="font-black text-brand-600">{p.betAmount}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase">CAT</p>
                       </div>
                     </motion.div>
                   ))}
                   {(!roomState?.players || roomState.players.length === 0) && (
                     <div className="text-center py-8">
                       <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                       <p className="text-slate-400 font-medium text-sm">Ждем первых игроков...</p>
                     </div>
                   )}
                 </AnimatePresence>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
}
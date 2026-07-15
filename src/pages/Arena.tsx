// src/pages/Arena.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { UserProfile } from '../types';
import { Users, Swords, AlertCircle, Clock } from 'lucide-react'; // <-- ДОБАВЛЕН ИМПОРТ CLOCK
import { cn } from '../lib/utils';

// Настройки комнат Арены
const ROOMS = [
  { id: 'arena_small', name: 'Small', min: 1, max: 100 },
  { id: 'arena_medium', name: 'Medium', min: 100, max: 1000 },
  { id: 'arena_high', name: 'High', min: 1000, max: 10000 },
  { id: 'arena_unlimited', name: 'Unlimited', min: 10, max: 1000000 },
];

interface Player {
  uid: string;
  nickname: string;
  avatar: string;
  color: string;
  betAmount: number;
  ticketsStart: number;
  ticketsEnd: number;
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

// ---------------------------------------------------------
// МАТЕМАТИКА ИГРОВОГО ПОЛЯ (ГЕНЕРАЦИЯ ПОЛИГОНОВ 100% ПОЛЯ)
// ---------------------------------------------------------
const getPointForArea = (targetArea: number, xc: number, yc: number) => {
  const V = [
    { x: 100, y: yc },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: yc }
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

const ArenaField = ({ roomState, spinData }: { roomState: RoomState | null, spinData: any }) => {
  const [currentIndicator, setCurrentIndicator] = useState(0);

  useEffect(() => {
    if (roomState?.gameState === 'rolling' && spinData) {
      // Вычитаем 0.5, чтобы остановиться точно в центре билетов победителя
      const targetArea = ((spinData.winningTicket - 0.5) / spinData.totalTickets) * 10000;
      const totalSpins = 4 * 10000; // 4 полных оборота "радара"
      const finalValue = totalSpins + targetArea;
      
      const controls = animate(0, finalValue, {
        duration: 14.5, 
        ease: [0.15, 0, 0.05, 1], // Плавная остановка
        onUpdate: (val) => setCurrentIndicator(val)
      });
      return () => controls.stop();
    } else if (roomState?.gameState === 'waiting' || roomState?.gameState === 'countdown') {
      setCurrentIndicator(0);
    }
  }, [roomState?.gameState, spinData]);

  const { xc, yc } = useMemo(() => {
    if (!roomState || !roomState.players || roomState.players.length === 0) {
      return { xc: 50, yc: 50 };
    }
    // "Рандомизация" центра, зависящая от суммы банка — фигуры никогда не повторяются!
    const seed = roomState.totalPool + roomState.players.length * 73;
    return {
      xc: 35 + (seed % 30), // Центр гуляет в пределах 35-64 по X
      yc: 35 + ((seed * 17) % 30) // Центр гуляет в пределах 35-64 по Y
    };
  }, [roomState?.totalPool, roomState?.players?.length]);

  const layout = useMemo(() => {
    if (!roomState || !roomState.players || roomState.players.length === 0) return [];
    
    const players = roomState.players;
    const totalPool = roomState.totalPool;

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
    return players.map((p) => {
      const playerArea = (p.betAmount / totalPool) * 10000;
      const startArea = currentArea;
      const endArea = currentArea + playerArea;
      
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
      
      // Идеальное нахождение центра фигуры для размещения аватарки
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

      return {
        ...p, pointsStr, cx, cy, startArea, endArea,
        percentage: (p.betAmount / totalPool) * 100
      };
    });
  }, [roomState?.players, roomState?.totalPool, xc, yc]);

  const indicatorPoint = getPointForArea(currentIndicator, xc, yc);
  const tailPoint = getPointForArea(currentIndicator - 250, xc, yc);

  if (!layout.length) {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full rounded-[2.5rem] bg-slate-900">
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full rounded-[2.5rem] bg-slate-900 shadow-inner overflow-hidden">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        {layout.map((p, i) => {
          // Динамический размер аватарки (максимум 7, минимум 1.5)
          const avatarRadius = Math.max(1.5, Math.min(7, Math.sqrt(p.percentage) * 1.3));
          return (
            <clipPath id={`clip-${p.uid}-${i}`} key={i}>
              <circle cx={p.cx} cy={p.cy} r={avatarRadius} />
            </clipPath>
          );
        })}
      </defs>

      {layout.map((p, i) => {
        const isWinner = roomState?.gameState === 'finished' && roomState.winner?.uid === p.uid;
        const isHighlighted = roomState?.gameState === 'rolling' && (currentIndicator % 10000) >= p.startArea && (currentIndicator % 10000) <= p.endArea;
        
        let opacity = 1;
        if (roomState?.gameState === 'finished' && !isWinner) opacity = 0.15;
        if (roomState?.gameState === 'rolling' && !isHighlighted) opacity = 0.5;
        
        const avatarRadius = Math.max(1.5, Math.min(7, Math.sqrt(p.percentage) * 1.3));

        return (
          <g key={`${p.uid}-${i}`} style={{ opacity, transition: 'opacity 0.3s ease-in-out' }}>
            <polygon 
              points={p.pointsStr} 
              fill={p.color} 
              stroke={p.color} 
              strokeWidth="0.3"
              style={{ filter: isHighlighted || isWinner ? 'url(#glow)' : 'none' }}
              className="transition-all duration-300"
            />
            {/* Картинка профиля по центру фигуры */}
            <image 
              href={p.avatar || '/assets/avatars/default.webp'} 
              x={p.cx - avatarRadius} 
              y={p.cy - avatarRadius} 
              width={avatarRadius * 2} 
              height={avatarRadius * 2} 
              clipPath={`url(#clip-${p.uid}-${i})`}
              preserveAspectRatio="xMidYMid slice"
              className="transition-transform duration-500"
            />
            <circle cx={p.cx} cy={p.cy} r={avatarRadius} fill="none" stroke="#ffffff" strokeWidth="0.4" opacity="0.8" />
          </g>
        );
      })}
      
      {/* ЛУЧ РАДАРА (КРУТИЛКА) */}
      {roomState?.gameState === 'rolling' && indicatorPoint && (
        <>
          <polygon 
            points={`${xc},${yc} ${tailPoint.x},${tailPoint.y} ${indicatorPoint.x},${indicatorPoint.y}`}
            fill="rgba(255,255,255,0.3)"
            style={{ mixBlendMode: 'overlay' }}
          />
          <line x1={xc} y1={yc} x2={indicatorPoint.x} y2={indicatorPoint.y} stroke="white" strokeWidth="1" strokeLinecap="round" />
        </>
      )}
      
      {/* Центр */}
      <circle cx={xc} cy={yc} r="1.5" fill="white" className="drop-shadow-lg" />
      <circle cx={xc} cy={yc} r="0.5" fill="#0f172a" />
    </svg>
  );
};


// ---------------------------------------------------------
// ГЛАВНЫЙ КОМПОНЕНТ СТРАНИЦЫ
// ---------------------------------------------------------
export default function Arena({ user }: { user: UserProfile | null }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeRoom, setActiveRoom] = useState('arena_small');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [spinData, setSpinData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('jackpotState', (state: RoomState) => {
      setRoomState(state);
    });

    newSocket.on('jackpotSpin', (data: any) => {
      setSpinData(data);
    });

    newSocket.on('jackpotError', (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.emit('joinRoom', activeRoom);
      return () => {
        socket.emit('leaveRoom', activeRoom);
      };
    }
  }, [socket, activeRoom]);

  const handleBet = () => {
    if (!user || !socket) return;
    socket.emit('placeJackpotBet', {
      userId: user.uid,
      nickname: user.nickname,
      avatar: user.avatar,
      amount: betAmount,
      roomId: activeRoom,
      cardStyle: undefined, 
      equippedFrame: undefined,
      equippedPrefix: undefined,
      equippedBg: undefined
    });
  };

  return (
    <div className="pb-12 max-w-7xl mx-auto px-4 lg:px-8 space-y-6">
       {/* ХЕДЕР: Заголовок и Выбор комнаты */}
       <header className="flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-3">
           <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center">
             <Swords className="w-6 h-6 text-brand-600" />
           </div>
           <div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Arena</h1>
             <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Останется только один</p>
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

       {errorMsg && (
         <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-2xl flex items-center gap-3 font-bold text-sm">
           <AlertCircle className="w-5 h-5" />
           {errorMsg}
         </motion.div>
       )}

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
         {/* ЛЕВАЯ КОЛОНКА: Игровое поле (100% графика без текста) */}
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
                    {roomState?.gameState === 'rolling' && 'Крутим рулетку!'}
                    {roomState?.gameState === 'finished' && 'Раунд завершен'}
                  </span>
               </div>
               <div className="text-right">
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Банк арены</p>
                  <p className="text-xl font-black text-slate-900">{roomState?.totalPool || 0} CAT</p>
               </div>
            </div>

            <div className="w-full aspect-square bg-slate-900 rounded-[3.5rem] p-3 shadow-2xl relative border-[6px] border-slate-800">
               <ArenaField roomState={roomState} spinData={spinData} />
               
               {/* Окно победителя появляется поверх, но вне самого SVG поля */}
               <AnimatePresence>
                 {roomState?.gameState === 'finished' && roomState.winner && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.8, y: 20 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.8 }}
                     className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                   >
                     <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-8 rounded-[3rem] text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                       <img src={roomState.winner.avatar} className="w-24 h-24 rounded-full mx-auto mb-4 border-4" style={{ borderColor: roomState.winner.color }} alt="" />
                       <h3 className="text-3xl font-black text-white mb-1">{roomState.winner.nickname}</h3>
                       <p className="text-brand-400 font-bold uppercase tracking-widest text-xs">Забирает банк</p>
                       <p className="text-white font-black text-4xl mt-4">+{roomState.winner.winAmount} CAT</p>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
         </div>

         {/* ПРАВАЯ КОЛОНКА: Ставки и Игроки */}
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
                   disabled={!user || roomState?.gameState === 'rolling' || roomState?.gameState === 'finished'}
                   className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-brand-500/30 active:scale-95"
                 >
                   {user ? 'Сделать ставку' : 'Войдите для игры'}
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
                         <img src={p.avatar} alt="avatar" className="w-10 h-10 rounded-full bg-slate-200" />
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
                       <p className="text-slate-400 font-medium">Ждем первых гладиаторов...</p>
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
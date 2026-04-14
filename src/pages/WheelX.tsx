// src/pages/WheelX.tsx
import { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, increment, addDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Coins, History, Timer, ShieldCheck, Flame, Users, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WheelXProps {
  user: UserProfile;
}

const WHEEL_PATTERN = [
  { type: 'orange', mult: 30, color: '#f97316' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'pink', mult: 5, color: '#ec4899' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'pink', mult: 5, color: '#ec4899' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'pink', mult: 5, color: '#ec4899' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'pink', mult: 5, color: '#ec4899' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'pink', mult: 5, color: '#ec4899' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'pink', mult: 5, color: '#ec4899' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'blue', mult: 3, color: '#3b82f6' }
];

export default function WheelX({ user }: WheelXProps) {
  const [globalBet, setGlobalBet] = useState('10');
  const currentBetNum = parseFloat(globalBet.replace(',', '.')) || 0;

  const [myBets, setMyBets] = useState({ black: 0, blue: 0, pink: 0, orange: 0 });
  const [history, setHistory] = useState<number[]>([]);
  
  const [gameState, setGameState] = useState<'betting' | 'spinning'>('betting');
  const [timeLeft, setTimeLeft] = useState(30);
  const [rotation, setRotation] = useState(0);
  const [lastWinInfo, setLastWinInfo] = useState<{ mult: number, payout: number } | null>(null);

  const myBetsRef = useRef(myBets);
  useEffect(() => {
    myBetsRef.current = myBets;
  }, [myBets]);

  const hasSpunRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'live', 'wheelx'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        setGameState(data.gameState);
        setTimeLeft(data.timeLeft || 0);

        if (data.gameState === 'betting' && data.history && data.history.length > 0) {
          setHistory(data.history);
        }

        if (data.gameState === 'betting') {
          hasSpunRef.current = false;
          setLastWinInfo(null);
        } 
        else if (data.gameState === 'spinning' && !hasSpunRef.current && data.winningIndex !== undefined) {
          hasSpunRef.current = true;
          
          const winningIndex = data.winningIndex;
          const winningSlice = WHEEL_PATTERN[winningIndex];
          
          setRotation(prev => {
              const currentSpins = Math.floor(prev / 360);
              const nextSpins = currentSpins + 10;
              return (nextSpins * 360) + (winningIndex * (360 / 32));
          });

          // Таймер 5 секунд на саму анимацию кручения
          setTimeout(() => {
            handlePayout(winningSlice);
            
            setHistory(prev => [winningSlice.mult, ...prev].slice(0, 10));

            // Даем время полюбоваться на результат перед обнулением ставок
            setTimeout(() => {
              setMyBets({ black: 0, blue: 0, pink: 0, orange: 0 });
            }, 3000);
          }, 5000);
        }
      }
    });
    return () => unsubscribe();
  }, []); // Пустой массив зависимостей, чтобы подписка сработала 1 раз

  const handlePayout = async (winningSlice: typeof WHEEL_PATTERN[0]) => {
    const betPlaced = myBetsRef.current[winningSlice.type as keyof typeof myBetsRef.current];
    if (betPlaced > 0) {
      const payout = betPlaced * winningSlice.mult;
      setLastWinInfo({ mult: winningSlice.mult, payout });
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          balance: increment(payout),
          xp: increment(betPlaced / 10)
        });
        await addDoc(collection(db, 'gameSessions'), { 
          userId: user.uid, 
          gameType: 'wheelx', 
          bet: betPlaced, 
          multiplier: winningSlice.mult, 
          payout, 
          timestamp: new Date().toISOString(), 
          nickname: user.nickname 
        });
      } catch (e) {
        console.error("Ошибка при начислении выигрыша", e);
      }
    }
  };

  const placeBet = async (color: 'black' | 'blue' | 'pink' | 'orange') => {
    if (gameState !== 'betting' || currentBetNum <= 0 || currentBetNum > user.balance) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { balance: increment(-currentBetNum) });
      setMyBets(prev => ({ ...prev, [color]: prev[color] + currentBetNum }));
    } catch (e) {
      console.error('Ошибка ставки', e);
    }
  };

  const BetCard = ({ 
    type, mult, titleColor, btnClass 
  }: { 
    type: 'black'|'blue'|'pink'|'orange', mult: number, titleColor: string, btnClass: string 
  }) => {
    const currentPool = myBets[type];
    const playersList = currentPool > 0 ? [{ nick: user.nickname, avatar: user.avatar, bet: currentPool }] : [];

    return (
      <div className="bg-white rounded-xl sm:rounded-2xl p-2 sm:p-4 flex flex-col gap-2 sm:gap-4 border border-slate-100 shadow-md sm:shadow-lg shadow-slate-200/50 relative overflow-hidden h-[200px] sm:h-[280px]">
        <div className="flex flex-col items-center justify-center pt-1">
            <span className={cn("text-2xl sm:text-4xl font-black drop-shadow-sm leading-none", titleColor)}>{mult}x</span>
            <div className="text-slate-400 text-[9px] sm:text-xs font-bold uppercase tracking-wider mt-1 sm:mt-2 flex items-center gap-1">
                <Users className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                {playersList.length}
            </div>
        </div>
        <button 
          disabled={gameState !== 'betting'} 
          onClick={() => placeBet(type)}
          className={cn("w-full py-2 sm:py-3 rounded-lg font-black text-[10px] sm:text-sm text-white uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm hover:-translate-y-0.5", btnClass)}
        >
          Поставить
        </button>
        <div className="flex justify-between items-center px-1 border-b border-slate-100 pb-1 sm:pb-2">
            <Coins className="w-3 h-3 sm:w-4 sm:h-4 text-brand-500" />
            <span className="text-xs sm:text-sm font-black text-slate-700">{currentPool.toFixed(0)}</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 sm:space-y-2 pr-1 custom-scrollbar">
          {playersList.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 p-1.5 sm:p-2.5 rounded-lg border border-slate-100/50">
              <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-hidden">
                <img src={p.avatar} alt="ava" className="w-4 h-4 sm:w-6 sm:h-6 rounded-full shrink-0 bg-slate-200" />
                <span className="text-[9px] sm:text-xs font-bold text-slate-700 truncate max-w-[40px] sm:max-w-[70px]">{p.nick}</span>
              </div>
              <span className="text-[9px] sm:text-xs font-black text-slate-900 shrink-0">{p.bet.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getHistoryHeight = (mult: number) => {
    switch(mult) {
        case 30: return 'h-12 sm:h-16';
        case 5: return 'h-8 sm:h-12';
        case 3: return 'h-5 sm:h-8';
        case 2: default: return 'h-3 sm:h-4';
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-4 sm:space-y-8 pb-12">
      <div className="bg-white rounded-3xl sm:rounded-[3.5rem] border border-slate-100 shadow-xl sm:shadow-2xl shadow-slate-200/50 pt-4 sm:pt-8 pb-4 sm:pb-6 relative overflow-hidden flex flex-col items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-50 via-transparent to-transparent opacity-80" />
        
        <div className="relative w-[220px] h-[220px] sm:w-[450px] sm:h-[450px] flex items-center justify-center z-10 mb-6 sm:mb-10 mt-2">
          <div className="absolute -top-4 sm:-top-6 left-1/2 -translate-x-1/2 z-40 drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)] scale-75 sm:scale-100">
            <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 48L4 24C4 24 0 18.5 0 12C0 5.5 8.9543 0 20 0C31.0457 0 40 5.5 40 12C40 18.5 36 24 36 24L20 48Z" fill="#F59E0B"/>
              <circle cx="20" cy="14" r="6" fill="white" className={cn("transition-all duration-300", gameState === 'spinning' && "animate-pulse")} />
            </svg>
          </div>

          <div className="absolute inset-[-12px] sm:inset-[-20px] rounded-full border-[12px] sm:border-[20px] border-slate-50 shadow-[inset_0_4px_20px_rgba(0,0,0,0.05)] pointer-events-none z-20 flex items-center justify-center">
              {Array.from({ length: 16 }).map((_, i) => (
                  <div 
                      key={i} 
                      className={cn(
                          "absolute w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full shadow-sm",
                          gameState === 'spinning' ? "bg-amber-400 animate-ping" : "bg-slate-200"
                      )}
                      style={{ transform: `rotate(${i * 22.5}deg) translateY(calc(-110px - 12px))` }} 
                  />
              ))}
          </div>
          
          <motion.div
            animate={{ rotate: -rotation }}
            transition={{ duration: 5, type: "tween", ease: [0.15, 0.8, 0.15, 1] }}
            className="w-full h-full rounded-full flex items-center justify-center relative shadow-[0_10px_40px_rgba(0,0,0,0.15)] bg-slate-900 overflow-hidden border-4 border-white"
          >
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
              <g transform="translate(50,50)">
                {WHEEL_PATTERN.map((slice, i) => (
                  <path 
                    key={i} 
                    d="M0,0 L-4.89,-49.76 A50,50 0 0,1 4.89,-49.76 Z" 
                    fill={slice.color} 
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="0.5"
                    transform={`rotate(${i * 11.25})`} 
                  />
                ))}
              </g>
            </svg>

            {WHEEL_PATTERN.map((slice, i) => (
              <div
                key={`text-${i}`}
                className="absolute inset-0 origin-center pointer-events-none"
                style={{ transform: `rotate(${i * 11.25}deg)` }}
              >
                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center drop-shadow-md">
                  <span className="text-[8px] sm:text-xs font-black tracking-tighter text-white/90">
                    {slice.mult === 2 ? "" : `${slice.mult}x`}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>

          <div className="absolute inset-0 m-auto w-20 h-20 sm:w-40 sm:h-40 bg-white rounded-full z-30 shadow-[0_0_40px_rgba(0,0,0,0.1)] border-4 sm:border-[8px] border-slate-50 flex flex-col items-center justify-center overflow-hidden transition-all">
            {gameState === 'betting' ? (
              <>
                  <span className="text-3xl sm:text-5xl font-black text-slate-800 leading-none tracking-tighter">{timeLeft}</span>
                  <span className="text-[7px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">Секунд</span>
              </>
            ) : (
              <img src="/assets/CoolCat_logo.webp" alt="Center Hub" className="w-10 h-10 sm:w-20 sm:h-20 object-contain animate-bounce" />
            )}
          </div>

          <AnimatePresence mode="wait">
              {lastWinInfo && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 bg-white/60 backdrop-blur-md rounded-full"
                >
                  <div className="bg-white px-4 sm:px-8 py-3 sm:py-6 rounded-2xl sm:rounded-3xl shadow-2xl border-4 border-emerald-100 text-center">
                      <p className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Выиграл</p>
                      <p className="text-3xl sm:text-5xl font-black text-emerald-500">{lastWinInfo.mult}x</p>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>
        </div>

        <div className="w-full max-w-2xl flex items-end justify-center gap-1 sm:gap-2 z-10 border-b-2 border-slate-100 px-2 h-16 sm:h-20">
          {history.map((mult, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 sm:gap-1 group relative">
                <span className={cn(
                    "text-[9px] sm:text-xs font-black",
                    mult === 30 ? "text-orange-500" :
                    mult === 5 ? "text-pink-500" :
                    mult === 3 ? "text-blue-500" : "text-slate-700"
                )}>
                    {mult}x
                </span>
                <div className={cn(
                    "w-5 sm:w-8 rounded-t-sm sm:rounded-t-md transition-all duration-500 shadow-sm",
                    getHistoryHeight(mult),
                    mult === 30 ? "bg-orange-500" :
                    mult === 5 ? "bg-pink-500" :
                    mult === 3 ? "bg-blue-500" : "bg-slate-800"
                )} />
            </div>
          ))}
          {history.length === 0 && (
              <div className="text-slate-400 text-[10px] sm:text-sm font-bold pb-2">Ожидание...</div>
          )}
        </div>
      </div>

      <div className={cn("space-y-4 sm:space-y-6 transition-opacity duration-300", gameState !== 'betting' && "opacity-50 pointer-events-none")}>
        <div className="bg-white rounded-2xl sm:rounded-[2rem] p-3 sm:p-5 border border-slate-100 shadow-lg shadow-slate-200/50">
            <div className="flex flex-col md:flex-row gap-2 sm:gap-4 items-center">
                <div className="relative w-full md:w-1/2">
                    <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm sm:text-base">₽</span>
                    <input
                        type="text"
                        value={globalBet}
                        onChange={(e) => setGlobalBet(e.target.value.replace(',', '.'))}
                        className="w-full bg-slate-50 text-slate-900 text-sm sm:text-lg font-black rounded-xl py-2.5 sm:py-3.5 pl-8 sm:pl-10 pr-4 outline-none border border-slate-200 focus:border-brand-500 transition-all"
                    />
                </div>
                
                <div className="flex w-full md:w-1/2 gap-1.5 sm:gap-2">
                    <button onClick={() => setGlobalBet((currentBetNum / 2).toString())} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-[10px] sm:text-xs py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border border-slate-200 transition-colors">
                        /2
                    </button>
                    <button onClick={() => setGlobalBet((currentBetNum * 2).toString())} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-[10px] sm:text-xs py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border border-slate-200 transition-colors">
                        X2
                    </button>
                    <button onClick={() => setGlobalBet('10')} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-[10px] sm:text-xs py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border border-slate-200 transition-colors">
                        MIN
                    </button>
                    <button onClick={() => setGlobalBet(user.balance.toString())} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-[10px] sm:text-xs py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border border-slate-200 transition-colors">
                        MAX
                    </button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-4">
            <BetCard type="black" mult={2} titleColor="text-slate-800" btnClass="bg-slate-800 hover:bg-slate-700" />
            <BetCard type="blue" mult={3} titleColor="text-blue-500" btnClass="bg-blue-500 hover:bg-blue-600" />
            <BetCard type="pink" mult={5} titleColor="text-pink-500" btnClass="bg-pink-500 hover:bg-pink-600" />
            <BetCard type="orange" mult={30} titleColor="text-orange-500" btnClass="bg-orange-500 hover:bg-orange-600 shadow-orange-500/30" />
        </div>
      </div>
    </div>
  );
}
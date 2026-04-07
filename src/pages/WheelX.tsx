// src/pages/WheelX.tsx
import { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, increment, addDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Coins, History, Timer, ShieldCheck, Flame } from 'lucide-react';
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
  const [betInput, setBetInput] = useState('10');
  const currentBet = parseFloat(betInput.replace(',', '.')) || 0;

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

        // Синхронизируем историю с сервером!
        if (data.history) {
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
          
          const segmentAngle = 360 / 32;
          const targetRotation = (360 * 10) + (winningIndex * segmentAngle);
          setRotation(prev => prev + targetRotation);

          setTimeout(() => {
            handlePayout(winningSlice);
            // Удалено: setHistory(prev => ...) -> теперь это делает сервер
            
            setTimeout(() => {
              setMyBets({ black: 0, blue: 0, pink: 0, orange: 0 });
            }, 3000);
          }, 5000);
        }
      }
    });

    return () => unsubscribe();
  }, []);

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
          userId: user.uid, gameType: 'wheelx', bet: betPlaced, multiplier: winningSlice.mult, payout, timestamp: new Date().toISOString(), nickname: user.nickname 
        });
      } catch (e) {
        console.error("Ошибка при начислении выигрыша", e);
      }
    }
  };

  const placeBet = async (color: 'black' | 'blue' | 'pink' | 'orange') => {
    if (gameState !== 'betting' || currentBet <= 0 || currentBet > user.balance) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-currentBet)
      });
      
      setMyBets(prev => ({ ...prev, [color]: prev[color] + currentBet }));
    } catch (e) {
      console.error('Ошибка ставки', e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 relative">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200 relative overflow-hidden">
             <div className="absolute inset-0 bg-white/20 animate-pulse" />
             <Flame className="w-8 h-8 text-white relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Live WheelX</h1>
              <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">
                Live Server
              </span>
            </div>
            <p className="text-slate-400 font-medium mt-1">Синхронизировано с сервером. Сделай ставку до запуска!</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-black uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Server Sync</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-6 sm:p-10 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px] lg:min-h-[600px] order-1">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-50/50 via-transparent to-transparent opacity-70" />
          
          <div className="absolute top-6 left-0 w-full px-8 flex justify-center gap-2 z-20">
            {history.map((mult, i) => (
              <div key={i} className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-lg",
                mult === 30 ? "bg-orange-500 shadow-orange-500/40" :
                mult === 5 ? "bg-pink-500 shadow-pink-500/40" :
                mult === 3 ? "bg-blue-500 shadow-blue-500/40" : "bg-slate-800 shadow-slate-800/40"
              )}>
                {mult}x
              </div>
            ))}
          </div>

          <div className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] flex items-center justify-center z-10 mt-12">
            
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-40 drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
              <svg width="32" height="40" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 48L4 24C4 24 0 18.5 0 12C0 5.5 8.9543 0 20 0C31.0457 0 40 5.5 40 12C40 18.5 36 24 36 24L20 48Z" fill="#F59E0B"/>
                <circle cx="20" cy="14" r="6" fill="white" className={cn("transition-all duration-300", gameState === 'spinning' && "animate-pulse")} />
              </svg>
            </div>

            <div className="absolute inset-[-16px] rounded-full border-[16px] border-slate-100 shadow-[inset_0_4px_20px_rgba(0,0,0,0.05)] pointer-events-none z-20 flex items-center justify-center">
                {Array.from({ length: 16 }).map((_, i) => (
                    <div 
                        key={i} 
                        className={cn(
                            "absolute w-2 h-2 rounded-full",
                            gameState === 'spinning' ? "bg-brand-400 animate-ping" : "bg-slate-300"
                        )}
                        style={{ transform: `rotate(${i * 22.5}deg) translateY(-205px)` }}
                    />
                ))}
            </div>
            
            <motion.div
              animate={{ rotate: -rotation }}
              transition={{ duration: 5, type: "tween", ease: [0.15, 0.8, 0.15, 1] }}
              className="w-full h-full rounded-full flex items-center justify-center relative shadow-[0_10px_40px_rgba(0,0,0,0.1)] bg-slate-900 overflow-hidden"
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
                    <span className="text-[10px] sm:text-xs font-black tracking-tighter text-white/90">
                      {slice.mult === 2 ? "" : `${slice.mult}x`}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>

            <div className="absolute inset-0 m-auto w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full z-30 shadow-[0_0_40px_rgba(0,0,0,0.2)] border-[8px] border-slate-50 flex flex-col items-center justify-center overflow-hidden transition-all">
              {gameState === 'betting' ? (
                <>
                    <Timer className="w-6 h-6 text-slate-400 mb-1 animate-pulse" />
                    <span className="text-3xl font-black text-slate-900 leading-none">{timeLeft}s</span>
                </>
              ) : (
                <img src="/assets/CoolCat_logo.webp" alt="Center Hub" className="w-16 h-16 object-contain animate-bounce" />
              )}
            </div>

            <AnimatePresence mode="wait">
                {lastWinInfo && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 bg-white/50 backdrop-blur-sm rounded-full"
                  >
                    <div className="bg-white px-8 py-6 rounded-3xl shadow-2xl border-4 border-emerald-100 text-center">
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Вы выиграли!</p>
                        <p className="text-4xl font-black text-emerald-500">+{lastWinInfo.payout.toFixed(0)}</p>
                    </div>
                  </motion.div>
                )}
            </AnimatePresence>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6 order-2">
          
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Сумма ставки
              </label>
              <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest bg-brand-50 px-3 py-1 rounded-full">
                Баланс: {user.balance.toFixed(2)}
              </span>
            </div>
            
            <input
              type="text"
              inputMode="decimal"
              value={betInput}
              disabled={gameState !== 'betting'}
              onChange={(e) => setBetInput(e.target.value.replace(',', '.'))}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-900 focus:border-brand-500 outline-none transition-all disabled:opacity-50 text-xl"
            />
            
            <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setBetInput((currentBet / 2).toString())} disabled={gameState !== 'betting'}
                  className="py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-400 transition-all border-2 border-slate-100 disabled:opacity-50"
                >/ 2</button>
                <button 
                  onClick={() => setBetInput((currentBet * 2).toString())} disabled={gameState !== 'betting'}
                  className="py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-400 transition-all border-2 border-slate-100 disabled:opacity-50"
                >x 2</button>
            </div>
          </div>

          <div className={cn("grid grid-cols-2 gap-4 transition-opacity duration-300", gameState !== 'betting' && "opacity-50 pointer-events-none")}>
             
             <button onClick={() => placeBet('black')} className="bg-slate-800 p-4 rounded-3xl text-center shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-3xl font-black text-white mb-1">2x</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wins on Black</p>
                <div className="mt-3 bg-slate-900/50 rounded-xl py-2 flex justify-center items-center gap-1">
                    <Coins className="w-3 h-3 text-brand-400" />
                    <span className="text-sm font-black text-white">{myBets.black.toFixed(0)}</span>
                </div>
             </button>

             <button onClick={() => placeBet('blue')} className="bg-blue-500 p-4 rounded-3xl text-center shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-3xl font-black text-white mb-1">3x</p>
                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Wins on Blue</p>
                <div className="mt-3 bg-blue-600/50 rounded-xl py-2 flex justify-center items-center gap-1">
                    <Coins className="w-3 h-3 text-white" />
                    <span className="text-sm font-black text-white">{myBets.blue.toFixed(0)}</span>
                </div>
             </button>

             <button onClick={() => placeBet('pink')} className="bg-pink-500 p-4 rounded-3xl text-center shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-3xl font-black text-white mb-1">5x</p>
                <p className="text-[10px] font-black text-pink-200 uppercase tracking-widest">Wins on Pink</p>
                <div className="mt-3 bg-pink-600/50 rounded-xl py-2 flex justify-center items-center gap-1">
                    <Coins className="w-3 h-3 text-white" />
                    <span className="text-sm font-black text-white">{myBets.pink.toFixed(0)}</span>
                </div>
             </button>

             <button onClick={() => placeBet('orange')} className="bg-orange-500 p-4 rounded-3xl text-center shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-3xl font-black text-white mb-1">30x</p>
                <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest">Wins on Orange</p>
                <div className="mt-3 bg-orange-600/50 rounded-xl py-2 flex justify-center items-center gap-1">
                    <Coins className="w-3 h-3 text-white" />
                    <span className="text-sm font-black text-white">{myBets.orange.toFixed(0)}</span>
                </div>
             </button>

          </div>

          {gameState !== 'betting' && (
            <div className="bg-amber-50 text-amber-600 p-4 rounded-2xl text-xs font-bold text-center border border-amber-200 uppercase tracking-widest animate-pulse">
                Ставки закрыты! Крутим колесо...
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
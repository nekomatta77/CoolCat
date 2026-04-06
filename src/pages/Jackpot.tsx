import { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, addDoc, collection, onSnapshot, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Coins, History, Sparkles, Star, Zap, ShieldCheck, Play, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface JackpotProps {
  user: UserProfile;
}

interface MutableAchievement {
  id?: string;
  userId: string;
  type: string;
  category: string;
  progress: number;
  completed: boolean;
  rewarded: boolean;
}

export default function Jackpot({ user }: JackpotProps) {
  const [bet, setBet] = useState(10);
  const [history, setHistory] = useState<any[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [unlockedAch, setUnlockedAch] = useState<string | null>(null);

  const isProcessing = useRef(false);

  useEffect(() => {
    const q = query(collection(db, 'gameSessions'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).filter(s => s.gameType === 'jackpot'));
    });
    return () => unsubscribe();
  }, []);

  const handleSpin = async () => {
    if (bet > user.balance || bet <= 0 || spinning || isProcessing.current) return;
    isProcessing.current = true;
    setLoading(true);
    setSpinning(true);
    setResult(null);

    const roll = Math.random() * 100;
    let multiplier = 0;
    let targetRotation = 0;

    if (roll < 0.1) {
      multiplier = 1000;
      targetRotation = 360 * 10 + 0;
    } else if (roll < 1) {
      multiplier = 100;
      targetRotation = 360 * 10 + 45;
    } else if (roll < 5) {
      multiplier = 10;
      targetRotation = 360 * 10 + 90;
    } else if (roll < 20) {
      multiplier = 2;
      targetRotation = 360 * 10 + 135;
    } else if (roll < 45) {
      multiplier = 1.2;
      targetRotation = 360 * 10 + 180;
    } else {
      multiplier = 0;
      targetRotation = 360 * 10 + 225;
    }

    setRotation(prev => prev + targetRotation);

    const payout = bet * multiplier;
    const newBalance = user.balance - bet + payout;

    const isWin = multiplier > 1; // 1.2x, 2x, 10x, etc.
    const prevStreak = (user as any).jackpotWinStreak || 0;
    const newStreak = isWin ? prevStreak + 1 : 0;

    try {
      await new Promise(r => setTimeout(r, 3000));

      const achQuery = query(collection(db, 'achievements'), where('userId', '==', user.uid), where('category', '==', 'jackpot'));
      const achSnapshot = await getDocs(achQuery);
      const userAchs: MutableAchievement[] = achSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as MutableAchievement));

      const getAch = (type: string): MutableAchievement => {
        const existing = userAchs.find(a => a.type === type);
        return existing ? { ...existing } : { type, category: 'jackpot', progress: 0, completed: false, rewarded: false, userId: user.uid };
      };

      const updates: MutableAchievement[] = [];
      const newAchsToCreate: MutableAchievement[] = [];
      let newlyUnlocked: string | null = null;

      const processAch = (type: string, target: number, progressFn: (a: MutableAchievement) => MutableAchievement, title: string) => {
        let ach = getAch(type);
        if (ach.completed) return;
        const oldProg = ach.progress;
        ach = progressFn({ ...ach });
        if (ach.progress >= target) {
          ach.progress = target;
          ach.completed = true;
          newlyUnlocked = title; 
        }
        if (ach.progress !== oldProg || ach.completed) {
          if (ach.id) {
            const existingIdx = updates.findIndex(u => u.id === ach.id);
            if (existingIdx >= 0) updates[existingIdx] = ach; else updates.push(ach);
          } else {
            const existingIdx = newAchsToCreate.findIndex(u => u.type === ach.type);
            if (existingIdx >= 0) newAchsToCreate[existingIdx] = ach; else newAchsToCreate.push(ach);
          }
        }
      };

      if (bet >= 100) processAch('jackpot_ticket1', 10, a => { a.progress++; return a; }, 'Билет в высшее общество');
      if (bet >= 250) processAch('jackpot_ticket2', 25, a => { a.progress++; return a; }, 'Билет в высшее общество II');
      if (bet >= 1000) processAch('jackpot_ticket3', 50, a => { a.progress++; return a; }, 'Билет в высшее общество III');
      
      processAch('jackpot_predator', 5, a => {
        if (isWin) a.progress++; else a.progress = 0;
        return a;
      }, 'Азартный хищник');

      if (payout > 10000) {
        processAch('jackpot_big_catch', 1, a => { a.progress = 1; return a; }, 'Большой куш');
      }

      await Promise.all([
        updateDoc(doc(db, 'users', user.uid), { 
          balance: newBalance, 
          xp: (user.xp || 0) + bet / 10,
          jackpotWinStreak: newStreak 
        }),
        addDoc(collection(db, 'gameSessions'), { userId: user.uid, gameType: 'jackpot', bet, multiplier, payout, timestamp: new Date().toISOString(), nickname: user.nickname, avatar: user.avatar }),
        ...updates.map(ach => updateDoc(doc(db, 'achievements', ach.id as string), { progress: ach.progress, completed: ach.completed })),
        ...newAchsToCreate.map(ach => { const { id, ...data } = ach; return addDoc(collection(db, 'achievements'), data); })
      ]);

      setResult({ multiplier, payout });
      
      if (newlyUnlocked) {
        setUnlockedAch(newlyUnlocked);
        setTimeout(() => setUnlockedAch(null), 4000);
      }
    } catch (error) {
      console.error('Jackpot error:', error);
    } finally {
      setSpinning(false);
      setLoading(false);
      setTimeout(() => { isProcessing.current = false; }, 300);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 relative">
      <AnimatePresence>
        {unlockedAch && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-white px-6 py-4 rounded-3xl shadow-2xl border-2 border-brand-200 flex items-center gap-4 min-w-[300px]"
          >
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-0.5">Достижение открыто!</p>
              <p className="text-lg font-black text-slate-900 leading-tight">{unlockedAch}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Jackpot</h1>
            <p className="text-slate-400 font-medium">Сорви большой куш и стань легендой!</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-black uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Provably Fair</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls & History */}
        <div className="lg:col-span-4 space-y-8 order-2 lg:order-1">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                  <Coins className="w-3 h-3" /> Сумма ставки
                </label>
                <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest bg-brand-50 px-3 py-1 rounded-full">
                  Баланс: {user.balance.toFixed(2)}
                </span>
              </div>
              <input
                type="number"
                value={bet}
                disabled={spinning}
                onChange={(e) => setBet(Number(e.target.value))}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-slate-900 focus:border-brand-500 outline-none transition-all disabled:opacity-50 text-xl"
              />
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setBet(Math.max(1, bet / 2))}
                  disabled={spinning}
                  className="py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-400 transition-all border-2 border-slate-100 hover:border-brand-200"
                >
                  / 2
                </button>
                <button 
                  onClick={() => setBet(Math.min(user.balance, bet * 2))}
                  disabled={spinning}
                  className="py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-400 transition-all border-2 border-slate-100 hover:border-brand-200"
                >
                  x 2
                </button>
              </div>
            </div>

            <button
              onClick={handleSpin}
              disabled={loading || bet > user.balance || bet <= 0 || spinning}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-6 rounded-2xl transition-all shadow-2xl shadow-brand-200 uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 group"
            >
              {spinning ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Испытать удачу 
                  <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
              <History className="w-5 h-5 text-brand-500" /> История
            </h3>
            <div className="space-y-3">
              {history.length > 0 ? history.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-100 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                      <Trophy className={cn("w-5 h-5", session.multiplier > 1 ? "text-brand-500" : "text-slate-300")} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">{session.nickname || 'Аноним'}</p>
                      <p className="text-[10px] font-bold text-slate-400">{new Date(session.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-black",
                      session.multiplier > 1 ? "text-emerald-500" : "text-slate-400"
                    )}>
                      x{session.multiplier.toFixed(1)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">{session.payout.toFixed(0)} CAT</p>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto border-2 border-slate-100">
                    <History className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-xs font-black text-slate-300 uppercase tracking-widest">История пуста</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wheel Area */}
        <div className="lg:col-span-8 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-6 lg:p-16 flex flex-col items-center justify-center relative overflow-hidden min-h-[600px] order-1 lg:order-2">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-50/30 via-transparent to-transparent opacity-50" />
          
          <div className="relative z-10 w-full max-w-lg aspect-square flex items-center justify-center">
            {/* Pointer */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-white shadow-2xl rounded-full flex items-center justify-center z-30 border-4 border-brand-500">
              <div className="w-3 h-3 bg-brand-500 rounded-full animate-ping" />
            </div>

            {/* Outer Ring Decoration */}
            <div className="absolute inset-[-20px] rounded-full border-[20px] border-slate-50/50 shadow-inner pointer-events-none" />
            
            <motion.div
              animate={{ rotate: -rotation }}
              transition={{ duration: 3, ease: [0.45, 0.05, 0.55, 0.95] }}
              className="w-full h-full rounded-full border-8 border-slate-100 flex items-center justify-center relative shadow-2xl bg-white overflow-hidden"
            >
              {/* Wheel Segments */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-0 origin-center"
                  style={{ transform: `rotate(${i * 45}deg)` }}
                >
                  <div 
                    className={cn(
                      "absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-1/2 origin-bottom bg-slate-100",
                      i % 2 === 0 ? "bg-slate-200" : ""
                    )}
                  />
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                    {i === 0 && <div className="flex flex-col items-center"><Trophy className="w-8 h-8 text-brand-500" /><span className="text-[10px] font-black text-brand-600">1000x</span></div>}
                    {i === 1 && <div className="flex flex-col items-center"><Star className="w-7 h-7 text-amber-500" /><span className="text-[10px] font-black text-amber-600">100x</span></div>}
                    {i === 2 && <div className="flex flex-col items-center"><Sparkles className="w-6 h-6 text-emerald-500" /><span className="text-[10px] font-black text-emerald-600">10x</span></div>}
                    {i === 3 && <div className="flex flex-col items-center"><Zap className="w-5 h-5 text-blue-500" /><span className="text-[10px] font-black text-blue-600">2x</span></div>}
                    {i === 4 && <div className="flex flex-col items-center"><Coins className="w-5 h-5 text-slate-400" /><span className="text-[10px] font-black text-slate-500">1.2x</span></div>}
                    {i === 5 && <div className="flex flex-col items-center"><RotateCcw className="w-5 h-5 text-slate-200" /><span className="text-[10px] font-black text-slate-300">0x</span></div>}
                    {i === 6 && <div className="flex flex-col items-center"><Zap className="w-5 h-5 text-slate-200" /><span className="text-[10px] font-black text-slate-300">0x</span></div>}
                    {i === 7 && <div className="flex flex-col items-center"><Zap className="w-5 h-5 text-slate-200" /><span className="text-[10px] font-black text-slate-300">0x</span></div>}
                  </div>
                </div>
              ))}
            </motion.div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="result"
                    initial={{ scale: 0.5, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.5, opacity: 0, y: -20 }}
                    className="text-center bg-white/90 backdrop-blur-2xl p-12 rounded-[4rem] border-4 border-brand-50 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)]"
                  >
                    <p className={cn(
                      "text-8xl font-black tracking-tighter leading-none",
                      result.multiplier > 1 ? "text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-emerald-600 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]" : "text-slate-400"
                    )}>
                      x{result.multiplier}
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <div className="w-8 h-8 bg-brand-50 rounded-full flex items-center justify-center">
                        <Coins className="w-4 h-4 text-brand-500" />
                      </div>
                      <p className="text-2xl font-black text-slate-900">
                        {result.payout.toFixed(0)}
                      </p>
                    </div>
                    {result.multiplier >= 10 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-6 inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/40 border border-emerald-400/50"
                      >
                        <Sparkles className="w-3 h-3" /> Big Win!
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center border-8 border-slate-50 shadow-2xl relative">
                      <div className="absolute inset-0 rounded-full border-4 border-brand-50 animate-pulse" />
                      <Trophy className={cn(
                        "w-20 h-20 transition-all duration-500",
                        spinning ? "text-brand-500 scale-110 animate-bounce" : "text-slate-100"
                      )} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
            <div className="bg-brand-50/50 p-6 rounded-[2rem] border border-brand-100/50 text-center space-y-1 group hover:bg-brand-50 transition-colors">
              <p className="text-3xl font-black text-brand-600 group-hover:scale-110 transition-transform">1,000x</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400">Jackpot</p>
            </div>
            <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100/50 text-center space-y-1 group hover:bg-amber-50 transition-colors">
              <p className="text-3xl font-black text-amber-600 group-hover:scale-110 transition-transform">100x</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Super Win</p>
            </div>
            <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100/50 text-center space-y-1 group hover:bg-emerald-50 transition-colors">
              <p className="text-3xl font-black text-emerald-600 group-hover:scale-110 transition-transform">10x</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Big Win</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center space-y-1 group hover:bg-slate-100 transition-colors">
              <p className="text-3xl font-black text-slate-400 group-hover:scale-110 transition-transform">2x</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Double</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
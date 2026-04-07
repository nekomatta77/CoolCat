import { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Layers, Coins, ShieldCheck, ArrowRight, RotateCcw, Zap, Trophy, Play, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

// ============================================================================
// 🛠️ РЕДАКТОР ЛАПОК В ЛЕНТЕ МНОЖИТЕЛЕЙ
// ============================================================================
const PAW_RIBBON_CONFIG = {
  width: 24,        // Ширина картинки (px)
  height: 24,       // Высота картинки (px)
  offsetX: 0,       // Сдвиг по оси X (влево/вправо)
  offsetY: 0,       // Сдвиг по оси Y (вверх/вниз)
  scale: 1,         // Базовый размер неактивной лапки (1 = 100%)
  activeScale: 1.3, // Размер активной (выигравшей) лапки (1.3 = 130%)
};

// ============================================================================
// 📊 ТАБЛИЦЫ МНОЖИТЕЛЕЙ ПО СЛОЖНОСТЯМ
// Первая цифра (0) - множитель при нуле совпадений (она скрыта визуально)
// ============================================================================
const MULTIPLIERS = {
  easy: {
    1: [0, 3.96],
    2: [0, 2, 3.8],
    3: [0, 1, 2.2, 20],
    4: [0, 0, 2, 8.4, 100],
    5: [0, 0, 1.5, 3.6, 20, 250],
    6: [0, 0, 1, 2, 7.5, 100, 700],
    7: [0, 0, 1.2, 1.6, 3.5, 15, 225, 700],
    8: [0, 0, 1.1, 1.5, 2, 3.5, 39, 100, 800],
    9: [0, 0, 1.2, 1.3, 1.7, 2.5, 7.5, 50, 250, 1000],
    10: [0, 0, 1.1, 1.2, 1.3, 1.8, 3.5, 13, 50, 250, 1000],
  },
  medium: {
    1: [0, 3.96],
    2: [0, 1.8, 5.1],
    3: [0, 0, 2.8, 50],
    4: [0, 0, 1.1, 13.3, 100],
    5: [0, 0, 1, 3, 35, 350],
    6: [0, 0, 0, 3, 9, 180, 710],
    7: [0, 0, 0, 2, 7, 30, 400, 800],
    8: [0, 0, 0, 2, 4, 11, 67, 400, 900],
    9: [0, 0, 0, 2, 2.5, 5, 15, 100, 500, 1000],
    10: [0, 0, 0, 1.6, 2, 4, 7, 25, 100, 500, 1000],
  },
  hard: {
    1: [0, 3.96],
    2: [0, 0, 17.1],
    3: [0, 0, 0, 81.5],
    4: [0, 0, 0, 10, 259],
    5: [0, 0, 0, 4.5, 48, 450],
    6: [0, 0, 0, 0, 11, 350, 710],
    7: [0, 0, 0, 0, 7, 90, 400, 800],
    8: [0, 0, 0, 0, 5, 20, 270, 600, 900],
    9: [0, 0, 0, 0, 4, 11, 56, 500, 800, 1000],
    10: [0, 0, 0, 0, 3.5, 8, 13, 64, 500, 800, 1000],
  }
} as const;

interface KenoProps {
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

const formatBalance = (val: number) => {
  const fixed = val.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formattedInt}.${decPart}`;
};

export default function Keno({ user }: KenoProps) {
  const [bet, setBet] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [selected, setSelected] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'idle' | 'drawing' | 'finished'>('idle');
  const [showResultModal, setShowResultModal] = useState(false);
  const [payout, setPayout] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unlockedAch, setUnlockedAch] = useState<string | null>(null);
  const [fastMode, setFastMode] = useState(false);

  const isProcessing = useRef(false);

  const resetDrawState = () => {
    if (drawn.length > 0) {
      setDrawn([]);
      setGameState('idle');
      setShowResultModal(false);
    }
  };

  const toggleNumber = (num: number) => {
    if (gameState === 'drawing') return;
    resetDrawState();
    
    if (selected.includes(num)) {
      setSelected(selected.filter(n => n !== num));
    } else if (selected.length < 10) {
      setSelected([...selected, num]);
    }
  };

  const clearSelection = () => {
    if (gameState === 'drawing') return;
    setSelected([]);
    setDrawn([]);
    setGameState('idle');
    setShowResultModal(false);
  };

  const autoPick = () => {
    if (gameState === 'drawing') return;
    resetDrawState();

    const nums: number[] = [];
    while (nums.length < 10) {
      const n = Math.floor(Math.random() * 40) + 1;
      if (!nums.includes(n)) nums.push(n);
    }
    setSelected(nums);
  };

  const handleHalfBet = () => {
    if (gameState === 'drawing') return;
    setBet(prev => Math.max(1, Number((prev / 2).toFixed(2))));
  };

  const handleDoubleBet = () => {
    if (gameState === 'drawing') return;
    setBet(prev => Number((prev * 2).toFixed(2)));
  };

  const handlePlay = async () => {
    if (bet > user.balance || bet <= 0 || selected.length === 0 || isProcessing.current) return;
    isProcessing.current = true;
    setLoading(true);
    setGameState('drawing');
    setShowResultModal(false);
    setDrawn([]);
    setPayout(0);

    const newDrawn: number[] = [];
    while (newDrawn.length < 10) {
      const num = Math.floor(Math.random() * 40) + 1;
      if (!newDrawn.includes(num)) newDrawn.push(num);
    }

    if (fastMode) {
      // Режим Турбо (почти моментально)
      setDrawn(newDrawn);
      await new Promise(r => setTimeout(r, 150)); // Минимальная задержка, чтобы успело отрисоваться
    } else {
      // Обычный режим (с анимацией)
      for (let i = 1; i <= 10; i++) {
        await new Promise(r => setTimeout(r, 150));
        setDrawn(newDrawn.slice(0, i));
      }
    }

    const matches = selected.filter(n => newDrawn.includes(n)).length;
    const multTable = MULTIPLIERS[difficulty][selected.length as keyof typeof MULTIPLIERS['medium']];
    const mult = multTable[matches]; 
    
    const winAmount = bet * mult;
    const newBalance = user.balance - bet + winAmount;

    const isOneNumWin = selected.length === 1 && matches === 1;
    const prevOneNumStreak = (user as any).kenoWinStreakOneNum || 0;
    const newOneNumStreak = isOneNumWin ? prevOneNumStreak + 1 : 0;

    try {
      const achQuery = query(collection(db, 'achievements'), where('userId', '==', user.uid), where('category', '==', 'keno'));
      const achSnapshot = await getDocs(achQuery);
      const userAchs: MutableAchievement[] = achSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as MutableAchievement));

      const getAch = (type: string): MutableAchievement => {
        const existing = userAchs.find(a => a.type === type);
        return existing ? { ...existing } : { type, category: 'keno', progress: 0, completed: false, rewarded: false, userId: user.uid };
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

      if (bet >= 20) processAch('keno_line1', 25, a => { a.progress++; return a; }, 'Первая линия');
      if (bet >= 40) processAch('keno_line2', 50, a => { a.progress++; return a; }, 'Первая линия II');
      if (bet >= 100) processAch('keno_line3', 100, a => { a.progress++; return a; }, 'Первая линия III');
      
      processAch('keno_lucky_num', 5, a => {
        if (isOneNumWin) a.progress++; else a.progress = 0;
        return a;
      }, 'Счастливое число');

      if (mult >= 200 && bet >= 50) {
        processAch('keno_magic', 1, a => { a.progress = 1; return a; }, 'Кошачья магия');
      }

      if (selected.length === 10 && matches === 10 && bet >= 10) {
        processAch('keno_nostracat', 1, a => { a.progress = 1; return a; }, 'Ностракотус');
      }

      await Promise.all([
        updateDoc(doc(db, 'users', user.uid), { 
          balance: newBalance, 
          xp: (user.xp || 0) + bet / 10,
          kenoWinStreakOneNum: newOneNumStreak
        }),
        addDoc(collection(db, 'gameSessions'), { userId: user.uid, gameType: 'keno', bet, multiplier: mult, payout: winAmount, timestamp: new Date().toISOString() }),
        ...updates.map(ach => updateDoc(doc(db, 'achievements', ach.id as string), { progress: ach.progress, completed: ach.completed })),
        ...newAchsToCreate.map(ach => { const { id, ...data } = ach; return addDoc(collection(db, 'achievements'), data); })
      ]);

      setPayout(winAmount);
      setGameState('finished');
      setShowResultModal(true);

      if (newlyUnlocked) {
        setUnlockedAch(newlyUnlocked);
        setTimeout(() => setUnlockedAch(null), 4000);
      }
    } catch (error) {
      console.error('Keno error:', error);
    } finally {
      setLoading(false);
      setTimeout(() => { isProcessing.current = false; }, 100);
    }
  };

  const currentMatchesCount = selected.filter(n => drawn.includes(n)).length;

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8 pb-12 relative min-h-[calc(100vh-120px)] flex flex-col">
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

      {/* HEADER */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 shrink-0">
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-brand-500 rounded-[1.2rem] lg:rounded-3xl flex items-center justify-center shadow-lg shadow-brand-200">
            <Layers className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-1">Keno</h1>
            <p className="text-slate-400 font-medium text-xs lg:text-base hidden sm:block">Выбери до 10 чисел и жди удачи!</p>
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-2 bg-brand-50 px-4 py-2 rounded-xl border border-brand-100 text-[10px] font-black uppercase text-brand-600 tracking-widest w-fit">
          <ShieldCheck className="w-4 h-4" /> <span>Provably Fair</span>
        </div>
      </header>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-8 flex-1">
        
        <div className="order-1 lg:order-2 lg:col-span-8 bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-6 lg:p-10 flex flex-col items-center justify-between relative overflow-hidden min-h-[350px] sm:min-h-[450px]">
          
          {/* МОДАЛКА ВЫПЛАТЫ (Без анимации в турбо-режиме) */}
          <AnimatePresence>
            {showResultModal && gameState === 'finished' && (
              <motion.div
                initial={fastMode ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: fastMode ? 0 : 0.2 }}
                onClick={() => setShowResultModal(false)}
                className="absolute inset-0 z-50 flex items-center justify-center p-6 cursor-pointer"
              >
                <motion.div
                  initial={fastMode ? false : { scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  transition={{ duration: fastMode ? 0 : 0.3 }}
                  onClick={(e) => e.stopPropagation()} 
                  className={cn(
                    "relative overflow-hidden w-full max-w-[280px] sm:max-w-[320px] rounded-[2rem] p-6 text-center border backdrop-blur-md",
                    fastMode ? "" : "transition-all duration-300",
                    payout > 0 
                      ? "bg-slate-900/40 border-emerald-500/30 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/20" 
                      : "bg-slate-900/40 border-slate-700/40 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] ring-1 ring-white/5"
                  )}
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent opacity-30 pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    {payout > 0 ? (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 shadow-[inset_0_0_20px_rgba(16,185,129,0.3)]">
                           <img src="/assets/keno/keno_paw.webp" alt="paw win" className="w-7 h-7 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                        </div>
                        <div>
                          <p className="text-emerald-400 font-black uppercase tracking-[0.3em] text-[10px] mb-1 drop-shadow-md">Winner!</p>
                          <p className="text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(16,185,129,0.5)]">+{formatBalance(payout)}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-slate-800/40 flex items-center justify-center border border-slate-600/50">
                           <img src="/assets/keno/grey_paw_keno.webp" alt="paw lose" className="w-7 h-7 opacity-60" />
                        </div>
                        <div>
                          <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-[10px] mb-1 drop-shadow-md">Проигрыш</p>
                          <p className="text-3xl font-black text-white drop-shadow-md">0.00</p>
                        </div>
                      </>
                    )}
                    
                    <div className="mt-2 px-5 py-2 rounded-xl bg-white/10 border border-white/20 text-[10px] font-bold text-white uppercase tracking-widest backdrop-blur-md drop-shadow-sm">
                      Ставка: {formatBalance(bet)}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-8 lg:grid-cols-10 gap-1.5 sm:gap-2 lg:gap-3 w-full relative z-10">
            {Array.from({ length: 40 }, (_, i) => i + 1).map((num) => {
              const isSelected = selected.includes(num);
              const isDrawn = drawn.includes(num);
              const isMatch = isSelected && isDrawn;

              return (
                <motion.button
                  key={num}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleNumber(num)}
                  disabled={gameState === 'drawing'}
                  className={cn(
                    "aspect-square rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center font-black text-xs sm:text-base lg:text-xl border-2 relative overflow-hidden",
                    fastMode ? "" : "transition-all duration-300",
                    isMatch ? "bg-emerald-500 border-emerald-600 shadow-lg shadow-emerald-200 z-10" :
                    isDrawn ? "bg-slate-100 border-slate-200 text-slate-300" :
                    isSelected ? "bg-brand-600 border-brand-700 text-white shadow-lg shadow-brand-200 z-10" :
                    "bg-slate-50 border-slate-100 text-slate-900 hover:border-brand-200"
                  )}
                >
                  {isMatch ? (
                    <motion.div
                      initial={fastMode ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: fastMode ? 0 : 0.3 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <img src="/assets/keno/keno_paw.webp" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 drop-shadow-md" alt="paw" />
                    </motion.div>
                  ) : (
                    <span className="relative z-10">{num}</span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* ЛЕНТА МНОЖИТЕЛЕЙ (Отключение анимации в турбо-режиме) */}
          {selected.length > 0 && (
            <div className="w-full mt-4 pt-3 border-t border-slate-100 relative z-20">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto justify-start sm:justify-center pb-2 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {MULTIPLIERS[difficulty][selected.length as keyof typeof MULTIPLIERS['medium']].slice(1).map((mult, idx) => {
                  const matchTarget = idx + 1; 
                  const isCompleted = (gameState === 'drawing' || gameState === 'finished') && matchTarget <= currentMatchesCount;
                  const isCurrent = (gameState === 'drawing' || gameState === 'finished') && matchTarget === currentMatchesCount;
                  
                  return (
                    <div key={matchTarget} className="flex flex-col items-center justify-end min-w-[36px] sm:min-w-[44px]">
                      <div className="flex items-center justify-center h-[36px] mb-1">
                        <img 
                          src={isCompleted ? "/assets/keno/keno_paw.webp" : "/assets/keno/grey_paw_keno.webp"} 
                          alt="multiplier paw" 
                          className={cn("drop-shadow-sm", fastMode ? "" : "transition-all duration-300")}
                          style={{
                            width: `${PAW_RIBBON_CONFIG.width}px`,
                            height: `${PAW_RIBBON_CONFIG.height}px`,
                            transform: `translate(${PAW_RIBBON_CONFIG.offsetX}px, ${PAW_RIBBON_CONFIG.offsetY}px) scale(${isCurrent ? PAW_RIBBON_CONFIG.activeScale : PAW_RIBBON_CONFIG.scale})`,
                            opacity: isCompleted ? 0.9 : 0.5
                          }}
                        />
                      </div>
                      <span className={cn(
                        "text-[9px] sm:text-[10px] font-black rounded-md px-1.5 py-0.5", 
                        fastMode ? "" : "transition-all duration-300",
                        isCompleted 
                          ? (isCurrent 
                              ? "bg-brand-500/30 text-brand-600 border border-brand-500/20 backdrop-blur-sm" 
                              : "bg-brand-100/60 text-brand-600 backdrop-blur-sm") 
                          : "text-slate-400 bg-slate-100/60 backdrop-blur-sm"
                      )}>
                        x{mult}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>

        <div className="order-2 lg:order-1 lg:col-span-4 bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-6 lg:p-8 flex flex-col gap-4 lg:gap-6 justify-between">
          
          <div className="space-y-4 lg:space-y-6">
            
            <div className="flex flex-col gap-1.5 lg:gap-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Coins className="w-3 h-3" /> Ставка
                </label>
                <span className="text-[10px] font-black text-brand-500 uppercase bg-brand-50 px-2 py-0.5 rounded-md">
                  Баланс: {formatBalance(user.balance)}
                </span>
              </div>
              
              <div className="flex gap-2 lg:gap-3 items-stretch">
                <div className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] sm:rounded-[1.5rem] p-1.5 sm:p-2 flex items-center focus-within:border-brand-300 transition-colors">
                  <input
                    type="number"
                    value={bet}
                    disabled={gameState === 'drawing'}
                    onChange={(e) => setBet(Number(e.target.value))}
                    className="w-full bg-transparent font-black text-slate-900 text-lg sm:text-xl outline-none disabled:opacity-50 px-2 sm:px-3 min-w-0"
                  />
                  <div className="flex items-center gap-1.5 shrink-0 px-1">
                    <button
                      onClick={handleHalfBet}
                      disabled={gameState === 'drawing'}
                      className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-xl border border-slate-200 text-slate-500 font-black text-xs sm:text-sm hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
                    >
                      /2
                    </button>
                    <button
                      onClick={handleDoubleBet}
                      disabled={gameState === 'drawing'}
                      className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-xl border border-slate-200 text-slate-500 font-black text-xs sm:text-sm hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
                    >
                      X2
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setFastMode(!fastMode)}
                  disabled={gameState === 'drawing'}
                  className={cn(
                    "shrink-0 w-14 sm:w-[68px] rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-center transition-all border-2 disabled:opacity-50",
                    fastMode
                      ? "bg-brand-50 border-brand-300 shadow-[inset_0_4px_10px_rgba(0,0,0,0.05)]"
                      : "bg-slate-50 border-slate-100 hover:border-slate-200 shadow-sm"
                  )}
                >
                  <img
                    src="/assets/keno/thunder_on.webp"
                    alt="Fast Mode"
                    className={cn(
                      "w-auto h-6 sm:h-8 object-contain transition-all duration-300", 
                      fastMode ? "grayscale-0 opacity-100 drop-shadow-[0_2px_8px_rgba(250,204,21,0.6)]" : "grayscale opacity-30"
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex-1 p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center shadow-inner">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Выбрано</p>
                  <p className="text-sm sm:text-lg font-black text-slate-900 leading-none">{selected.length} / 10</p>
                </div>
                <div className="flex-1 p-2 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center shadow-inner">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Лапки</p>
                  <p className="text-sm sm:text-lg font-black text-brand-600 leading-none">{currentMatchesCount}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={autoPick}
                  disabled={gameState === 'drawing'}
                  className="flex-1 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-xl text-[10px] sm:text-xs font-black transition-all border border-brand-100 flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                >
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4" /> Авто
                </button>
                <button
                  onClick={clearSelection}
                  disabled={gameState === 'drawing'}
                  className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl text-[10px] sm:text-xs font-black transition-all border border-rose-100 flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" /> Сброс
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1 border border-slate-100">
              <button 
                onClick={() => {if(gameState !== 'drawing') setDifficulty('easy')}}
                className={cn("flex-1 py-2 rounded-xl text-[10px] sm:text-xs font-black transition-all", difficulty === 'easy' ? "bg-white text-emerald-500 shadow-sm border border-emerald-100" : "text-slate-400 hover:text-slate-600")}
              >
                ЛЕГКИЙ
              </button>
              <button 
                onClick={() => {if(gameState !== 'drawing') setDifficulty('medium')}}
                className={cn("flex-1 py-2 rounded-xl text-[10px] sm:text-xs font-black transition-all", difficulty === 'medium' ? "bg-white text-brand-500 shadow-sm border border-brand-100" : "text-slate-400 hover:text-slate-600")}
              >
                СРЕДНИЙ
              </button>
              <button 
                onClick={() => {if(gameState !== 'drawing') setDifficulty('hard')}}
                className={cn("flex-1 py-2 rounded-xl text-[10px] sm:text-xs font-black transition-all", difficulty === 'hard' ? "bg-white text-rose-500 shadow-sm border border-rose-100" : "text-slate-400 hover:text-slate-600")}
              >
                СЛОЖНЫЙ
              </button>
            </div>

          </div>

          <div className="pt-2 lg:pt-0 flex flex-col gap-2 lg:gap-3">
            <button
              onClick={handlePlay}
              disabled={loading || bet > user.balance || bet <= 0 || selected.length === 0 || gameState === 'drawing'}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black rounded-[1.2rem] sm:rounded-[1.5rem] transition-all shadow-xl shadow-brand-200 uppercase tracking-widest text-sm sm:text-base flex items-center justify-center gap-2 py-4 sm:py-5 active:scale-[0.98]"
            >
              {gameState === 'drawing' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>{gameState === 'finished' ? 'Играть снова' : 'Играть'} <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /></>
              )}
            </button>

            <div className="flex lg:hidden justify-center mt-1">
              <div className="flex items-center gap-2 bg-brand-50 px-4 py-2 rounded-xl border border-brand-100 text-[10px] font-black uppercase text-brand-600 tracking-widest w-fit">
                <ShieldCheck className="w-4 h-4" /> <span>Provably Fair</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
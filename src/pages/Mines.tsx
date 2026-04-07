import { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Grid3X3, Gem, Trophy, Coins, ShieldCheck, Play, Bomb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface MinesProps {
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

export default function Mines({ user }: MinesProps) {
  const [bet, setBet] = useState(10);
  const [minesCount, setMinesCount] = useState(3);
  const [mineInputValue, setMineInputValue] = useState('3');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [grid, setGrid] = useState<boolean[]>(Array(25).fill(false));
  const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
  const [multiplier, setMultiplier] = useState(1);
  const [loading, setLoading] = useState(false);
  const [unlockedAch, setUnlockedAch] = useState<string | null>(null);

  const isProcessing = useRef(false);
  const ribbonRef = useRef<HTMLDivElement>(null);

  const calculateMultiplierPure = (count: number, mines: number) => {
    if (count === 0) return 1.00;
    let mult = 1;
    for (let i = 0; i < count; i++) {
      mult *= (25 - i) / (25 - mines - i);
    }
    return mult;
  };

  useEffect(() => {
    if (ribbonRef.current) {
      const target = ribbonRef.current.querySelector('.is-current') || ribbonRef.current.querySelector('.is-next');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [revealed.filter(r => r).length, gameState, minesCount]);

  const handleMinesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMineInputValue(e.target.value);
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 1 && val <= 24) {
      setMinesCount(val);
    }
  };

  const handleMinesInputBlur = () => {
    let val = parseInt(mineInputValue);
    if (isNaN(val) || val < 1) {
      setMinesCount(1);
      setMineInputValue('1');
    } else if (val > 24) {
      setMinesCount(24);
      setMineInputValue('24');
    } else {
      setMineInputValue(val.toString());
    }
  };

  // ФУНКЦИИ ДЛЯ КНОПОК СТАВКИ
  const handleHalfBet = () => {
    if (gameState === 'playing') return;
    setBet(prev => Math.max(1, Number((prev / 2).toFixed(2))));
  };

  const handleDoubleBet = () => {
    if (gameState === 'playing') return;
    setBet(prev => Number((prev * 2).toFixed(2)));
  };

  const startGame = () => {
    if (bet > user.balance || bet <= 0) return;
    const newGrid = Array(25).fill(false);
    let placed = 0;
    while (placed < minesCount) {
      const idx = Math.floor(Math.random() * 25);
      if (!newGrid[idx]) {
        newGrid[idx] = true;
        placed++;
      }
    }
    setGrid(newGrid);
    setRevealed(Array(25).fill(false));
    setGameState('playing');
    setMultiplier(1);
  };

  const handleTileClick = async (idx: number) => {
    if (gameState !== 'playing' || revealed[idx] || isProcessing.current) return;

    const newRevealed = [...revealed];
    newRevealed[idx] = true;
    setRevealed(newRevealed);

    if (grid[idx]) {
      setGameState('lost');
      const newBalance = user.balance - bet;
      await updateDoc(doc(db, 'users', user.uid), { balance: newBalance });
      await addDoc(collection(db, 'gameSessions'), {
        userId: user.uid,
        gameType: 'mines',
        bet,
        multiplier: 0,
        payout: 0,
        timestamp: new Date().toISOString()
      });
    } else {
      const revealedCount = newRevealed.filter((r, i) => r && !grid[i]).length;
      const newMult = calculateMultiplierPure(revealedCount, minesCount);
      setMultiplier(newMult);
    }
  };

  const cashout = async () => {
    if (gameState !== 'playing' || isProcessing.current) return;
    isProcessing.current = true;
    setLoading(true);
    
    const payout = bet * multiplier;
    const newBalance = user.balance - bet + payout;
    setGameState('won');

    try {
      const achQuery = query(collection(db, 'achievements'), where('userId', '==', user.uid), where('category', '==', 'mines'));
      const achSnapshot = await getDocs(achQuery);
      
      const userAchs: MutableAchievement[] = achSnapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as MutableAchievement));

      const getAch = (type: string): MutableAchievement => {
        const existing = userAchs.find(a => a.type === type);
        return existing ? { ...existing } : { 
          type, category: 'mines', progress: 0, completed: false, rewarded: false, userId: user.uid 
        };
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
            if (existingIdx >= 0) updates[existingIdx] = ach;
            else updates.push(ach);
          } else {
            const existingIdx = newAchsToCreate.findIndex(u => u.type === ach.type);
            if (existingIdx >= 0) newAchsToCreate[existingIdx] = ach;
            else newAchsToCreate.push(ach);
          }
        }
      };

      const revealedCount = revealed.filter((r, i) => r && !grid[i]).length;

      if (bet >= 100) {
        processAch('mines_sapper1', 25, a => { a.progress++; return a; }, 'Кот-сапер');
        processAch('mines_sapper2', 50, a => { a.progress++; return a; }, 'Кот-сапер II');
      }
      if (bet >= 250 && minesCount >= 5) {
        processAch('mines_sapper3', 100, a => { a.progress++; return a; }, 'Кот-сапер III');
      }
      if (minesCount === 24 && bet >= 100) {
        processAch('mines_careful', 5, a => { a.progress++; return a; }, 'Осторожные лапки');
      }
      if (multiplier >= 50) {
        processAch('mines_kitty1', 1, a => { a.progress = 1; return a; }, 'В поисках кисы');
      }
      if (multiplier >= 100) {
        processAch('mines_kitty2', 1, a => { a.progress = 1; return a; }, 'В поисках кисы II');
      }
      if (multiplier >= 250) {
        processAch('mines_kitty3', 1, a => { a.progress = 1; return a; }, 'В поисках кисы III');
      }
      if (multiplier >= 800 && bet >= 25) {
        processAch('mines_kitty4', 1, a => { a.progress = 1; return a; }, 'В поисках кисы IV');
      }
      if (minesCount === 2 && revealedCount === 23) {
        processAch('mines_infinity1', 1, a => { a.progress = 1; return a; }, 'Бесконечность не предел');
      }
      if (minesCount === 3 && revealedCount === 22 && bet >= 5) {
        processAch('mines_infinity2', 1, a => { a.progress = 1; return a; }, 'Бесконечность не предел II');
      }

      await Promise.all([
        updateDoc(doc(db, 'users', user.uid), {
          balance: newBalance,
          xp: (user.xp || 0) + bet / 10
        }),
        addDoc(collection(db, 'gameSessions'), {
          userId: user.uid,
          gameType: 'mines',
          bet,
          multiplier,
          payout,
          timestamp: new Date().toISOString()
        }),
        ...updates.map(ach => updateDoc(doc(db, 'achievements', ach.id as string), { progress: ach.progress, completed: ach.completed })),
        ...newAchsToCreate.map(ach => {
          const { id, ...data } = ach;
          return addDoc(collection(db, 'achievements'), data);
        })
      ]);

      if (newlyUnlocked) {
        setUnlockedAch(newlyUnlocked);
        setTimeout(() => setUnlockedAch(null), 4000);
      }

    } catch (error) {
      console.error('Mines error:', error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isProcessing.current = false;
      }, 300);
    }
  };

  const revealedCount = revealed.filter((r, i) => r && !grid[i]).length;
  const maxSafe = 25 - minesCount;
  const multipliersList = Array.from({length: maxSafe}, (_, i) => calculateMultiplierPure(i + 1, minesCount));

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-12 relative min-h-[calc(100vh-120px)] flex flex-col">

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

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 shrink-0">
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-brand-600 rounded-[1.2rem] lg:rounded-[2rem] flex items-center justify-center shadow-lg shadow-brand-200">
            <Grid3X3 className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-1">Mines</h1>
            <p className="text-slate-400 font-medium text-xs lg:text-base hidden sm:block">Найди кристаллы и не подорвись на мине!</p>
          </div>
        </div>
        
        {/* Provably Fair табличка для ПК (Скрыта на мобильных) */}
        <div className="hidden lg:flex items-center gap-2 bg-brand-50 px-4 py-2 rounded-xl border border-brand-100 text-[10px] font-black uppercase text-brand-600 tracking-widest w-fit">
          <ShieldCheck className="w-4 h-4" /> <span>Provably Fair</span>
        </div>
      </header>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 flex-1">
        
        <div className="order-1 lg:order-2 lg:col-span-8 bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[400px] lg:min-h-[500px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-50/30 via-transparent to-transparent opacity-50 pointer-events-none" />
          
          {/* ЛЕНТА С МНОЖИТЕЛЯМИ */}
          <div className="w-full max-w-[320px] sm:max-w-[450px] lg:max-w-[550px] mb-6 sm:mb-8 shrink-0 relative z-20">
            <div ref={ribbonRef} className="flex gap-2 sm:gap-3 overflow-x-auto px-2 sm:px-4 pb-4 pt-2 snap-x items-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:[scrollbar-width:thin] lg:[&::-webkit-scrollbar]:block lg:[&::-webkit-scrollbar]:h-2 lg:[&::-webkit-scrollbar-track]:bg-slate-50 lg:[&::-webkit-scrollbar-track]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-slate-300 lg:[&::-webkit-scrollbar-thumb]:rounded-full">
              {multipliersList.map((m, idx) => {
                 const isPassed = idx < revealedCount - 1;
                 const isCurrent = idx === revealedCount - 1 && gameState === 'playing';
                 const isNext = idx === revealedCount && gameState === 'playing';
                 
                 return (
                   <div 
                     key={idx} 
                     className={cn(
                       "shrink-0 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all duration-300 snap-center border-2",
                       isCurrent ? "bg-emerald-500 text-white border-emerald-500 shadow-[0_8px_20px_rgba(16,185,129,0.3)] scale-110 mx-2 is-current" :
                       isPassed ? "bg-emerald-50 border-emerald-100 text-emerald-500 opacity-60" :
                       isNext ? "bg-brand-50 border-brand-300 text-brand-600 shadow-sm scale-105 mx-1 is-next" :
                       "bg-slate-50 border-slate-100 text-slate-400"
                     )}
                   >
                     x{m.toFixed(2)}
                   </div>
                 );
              })}
            </div>
          </div>

          <div className="w-full max-w-[280px] sm:max-w-[380px] lg:max-w-[420px] mx-auto relative z-10">
            <div className="grid grid-cols-5 grid-rows-5 gap-2 sm:gap-3 w-full aspect-square">
              {grid.map((isMine, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: revealed[i] ? 1 : 1.05, y: revealed[i] ? 0 : -2 }}
                  whileTap={{ scale: revealed[i] ? 1 : 0.95 }}
                  onClick={() => handleTileClick(i)}
                  disabled={gameState !== 'playing' || revealed[i]}
                  className={cn(
                    "w-full h-full rounded-[0.8rem] sm:rounded-2xl flex items-center justify-center transition-all shadow-sm relative overflow-hidden border-2",
                    !revealed[i] && gameState === 'playing' ? "bg-slate-50 hover:bg-white border-slate-100 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-100/50" : "",
                    !revealed[i] && gameState !== 'playing' ? "bg-slate-50 border-slate-100 opacity-50" : "",
                    revealed[i] && isMine ? "bg-rose-500 text-white border-rose-400 shadow-2xl shadow-rose-200" : "",
                    revealed[i] && !isMine ? "bg-brand-600 text-white border-brand-500 shadow-2xl shadow-brand-200" : "",
                    !revealed[i] && gameState === 'lost' && isMine ? "bg-rose-50 border-rose-100 text-rose-600" : ""
                  )}
                >
                  <AnimatePresence mode="wait">
                    {revealed[i] ? (
                      <motion.div
                        key="revealed"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        {isMine ? <Bomb className="w-6 h-6 sm:w-8 sm:h-8" /> : <Gem className="w-6 h-6 sm:w-8 sm:h-8" />}
                      </motion.div>
                    ) : (
                      gameState === 'lost' && isMine ? (
                        <motion.div
                          key="lost-mine"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Bomb className="w-4 h-4 sm:w-6 sm:h-6 opacity-30" />
                        </motion.div>
                      ) : null
                    )}
                  </AnimatePresence>
                  
                  {!revealed[i] && gameState === 'playing' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="order-2 lg:order-1 lg:col-span-4 bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 sm:p-8 flex flex-col gap-6 lg:gap-8 justify-between">
          
          <div className="space-y-6 lg:space-y-8">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">Ставка</label>
                <span className="text-[10px] font-black text-brand-500 uppercase bg-brand-50 px-2 py-0.5 rounded-md hidden sm:block">
                  Баланс: {user.balance.toFixed(2)}
                </span>
              </div>
              
              {/* ОБНОВЛЕННЫЙ БЛОК СТАВКИ С КНОПКАМИ */}
              <div className="flex gap-2 lg:gap-3 items-stretch">
                <div className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] sm:rounded-[1.5rem] p-1.5 sm:p-2 flex items-center focus-within:border-brand-300 transition-colors">
                  <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 mx-2 shrink-0 hidden sm:block" />
                  <input
                    type="number"
                    value={bet}
                    disabled={gameState === 'playing'}
                    onChange={(e) => setBet(Number(e.target.value))}
                    className="w-full bg-transparent font-black text-slate-900 text-lg sm:text-xl outline-none disabled:opacity-50 px-2 sm:px-1 min-w-0"
                  />
                  <div className="flex items-center gap-1.5 shrink-0 px-1">
                    <button
                      onClick={handleHalfBet}
                      disabled={gameState === 'playing'}
                      className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-xl border border-slate-200 text-slate-500 font-black text-xs sm:text-sm hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
                    >
                      /2
                    </button>
                    <button
                      onClick={handleDoubleBet}
                      disabled={gameState === 'playing'}
                      className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-xl border border-slate-200 text-slate-500 font-black text-xs sm:text-sm hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
                    >
                      X2
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="px-1">
                <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">Количество мин</label>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[3, 5, 10, 24].map(n => (
                  <button
                    key={n}
                    disabled={gameState === 'playing'}
                    onClick={() => { setMinesCount(n); setMineInputValue(n.toString()); }}
                    className={cn(
                      "rounded-xl py-3 text-xs sm:text-sm font-black transition-all border-2",
                      minesCount === n 
                        ? "bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-200" 
                        : "bg-slate-50 text-slate-400 border-slate-100 hover:border-brand-200"
                    )}
                  >
                    {n}
                  </button>
                ))}
                <div className="col-span-1 bg-white rounded-xl border-2 border-brand-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all shadow-inner flex items-center justify-center overflow-hidden">
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={mineInputValue}
                    onChange={handleMinesInputChange}
                    onBlur={handleMinesInputBlur}
                    disabled={gameState === 'playing'}
                    className="w-full h-full text-center font-black text-brand-600 bg-transparent outline-none disabled:opacity-50 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 lg:pt-0">
            <AnimatePresence mode="popLayout">
              {gameState === 'playing' ? (
                <motion.div 
                  key="playing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-3"
                >
                  <div className="w-full bg-brand-50 rounded-[1.2rem] sm:rounded-[1.5rem] border border-brand-100 flex flex-row items-center justify-between px-6 py-4">
                    <span className="text-[10px] sm:text-xs uppercase font-black tracking-widest text-brand-400">Множитель</span>
                    <span className="text-xl sm:text-3xl font-black text-brand-600 leading-none">x{multiplier.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={cashout}
                    disabled={loading || revealed.filter((r, i) => r && !grid[i]).length === 0}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black rounded-[1.2rem] sm:rounded-[1.5rem] transition-all shadow-xl shadow-emerald-200 uppercase tracking-widest text-sm sm:text-base flex items-center justify-center gap-2 py-4 sm:py-5 active:scale-[0.98]"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Забрать <span className="opacity-90 ml-1">{(bet * multiplier).toFixed(2)} CAT</span></>
                    )}
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-3 sm:gap-4"
                >
                  {/* ОБНОВЛЕННЫЕ ПЛАШКИ РЕЗУЛЬТАТА */}
                  {gameState === 'won' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-row items-center justify-between py-3 px-4 sm:px-6 bg-emerald-50/80 border-2 border-emerald-400 rounded-xl sm:rounded-2xl shadow-[0_4px_20px_-5px_rgba(16,185,129,0.3)]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                          <Gem className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] sm:text-[11px] uppercase font-black tracking-widest text-emerald-600/80 mb-0.5">Победа!</p>
                          <p className="text-xs sm:text-sm font-bold text-emerald-700">Множитель: x{multiplier.toFixed(2)}</p>
                        </div>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-emerald-500 drop-shadow-sm ml-2">+{(bet * multiplier).toFixed(2)}</p>
                    </motion.div>
                  )}
                  {gameState === 'lost' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-row items-center justify-between py-3 px-4 sm:px-6 bg-rose-50/80 border-2 border-rose-400 rounded-xl sm:rounded-2xl shadow-[0_4px_20px_-5px_rgba(244,63,94,0.3)]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                          <Bomb className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] sm:text-[11px] uppercase font-black tracking-widest text-rose-600/80 mb-0.5">Бум!</p>
                          <p className="text-xs sm:text-sm font-bold text-rose-700">Множитель: x0.00</p>
                        </div>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-rose-500 drop-shadow-sm ml-2">0.00</p>
                    </motion.div>
                  )}

                  {/* КНОПКА СТАРТА */}
                  <button
                    onClick={startGame}
                    disabled={bet > user.balance || bet <= 0}
                    className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black rounded-[1.2rem] sm:rounded-[1.5rem] transition-all shadow-xl shadow-brand-200 uppercase tracking-[0.2em] text-sm sm:text-base flex items-center justify-center gap-3 py-4 sm:py-5 active:scale-[0.98]"
                  >
                    {gameState === 'idle' ? 'Начать игру' : 'Играть снова'} <Play className="w-5 h-5 fill-current" />
                  </button>

                  {/* Provably Fair табличка для Мобильных (Скрыта на ПК) */}
                  <div className="flex lg:hidden justify-center mt-2">
                    <div className="flex items-center gap-2 bg-brand-50 px-4 py-2 rounded-xl border border-brand-100 text-[10px] font-black uppercase text-brand-600 tracking-widest w-fit">
                      <ShieldCheck className="w-4 h-4" /> <span>Provably Fair</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
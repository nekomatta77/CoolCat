// src/pages/Mines.tsx
import { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, addDoc, collection, getDocs, query, where, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Grid3X3, Gem, Trophy, Coins, ShieldCheck, Play, Bomb, Loader2 } from 'lucide-react';
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
  const [betInput, setBetInput] = useState('10');
  const bet = parseFloat(betInput.replace(',', '.')) || 0;

  const [minesCount, setMinesCount] = useState(3);
  const [mineInputValue, setMineInputValue] = useState('3');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [grid, setGrid] = useState<boolean[]>(Array(25).fill(false));
  const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
  const [multiplier, setMultiplier] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true); // Флаг восстановления игры
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

  // ВОССТАНОВЛЕНИЕ ИГРЫ ПРИ ЗАГРУЗКЕ
  useEffect(() => {
    const restoreActiveGame = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.activeMinesGame && userData.activeMinesGame.status === 'playing') {
            setGrid(userData.activeMinesGame.grid);
            setRevealed(userData.activeMinesGame.revealed);
            setMultiplier(userData.activeMinesGame.multiplier);
            setBetInput(userData.activeMinesGame.bet.toString());
            setMinesCount(userData.activeMinesGame.minesCount);
            setMineInputValue(userData.activeMinesGame.minesCount.toString());
            setGameState('playing');
            console.log('✅ Найдена незаконченная игра, восстанавливаем!');
          }
        }
      } catch (error) {
        console.error('Ошибка при восстановлении игры:', error);
      } finally {
        setIsRestoring(false);
      }
    };
    
    restoreActiveGame();
  }, [user.uid]);

  useEffect(() => {
    if (ribbonRef.current && !isRestoring) {
      const target = ribbonRef.current.querySelector('.is-current') || ribbonRef.current.querySelector('.is-next');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [revealed.filter(r => r).length, gameState, minesCount, isRestoring]);

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

  const handleHalfBet = () => {
    if (gameState === 'playing') return;
    const current = parseFloat(betInput.replace(',', '.')) || 0;
    let next = current / 2;
    if (next < 1) next = 1;
    setBetInput(Number(next.toFixed(2)).toString());
  };

  const handleDoubleBet = () => {
    if (gameState === 'playing') return;
    const current = parseFloat(betInput.replace(',', '.')) || 0;
    let next = current * 2;
    if (next > user.balance) next = user.balance;
    if (next < 1) next = 1;
    setBetInput(Number(next.toFixed(2)).toString());
  };

  const startGame = async () => {
    if (!user?.uid || bet > user.balance || bet < 1 || isProcessing.current) return;
    isProcessing.current = true;

    try {
      const newGrid = Array(25).fill(false);
      let placed = 0;
      while (placed < minesCount) {
        const idx = Math.floor(Math.random() * 25);
        if (!newGrid[idx]) {
          newGrid[idx] = true;
          placed++;
        }
      }
      
      const newGameData = {
        grid: newGrid,
        revealed: Array(25).fill(false),
        multiplier: 1,
        bet,
        minesCount,
        status: 'playing'
      };

      // Списываем баланс и одновременно сохраняем прогресс игры в базу!
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-bet),
        activeMinesGame: newGameData
      });

      setGrid(newGrid);
      setRevealed(Array(25).fill(false));
      setMultiplier(1);
      setGameState('playing');

    } catch (error) {
      console.error('Ошибка при старте игры:', error);
    } finally {
      isProcessing.current = false;
    }
  };

  const handleTileClick = (idx: number) => {
    if (gameState !== 'playing' || revealed[idx] || isProcessing.current) return;
    isProcessing.current = true;

    // Мгновенное оптимистичное обновление UI
    const newRevealed = [...revealed];
    newRevealed[idx] = true;
    setRevealed(newRevealed);

    if (grid[idx]) {
      setGameState('lost');
      // В фоне обновляем базу
      Promise.all([
        updateDoc(doc(db, 'users', user.uid), { activeMinesGame: null }), // Очищаем сохраненную игру
        addDoc(collection(db, 'gameSessions'), {
          userId: user.uid, gameType: 'mines', bet, multiplier: 0, payout: 0, timestamp: new Date().toISOString()
        })
      ]).finally(() => isProcessing.current = false);
    } else {
      const revealedCount = newRevealed.filter((r, i) => r && !grid[i]).length;
      const newMult = calculateMultiplierPure(revealedCount, minesCount);
      setMultiplier(newMult);
      
      // Фоновое сохранение шага
      updateDoc(doc(db, 'users', user.uid), {
        'activeMinesGame.revealed': newRevealed,
        'activeMinesGame.multiplier': newMult
      }).finally(() => isProcessing.current = false);
    }
  };

  const cashout = async () => {
    if (gameState !== 'playing' || isProcessing.current) return;
    isProcessing.current = true;
    setLoading(true);
    
    const payout = bet * multiplier;
    setGameState('won');

    try {
      const achQuery = query(collection(db, 'achievements'), where('userId', '==', user.uid), where('category', '==', 'mines'));
      const achSnapshot = await getDocs(achQuery);
      const userAchs: MutableAchievement[] = achSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as MutableAchievement));

      const getAch = (type: string): MutableAchievement => {
        const existing = userAchs.find(a => a.type === type);
        return existing ? { ...existing } : { type, category: 'mines', progress: 0, completed: false, rewarded: false, userId: user.uid };
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
          ach.progress = target; ach.completed = true; newlyUnlocked = title; 
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

      const revealedCount = revealed.filter((r, i) => r && !grid[i]).length;

      if (bet >= 100) {
        processAch('mines_sapper1', 25, a => { a.progress++; return a; }, 'Кот-сапер');
        processAch('mines_sapper2', 50, a => { a.progress++; return a; }, 'Кот-сапер II');
      }
      if (bet >= 250 && minesCount >= 5) processAch('mines_sapper3', 100, a => { a.progress++; return a; }, 'Кот-сапер III');
      if (minesCount === 24 && bet >= 100) processAch('mines_careful', 5, a => { a.progress++; return a; }, 'Осторожные лапки');
      if (multiplier >= 50) processAch('mines_kitty1', 1, a => { a.progress = 1; return a; }, 'В поисках кисы');
      if (multiplier >= 100) processAch('mines_kitty2', 1, a => { a.progress = 1; return a; }, 'В поисках кисы II');
      if (multiplier >= 250) processAch('mines_kitty3', 1, a => { a.progress = 1; return a; }, 'В поисках кисы III');
      if (multiplier >= 800 && bet >= 25) processAch('mines_kitty4', 1, a => { a.progress = 1; return a; }, 'В поисках кисы IV');
      if (minesCount === 2 && revealedCount === 23) processAch('mines_infinity1', 1, a => { a.progress = 1; return a; }, 'Бесконечность не предел');
      if (minesCount === 3 && revealedCount === 22 && bet >= 5) processAch('mines_infinity2', 1, a => { a.progress = 1; return a; }, 'Бесконечность не предел II');

      await Promise.all([
        updateDoc(doc(db, 'users', user.uid), { 
          balance: increment(payout), 
          xp: increment(bet / 10),
          activeMinesGame: null // Очищаем игру после победы
        }),
        addDoc(collection(db, 'gameSessions'), { userId: user.uid, gameType: 'mines', bet, multiplier, payout, timestamp: new Date().toISOString() }),
        ...updates.map(ach => updateDoc(doc(db, 'achievements', ach.id as string), { progress: ach.progress, completed: ach.completed })),
        ...newAchsToCreate.map(ach => { const { id, ...data } = ach; return addDoc(collection(db, 'achievements'), data); })
      ]);

      if (newlyUnlocked) {
        setUnlockedAch(newlyUnlocked);
        setTimeout(() => setUnlockedAch(null), 4000);
      }

    } catch (error) {
      console.error('Mines error:', error);
    } finally {
      setLoading(false);
      setTimeout(() => { isProcessing.current = false; }, 300);
    }
  };

  const revealedCount = revealed.filter((r, i) => r && !grid[i]).length;
  const maxSafe = 25 - minesCount;
  const multipliersList = Array.from({length: maxSafe}, (_, i) => calculateMultiplierPure(i + 1, minesCount));

  if (isRestoring) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-500 font-black tracking-widest uppercase text-sm">Проверка игр...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8 pb-0 sm:pb-12 relative min-h-[calc(100vh-120px)] flex flex-col">

      <AnimatePresence>
        {unlockedAch && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-100 bg-white px-6 py-4 rounded-3xl shadow-2xl border-2 border-brand-200 flex items-center gap-4 min-w-75"
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

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 shrink-0 pt-4 sm:pt-0 px-4 sm:px-0">
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-brand-600 rounded-[1.2rem] lg:rounded-4xl flex items-center justify-center shadow-lg shadow-brand-200 shrink-0">
            <Grid3X3 className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-1">Mines</h1>
            <p className="text-slate-400 font-medium text-xs lg:text-base hidden sm:block">Найди кристаллы и не подорвись на мине!</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-8 flex-1">
        
        <div className="order-1 lg:order-2 lg:col-span-8 bg-white sm:rounded-4xl sm:border border-slate-100 sm:shadow-xl sm:shadow-slate-200/50 p-4 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-100 lg:min-h-125">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-brand-50/30 via-transparent to-transparent opacity-50 pointer-events-none hidden sm:block" />
          
          <div className="w-full max-w-[320px] sm:max-w-112.5 lg:max-w-137.5 mb-4 sm:mb-8 shrink-0 relative z-20">
            <div ref={ribbonRef} className="flex gap-2 sm:gap-3 overflow-x-auto px-2 sm:px-4 pb-4 pt-2 snap-x items-center scrollbar-none lg:scrollbar-thin lg:[&::-webkit-scrollbar]:h-2 lg:[&::-webkit-scrollbar-track]:bg-slate-50 lg:[&::-webkit-scrollbar-track]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-slate-300 lg:[&::-webkit-scrollbar-thumb]:rounded-full">
              {multipliersList.map((m, idx) => {
                 const isPassed = idx < revealedCount - 1;
                 const isCurrent = idx === revealedCount - 1 && gameState === 'playing';
                 const isNext = idx === revealedCount && gameState === 'playing';
                 
                 return (
                   <div 
                     key={idx} 
                     className={cn(
                       "shrink-0 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-3xl font-black text-xs sm:text-sm transition-all duration-300 snap-center border-2",
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

          <div className="w-full max-w-70 sm:max-w-95 lg:max-w-105 mx-auto relative z-10 mb-6 sm:mb-0">
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
                      <motion.div key="revealed" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} className="absolute inset-0 flex items-center justify-center">
                        {isMine ? <Bomb className="w-6 h-6 sm:w-8 sm:h-8" /> : <Gem className="w-6 h-6 sm:w-8 sm:h-8" />}
                      </motion.div>
                    ) : (
                      gameState === 'lost' && isMine ? (
                        <motion.div key="lost-mine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center">
                          <Bomb className="w-4 h-4 sm:w-6 sm:h-6 opacity-30" />
                        </motion.div>
                      ) : null
                    )}
                  </AnimatePresence>
                  
                  {!revealed[i] && gameState === 'playing' && (
                    <div className="absolute inset-0 bg-linear-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="mt-8 w-full max-w-sm hidden lg:block">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all group">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                   <ShieldCheck className="w-5 h-5 text-emerald-500" />
                 </div>
                 <div className="flex flex-col text-left">
                   <span className="text-xs font-black uppercase text-slate-700 tracking-widest leading-none mb-1">Provably Fair</span>
                   <span className="text-[10px] font-bold text-slate-400 leading-none">Честная игра со 100% случайностью</span>
                 </div>
               </div>
            </div>
          </div>

        </div>

        <div className="order-2 lg:order-1 lg:col-span-4 bg-white sm:bg-white rounded-t-4xl sm:rounded-[3rem] border-t sm:border border-slate-200 sm:border-slate-100 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.15)] sm:shadow-xl sm:shadow-slate-200/50 p-4 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6 justify-between sticky bottom-0 z-50 max-h-[60vh] sm:max-h-none overflow-y-auto sm:overflow-visible transition-all scrollbar-none">
          
          <div className="space-y-4 lg:space-y-8">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Coins className="w-3 h-3" /> Ставка
                </label>
                <span className="text-[10px] font-black text-brand-500 uppercase bg-brand-50 px-2 py-0.5 rounded-md hidden sm:block">
                  Баланс: {user?.balance?.toFixed(2) || '0.00'}
                </span>
              </div>
              
              <div className="flex gap-2 lg:gap-3 items-stretch">
                <div className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] sm:rounded-3xl p-1.5 sm:p-2 flex items-center focus-within:border-brand-300 transition-colors">
                  <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 mx-2 shrink-0 hidden sm:block" />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={betInput}
                    disabled={gameState === 'playing'}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                        setBetInput(val);
                      }
                    }}
                    onBlur={() => {
                      let val = parseFloat(betInput.replace(',', '.'));
                      if (isNaN(val) || val < 1) val = 1;
                      else if (val > user.balance) val = Math.max(1, user.balance);
                      setBetInput(Number(val.toFixed(2)).toString());
                    }}
                    className="w-full bg-transparent font-black text-slate-900 text-lg sm:text-xl outline-none disabled:opacity-50 px-2 sm:px-1 min-w-0"
                  />
                  <div className="flex items-center gap-1.5 shrink-0 px-1">
                    <button onClick={handleHalfBet} disabled={gameState === 'playing'} className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-xl border border-slate-200 text-slate-500 font-black text-xs sm:text-sm hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all flex items-center justify-center shadow-sm disabled:opacity-50">/2</button>
                    <button onClick={handleDoubleBet} disabled={gameState === 'playing'} className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-xl border border-slate-200 text-slate-500 font-black text-xs sm:text-sm hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all flex items-center justify-center shadow-sm disabled:opacity-50">X2</button>
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
                      "rounded-xl py-2 sm:py-3 text-xs sm:text-sm font-black transition-all border-2",
                      minesCount === n ? "bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-200" : "bg-slate-50 text-slate-400 border-slate-100 hover:border-brand-200"
                    )}
                  >
                    {n}
                  </button>
                ))}
                <div className="col-span-1 bg-white rounded-xl border-2 border-brand-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all shadow-inner flex items-center justify-center overflow-hidden">
                  <input type="number" min={1} max={24} value={mineInputValue} onChange={handleMinesInputChange} onBlur={handleMinesInputBlur} disabled={gameState === 'playing'} className="w-full h-full text-center font-black text-brand-600 bg-transparent outline-none disabled:opacity-50 text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 lg:pt-0">
            <AnimatePresence mode="popLayout">
              {gameState === 'playing' ? (
                <motion.div key="playing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-3">
                  <div className="w-full bg-brand-50 rounded-[1.2rem] sm:rounded-3xl border border-brand-100 flex flex-row items-center justify-between px-6 py-3 sm:py-4">
                    <span className="text-[10px] sm:text-xs uppercase font-black tracking-widest text-brand-400">Множитель</span>
                    <span className="text-xl sm:text-3xl font-black text-brand-600 leading-none">x{multiplier.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={cashout}
                    disabled={loading || revealed.filter((r, i) => r && !grid[i]).length === 0}
                    className="w-full bg-linear-to-r from-emerald-500 to-emerald-600 disabled:opacity-50 text-white font-black rounded-[1.2rem] sm:rounded-3xl transition-all shadow-lg shadow-emerald-500/30 uppercase tracking-widest text-sm sm:text-base flex items-center justify-center gap-2 py-3.5 sm:py-5 active:scale-95"
                  >
                    {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Забрать <span className="opacity-90 ml-1">{(bet * multiplier).toFixed(2)} CAT</span></>}
                  </button>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-3 sm:gap-4">
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

                  <button
                    onClick={startGame}
                    disabled={bet > user.balance || bet < 1 || isProcessing.current}
                    className="w-full bg-linear-to-r from-brand-500 to-brand-600 disabled:opacity-50 text-white font-black rounded-[1.2rem] sm:rounded-3xl transition-all shadow-lg shadow-brand-500/30 uppercase tracking-[0.2em] text-sm sm:text-base flex items-center justify-center gap-3 py-3.5 sm:py-5 active:scale-95"
                  >
                    {gameState === 'idle' ? 'Начать игру' : 'Играть снова'} <Play className="w-5 h-5 fill-current" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="mt-4 w-full block lg:hidden">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                     <ShieldCheck className="w-5 h-5 text-emerald-500" />
                   </div>
                   <div className="flex flex-col text-left">
                     <span className="text-xs font-black uppercase text-slate-700 tracking-widest leading-none mb-1">Provably Fair</span>
                     <span className="text-[10px] font-bold text-slate-400 leading-none">Честная игра</span>
                   </div>
                 </div>
              </div>
            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
}
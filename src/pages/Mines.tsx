import { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Grid3X3, Bomb, Gem, Trophy, Coins, Settings, ArrowRight, ShieldCheck, Play } from 'lucide-react';
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
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [grid, setGrid] = useState<boolean[]>(Array(25).fill(false));
  const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
  const [multiplier, setMultiplier] = useState(1);
  const [loading, setLoading] = useState(false);
  const [unlockedAch, setUnlockedAch] = useState<string | null>(null);

  const isProcessing = useRef(false);

  const calculateMultiplier = (revealedCount: number) => {
    let mult = 1;
    for (let i = 0; i < revealedCount; i++) {
      mult *= (25 - i) / (25 - minesCount - i);
    }
    return (mult * 0.95).toFixed(2);
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
      const newMult = parseFloat(calculateMultiplier(revealedCount));
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
            <Grid3X3 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Mines</h1>
            <p className="text-slate-400 font-medium">Найди кристаллы и не подорвись на мине!</p>
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
        <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-8">
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
              disabled={gameState === 'playing'}
              onChange={(e) => setBet(Number(e.target.value))}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-slate-900 focus:border-brand-500 outline-none transition-all disabled:opacity-50 text-xl"
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Settings className="w-3 h-3" /> Количество мин
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 5, 10, 15, 20, 24].map(n => (
                <button
                  key={n}
                  disabled={gameState === 'playing'}
                  onClick={() => setMinesCount(n)}
                  className={cn(
                    "py-3 rounded-xl text-xs font-black transition-all border-2",
                    minesCount === n 
                      ? "bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-200" 
                      : "bg-slate-50 text-slate-400 border-slate-100 hover:border-brand-200"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {gameState === 'playing' ? (
              <motion.div 
                key="playing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="p-6 bg-brand-50 rounded-[2.5rem] border border-brand-100 text-center space-y-1 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400 relative z-10">Текущий множитель</p>
                  <p className="text-4xl font-black text-brand-600 relative z-10">x{multiplier.toFixed(2)}</p>
                  <p className="text-sm font-bold text-brand-400 relative z-10">{(bet * multiplier).toFixed(2)} CAT</p>
                </div>
                <button
                  onClick={cashout}
                  disabled={loading || revealed.filter((r, i) => r && !grid[i]).length === 0}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 rounded-2xl transition-all shadow-2xl shadow-emerald-200 uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 group"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Забрать выигрыш 
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={startGame}
                disabled={bet > user.balance || bet <= 0}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-6 rounded-2xl transition-all shadow-2xl shadow-brand-200 uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 group"
              >
                Начать игру <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* === Плашки результата (Mines) без иконок, выровнены по центру === */}
          <AnimatePresence>
            {gameState === 'won' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="p-4 sm:p-5 bg-white border-2 border-emerald-500 rounded-2xl flex flex-col items-center justify-center text-center shadow-[0_8px_20px_rgba(16,185,129,0.15)] w-full"
              >
                <p className="text-[10px] sm:text-[11px] uppercase tracking-widest font-black text-emerald-600 mb-1">Победа!</p>
                <p className="text-xl sm:text-2xl font-black text-slate-800 leading-none">+{(bet * multiplier).toFixed(2)} CAT</p>
              </motion.div>
            )}
            {gameState === 'lost' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="p-4 sm:p-5 bg-white border-2 border-rose-500 rounded-2xl flex flex-col items-center justify-center text-center shadow-[0_8px_20px_rgba(244,63,94,0.15)] w-full"
              >
                <p className="text-[10px] sm:text-[11px] uppercase tracking-widest font-black text-rose-600 mb-1">Бум!</p>
                <p className="text-xl sm:text-2xl font-black text-slate-800 leading-none">Проигрыш</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-8 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-6 lg:p-16 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-50/30 via-transparent to-transparent opacity-50" />
          
          <div className="grid grid-cols-5 gap-3 lg:gap-6 w-full max-w-xl aspect-square relative z-10">
            {grid.map((isMine, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: revealed[i] ? 1 : 1.05, y: revealed[i] ? 0 : -2 }}
                whileTap={{ scale: revealed[i] ? 1 : 0.95 }}
                onClick={() => handleTileClick(i)}
                disabled={gameState !== 'playing' || revealed[i]}
                className={cn(
                  "aspect-square rounded-2xl lg:rounded-[2rem] flex items-center justify-center transition-all shadow-sm relative overflow-hidden border-2",
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
                      className="flex items-center justify-center"
                    >
                      {isMine ? <Bomb className="w-8 h-8 lg:w-12 lg:h-12" /> : <Gem className="w-8 h-8 lg:w-12 lg:h-12" />}
                    </motion.div>
                  ) : (
                    gameState === 'lost' && isMine ? (
                      <motion.div
                        key="lost-mine"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Bomb className="w-6 h-6 lg:w-8 lg:h-8 opacity-30" />
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
    </div>
  );
}
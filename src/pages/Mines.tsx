import { useState, useCallback } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { Grid3X3, Bomb, Gem, Trophy, Coins, Settings, ArrowRight, ShieldCheck, Zap, Sparkles, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface MinesProps {
  user: UserProfile;
}

export default function Mines({ user }: MinesProps) {
  const [bet, setBet] = useState(10);
  const [minesCount, setMinesCount] = useState(3);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [grid, setGrid] = useState<boolean[]>(Array(25).fill(false));
  const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
  const [multiplier, setMultiplier] = useState(1);
  const [loading, setLoading] = useState(false);

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
    if (gameState !== 'playing' || revealed[idx]) return;

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
    if (gameState !== 'playing') return;
    setLoading(true);
    const payout = bet * multiplier;
    const newBalance = user.balance - bet + payout;
    setGameState('won');

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: newBalance,
        xp: user.xp + bet / 10
      });
      await addDoc(collection(db, 'gameSessions'), {
        userId: user.uid,
        gameType: 'mines',
        bet,
        multiplier,
        payout,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Mines error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
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
        {/* Controls */}
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

          <AnimatePresence>
            {gameState === 'won' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="p-5 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] text-emerald-600 font-black text-center flex items-center justify-center gap-3 shadow-xl shadow-emerald-100/50"
              >
                <Sparkles className="w-5 h-5" /> Победа! +{(bet * multiplier).toFixed(2)} CAT
              </motion.div>
            )}
            {gameState === 'lost' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="p-5 bg-rose-50 border-2 border-rose-100 rounded-[2rem] text-rose-600 font-black text-center flex items-center justify-center gap-3 shadow-xl shadow-rose-100/50"
              >
                <Bomb className="w-5 h-5" /> Бум! Проигрыш
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Game Board */}
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

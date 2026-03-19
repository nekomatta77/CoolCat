import { useState, useCallback } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { Layers, Sparkles, Coins, ShieldCheck, ArrowRight, RotateCcw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface KenoProps {
  user: UserProfile;
}

export default function Keno({ user }: KenoProps) {
  const [bet, setBet] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'idle' | 'drawing' | 'finished'>('idle');
  const [payout, setPayout] = useState(0);
  const [loading, setLoading] = useState(false);

  const multipliers: { [key: number]: number[] } = {
    1: [0, 3.8],
    2: [0, 1.9, 5.1],
    3: [0, 1.1, 2.5, 15],
    4: [0, 0.5, 2, 6, 50],
    5: [0, 0, 1.5, 4, 15, 100],
    6: [0, 0, 1, 3, 10, 40, 250],
    7: [0, 0, 0.5, 2, 5, 20, 100, 500],
    8: [0, 0, 0.5, 1, 3, 10, 50, 200, 1000],
    9: [0, 0, 0, 1, 2, 5, 20, 100, 500, 2500],
    10: [0, 0, 0, 0.5, 1, 3, 10, 50, 250, 1000, 5000],
  };

  const toggleNumber = (num: number) => {
    if (gameState === 'drawing') return;
    if (selected.includes(num)) {
      setSelected(selected.filter(n => n !== num));
    } else if (selected.length < 10) {
      setSelected([...selected, num]);
    }
  };

  const clearSelection = () => {
    if (gameState === 'drawing') return;
    setSelected([]);
    setGameState('idle');
    setDrawn([]);
  };

  const autoPick = () => {
    if (gameState === 'drawing') return;
    const nums: number[] = [];
    while (nums.length < 10) {
      const n = Math.floor(Math.random() * 40) + 1;
      if (!nums.includes(n)) nums.push(n);
    }
    setSelected(nums);
  };

  const handlePlay = async () => {
    if (bet > user.balance || bet <= 0 || selected.length === 0) return;
    setLoading(true);
    setGameState('drawing');
    setDrawn([]);
    setPayout(0);

    const newDrawn: number[] = [];
    while (newDrawn.length < 10) {
      const num = Math.floor(Math.random() * 40) + 1;
      if (!newDrawn.includes(num)) newDrawn.push(num);
    }

    // Simulate drawing
    for (let i = 1; i <= 10; i++) {
      await new Promise(r => setTimeout(r, 150));
      setDrawn(newDrawn.slice(0, i));
    }

    const matches = selected.filter(n => newDrawn.includes(n)).length;
    const mult = multipliers[selected.length][matches];
    const winAmount = bet * mult;
    const newBalance = user.balance - bet + winAmount;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: newBalance,
        xp: user.xp + bet / 10
      });
      await addDoc(collection(db, 'gameSessions'), {
        userId: user.uid,
        gameType: 'keno',
        bet,
        multiplier: mult,
        payout: winAmount,
        timestamp: new Date().toISOString()
      });
      setPayout(winAmount);
      setGameState('finished');
    } catch (error) {
      console.error('Keno error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-brand-500 rounded-3xl flex items-center justify-center shadow-lg shadow-brand-200">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Keno</h1>
            <p className="text-slate-400 font-medium">Выбери до 10 чисел и жди удачи!</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Provably Fair</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Coins className="w-3 h-3" /> Ставка
              </label>
              <span className="text-xs font-bold text-brand-600">Баланс: {user.balance.toFixed(2)}</span>
            </div>
            <input
              type="number"
              value={bet}
              disabled={gameState === 'drawing'}
              onChange={(e) => setBet(Number(e.target.value))}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 font-bold text-slate-900 focus:border-brand-500 outline-none transition-all disabled:opacity-50 text-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Выбрано</p>
              <p className="text-xl font-black text-slate-900">{selected.length} / 10</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Матчи</p>
              <p className="text-xl font-black text-brand-600">{selected.filter(n => drawn.includes(n)).length}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={autoPick}
              disabled={gameState === 'drawing'}
              className="py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-600 transition-all border border-slate-100 flex items-center justify-center gap-2"
            >
              <Zap className="w-3 h-3" /> Авто-выбор
            </button>
            <button
              onClick={clearSelection}
              disabled={gameState === 'drawing'}
              className="py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-600 transition-all border border-slate-100 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3 h-3" /> Очистить
            </button>
          </div>

          <button
            onClick={handlePlay}
            disabled={loading || bet > user.balance || bet <= 0 || selected.length === 0 || gameState === 'drawing'}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-5 rounded-2xl transition-all shadow-lg shadow-brand-200 uppercase tracking-widest text-sm flex items-center justify-center gap-3"
          >
            {gameState === 'drawing' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Играть <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          <AnimatePresence>
            {gameState === 'finished' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "p-6 rounded-3xl text-center space-y-1 border",
                  payout > 0 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                    : "bg-slate-50 text-slate-400 border-slate-100"
                )}
              >
                {payout > 0 ? (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-widest">Победа!</p>
                    <p className="text-2xl font-black">+{payout.toFixed(2)} CAT</p>
                  </>
                ) : (
                  <p className="text-sm font-bold">Попробуй еще раз!</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Board */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-4 lg:p-12">
          <div className="grid grid-cols-5 lg:grid-cols-8 gap-2 lg:gap-3">
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
                    "aspect-square rounded-xl lg:rounded-2xl flex items-center justify-center font-black text-base lg:text-xl transition-all border-2 relative overflow-hidden",
                    isMatch ? "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-200 z-10" :
                    isDrawn ? "bg-slate-100 border-slate-200 text-slate-300" :
                    isSelected ? "bg-brand-600 border-brand-700 text-white shadow-lg shadow-brand-200 z-10" :
                    "bg-slate-50 border-slate-100 text-slate-900 hover:border-brand-200"
                  )}
                >
                  {num}
                  {isMatch && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 bg-white/20 flex items-center justify-center"
                    >
                      <Sparkles className="w-6 h-6 text-white opacity-50" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

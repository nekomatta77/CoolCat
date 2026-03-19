import { useState } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { Dice5, AlertCircle, TrendingUp, Coins, Trophy, Info, ShieldCheck, RotateCcw, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface DiceProps {
  user: UserProfile;
}

export default function Dice({ user }: DiceProps) {
  const [bet, setBet] = useState(10);
  const [chance, setChance] = useState(50);
  const [result, setResult] = useState<number | null>(null);
  const [win, setWin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const multiplier = (95 / chance).toFixed(2);
  const potentialWin = (bet * parseFloat(multiplier)).toFixed(2);

  const handlePlay = async () => {
    if (bet > user.balance || bet <= 0) return;
    setLoading(true);
    setResult(null);
    setWin(null);

    const roll = Math.random() * 100;
    const isWin = roll <= chance;
    const payout = isWin ? bet * parseFloat(multiplier) : 0;
    const newBalance = user.balance - bet + payout;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: newBalance,
        xp: user.xp + bet / 10
      });

      await addDoc(collection(db, 'gameSessions'), {
        userId: user.uid,
        gameType: 'dice',
        bet,
        multiplier: isWin ? parseFloat(multiplier) : 0,
        payout,
        timestamp: new Date().toISOString()
      });

      setResult(roll);
      setWin(isWin);
    } catch (error) {
      console.error('Game error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-brand-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200">
            <Dice5 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Dice</h1>
            <p className="text-slate-400 font-medium">Установи шанс и испытай удачу!</p>
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
            <div className="relative group">
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Number(e.target.value))}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-slate-900 focus:border-brand-500 outline-none transition-all text-xl"
              />
              <div className="absolute right-3 top-3 flex gap-2">
                <button 
                  onClick={() => setBet(Math.max(1, bet / 2))} 
                  className="bg-white hover:bg-brand-600 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black text-slate-400 transition-all shadow-sm border border-slate-100"
                >
                  /2
                </button>
                <button 
                  onClick={() => setBet(Math.min(user.balance, bet * 2))} 
                  className="bg-white hover:bg-brand-600 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black text-slate-400 transition-all shadow-sm border border-slate-100"
                >
                  x2
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> Шанс выигрыша
              </label>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-brand-500" />
                <span className="text-xl font-black text-brand-600">{chance}%</span>
              </div>
            </div>
            <div className="relative pt-4">
              <input
                type="range"
                min="1"
                max="95"
                value={chance}
                onChange={(e) => setChance(Number(e.target.value))}
                className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-brand-600"
              />
              <div className="flex justify-between mt-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                <span>1%</span>
                <span>50%</span>
                <span>95%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 text-center group hover:border-brand-200 transition-colors">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Множитель</p>
              <p className="text-2xl font-black text-slate-900">x{multiplier}</p>
            </div>
            <div className="p-5 bg-brand-50 rounded-[2rem] border border-brand-100 text-center group hover:border-brand-300 transition-colors">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400 mb-2">Выигрыш</p>
              <p className="text-2xl font-black text-brand-600">{potentialWin}</p>
            </div>
          </div>

          <button
            onClick={handlePlay}
            disabled={loading || bet > user.balance || bet <= 0}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black py-6 rounded-2xl transition-all shadow-2xl shadow-brand-200 uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 group"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Сделать ставку 
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>

        {/* Game Board */}
        <div className="lg:col-span-8 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col items-center justify-center p-8 lg:p-20 relative overflow-hidden min-h-[500px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-50/50 via-transparent to-transparent opacity-50" />
          
          <AnimatePresence mode="wait">
            {result !== null ? (
              <motion.div
                key="result"
                initial={{ scale: 0.8, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -40 }}
                className="text-center relative z-10"
              >
                <motion.div 
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  className={cn(
                    "text-[10rem] lg:text-[12rem] font-black mb-8 tracking-tighter leading-none",
                    win ? 'text-emerald-500 drop-shadow-[0_0_40px_rgba(16,185,129,0.3)]' : 'text-rose-500 drop-shadow-[0_0_40px_rgba(244,63,94,0.3)]'
                  )}
                >
                  {result.toFixed(2)}
                </motion.div>
                <div className={cn(
                  "inline-flex items-center gap-3 px-10 py-5 rounded-full font-black uppercase tracking-[0.2em] text-sm border-2 shadow-xl",
                  win ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/50' : 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100/50'
                )}>
                  {win ? (
                    <><Sparkles className="w-5 h-5" /> Победа! +{potentialWin} CAT</>
                  ) : (
                    <><AlertCircle className="w-5 h-5" /> Проигрыш</>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center relative z-10"
              >
                <div className="w-56 h-56 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-10 mx-auto border-4 border-dashed border-slate-200 animate-spin-slow relative group">
                  <div className="absolute inset-0 bg-brand-500/5 rounded-[3rem] group-hover:bg-brand-500/10 transition-colors" />
                  <Dice5 className="w-24 h-24 text-slate-200 group-hover:text-brand-200 transition-colors" />
                </div>
                <div className="space-y-2">
                  <p className="text-slate-900 font-black text-2xl tracking-tight">Готовы к игре?</p>
                  <p className="text-slate-400 font-bold">Сделайте ставку, чтобы начать раунд</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-20 w-full max-w-2xl h-8 bg-slate-100 rounded-full relative overflow-hidden border-4 border-white shadow-inner p-1">
            <div
              className="h-full bg-brand-500/20 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${chance}%` }}
            />
            {result !== null && (
              <motion.div
                initial={{ left: 0 }}
                animate={{ left: `${result}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className={cn(
                  "absolute top-0 bottom-0 w-2 z-20 rounded-full shadow-2xl",
                  win ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'
                )}
              />
            )}
          </div>
          <div className="mt-6 w-full max-w-2xl flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
            <span>0.00</span>
            <div className="flex items-center gap-2 text-brand-400">
              <RotateCcw className="w-3 h-3" />
              <span>{chance.toFixed(2)}% TARGET</span>
            </div>
            <span>100.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

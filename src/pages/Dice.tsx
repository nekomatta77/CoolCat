import { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Dice5, Trophy, ShieldCheck, Zap, Sparkles, ArrowDownCircle, ArrowUpCircle, Coins, TrendingUp, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface DiceProps {
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

export default function Dice({ user }: DiceProps) {
  const [bet, setBet] = useState(10);
  const [chance, setChance] = useState(50);
  const [result, setResult] = useState<number | null>(null);
  const [win, setWin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlockedAch, setUnlockedAch] = useState<string | null>(null);
  const [diceMode, setDiceMode] = useState<'classic' | 'switch'>('classic');
  const [rollId, setRollId] = useState(0);

  const isRolling = useRef(false);

  const multiplier = (100 / chance).toFixed(2);
  const potentialWin = (bet * parseFloat(multiplier)).toFixed(2);

  const handlePlay = async (type: 'under' | 'over' = 'under') => {
    if (isRolling.current || bet > user.balance || bet <= 0) return;
    
    isRolling.current = true;
    setLoading(true);

    const roll = Math.random() * 100;
    const isWin = type === 'under' ? roll <= chance : roll >= (100 - chance);
    const payout = isWin ? Number((bet * parseFloat(multiplier)).toFixed(2)) : 0;
    const newBalance = Number((user.balance - bet + payout).toFixed(2));

    setResult(roll);
    setWin(isWin);
    setRollId(Date.now()); 

    const prevLossStreak = (user as any).diceLossStreak || 0;
    const newWinStreak = isWin ? ((user as any).diceWinStreak || 0) + 1 : 0;
    const newLossStreak = !isWin ? prevLossStreak + 1 : 0;

    try {
      const achQuery = query(collection(db, 'achievements'), where('userId', '==', user.uid), where('category', '==', 'dice'));
      const achSnapshot = await getDocs(achQuery);
      
      const userAchs: MutableAchievement[] = achSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as MutableAchievement));
      const getAch = (achType: string): MutableAchievement => {
        const existing = userAchs.find(a => a.type === achType);
        return existing ? { ...existing } : { type: achType, category: 'dice', progress: 0, completed: false, rewarded: false, userId: user.uid };
      };

      const updates: MutableAchievement[] = [];
      const newAchsToCreate: MutableAchievement[] = [];
      let newlyUnlocked: string | null = null;

      const processAch = (achType: string, target: number, progressFn: (a: MutableAchievement) => MutableAchievement, title: string) => {
        let ach = getAch(achType);
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

      if (isWin && chance < 70 && bet >= 100) {
        processAch('dice_fb1', 25, a => { a.progress++; return a; }, 'Первый бросок');
        processAch('dice_fb2', 100, a => { a.progress++; return a; }, 'Первый бросок II');
        processAch('dice_fb3', 500, a => { a.progress++; return a; }, 'Первый бросок III');
      }
      processAch('dice_cat_sense', 5, a => {
        if (isWin && chance < 15 && bet >= 30) a.progress++; else a.progress = 0; 
        return a;
      }, 'Кошачье чутье');

      await Promise.all([
        updateDoc(doc(db, 'users', user.uid), { balance: newBalance, xp: Number(((user.xp || 0) + bet / 10).toFixed(2)), diceWinStreak: newWinStreak, diceLossStreak: newLossStreak }),
        addDoc(collection(db, 'gameSessions'), { userId: user.uid, gameType: 'dice', bet: Number(bet.toFixed(2)), multiplier: isWin ? parseFloat(multiplier) : 0, payout, timestamp: new Date().toISOString() }),
        ...updates.map(ach => updateDoc(doc(db, 'achievements', ach.id as string), { progress: ach.progress, completed: ach.completed })),
        ...newAchsToCreate.map(ach => { const { id, ...data } = ach; return addDoc(collection(db, 'achievements'), data); })
      ]);

      if (newlyUnlocked) {
        setUnlockedAch(newlyUnlocked);
        setTimeout(() => setUnlockedAch(null), 4000);
      }
    } catch (error) {
      console.error('Game error:', error);
    } finally {
      setLoading(false);
      isRolling.current = false; 
    }
  };

  const maxNumber = 9999.99;
  const underTarget = Math.floor(chance * maxNumber);
  const overTarget = Math.ceil((100 - chance) * maxNumber);

  return (
    <div className="max-w-4xl mx-auto lg:ml-0 lg:mr-auto space-y-6 pb-12 relative flex flex-col min-h-[calc(100vh-120px)]">
      
      <AnimatePresence>
        {unlockedAch && (
          <motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -50, scale: 0.9 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-white px-6 py-4 rounded-3xl shadow-2xl border-2 border-brand-200 flex items-center gap-4 min-w-[300px]">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-0.5">Достижение!</p>
              <p className="text-lg font-black text-slate-900 leading-tight">{unlockedAch}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-600 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-brand-200 shrink-0">
            <Dice5 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Dice</h1>
        </div>
        <div className="flex bg-white p-1 rounded-xl w-fit border border-slate-100 shadow-sm">
          <button onClick={() => setDiceMode('classic')} className={cn("px-5 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-wider", diceMode === 'classic' ? "bg-brand-50 shadow-sm text-brand-600" : "text-slate-400 hover:text-slate-600")}>Classic</button>
          <button onClick={() => setDiceMode('switch')} className={cn("px-5 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-wider", diceMode === 'switch' ? "bg-brand-50 shadow-sm text-brand-600" : "text-slate-400 hover:text-slate-600")}>Switch</button>
        </div>
      </header>

      {/* =========================================
          РЕЖИМ CLASSIC 
          ========================================= */}
      {diceMode === 'classic' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 w-full">
          
          <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            
            {/* ЛЕВАЯ КОЛОНКА: СТАВКА */}
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="bg-slate-50 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-3xl border border-slate-100 focus-within:border-brand-300 transition-colors flex flex-col justify-center h-full">
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-wider">Ставка</span>
                  <span className="text-[10px] sm:text-xs font-black uppercase text-brand-500 tracking-widest bg-brand-100/50 px-2.5 py-1 rounded-lg hidden sm:block">
                    {user.balance.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center">
                  <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 mr-2 shrink-0" />
                  <input type="number" step="0.01" value={bet} onChange={e => setBet(Number(e.target.value))} className="w-full bg-transparent font-black text-slate-900 text-2xl sm:text-3xl outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 lg:flex gap-1.5 sm:gap-2 w-full">
                <button onClick={() => setBet(1)} className="order-3 lg:order-1 flex-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm">МИН</button>
                <button onClick={() => setBet(Number(Math.max(1, bet / 2).toFixed(2)))} className="order-1 lg:order-2 flex-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm">/2</button>
                <button onClick={() => setBet(Number(Math.min(user.balance, bet * 2).toFixed(2)))} className="order-2 lg:order-3 flex-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm">X2</button>
                <button onClick={() => setBet(Number(user.balance.toFixed(2)))} className="order-4 lg:order-4 flex-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm">МАКС</button>
              </div>
            </div>

            {/* ПРАВАЯ КОЛОНКА: ШАНС */}
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="bg-slate-50 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-3xl border border-slate-100 focus-within:border-brand-300 transition-colors flex flex-col justify-center h-full">
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-wider">Шанс %</span>
                  <span className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-widest bg-slate-200/50 px-2.5 py-1 rounded-lg hidden sm:block">
                    x{multiplier}
                  </span>
                </div>
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 mr-2 shrink-0" />
                  <input type="number" step="0.01" value={chance} onChange={e => setChance(Math.min(95, Math.max(1, Number(e.target.value))))} className="w-full bg-transparent font-black text-slate-900 text-2xl sm:text-3xl outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 lg:flex gap-1.5 sm:gap-2 w-full">
                <button onClick={() => setChance(1)} className="order-3 lg:order-1 flex-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm">МИН</button>
                <button onClick={() => setChance(Math.max(1, Number((chance / 2).toFixed(2))))} className="order-1 lg:order-2 flex-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm">/2</button>
                <button onClick={() => setChance(Math.min(95, Number((chance * 2).toFixed(2))))} className="order-2 lg:order-3 flex-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm">X2</button>
                <button onClick={() => setChance(95)} className="order-4 lg:order-4 flex-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm">МАКС</button>
              </div>
            </div>

          </div>

          {/* ИЗМЕНЕНА ОБВОДКА: border-2 border-emerald-600 */}
          <div className="bg-emerald-50 py-5 px-6 sm:py-6 sm:px-8 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-emerald-600 mb-4 sm:mb-6 flex items-center justify-between shadow-lg shadow-emerald-500/10">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
              <span className="text-[11px] sm:text-xs font-black uppercase text-emerald-600 tracking-widest">Возможный выигрыш</span>
            </div>
            <span className="font-black text-emerald-600 text-2xl sm:text-3xl tracking-tight">+{potentialWin}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <button onClick={() => handlePlay('under')} disabled={loading || bet > user.balance || bet <= 0} className="relative overflow-hidden bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white p-4 rounded-3xl transition-all shadow-lg shadow-brand-200 active:scale-[0.98] group flex flex-col items-center justify-center gap-2 h-24 sm:h-28">
              <div className="flex items-center gap-2 text-sm sm:text-base font-black uppercase tracking-widest"><ArrowDownCircle className="w-5 h-5 opacity-80" />Меньше</div>
              <div className="bg-black/10 px-3 sm:px-4 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-widest">0 - {underTarget}</div>
            </button>
            <button onClick={() => handlePlay('over')} disabled={loading || bet > user.balance || bet <= 0} className="relative overflow-hidden bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white p-4 rounded-3xl transition-all shadow-lg shadow-slate-300 active:scale-[0.98] group flex flex-col items-center justify-center gap-2 h-24 sm:h-28">
              <div className="flex items-center gap-2 text-sm sm:text-base font-black uppercase tracking-widest"><ArrowUpCircle className="w-5 h-5 opacity-80" />Больше</div>
              <div className="bg-white/10 px-3 sm:px-4 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold tracking-widest">{overTarget} - 999999</div>
            </button>
          </div>

          <div className="h-20 sm:h-24 mt-6 flex items-center justify-center bg-slate-50/50 rounded-[1.5rem] border border-slate-100/50 overflow-hidden">
            <AnimatePresence mode="wait">
              {result !== null ? (
                <motion.div
                  key={rollId} 
                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-sm sm:text-base flex items-center gap-3 border",
                    win 
                      ? "bg-gradient-to-b from-emerald-400 to-emerald-500 text-white border-emerald-400/50 shadow-lg shadow-emerald-500/40" 
                      : "bg-gradient-to-b from-rose-400 to-rose-500 text-white border-rose-400/50 shadow-lg shadow-rose-500/40"
                  )}
                >
                  {win ? (
                    <><Sparkles className="w-5 h-5" /> Выигрыш: +{potentialWin}</>
                  ) : (
                    <><AlertCircle className="w-5 h-5" /> Проигрыш: {Math.floor(result * maxNumber).toString().padStart(6, '0')}</>
                  )}
                </motion.div>
              ) : (
                 <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-slate-300 font-bold uppercase tracking-widest text-xs sm:text-sm">
                   Ожидание ставки
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* =========================================
          РЕЖИМ SWITCH 
          ========================================= */}
      {diceMode === 'switch' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 sm:p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 w-full">
          
          <div className="flex flex-col items-center justify-center min-h-[100px] mb-8 relative">
              <motion.div className={cn("text-[4rem] sm:text-[6rem] font-black tracking-tighter leading-none transition-colors", win === true ? 'text-emerald-500 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]' : win === false ? 'text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.5)]' : 'text-slate-300')}>
                {result !== null ? result.toFixed(2) : '00.00'}
              </motion.div>
          </div>

          <div className="relative pt-12 pb-12 w-full max-w-2xl mx-auto mt-4">
            <div 
              className="absolute top-1 -translate-y-full px-3 py-1 bg-slate-800 text-white font-black text-xs rounded-xl shadow-lg transition-all duration-300 ease-out pointer-events-none z-20 flex items-center justify-center"
              style={{ left: `calc(${chance}% - 22px)` }}
            >
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
              <span className="relative z-10">{chance}%</span>
            </div>

            <div className="h-3 bg-rose-500 rounded-full relative w-full overflow-hidden shadow-inner">
              <div className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-300 ease-out" style={{ width: `${chance}%` }} />
            </div>
            <input type="range" min="1" max="95" value={chance} onChange={(e) => setChance(Number(e.target.value))} className="absolute inset-x-0 top-12 w-full h-3 opacity-0 cursor-pointer z-20" />
            
            <div className="absolute top-[48px] -translate-y-1/2 w-8 h-8 bg-white border-[4px] border-slate-900 rounded-full shadow-lg pointer-events-none transition-all duration-300 ease-out z-10 flex items-center justify-center" style={{ left: `calc(${chance}% - 16px)` }}>
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
            </div>

            <motion.div
              initial={false}
              animate={{
                top: "48px",
                opacity: result !== null ? 1 : 0,
                left: result !== null ? `calc(${result}% - 10px)` : '50%'
              }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className={cn(
                "absolute -translate-y-1/2 w-5 h-5 border-[3px] border-white rounded-full shadow-md z-30 pointer-events-none flex items-center justify-center transition-colors duration-300",
                win === true ? 'bg-emerald-500' : (win === false ? 'bg-rose-500' : 'bg-slate-400')
              )}
            >
              <div className="w-1 h-1 bg-white rounded-full" />
            </motion.div>

            <div className="absolute w-full bottom-2 flex justify-between px-1 text-[10px] font-black text-slate-300 uppercase">
              <span>0</span> <span>50</span> <span>100</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 mt-6 sm:mt-8">
            
            {/* ЛЕВАЯ КОЛОНКА: СТАВКА */}
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="bg-slate-50 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-3xl border border-slate-100 focus-within:border-brand-300 transition-colors flex flex-col justify-center h-full">
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-wider">Ставка</span>
                  <span className="text-[10px] sm:text-xs font-black uppercase text-brand-500 tracking-widest bg-brand-100/50 px-2.5 py-1 rounded-lg hidden sm:block">
                    {user.balance.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center">
                  <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 mr-2 shrink-0" />
                  <input type="number" step="0.01" value={bet} onChange={e => setBet(Number(e.target.value))} className="w-full bg-transparent font-black text-slate-900 text-2xl sm:text-3xl outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 lg:flex gap-1.5 sm:gap-2 w-full">
                <button onClick={() => setBet(1)} className="order-3 lg:order-1 flex-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm">МИН</button>
                <button onClick={() => setBet(Number(Math.max(1, bet / 2).toFixed(2)))} className="order-1 lg:order-2 flex-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm">/2</button>
                <button onClick={() => setBet(Number(Math.min(user.balance, bet * 2).toFixed(2)))} className="order-2 lg:order-3 flex-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm">X2</button>
                <button onClick={() => setBet(Number(user.balance.toFixed(2)))} className="order-4 lg:order-4 flex-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm">МАКС</button>
              </div>
            </div>

            {/* ПРАВАЯ КОЛОНКА: ВЫИГРЫШ (ИЗМЕНЕНА ДЛЯ МОБИЛЬНЫХ: min-h-[70px] sm:min-h-[140px] и отступы p-3 sm:p-5) */}
            <div className="bg-emerald-50 p-3 sm:p-5 rounded-[1.5rem] sm:rounded-3xl border border-emerald-100 flex flex-col items-center justify-center text-center relative overflow-hidden h-full min-h-[70px] sm:min-h-[140px]">
              <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-emerald-500/10 rotate-12" />
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-emerald-600 tracking-widest mb-1 sm:mb-2 relative z-10 flex items-center gap-1 sm:gap-2">
                Множитель <span className="text-emerald-800 bg-emerald-200/50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg">x{multiplier}</span>
              </span>
              <span className="font-black text-emerald-600 text-3xl sm:text-4xl tracking-tight relative z-10">+{potentialWin}</span>
            </div>

          </div>

          <button onClick={() => handlePlay('under')} disabled={loading || bet > user.balance || bet <= 0} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black py-5 rounded-[1.5rem] transition-all shadow-lg shadow-brand-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
            СДЕЛАТЬ СТАВКУ
          </button>
        </motion.div>
      )}

      {/* ПЛАШКА PROVABLY FAIR (СИНИЙ ЦВЕТ) */}
      <div className="mt-auto pt-6 flex justify-center lg:justify-start">
        <div className="flex items-center gap-2 text-brand-600 text-[10px] font-black uppercase tracking-widest bg-brand-50 px-4 py-2 rounded-xl border border-brand-100">
          <ShieldCheck className="w-4 h-4" /> <span>Provably Fair</span>
        </div>
      </div>
    </div>
  );
}
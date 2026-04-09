import { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, addDoc, collection, getDocs, query, where, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Dice5, Trophy, ShieldCheck, ArrowDownCircle, ArrowUpCircle, Coins, TrendingUp, Hash } from 'lucide-react';
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

// Генератор случайного хэша
const generateMockHash = () => {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
};

// 🛠 Функция умного форматирования: отсекает длинные копейки и убирает .00 у круглых сумм
const formatBalance = (val: number) => {
  const truncated = Math.floor(val * 100) / 100; 
  const isInteger = truncated === Math.floor(truncated);
  const fixed = isInteger ? truncated.toString() : truncated.toFixed(2);
  const parts = fixed.split('.');
  const formattedInt = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.length > 1 ? `${formattedInt}.${parts[1]}` : formattedInt;
};

export default function Dice({ user }: DiceProps) {
  // === ГЛОБАЛЬНАЯ МЕХАНИКА ВВОДА ===
  const [betInput, setBetInput] = useState('10');
  const bet = parseFloat(betInput.replace(',', '.')) || 0;

  const [chance, setChance] = useState<number | string>(50);
  const parsedChance = parseFloat(String(chance).replace(',', '.')) || 50;
  const activeChance = Math.min(95, Math.max(1, parsedChance));

  const [result, setResult] = useState<number | null>(null);
  const [win, setWin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlockedAch, setUnlockedAch] = useState<string | null>(null);
  const [diceMode, setDiceMode] = useState<'classic' | 'switch'>('classic');
  const [rollId, setRollId] = useState(0);
  
  const [gameHash, setGameHash] = useState(generateMockHash());
  const isRolling = useRef(false);

  const multiplier = (100 / activeChance).toFixed(2);
  const potentialWinAmount = bet * parseFloat(multiplier);

  const handleHalfBet = () => {
    if (loading) return;
    const current = parseFloat(betInput.replace(',', '.')) || 0;
    setBetInput(Number((current / 2).toFixed(2)).toString());
  };

  const handleDoubleBet = () => {
    if (loading) return;
    const current = parseFloat(betInput.replace(',', '.')) || 0;
    setBetInput(Number((current * 2).toFixed(2)).toString());
  };

  const handlePlay = async (type: 'under' | 'over' = 'under') => {
    if (isRolling.current || bet > user.balance || bet <= 0) return;
    isRolling.current = true;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-bet)
      });
    } catch (e) {
      isRolling.current = false;
      return;
    }

    setLoading(true);

    const roll = Math.random() * 100;
    const isWin = type === 'under' ? roll <= activeChance : roll >= (100 - activeChance);
    const payout = isWin ? Number((bet * parseFloat(multiplier)).toFixed(2)) : 0;

    setResult(roll);
    setWin(isWin);
    setRollId(Date.now());
    
    setGameHash(generateMockHash());

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

      if (isWin && activeChance < 70 && bet >= 100) {
        processAch('dice_fb1', 25, a => { a.progress++; return a; }, 'Первый бросок');
        processAch('dice_fb2', 100, a => { a.progress++; return a; }, 'Первый бросок II');
        processAch('dice_fb3', 500, a => { a.progress++; return a; }, 'Первый бросок III');
      }
      processAch('dice_cat_sense', 5, a => {
        if (isWin && activeChance < 15 && bet >= 30) a.progress++; else a.progress = 0; 
        return a;
      }, 'Кошачье чутье');

      await Promise.all([
        updateDoc(doc(db, 'users', user.uid), { 
          balance: increment(payout), 
          xp: increment(bet / 10), 
          diceWinStreak: newWinStreak, 
          diceLossStreak: newLossStreak 
        }),
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
  const underTarget = Math.floor(activeChance * maxNumber);
  const overTarget = Math.ceil((100 - activeChance) * maxNumber);

  const hashBlock = (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-brand-600 text-[10px] font-black uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4" /> <span>Provably Fair</span>
        </div>
        <Hash className="w-4 h-4 text-slate-300" />
      </div>
      <div className="text-[10px] sm:text-xs font-mono text-slate-400 break-all bg-white p-2 rounded-lg border border-slate-100">
        {gameHash}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto lg:ml-0 lg:mr-auto space-y-6 pb-12 relative flex flex-col min-h-[calc(100vh-120px)]">
      
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 w-full">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            
            {/* ЛЕВАЯ КОЛОНКА */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-5">
                
                {/* БЛОК СТАВКИ */}
                <div className="flex flex-col gap-2">
                  <div className="bg-slate-50 p-3 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-100 focus-within:border-brand-300 transition-colors">
                    <div className="flex justify-between items-center mb-2 sm:mb-3">
                      <span className="text-[9px] sm:text-xs font-black uppercase text-slate-400 tracking-wider">Ставка</span>
                      <span className="text-[9px] sm:text-xs font-black uppercase text-brand-500 tracking-widest bg-brand-100/50 px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg hidden sm:block">
                        {formatBalance(user.balance)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Coins className="w-4 h-4 sm:w-6 sm:h-6 text-slate-400 mr-1 sm:mr-2 shrink-0 hidden sm:block" />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={betInput}
                        disabled={loading}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.');
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setBetInput(val);
                          }
                        }}
                        onBlur={() => {
                          if (betInput === '') return;
                          const val = parseFloat(betInput.replace(',', '.'));
                          if (isNaN(val) || val < 0) setBetInput('');
                          else setBetInput(val.toString());
                        }}
                        className="w-full bg-transparent font-black text-slate-900 text-lg sm:text-2xl outline-none disabled:opacity-50 min-w-0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 w-full">
                    <button onClick={handleHalfBet} disabled={loading} className="bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 text-[10px] font-black text-slate-500 transition-all shadow-sm disabled:opacity-50">/2</button>
                    <button onClick={handleDoubleBet} disabled={loading} className="bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 text-[10px] font-black text-slate-500 transition-all shadow-sm disabled:opacity-50">X2</button>
                    <button onClick={() => setBetInput('1')} disabled={loading} className="bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 text-[10px] font-black text-slate-500 transition-all shadow-sm disabled:opacity-50">МИН</button>
                    <button onClick={() => setBetInput(user.balance.toString())} disabled={loading} className="bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 text-[10px] font-black text-slate-500 transition-all shadow-sm disabled:opacity-50">МАКС</button>
                  </div>
                </div>

                {/* БЛОК ШАНСА */}
                <div className="flex flex-col gap-2">
                  <div className="bg-slate-50 p-3 sm:p-5 rounded-2xl sm:rounded-[1.5rem] border border-slate-100 focus-within:border-brand-300 transition-colors">
                    <div className="flex justify-between items-center mb-2 sm:mb-3">
                      <span className="text-[9px] sm:text-xs font-black uppercase text-slate-400 tracking-wider">Шанс %</span>
                      <span className="text-[9px] sm:text-xs font-black uppercase text-slate-500 tracking-widest bg-slate-200/50 px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg hidden sm:block">
                        x{multiplier}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-slate-400 mr-1 sm:mr-2 shrink-0 hidden sm:block" />
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={chance} 
                        disabled={loading} 
                        onChange={e => {
                          const val = e.target.value.replace(',', '.');
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setChance(val);
                          }
                        }}
                        onBlur={() => {
                          if (chance === '') return;
                          const val = parseFloat(String(chance).replace(',', '.'));
                          if (isNaN(val)) setChance(50);
                          else setChance(Math.min(95, Math.max(1, val)));
                        }}
                        className="w-full bg-transparent font-black text-slate-900 text-lg sm:text-2xl outline-none disabled:opacity-50 min-w-0" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 w-full">
                    <button onClick={() => setChance(Math.max(1, Number((activeChance / 2).toFixed(2))))} disabled={loading} className="bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 text-[10px] font-black text-slate-500 transition-all shadow-sm disabled:opacity-50">/2</button>
                    <button onClick={() => setChance(Math.min(95, Number((activeChance * 2).toFixed(2))))} disabled={loading} className="bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 text-[10px] font-black text-slate-500 transition-all shadow-sm disabled:opacity-50">X2</button>
                    <button onClick={() => setChance(1)} disabled={loading} className="bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 text-[10px] font-black text-slate-500 transition-all shadow-sm disabled:opacity-50">МИН</button>
                    <button onClick={() => setChance(95)} disabled={loading} className="bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 text-[10px] font-black text-slate-500 transition-all shadow-sm disabled:opacity-50">МАКС</button>
                  </div>
                </div>

              </div>

              <div className="hidden lg:block mt-auto pt-2">
                {hashBlock}
              </div>

            </div>

            {/* ПРАВАЯ КОЛОНКА */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              
              {/* Блок возможного выигрыша с красивым форматированием */}
              <div className="flex flex-col items-center justify-center py-6 sm:py-10 flex-1 relative group">
                <span className="font-black text-slate-900 text-5xl sm:text-7xl tracking-tighter z-10 transition-all duration-300 group-hover:scale-105">
                  +{formatBalance(potentialWinAmount)}
                </span>
                <span className="text-xs sm:text-sm font-black uppercase text-slate-400 tracking-widest mt-2 sm:mt-4 z-10">Возможный выигрыш</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="text-center text-xs sm:text-sm font-bold text-slate-400 pb-1">
                    0 - {underTarget}
                  </div>
                  <button onClick={() => handlePlay('under')} disabled={loading || bet > user.balance || bet <= 0} className="relative overflow-hidden bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white py-2.5 sm:py-3 px-4 rounded-[1rem] sm:rounded-[1.2rem] transition-all shadow-md shadow-brand-200 active:scale-[0.98] flex flex-row items-center justify-center gap-1.5 sm:gap-2">
                    <ArrowDownCircle className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
                    <span className="text-xs sm:text-sm font-black uppercase tracking-widest mt-0.5">Меньше</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-center text-xs sm:text-sm font-bold text-slate-400 pb-1">
                    {overTarget} - 999999
                  </div>
                  <button onClick={() => handlePlay('over')} disabled={loading || bet > user.balance || bet <= 0} className="relative overflow-hidden bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white py-2.5 sm:py-3 px-4 rounded-[1rem] sm:rounded-[1.2rem] transition-all shadow-md shadow-slate-300 active:scale-[0.98] flex flex-row items-center justify-center gap-1.5 sm:gap-2">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-widest mt-0.5">Больше</span>
                    <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
                  </button>
                </div>
              </div>

              <div className="w-full min-h-[50px] sm:min-h-[60px]">
                <AnimatePresence mode="wait">
                  {result !== null && (
                    <motion.div
                      key={rollId} 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "w-full py-3.5 sm:py-5 rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-center text-sm sm:text-base uppercase tracking-widest font-black shadow-xl text-white transition-all",
                        win ? "bg-emerald-500 shadow-emerald-200/50" : "bg-rose-500 shadow-rose-200/50"
                      )}
                    >
                      {win ? "Победа" : "Поражение"} <span className="ml-2 opacity-90">({Math.floor(result * maxNumber).toString().padStart(6, '0')})</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="block lg:hidden mt-2">
                {hashBlock}
              </div>

            </div>

          </div>
        </motion.div>
      )}

      {/* =========================================
          РЕЖИМ SWITCH 
          ========================================= */}
      {diceMode === 'switch' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 sm:p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 w-full flex flex-col">
          
          <div className="flex flex-col items-center justify-center text-center mb-6 sm:mb-8 mt-2">
            <span className="font-black text-slate-900 text-4xl sm:text-5xl tracking-tight relative z-10 mb-1">+{formatBalance(potentialWinAmount)}</span>
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400 tracking-widest relative z-10 flex items-center gap-1 sm:gap-2">
              Возможный выигрыш <span className="text-slate-800 bg-slate-100 border border-slate-200 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg">x{multiplier}</span>
            </span>
          </div>

          <div className="flex flex-col items-center justify-center min-h-[80px] mb-8 relative">
              <motion.div className={cn("text-[4rem] sm:text-[6rem] font-black tracking-tighter leading-none transition-colors", win === true ? 'text-emerald-500 drop-shadow-md' : win === false ? 'text-rose-500 drop-shadow-md' : 'text-slate-300')}>
                {result !== null ? result.toFixed(2) : '00.00'}
              </motion.div>
          </div>

          <div className="relative pt-8 pb-12 w-full max-w-2xl mx-auto mt-4">
            <div 
              className="absolute top-1 -translate-y-full px-3 py-1 bg-slate-800 text-white font-black text-xs rounded-xl shadow-lg transition-all duration-300 ease-out pointer-events-none z-20 flex items-center justify-center"
              style={{ left: `calc(${activeChance}% - 22px)` }}
            >
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
              <span className="relative z-10">{activeChance}%</span>
            </div>

            <div className="h-3 bg-rose-500 rounded-full relative w-full overflow-hidden shadow-inner">
              <div className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-300 ease-out" style={{ width: `${activeChance}%` }} />
            </div>
            <input type="range" min="1" max="95" value={activeChance} disabled={loading} onChange={(e) => setChance(Number(e.target.value))} className="absolute inset-x-0 top-8 w-full h-3 opacity-0 cursor-pointer z-20 disabled:opacity-50 disabled:cursor-not-allowed" />
            
            <div className="absolute top-[38px] -translate-y-1/2 w-8 h-8 bg-white border-[4px] border-slate-900 rounded-full shadow-lg pointer-events-none transition-all duration-300 ease-out z-10 flex items-center justify-center" style={{ left: `calc(${activeChance}% - 16px)` }}>
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
            </div>

            <motion.div
              initial={false}
              animate={{
                top: "38px",
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

          <div className="max-w-md mx-auto w-full mt-6 mb-6">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="bg-slate-50 px-4 py-2 sm:px-5 sm:py-3 rounded-[1rem] sm:rounded-[1.5rem] border border-slate-100 focus-within:border-brand-300 transition-colors flex flex-col justify-center">
                <div className="flex justify-between items-center mb-1 sm:mb-2">
                  <span className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-wider">Ставка</span>
                  <span className="text-[10px] sm:text-xs font-black uppercase text-brand-500 tracking-widest bg-brand-100/50 px-2.5 py-0.5 rounded-md">
                    {formatBalance(user.balance)}
                  </span>
                </div>
                <div className="flex items-center">
                  <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={betInput}
                    disabled={loading}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setBetInput(val);
                      }
                    }}
                    onBlur={() => {
                      if (betInput === '') return;
                      const val = parseFloat(betInput.replace(',', '.'));
                      if (isNaN(val) || val < 0) setBetInput('');
                      else setBetInput(val.toString());
                    }}
                    className="w-full bg-transparent font-black text-slate-900 text-xl sm:text-2xl outline-none disabled:opacity-50 min-w-0 text-left"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full">
                <button onClick={() => setBetInput('1')} disabled={loading} className="bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm disabled:opacity-50">МИН</button>
                <button onClick={handleHalfBet} disabled={loading} className="bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm disabled:opacity-50">/2</button>
                <button onClick={handleDoubleBet} disabled={loading} className="bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm disabled:opacity-50">X2</button>
                <button onClick={() => setBetInput(user.balance.toString())} disabled={loading} className="bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-slate-100 rounded-xl py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-slate-500 transition-all shadow-sm disabled:opacity-50">МАКС</button>
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto w-full">
            <button onClick={() => handlePlay('under')} disabled={loading || bet > user.balance || bet <= 0} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black py-5 rounded-[1.5rem] transition-all shadow-lg shadow-brand-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
              СДЕЛАТЬ СТАВКУ
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
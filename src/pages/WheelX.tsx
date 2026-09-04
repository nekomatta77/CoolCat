import { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, collection, addDoc, onSnapshot, getDoc, getDocs, query, where, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Aperture, Trophy, Users, ShieldCheck, History, Clock, ArrowRight, X, Copy, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { vpsSocket as socket } from '../lib/vpsSocket';
import ProvablyFairModal from '../components/ProvablyFairModal';

interface WheelXProps {
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
  const truncated = Math.floor(val * 100) / 100;
  const isInteger = truncated === Math.floor(truncated);
  const fixed = isInteger ? truncated.toString() : truncated.toFixed(2);
  const parts = fixed.split('.');
  const formattedInt = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.length > 1 ? `${formattedInt}.${parts[1]}` : formattedInt;
};

const WHEEL_SEGMENTS = [
  { mult: 2, color: 'bg-slate-300', hex: '#cbd5e1', weight: 30 },
  { mult: 3, color: 'bg-emerald-400', hex: '#34d399', weight: 15 },
  { mult: 5, color: 'bg-brand-500', hex: '#6366f1', weight: 8 },
  { mult: 30, color: 'bg-amber-400', hex: '#fbbf24', weight: 1 },
];

export default function WheelX({ user }: WheelXProps) {
  const [gameState, setGameState] = useState<'betting' | 'spinning' | 'finished'>('betting');
  const [timeLeft, setTimeLeft] = useState(20);
  const [history, setHistory] = useState<any[]>([]);
  const [bets, setBets] = useState<Record<string, { total: number, users: any[] }>>({
    '2': { total: 0, users: [] },
    '3': { total: 0, users: [] },
    '5': { total: 0, users: [] },
    '30': { total: 0, users: [] },
  });

  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({
    '2': '10', '3': '10', '5': '10', '30': '10'
  });

  const [wheelRotation, setWheelRotation] = useState(0);
  const [targetMultiplier, setTargetMultiplier] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unlockedAch, setUnlockedAch] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gameHash, setGameHash] = useState('');
  const [verificationData, setVerificationData] = useState({
    gameId: '---',
    hashData: {
      hash: '',
      salt1: 'Ожидание завершения...',
      number: '---',
      salt2: 'Ожидание завершения...',
      amount: 0,
      percent: 'N/A',
      result: 0
    }
  });

  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameIdRef = useRef('');

  useEffect(() => {
    socket.emit('joinWheel');

    socket.on('wheelState', (state) => {
      setGameState(state.gameState);
      setTimeLeft(state.timeLeft);
      setHistory(state.history || []);
      setGameHash(state.hash || '');
      gameIdRef.current = state.gameId || '---';

      if (state.gameState === 'betting') {
        setTargetMultiplier(null);
        setWheelRotation(0);
        setVerificationData(prev => ({
          ...prev,
          gameId: gameIdRef.current,
          hashData: {
            hash: state.hash || '',
            salt1: 'Скрыто до конца раунда',
            number: '---',
            salt2: 'Скрыто до конца раунда',
            amount: 0,
            percent: 'N/A',
            result: 0
          }
        }));
      }

      const formattedBets: Record<string, { total: number, users: any[] }> = {
        '2': { total: 0, users: [] },
        '3': { total: 0, users: [] },
        '5': { total: 0, users: [] },
        '30': { total: 0, users: [] }
      };

      if (state.bets) {
        state.bets.forEach((b: any) => {
          const mult = b.multiplier.toString();
          if (formattedBets[mult]) {
            formattedBets[mult].total += b.amount;
            formattedBets[mult].users.push(b);
          }
        });
      }
      setBets(formattedBets);
    });

    socket.on('wheelSpin', async (data: any) => {
      const result = data?.result || 2;
      const salt1 = data?.salt1 || '---';
      const salt2 = data?.salt2 || '---';
      const randomNum = data?.randomNum || 0;

      setGameState('spinning');
      setTargetMultiplier(result);
      
      const extraSpins = 5 * 360; 
      let targetDeg = 0;
      if (result === 2) targetDeg = 45;
      if (result === 3) targetDeg = 135;
      if (result === 5) targetDeg = 225;
      if (result === 30) targetDeg = 315;
      
      const offset = (Math.random() - 0.5) * 60; 
      const finalRotation = extraSpins + targetDeg + offset;
      
      setWheelRotation(finalRotation);

      setVerificationData({
        gameId: gameIdRef.current,
        hashData: {
          hash: gameHash,
          salt1: salt1,
          number: randomNum.toFixed(4),
          salt2: salt2,
          amount: 0, 
          percent: 'N/A',
          result: result
        }
      });

      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = setTimeout(async () => {
        setGameState('finished');
        
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) return;
          const uData = userDoc.data();
          
          const myBets = [2, 3, 5, 30].filter(m => 
            bets[m.toString()]?.users.some(u => u.uid === user.uid)
          );

          if (myBets.length > 0) {
            const achQuery = query(collection(db, 'achievements'), where('userId', '==', user.uid), where('category', '==', 'wheelx'));
            const achSnapshot = await getDocs(achQuery);
            const userAchs: MutableAchievement[] = achSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as MutableAchievement));

            const getAch = (type: string): MutableAchievement => {
              const existing = userAchs.find(a => a.type === type);
              return existing ? { ...existing } : { type, category: 'wheelx', progress: 0, completed: false, rewarded: false, userId: user.uid };
            };

            const updates: MutableAchievement[] = [];
            const newAchsToCreate: MutableAchievement[] = [];
            let newlyUnlocked: string | null = null;
            let currentSequence = uData.wxSequence || [];

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

            const wonAmount = myBets.includes(result) ? bets[result.toString()].users.find(u => u.uid === user.uid).amount * result : 0;
            const totalBetRound = myBets.reduce((sum, m) => sum + bets[m.toString()].users.find(u => u.uid === user.uid).amount, 0);

            if (result === 30 && myBets.includes(30) && bets['30'].users.find(u => u.uid === user.uid).amount >= 50) {
              processAch('wx_greedy', 30, a => { a.progress++; return a; }, 'Жадный');
            }
            if (myBets.length === 4 && totalBetRound >= 100) {
              processAch('wx_safe', 1, a => { a.progress = 1; return a; }, 'Надежный выигрыш');
            }
            if (wonAmount > 10000) {
              processAch('wx_more', 1, a => { a.progress = 1; return a; }, 'Мне нужно больше');
            }

            if (myBets.includes(result) && bets[result.toString()].users.find(u => u.uid === user.uid).amount >= 10) {
              if (result === 2 && currentSequence.length === 0) currentSequence = [2];
              else if (result === 3 && currentSequence.length === 1 && currentSequence[0] === 2) currentSequence.push(3);
              else if (result === 5 && currentSequence.length === 2 && currentSequence[1] === 3) currentSequence.push(5);
              else if (result === 30 && currentSequence.length === 3 && currentSequence[2] === 5) {
                currentSequence.push(30);
                processAch('wx_why_not', 1, a => { a.progress = 1; return a; }, 'Почему бы и нет?');
              } else {
                currentSequence = [];
              }
            } else {
              currentSequence = [];
            }

            await updateDoc(doc(db, 'users', user.uid), { wxSequence: currentSequence });

            if (updates.length > 0 || newAchsToCreate.length > 0) {
              await Promise.all([
                ...updates.map(ach => updateDoc(doc(db, 'achievements', ach.id as string), { progress: ach.progress, completed: ach.completed })),
                ...newAchsToCreate.map(ach => { const { id, ...data } = ach; return addDoc(collection(db, 'achievements'), data); })
              ]);
            }

            if (newlyUnlocked) {
              setUnlockedAch(newlyUnlocked);
              setTimeout(() => setUnlockedAch(null), 4000);
            }
          }
        } catch (error) {
          console.error('Achievement processing error:', error);
        }
      }, 7000); 
    });

    socket.on('wheelError', (msg) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
      setLoading(false);
    });

    return () => {
      socket.emit('leaveWheel');
      socket.off('wheelState');
      socket.off('wheelSpin');
      socket.off('wheelError');
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, [user.uid, bets, gameHash]);

  const handleBet = async (multiplier: number) => {
    if (gameState !== 'betting' || loading) return;
    
    const amountStr = betAmounts[multiplier.toString()];
    const amount = parseFloat(amountStr.replace(',', '.')) || 0;
    
    if (amount < 1) {
      setErrorMsg('Мин. ставка 1 CAT');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    if (amount > user.balance) {
      setErrorMsg('Недостаточно средств');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setLoading(true);
    socket.emit('placeWheelBet', {
      userId: user.uid,
      nickname: user.nickname,
      avatar: user.avatar,
      amount,
      multiplier
    });
    setTimeout(() => setLoading(false), 500); 
  };

  const updateBetAmount = (multiplier: number, action: 'min' | 'half' | 'double' | 'max' | string) => {
    if (gameState !== 'betting') return;
    const currentStr = betAmounts[multiplier.toString()];
    let current = parseFloat(currentStr.replace(',', '.')) || 0;
    
    if (action === 'min') current = 1;
    else if (action === 'half') current = Math.max(1, current / 2);
    else if (action === 'double') current = Math.min(user.balance, current * 2);
    else if (action === 'max') current = Math.max(1, user.balance);
    else current = parseFloat(action) || 0;

    setBetAmounts(prev => ({ ...prev, [multiplier.toString()]: Number(current.toFixed(2)).toString() }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8 pb-0 sm:pb-12 relative min-h-[calc(100vh-120px)] flex flex-col">
      <ProvablyFairModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        gameId={verificationData.gameId} 
        hashData={verificationData.hashData} 
      />

      <AnimatePresence>
        {unlockedAch && (
          <motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -50, scale: 0.9 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-100 bg-white px-6 py-4 rounded-3xl shadow-2xl border-2 border-brand-200 flex items-center gap-4 min-w-75">
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

      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -50, scale: 0.9 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-100 bg-white px-6 py-4 rounded-3xl shadow-2xl border-2 border-rose-200 flex items-center gap-4 min-w-75">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-0.5">Ошибка ставки</p>
              <p className="text-sm sm:text-base font-black text-slate-900 leading-tight">{errorMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 shrink-0 pt-4 sm:pt-0 px-4 sm:px-0">
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-brand-600 rounded-2xl lg:rounded-4xl flex items-center justify-center shadow-lg shadow-brand-200 shrink-0">
            <Aperture className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-1">WheelX</h1>
            <p className="text-slate-400 font-medium text-xs lg:text-base hidden sm:block">Делай ставки на цвета. Больше риск — больше куш!</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 flex-1 w-full">
        
        <div className="lg:w-1/3 flex flex-col gap-4 lg:gap-6 order-1">
          <div className="bg-white rounded-4xl sm:rounded-4xl p-4 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden h-55 sm:h-70 w-full shrink-0">
            <div className="absolute inset-0 bg-slate-900">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-brand-500/20 via-transparent to-transparent" />
            </div>

            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 backdrop-blur-sm">
               <Clock className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
               <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">{gameState === 'betting' ? `00:${timeLeft.toString().padStart(2, '0')}` : 'ROLL'}</span>
            </div>

            <div 
              onClick={() => setIsModalOpen(true)}
              className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl px-3 py-1.5 backdrop-blur-sm cursor-pointer transition-colors max-w-15 sm:max-w-20"
            >
               <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
               <span className="text-[10px] font-mono text-slate-300 truncate">{gameHash || '---'}</span>
            </div>
            
            <div className="relative w-full max-w-300 aspect-square flex items-center justify-center -mb-20 sm:-mb-24 mt-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-100">
                <div className="w-0 h-0 border-l-12 sm:border-l-16 border-l-transparent border-r-12 sm:border-r-16 border-r-transparent border-t-20 sm:border-t-28 border-t-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" />
              </div>

              <div className="w-full h-full rounded-full border-16 sm:border-24 border-slate-800 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-900">
                <motion.div 
                  className="w-full h-full rounded-full absolute inset-0"
                  animate={{ rotate: wheelRotation }}
                  transition={{ 
                    type: "tween", 
                    duration: gameState === 'spinning' ? 7 : 0, 
                    ease: gameState === 'spinning' ? [0.1, 0.85, 0.15, 1] : "linear" 
                  }}
                  style={{ 
                    background: 'conic-gradient(#cbd5e1 0deg 180deg, #34d399 180deg 270deg, #6366f1 270deg 315deg, #fbbf24 315deg 360deg)',
                    willChange: 'transform'
                  }}
                />
                <div className="absolute inset-10 sm:inset-12 bg-slate-900 rounded-full shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] border-4 sm:border-10 border-slate-800 flex flex-col items-center justify-center z-20">
                  <span className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-widest mt-1">Пул</span>
                  <span className="text-xl sm:text-3xl font-black text-white leading-none my-1">
                    {Object.values(bets).reduce((a,b) => a + b.total, 0).toFixed(0)}
                  </span>
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">CAT</span>
                </div>
              </div>

              <AnimatePresence>
                {gameState === 'finished' && targetMultiplier !== null && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute inset-0 z-60 flex items-center justify-center"
                  >
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-4xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-2xl flex flex-col items-center justify-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Выпало</span>
                      <span className={cn("text-3xl sm:text-4xl font-black leading-none", WHEEL_SEGMENTS.find(s => s.mult === targetMultiplier)?.color || 'text-white')}>
                        x{targetMultiplier}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-4xl border border-slate-100 shadow-xl shadow-slate-200/50 p-4 sm:p-6 w-full">
            <div className="flex items-center gap-2 mb-3 px-1">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Последние игры</h3>
            </div>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
              <AnimatePresence>
                {history.map((h, i) => {
                  const seg = WHEEL_SEGMENTS.find(s => s.mult === h) || WHEEL_SEGMENTS[0];
                  return (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} key={i} className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-sm text-slate-900", seg.color)}>
                      x{h}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {history.length === 0 && <span className="text-[10px] font-bold text-slate-400 py-3 px-2 uppercase tracking-widest">Нет игр</span>}
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 flex flex-col gap-4 sm:gap-6 order-2">
           <div className="grid grid-cols-2 gap-4 sm:gap-6">
             {WHEEL_SEGMENTS.map(seg => {
               const segmentBets = bets[seg.mult.toString()] || { total: 0, users: [] };
               return (
                 <div key={seg.mult} className="bg-white rounded-3xl sm:rounded-4xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col transition-all hover:border-slate-200">
                    <div className={cn("p-4 sm:p-5 flex items-center justify-between text-slate-900", seg.color)}>
                       <span className="font-black text-xl sm:text-3xl">x{seg.mult}</span>
                       <div className="text-right">
                         <span className="text-xs sm:text-sm font-black opacity-80 uppercase tracking-widest block mb-0.5">Банк</span>
                         <span className="text-lg sm:text-xl font-black leading-none">{segmentBets.total.toFixed(0)} <span className="text-[10px] opacity-70">CAT</span></span>
                       </div>
                    </div>
                    
                    <div className="p-4 sm:p-5 flex flex-col gap-3 bg-slate-50 border-b border-slate-100">
                       <div className="flex bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-1.5 focus-within:border-brand-300 transition-colors">
                         <input 
                           type="text" inputMode="decimal"
                           value={betAmounts[seg.mult.toString()]} 
                           onChange={(e) => updateBetAmount(seg.mult, e.target.value)}
                           disabled={gameState !== 'betting' || loading}
                           className="w-full bg-transparent text-center font-black text-slate-900 outline-none text-sm sm:text-base min-w-0"
                         />
                       </div>
                       <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                         <button onClick={() => updateBetAmount(seg.mult, 'min')} disabled={gameState !== 'betting' || loading} className="py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-[9px] sm:text-[10px] font-black text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">МИН</button>
                         <button onClick={() => updateBetAmount(seg.mult, 'half')} disabled={gameState !== 'betting' || loading} className="py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-[9px] sm:text-[10px] font-black text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">/2</button>
                         <button onClick={() => updateBetAmount(seg.mult, 'double')} disabled={gameState !== 'betting' || loading} className="py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-[9px] sm:text-[10px] font-black text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">X2</button>
                         <button onClick={() => updateBetAmount(seg.mult, 'max')} disabled={gameState !== 'betting' || loading} className="py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-[9px] sm:text-[10px] font-black text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">МАКС</button>
                       </div>
                       <button 
                         onClick={() => handleBet(seg.mult)} 
                         disabled={gameState !== 'betting' || loading || parseFloat(betAmounts[seg.mult.toString()]) < 1 || parseFloat(betAmounts[seg.mult.toString()]) > user.balance}
                         className={cn("w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all shadow-md active:scale-95 text-slate-900 disabled:opacity-50", seg.color)}
                       >
                         {gameState === 'betting' ? 'Поставить' : 'Ожидание...'}
                       </button>
                    </div>

                    <div className="flex-1 p-3 sm:p-4 bg-white max-h-40 sm:max-h-48 overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Игрок</span>
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Сумма</span>
                      </div>
                      <div className="space-y-2">
                        <AnimatePresence>
                          {segmentBets.users.map((u, i) => (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <img src={u.avatar || '/assets/avatars/ava1.webp'} className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-cover shrink-0" alt="ava" />
                                <span className="text-xs sm:text-sm font-bold text-slate-700 truncate max-w-16 sm:max-w-24">{u.nickname}</span>
                              </div>
                              <span className="text-xs sm:text-sm font-black text-slate-900 shrink-0">{u.amount.toFixed(0)}</span>
                            </motion.div>
                          ))}
                          {segmentBets.users.length === 0 && (
                            <div className="text-center py-4 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                              Нет ставок
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                 </div>
               )
             })}
           </div>
        </div>

      </div>
    </div>
  );
}
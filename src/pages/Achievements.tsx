import { useState, useEffect } from 'react';
import { UserProfile, Achievement } from '../types';
import { doc, updateDoc, getDocs, query, collection, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Dice5, Grid3X3, Layers, Coins, CheckCircle2, Lock, Star, Sparkles, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AchievementsProps {
  user: UserProfile;
}

export default function Achievements({ user }: AchievementsProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'dice', name: 'Dice', icon: Dice5, color: 'bg-brand-500' },
    { id: 'mines', name: 'Mines', icon: Grid3X3, color: 'bg-brand-400' },
    { id: 'keno', name: 'Keno', icon: Layers, color: 'bg-brand-300' },
    { id: 'jackpot', name: 'Jackpot', icon: Trophy, color: 'bg-brand-600' },
    { id: 'general', name: 'Общие', icon: Coins, color: 'bg-brand-200' },
  ];

  const achievementList = [
    { id: 'dice_100', category: 'dice', title: 'Мастер костей', desc: 'Сделайте 100 ставок в Dice', target: 100, reward: 500 },
    { id: 'mines_50', category: 'mines', title: 'Сапер-новичок', desc: 'Найдите 50 кристаллов в Mines', target: 50, reward: 300 },
    { id: 'keno_win', category: 'keno', title: 'Числовой гений', desc: 'Угадайте 5 чисел в Keno за раз', target: 5, reward: 1000 },
    { id: 'jackpot_spin', category: 'jackpot', title: 'Спиннер', desc: 'Сделайте 50 спинов в Jackpot', target: 50, reward: 500 },
    { id: 'dep_1000', category: 'general', title: 'Инвестор', desc: 'Сумма депозитов более 1000 CAT', target: 1000, reward: 2000 },
  ];

  useEffect(() => {
    const fetchAchievements = async () => {
      const q = query(collection(db, 'achievements'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      setAchievements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Achievement));
      setLoading(false);
    };
    fetchAchievements();
  }, [user.uid]);

  const handleClaim = async (achievementId: string, reward: number) => {
    const ach = achievements.find(a => a.type === achievementId);
    if (!ach || !ach.completed || ach.rewarded) return;

    try {
      await updateDoc(doc(db, 'achievements', ach.id), { rewarded: true });
      await updateDoc(doc(db, 'users', user.uid), { balance: user.balance + reward });
      setAchievements(achievements.map(a => a.id === ach.id ? { ...a, rewarded: true } : a));
    } catch (error) {
      console.error('Claim achievement error:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <header className="flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200 rotate-3">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Достижения</h1>
          <p className="text-slate-400 text-lg font-medium">Выполняйте задания и получайте награды</p>
        </div>
      </header>

      <div className="space-y-16">
        {categories.map((cat) => (
          <div key={cat.id} className="space-y-8">
            <div className="flex items-center gap-4 px-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-100", cat.color)}>
                <cat.icon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{cat.name}</h2>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievementList.filter(a => a.category === cat.id).map((item) => {
                const userAch = achievements.find(a => a.type === item.id);
                const progress = userAch ? (userAch.progress / item.target) * 100 : 0;
                const isCompleted = userAch?.completed;
                const isRewarded = userAch?.rewarded;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "bg-white p-8 rounded-[2.5rem] border transition-all duration-300 flex flex-col justify-between group relative overflow-hidden",
                      isCompleted 
                        ? "border-brand-200 shadow-xl shadow-brand-100/50" 
                        : "border-slate-100 shadow-lg shadow-slate-100/50 opacity-80"
                    )}
                  >
                    {isCompleted && !isRewarded && (
                      <div className="absolute top-0 right-0 p-4">
                        <Sparkles className="w-5 h-5 text-brand-400 animate-pulse" />
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-brand-600 transition-colors">{item.title}</h3>
                          <p className="text-slate-400 text-xs font-bold leading-relaxed">{item.desc}</p>
                        </div>
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-200"
                        )}>
                          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span>Прогресс</span>
                          <span className={cn(isCompleted ? "text-brand-600" : "text-slate-400")}>
                            {userAch?.progress || 0} / {item.target}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              isCompleted ? "bg-brand-500 shadow-sm shadow-brand-200" : "bg-slate-200"
                            )} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Coins className="w-3.5 h-3.5 text-brand-500" />
                        <span className="text-xs font-black text-slate-900">Награда: {item.reward} CAT</span>
                      </div>
                      <button
                        onClick={() => handleClaim(item.id, item.reward)}
                        disabled={!isCompleted || isRewarded}
                        className={cn(
                          "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                          isRewarded 
                            ? "bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100" 
                            : isCompleted 
                              ? "bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-200" 
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100"
                        )}
                      >
                        {isRewarded ? (
                          <>Получено <CheckCircle2 className="w-4 h-4" /></>
                        ) : isCompleted ? (
                          <>Забрать награду <ArrowRight className="w-4 h-4" /></>
                        ) : (
                          'В процессе'
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

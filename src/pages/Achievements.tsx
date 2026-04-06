import { useState, useEffect } from 'react';
import { UserProfile, Achievement } from '../types';
import { doc, updateDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Trophy, Dice5, Grid3X3, Layers, Coins, CheckCircle2, Lock, 
  Star, Sparkles, ChevronLeft, ChevronRight, Gift, ArrowRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AchievementsProps {
  user: UserProfile;
}

// Расширенный тип для локального списка достижений
interface LocalAchievement {
  id: string;
  category: 'dice' | 'mines' | 'keno' | 'jackpot' | 'general';
  title: string;
  desc: string;
  target: number;
  rewardCat: number;
  rewardXp: number;
  bonus?: string;
}

export default function Achievements({ user }: AchievementsProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  // Состояния для карусели: текущий индекс в каждой категории и направление анимации
  const [activeIndices, setActiveIndices] = useState<Record<string, number>>({
    dice: 0, mines: 0, keno: 0, jackpot: 0, general: 0
  });
  const [directions, setDirections] = useState<Record<string, number>>({});

  const categories = [
    { id: 'dice', name: 'Dice', icon: Dice5, color: 'bg-brand-500', shadow: 'shadow-brand-500/50' },
    { id: 'mines', name: 'Mines', icon: Grid3X3, color: 'bg-rose-500', shadow: 'shadow-rose-500/50' },
    { id: 'keno', name: 'Keno', icon: Layers, color: 'bg-violet-500', shadow: 'shadow-violet-500/50' },
    { id: 'jackpot', name: 'Jackpot', icon: Trophy, color: 'bg-amber-500', shadow: 'shadow-amber-500/50' },
    { id: 'general', name: 'Общие', icon: Coins, color: 'bg-emerald-500', shadow: 'shadow-emerald-500/50' },
  ] as const;

  const achievementList: LocalAchievement[] = [
    // --- DICE ---
    { id: 'dice_fb1', category: 'dice', title: 'Первый бросок', desc: 'Выиграть 25 игр (шанс <70%, ставка от 100 CAT)', target: 25, rewardCat: 10, rewardXp: 50, bonus: 'Аватар "DICE CAT"' },
    { id: 'dice_fb2', category: 'dice', title: 'Первый бросок II', desc: 'Выиграть 100 игр (шанс <70%, ставка от 100 CAT)', target: 100, rewardCat: 50, rewardXp: 250 },
    { id: 'dice_fb3', category: 'dice', title: 'Первый бросок III', desc: 'Выиграть 500 игр (шанс <70%, ставка от 100 CAT)', target: 500, rewardCat: 75, rewardXp: 500, bonus: 'Фон "DICE"' },
    { id: 'dice_cat_sense', category: 'dice', title: 'Кошачье чутье', desc: 'Выиграть 5 раз подряд (шанс <15%, ставка от 30 CAT)', target: 5, rewardCat: 1000, rewardXp: 2500, bonus: 'Рамка "DICE"' },
    { id: 'dice_sniper', category: 'dice', title: 'Снайпер', desc: 'Поймать победу на шансе 1% (ставка от 15 CAT)', target: 1, rewardCat: 300, rewardXp: 250 },
    { id: 'dice_nine_lives', category: 'dice', title: 'Девять жизней', desc: 'Выиграть после 8 поражений подряд (шанс <50%)', target: 1, rewardCat: 50, rewardXp: 100, bonus: 'Аватар "NINE LIVES"' },
    { id: 'dice_madman', category: 'dice', title: 'Безумец', desc: 'Ставка 15,000 CAT на шанс 90% и выигрыш', target: 1, rewardCat: 333, rewardXp: 999, bonus: 'Префикс "БЕЗУМИЕ"' },
    
    // --- MINES (Пока заглушки) ---
    { id: 'mines_50', category: 'mines', title: 'Сапер-новичок', desc: 'Найдите 50 кристаллов в Mines', target: 50, rewardCat: 300, rewardXp: 100 },
    
    // --- KENO (Пока заглушки) ---
    { id: 'keno_win', category: 'keno', title: 'Числовой гений', desc: 'Угадайте 5 чисел в Keno за раз', target: 5, rewardCat: 1000, rewardXp: 200 },
    
    // --- JACKPOT (Пока заглушки) ---
    { id: 'jackpot_spin', category: 'jackpot', title: 'Спиннер', desc: 'Сделайте 50 спинов в Jackpot', target: 50, rewardCat: 500, rewardXp: 150 },
    
    // --- GENERAL (Пока заглушки) ---
    { id: 'dep_1000', category: 'general', title: 'Инвестор', desc: 'Сумма депозитов более 1000 CAT', target: 1000, rewardCat: 2000, rewardXp: 500 },
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

  const handleClaim = async (item: LocalAchievement) => {
    const ach = achievements.find(a => a.type === item.id);
    if (!ach || !ach.completed || ach.rewarded) return;

    try {
      await updateDoc(doc(db, 'achievements', ach.id), { rewarded: true });
      
      // ИСПРАВЛЕНИЕ: Используем строго user.xp
      await updateDoc(doc(db, 'users', user.uid), { 
        balance: (user.balance || 0) + item.rewardCat,
        xp: (user.xp || 0) + item.rewardXp
      });
      
      setAchievements(achievements.map(a => a.id === ach.id ? { ...a, rewarded: true } : a));
    } catch (error) {
      console.error('Claim achievement error:', error);
    }
  };

  const handleNext = (categoryId: string, maxIndex: number) => {
    setDirections(prev => ({ ...prev, [categoryId]: 1 }));
    setActiveIndices(prev => ({ 
      ...prev, 
      [categoryId]: Math.min((prev[categoryId] || 0) + 1, maxIndex) 
    }));
  };

  const handlePrev = (categoryId: string) => {
    setDirections(prev => ({ ...prev, [categoryId]: -1 }));
    setActiveIndices(prev => ({ 
      ...prev, 
      [categoryId]: Math.max((prev[categoryId] || 0) - 1, 0) 
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-12 px-4 md:px-0">
      <header className="flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200 rotate-3">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">Достижения</h1>
          <p className="text-slate-400 text-sm md:text-lg font-medium">Выполняйте задания и забирайте эксклюзивные награды</p>
        </div>
      </header>

      <div className="space-y-16">
        {categories.map((cat) => {
          const catAchievements = achievementList.filter(a => a.category === cat.id);
          if (catAchievements.length === 0) return null;

          const currentIndex = activeIndices[cat.id] || 0;
          const direction = directions[cat.id] || 0;
          const item = catAchievements[currentIndex];

          const userAch = achievements.find(a => a.type === item.id);
          const progress = userAch ? (userAch.progress / item.target) * 100 : 0;
          const isCompleted = userAch?.completed || false;
          const isRewarded = userAch?.rewarded;

          return (
            <div key={cat.id} className="space-y-6">
              {/* Заголовок категории */}
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", cat.color, cat.shadow)}>
                  <cat.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{cat.name}</h2>
                <div className="flex-1 h-px bg-slate-200" />
                <div className="text-sm font-black text-slate-300">
                  {currentIndex + 1} / {catAchievements.length}
                </div>
              </div>
              
              {/* Карусель */}
              <div className="relative flex items-center justify-center pt-2">
                
                {/* Левая стрелка */}
                <button 
                  onClick={() => handlePrev(cat.id)}
                  disabled={currentIndex === 0}
                  className="absolute left-0 z-10 w-12 h-12 bg-white rounded-2xl hidden md:flex items-center justify-center shadow-lg border border-slate-100 text-slate-400 hover:text-brand-600 disabled:opacity-0 transition-all hover:scale-110 active:scale-95 -ml-6"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="w-full max-w-2xl overflow-hidden relative px-1">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={item.id}
                      custom={direction}
                      initial={{ opacity: 0, x: direction > 0 ? 50 : -50, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: direction > 0 ? -50 : 50, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        "bg-white p-6 md:p-8 rounded-[2.5rem] border-2 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden min-h-[320px]",
                        isCompleted 
                          ? "border-brand-300 shadow-2xl shadow-brand-200/50" 
                          : "border-slate-100 shadow-xl shadow-slate-200/50"
                      )}
                    >
                      {/* Свечение для выполненных */}
                      {isCompleted && (
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-brand-400 rounded-full blur-[100px] opacity-20 pointer-events-none" />
                      )}

                      {isCompleted && !isRewarded && (
                        <div className="absolute top-0 right-0 p-6">
                          <Sparkles className="w-6 h-6 text-brand-400 animate-pulse" />
                        </div>
                      )}

                      <div className="space-y-6 relative z-10">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 leading-tight">{item.title}</h3>
                            <p className="text-slate-500 text-sm font-bold leading-relaxed max-w-[85%]">{item.desc}</p>
                          </div>
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all border-2",
                            isCompleted ? "bg-emerald-50 text-emerald-500 border-emerald-100 shadow-inner" : "bg-slate-50 text-slate-300 border-transparent"
                          )}>
                            {isCompleted ? <CheckCircle2 className="w-7 h-7" /> : <Lock className="w-6 h-6" />}
                          </div>
                        </div>
                        
                        {/* Прогресс-бар */}
                        <div className="space-y-3">
                          <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                            <span>Прогресс</span>
                            <span className={cn(isCompleted ? "text-brand-600" : "text-slate-400")}>
                              {userAch?.progress || 0} / {item.target}
                            </span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(progress, 100)}%` }}
                              className={cn(
                                "absolute top-0 left-0 h-full rounded-full transition-all duration-1000",
                                isCompleted ? "bg-gradient-to-r from-brand-400 to-brand-600 shadow-sm" : "bg-slate-300"
                              )} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Блок наград */}
                      <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-6 relative z-10">
                        <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                          {item.rewardCat > 0 && (
                            <div className="bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl flex items-center gap-2">
                              <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                              <span className="text-xs font-black text-amber-700 truncate">{item.rewardCat} CAT</span>
                            </div>
                          )}
                          {item.rewardXp > 0 && (
                            <div className="bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl flex items-center gap-2">
                              <Star className="w-4 h-4 text-indigo-500 shrink-0" />
                              <span className="text-xs font-black text-indigo-700 truncate">{item.rewardXp} XP</span>
                            </div>
                          )}
                          {item.bonus && (
                            <div className="bg-fuchsia-50 border border-fuchsia-100 px-3 py-2 rounded-xl flex items-center gap-2 col-span-2">
                              <Gift className="w-4 h-4 text-fuchsia-500 shrink-0" />
                              <span className="text-xs font-black text-fuchsia-700 truncate">{item.bonus}</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleClaim(item)}
                          disabled={!isCompleted || isRewarded}
                          className={cn(
                            "w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0",
                            isRewarded 
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" 
                              : isCompleted 
                                ? "bg-brand-600 text-white hover:bg-brand-700 shadow-xl shadow-brand-200 hover:scale-105 active:scale-95" 
                                : "bg-slate-50 text-slate-400 border-2 border-slate-100 cursor-not-allowed"
                          )}
                        >
                          {isRewarded ? (
                            <>Получено <CheckCircle2 className="w-4 h-4" /></>
                          ) : isCompleted ? (
                            <>Забрать <ArrowRight className="w-4 h-4" /></>
                          ) : (
                            <><Lock className="w-4 h-4" /> В процессе</>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Правая стрелка */}
                <button 
                  onClick={() => handleNext(cat.id, catAchievements.length - 1)}
                  disabled={currentIndex === catAchievements.length - 1}
                  className="absolute right-0 z-10 w-12 h-12 bg-white rounded-2xl hidden md:flex items-center justify-center shadow-lg border border-slate-100 text-slate-400 hover:text-brand-600 disabled:opacity-0 transition-all hover:scale-110 active:scale-95 -mr-6"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
              
              {/* Мобильная навигация (кнопки под карточкой на маленьких экранах) */}
              <div className="flex md:hidden justify-center gap-4 pt-2">
                <button 
                  onClick={() => handlePrev(cat.id)}
                  disabled={currentIndex === 0}
                  className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-100 text-slate-400 disabled:opacity-30"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => handleNext(cat.id, catAchievements.length - 1)}
                  disabled={currentIndex === catAchievements.length - 1}
                  className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-100 text-slate-400 disabled:opacity-30"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Точечки навигации */}
              <div className="flex justify-center gap-2 pt-2">
                {catAchievements.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDirections(prev => ({ ...prev, [cat.id]: i > currentIndex ? 1 : -1 }));
                      setActiveIndices(prev => ({ ...prev, [cat.id]: i }));
                    }}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      currentIndex === i ? "w-6 bg-brand-500" : "w-2 bg-slate-200"
                    )}
                    aria-label={`Перейти к достижению ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { UserProfile, Achievement } from '../types';
import { doc, updateDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Trophy, Dice5, Grid3X3, Layers, Coins, CheckCircle2, Lock, 
  Star, Sparkles, ChevronLeft, ChevronRight, Gift, ArrowRight, Aperture 
} from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AchievementsProps {
  user: UserProfile;
}

interface LocalAchievement {
  id: string;
  category: 'dice' | 'mines' | 'keno' | 'wheelx' | 'jackpot' | 'general';
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

  const [activeIndices, setActiveIndices] = useState<Record<string, number>>({
    dice: 0, mines: 0, keno: 0, wheelx: 0, jackpot: 0, general: 0
  });
  const [directions, setDirections] = useState<Record<string, number>>({});

  const categories = [
    { id: 'dice', name: 'Dice', icon: Dice5, color: 'bg-brand-500', shadow: 'shadow-brand-500/50' },
    { id: 'mines', name: 'Mines', icon: Grid3X3, color: 'bg-rose-500', shadow: 'shadow-rose-500/50' },
    { id: 'keno', name: 'Keno', icon: Layers, color: 'bg-violet-500', shadow: 'shadow-violet-500/50' },
    { id: 'wheelx', name: 'WheelX', icon: Aperture, color: 'bg-pink-500', shadow: 'shadow-pink-500/50' },
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
    
    // --- MINES ---
    { id: 'mines_sapper1', category: 'mines', title: 'Кот-сапер', desc: 'Завершить игры победой 25 раз, ставка от 100 CAT', target: 25, rewardCat: 50, rewardXp: 100 },
    { id: 'mines_sapper2', category: 'mines', title: 'Кот-сапер II', desc: 'Завершить игры победой 50 раз, ставка от 100 CAT', target: 50, rewardCat: 100, rewardXp: 250 },
    { id: 'mines_sapper3', category: 'mines', title: 'Кот-сапер III', desc: 'Выиграть 100 раз (ставка от 250 CAT, от 5 мин)', target: 100, rewardCat: 150, rewardXp: 400, bonus: 'Аватар "Кот-сапёр"' },
    { id: 'mines_careful', category: 'mines', title: 'Осторожные лапки', desc: 'Выиграть 5 раз на 24 минах, ставка от 100 CAT', target: 5, rewardCat: 250, rewardXp: 100 },
    { id: 'mines_kitty1', category: 'mines', title: 'В поисках кисы', desc: 'Поймать x50 в одной игре', target: 1, rewardCat: 50, rewardXp: 10 },
    { id: 'mines_kitty2', category: 'mines', title: 'В поисках кисы II', desc: 'Поймать x100 в одной игре', target: 1, rewardCat: 100, rewardXp: 20 },
    { id: 'mines_kitty3', category: 'mines', title: 'В поисках кисы III', desc: 'Поймать x250 в одной игре', target: 1, rewardCat: 200, rewardXp: 40 },
    { id: 'mines_kitty4', category: 'mines', title: 'В поисках кисы IV', desc: 'Поймать x800 (ставка от 25 CAT)', target: 1, rewardCat: 1500, rewardXp: 10000, bonus: 'Аватар "I find"' },
    { id: 'mines_infinity1', category: 'mines', title: 'Бесконечность не предел', desc: 'Открыть все выигрышные ячейки на 2-х минах', target: 1, rewardCat: 300, rewardXp: 800 },
    { id: 'mines_infinity2', category: 'mines', title: 'Бесконечность не предел II', desc: 'Открыть все ячейки на 3-х минах (ставка от 5 CAT)', target: 1, rewardCat: 1000, rewardXp: 1500, bonus: 'Аватар "Buzz-Cat"' },
    
    // --- KENO ---
    { id: 'keno_line1', category: 'keno', title: 'Первая линия', desc: 'Сыграть 25 игр (ставка от 20 CAT)', target: 25, rewardCat: 50, rewardXp: 50 },
    { id: 'keno_line2', category: 'keno', title: 'Первая линия II', desc: 'Сыграть 50 игр (ставка от 40 CAT)', target: 50, rewardCat: 150, rewardXp: 200 },
    { id: 'keno_line3', category: 'keno', title: 'Первая линия III', desc: 'Сыграть 100 игр (ставка от 100 CAT)', target: 100, rewardCat: 300, rewardXp: 400, bonus: 'Аватар "Paw"' },
    { id: 'keno_lucky_num', category: 'keno', title: 'Счастливое число', desc: 'Выиграть 5 раз ПОДРЯД, угадав 1 из 1 числа', target: 5, rewardCat: 300, rewardXp: 500, bonus: 'Аватары "Numbers"' },
    { id: 'keno_magic', category: 'keno', title: 'Кошачья магия', desc: 'Поймать множитель x200 или выше (ставка от 50 CAT)', target: 1, rewardCat: 1500, rewardXp: 2500 },
    { id: 'keno_nostracat', category: 'keno', title: 'Ностракотус', desc: 'Угадать 10 из 10 чисел (ставка от 10 CAT)', target: 1, rewardCat: 5000, rewardXp: 10000, bonus: 'Префикс "ПРОРОК", Аватар "Magic Cat"' },
    
    // --- WHEELX ---
    { id: 'wx_greedy', category: 'wheelx', title: 'Жадный', desc: 'Поймать 30 раз коэффициент х30 (ставка от 50 CAT)', target: 30, rewardCat: 150, rewardXp: 200, bonus: 'Аватар "Моя прелесть"' },
    { id: 'wx_safe', category: 'wheelx', title: 'Надежный выигрыш', desc: 'Поставить ставку на все коэффициенты в одном раунде (от 100 CAT)', target: 1, rewardCat: 100, rewardXp: 250 },
    { id: 'wx_why_not', category: 'wheelx', title: 'Почему бы и нет?', desc: 'Поймать по очереди Х2, Х3, Х5, Х30 (ставка от 10 CAT)', target: 1, rewardCat: 200, rewardXp: 300, bonus: 'Аватар "Терпение"' },
    { id: 'wx_more', category: 'wheelx', title: 'Мне нужно больше', desc: 'Выиграть за раунд больше 10,000 CAT', target: 1, rewardCat: 300, rewardXp: 300, bonus: 'Префикс "Рука Мидаса"' },

    // --- JACKPOT ---
    { id: 'jackpot_ticket1', category: 'jackpot', title: 'Билет в высшее общество', desc: 'Сыграть 10 раз (ставка от 100 CAT)', target: 10, rewardCat: 150, rewardXp: 100 },
    { id: 'jackpot_ticket2', category: 'jackpot', title: 'Билет в высшее общество II', desc: 'Сыграть 25 раз (ставка от 250 CAT)', target: 25, rewardCat: 300, rewardXp: 200 },
    { id: 'jackpot_ticket3', category: 'jackpot', title: 'Билет в высшее общество III', desc: 'Сыграть 50 раз (ставка от 1000 CAT)', target: 50, rewardCat: 500, rewardXp: 500, bonus: 'Фон "Любимец общества"' },
    { id: 'jackpot_predator', category: 'jackpot', title: 'Азартный хищник', desc: 'Выиграть 5 раз ПОДРЯД', target: 5, rewardCat: 300, rewardXp: 250, bonus: 'Аватар "Tiger"' },
    { id: 'jackpot_big_catch', category: 'jackpot', title: 'Большой куш', desc: 'Выиграть за раз более 10,000 CAT', target: 1, rewardCat: 1000, rewardXp: 1500 },
    
    // --- GENERAL ---
    { id: 'gen_first_step', category: 'general', title: 'Первые шаги', desc: 'Сумма депозитов более 1000 CAT', target: 1000, rewardCat: 100, rewardXp: 100 },
    { id: 'gen_investor', category: 'general', title: 'Инвестор', desc: 'Сумма депозитов более 10,000 CAT', target: 10000, rewardCat: 500, rewardXp: 1000 },
    { id: 'gen_crypto_cat', category: 'general', title: 'Крипто-Кот', desc: 'Сумма депозитов более 100,000 CAT', target: 100000, rewardCat: 1000, rewardXp: 5000, bonus: 'Фон "CRYPTO"' },
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

  const handleDragEnd = (categoryId: string, maxIndex: number, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    const currentIndex = activeIndices[categoryId] || 0;
    if (info.offset.x < -swipeThreshold && currentIndex < maxIndex) {
      handleNext(categoryId, maxIndex);
    } else if (info.offset.x > swipeThreshold && currentIndex > 0) {
      handlePrev(categoryId);
    }
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
              
              <div className="relative flex items-center justify-center pt-2">
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
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(e, info) => handleDragEnd(cat.id, catAchievements.length - 1, e, info)}
                      className={cn(
                        "bg-white p-6 md:p-8 rounded-[2.5rem] border-2 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden min-h-[320px] cursor-grab active:cursor-grabbing",
                        isCompleted 
                          ? "border-brand-300 shadow-2xl shadow-brand-200/50" 
                          : "border-slate-100 shadow-xl shadow-slate-200/50"
                      )}
                    >
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

                <button 
                  onClick={() => handleNext(cat.id, catAchievements.length - 1)}
                  disabled={currentIndex === catAchievements.length - 1}
                  className="absolute right-0 z-10 w-12 h-12 bg-white rounded-2xl hidden md:flex items-center justify-center shadow-lg border border-slate-100 text-slate-400 hover:text-brand-600 disabled:opacity-0 transition-all hover:scale-110 active:scale-95 -mr-6"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
              
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
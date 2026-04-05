import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { 
  Trophy, ChevronRight, ChevronLeft, Lock, Unlock, 
  Star, Shield, Crown, Zap, Gem, Flame, Target, Gift, Coins, Loader2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RANKS = [
  { id: 1, name: 'Кот-Новичок', points: 0, reward: 0, cashback: 1, rakeback: 0.5, bonus: 'Базовая аватарка', icon: Star, color: 'text-slate-400', bg: 'bg-slate-100', border: 'border-slate-200' },
  { id: 2, name: 'Уличный Кот', points: 100, reward: 50, cashback: 2, rakeback: 1, bonus: 'Бронзовая рамка профиля', icon: Target, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
  { id: 3, name: 'Охотник', points: 500, reward: 150, cashback: 3, rakeback: 1.5, bonus: 'Эксклюзивный стикерпак в чат', icon: Target, color: 'text-orange-500', bg: 'bg-orange-100', border: 'border-orange-200' },
  { id: 4, name: 'Домашний Любимец', points: 1500, reward: 300, cashback: 4, rakeback: 2, bonus: 'Серебряная рамка', icon: Shield, color: 'text-slate-500', bg: 'bg-slate-200', border: 'border-slate-300' },
  { id: 5, name: 'Пушистик', points: 3000, reward: 600, cashback: 5, rakeback: 2.5, bonus: 'Цветной никнейм (Синий)', icon: Star, color: 'text-blue-500', bg: 'bg-blue-100', border: 'border-blue-200' },
  { id: 6, name: 'Гроза Района', points: 5000, reward: 1000, cashback: 6, rakeback: 3, bonus: 'Уникальная аватарка "Гроза"', icon: Zap, color: 'text-indigo-500', bg: 'bg-indigo-100', border: 'border-indigo-200' },
  { id: 7, name: 'Аристократ', points: 10000, reward: 2500, cashback: 7, rakeback: 4, bonus: 'Золотая рамка профиля', icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-100', border: 'border-yellow-200' },
  { id: 8, name: 'Мафиози', points: 25000, reward: 5000, cashback: 8, rakeback: 5, bonus: 'Режим "Скрытый профиль"', icon: Target, color: 'text-rose-500', bg: 'bg-rose-100', border: 'border-rose-200' },
  { id: 9, name: 'Удачливый Кот', points: 50000, reward: 12000, cashback: 9, rakeback: 6, bonus: 'Эксклюзивный фон профиля', icon: Flame, color: 'text-emerald-500', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  { id: 10, name: 'Золотые Лапки', points: 100000, reward: 25000, cashback: 10, rakeback: 7, bonus: 'Платиновая рамка', icon: Gem, color: 'text-cyan-500', bg: 'bg-cyan-100', border: 'border-cyan-200' },
  { id: 11, name: 'Бриллиантовые Усы', points: 250000, reward: 60000, cashback: 11, rakeback: 8, bonus: 'Анимированная аватарка', icon: Gem, color: 'text-violet-500', bg: 'bg-violet-100', border: 'border-violet-200' },
  { id: 12, name: 'Пантера', points: 500000, reward: 150000, cashback: 12, rakeback: 9, bonus: 'VIP Поддержка 24/7', icon: Zap, color: 'text-fuchsia-500', bg: 'bg-fuchsia-100', border: 'border-fuchsia-200' },
  { id: 13, name: 'Лев', points: 1000000, reward: 350000, cashback: 13, rakeback: 10, bonus: 'Персональный VIP-менеджер', icon: Crown, color: 'text-orange-600', bg: 'bg-orange-200', border: 'border-orange-300' },
  { id: 14, name: 'Котодракон', points: 2500000, reward: 1000000, cashback: 14, rakeback: 12, bonus: 'Светящийся анимированный никнейм', icon: Flame, color: 'text-red-600', bg: 'bg-red-200', border: 'border-red-300' },
  { id: 15, name: 'Бог Котов', points: 5000000, reward: 2500000, cashback: 15, rakeback: 15, bonus: 'Кастомный дизайн всего профиля', icon: Trophy, color: 'text-brand-500', bg: 'bg-brand-100', border: 'border-brand-200' },
];

export default function Level({ user }: { user: any }) {
  const userExp = user?.experience || 12500; 
  
  const currentRankIndex = [...RANKS].reverse().findIndex(r => userExp >= r.points);
  const actualRankIndex = currentRankIndex === -1 ? 0 : RANKS.length - 1 - currentRankIndex;
  
  const [activeIndex, setActiveIndex] = useState(actualRankIndex);
  const [direction, setDirection] = useState(0); 
  
  // Состояние для отслеживания загруженных картинок
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});

  // Фоновая предзагрузка всех картинок при монтировании компонента
  useEffect(() => {
    RANKS.forEach(rank => {
      const img = new Image();
      img.src = `/assets/ranks/cat_rank${rank.id}.webp`;
    });
  }, []);

  const handlePrev = () => {
    setDirection(-1);
    setActiveIndex(prev => Math.max(0, prev - 1));
  };
  
  const handleNext = () => {
    setDirection(1);
    setActiveIndex(prev => Math.min(RANKS.length - 1, prev + 1));
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold && activeIndex < RANKS.length - 1) {
      handleNext();
    } else if (info.offset.x > swipeThreshold && activeIndex > 0) {
      handlePrev();
    }
  };

  const activeRank = RANKS[activeIndex];
  const isUnlocked = userExp >= activeRank.points;
  const isCurrentImgLoaded = loadedImages[activeRank.id];

  const currentRankObj = RANKS[actualRankIndex];
  const nextRankObj = RANKS[actualRankIndex + 1];
  const progressPercent = nextRankObj 
    ? Math.min(100, Math.max(0, ((userExp - currentRankObj.points) / (nextRankObj.points - currentRankObj.points)) * 100))
    : 100;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <header className="flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200 rotate-3">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Система Рангов</h1>
          <p className="text-slate-400 text-lg font-medium">Играй, повышай уровень и забирай топовые награды</p>
        </div>
      </header>

      <section className="bg-white p-6 md:p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", currentRankObj.bg)}>
              <currentRankObj.icon className={cn("w-7 h-7", currentRankObj.color)} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-slate-400">Твой ранг</p>
              <h2 className="text-2xl font-black text-slate-900">{currentRankObj.name}</h2>
            </div>
          </div>
          <div className="text-center md:text-right">
             <p className="text-sm font-black uppercase tracking-widest text-slate-400">Опыт (XP)</p>
             <p className="text-2xl font-black text-brand-600">
               {userExp.toLocaleString()} <span className="text-slate-300 text-lg">/ {nextRankObj ? nextRankObj.points.toLocaleString() : 'MAX'}</span>
             </p>
          </div>
        </div>

        <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden relative">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full"
          />
        </div>
      </section>

      <section className="relative flex items-center justify-center pt-8">
        <button 
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="absolute left-0 z-10 w-14 h-14 bg-white rounded-2xl hidden md:flex items-center justify-center shadow-lg border border-slate-100 text-slate-400 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        <div className="w-full max-w-md md:max-w-xl mx-auto overflow-hidden px-2 md:px-4">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeRank.id}
              initial={{ opacity: 0, x: direction > 0 ? 50 : -50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: direction > 0 ? -50 : 50, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className={cn(
                "bg-white rounded-[3rem] border-2 shadow-2xl p-6 md:p-8 relative overflow-hidden flex flex-col cursor-grab active:cursor-grabbing",
                activeRank.border,
                isUnlocked ? "shadow-brand-200/50" : "shadow-slate-200/50"
              )}
            >
              <div className={cn("absolute -top-32 -right-32 w-80 h-80 rounded-full blur-[100px] opacity-40 pointer-events-none", activeRank.bg)} />

              <div className="relative z-10 space-y-8 flex-1 flex flex-col">
                
                {/* Блок с изображением кота */}
                <div className="relative h-56 md:h-72 w-full flex items-center justify-center">
                   
                   {/* Свечение появляется плавно вместе с картинкой */}
                   <div className={cn(
                     "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 blur-[50px] rounded-full pointer-events-none transition-opacity duration-700", 
                     activeRank.bg,
                     isCurrentImgLoaded ? "opacity-100" : "opacity-0"
                   )} />
                   
                   {/* Лоадер отображается пока картинка не загрузится */}
                   {!isCurrentImgLoaded && (
                     <Loader2 className="w-8 h-8 text-slate-300 animate-spin absolute z-0" />
                   )}

                   {/* Сама картинка */}
                   <img 
                     src={`/assets/ranks/cat_rank${activeRank.id}.webp`}
                     alt={activeRank.name}
                     onLoad={() => setLoadedImages(prev => ({ ...prev, [activeRank.id]: true }))}
                     className={cn(
                       "h-full w-auto object-contain relative z-10 drop-shadow-2xl select-none transition-all duration-500",
                       isCurrentImgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
                     )}
                     draggable="false"
                   />
                </div>

                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="flex items-center gap-2 justify-center">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{activeRank.name}</h3>
                    {!isUnlocked && <Lock className="w-6 h-6 text-slate-400" />}
                    {isUnlocked && actualRankIndex >= activeIndex && <Unlock className="w-6 h-6 text-emerald-500" />}
                  </div>
                  <p className="text-slate-400 font-bold bg-slate-50 px-4 py-1.5 rounded-xl inline-block">
                    Требуется {activeRank.points.toLocaleString()} XP
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4 mt-auto">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Кешбэк</p>
                     <p className="text-2xl font-black text-slate-900">{activeRank.cashback}%</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Рейкбек</p>
                     <p className="text-2xl font-black text-slate-900">{activeRank.rakeback}%</p>
                  </div>
                  <div className="col-span-2 bg-gradient-to-br from-brand-50 to-indigo-50 p-4 md:p-5 rounded-2xl border border-brand-100 flex items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-brand-100">
                         <Coins className="w-6 h-6 text-brand-500" />
                       </div>
                       <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Награда за уровень</p>
                         <p className="text-xl md:text-2xl font-black text-brand-600 leading-none">
                           {activeRank.reward > 0 ? `${activeRank.reward.toLocaleString()} CAT` : 'Нет'}
                         </p>
                       </div>
                     </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100">
                    <Gift className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-1">Особый Бонус</h4>
                    <p className="text-sm md:text-base text-slate-600 font-bold leading-tight">{activeRank.bonus}</p>
                  </div>
                </div>

              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <button 
          onClick={handleNext}
          disabled={activeIndex === RANKS.length - 1}
          className="absolute right-0 z-10 w-14 h-14 bg-white rounded-2xl hidden md:flex items-center justify-center shadow-lg border border-slate-100 text-slate-400 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </section>

      <div className="flex justify-center flex-wrap gap-2 pt-6 px-4">
        {RANKS.map((r, i) => (
          <button
            key={r.id}
            onClick={() => {
              setDirection(i > activeIndex ? 1 : -1);
              setActiveIndex(i);
            }}
            className={cn(
              "h-2.5 rounded-full transition-all duration-300",
              activeIndex === i ? "w-8 bg-brand-500" : "w-2.5 bg-slate-200 hover:bg-slate-300"
            )}
            aria-label={`Ранг ${r.name}`}
          />
        ))}
      </div>
    </div>
  );
}
import { UserProfile } from '../types';
import { TrendingUp, Award, Star, Zap, ShieldCheck, Cat, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LevelProps {
  user: UserProfile;
}

export default function Level({ user }: LevelProps) {
  const levels = [
    { level: 1, name: 'Котенок', xp: 0, bonus: 'Начальный ранг', icon: Star, color: 'text-brand-400' },
    { level: 5, name: 'Уличный Кот', xp: 5000, bonus: '+5% к ежедневному бонусу', icon: Zap, color: 'text-brand-500' },
    { level: 10, name: 'Домашний Любимец', xp: 20000, bonus: 'Персональная обводка профиля', icon: Award, color: 'text-brand-600' },
    { level: 25, name: 'Кот-Аристократ', xp: 100000, bonus: 'Кешбек 5% каждую неделю', icon: ShieldCheck, color: 'text-brand-700' },
    { level: 50, name: 'Король CoolCat', xp: 500000, bonus: 'Приоритетные выводы и VIP поддержка', icon: TrendingUp, color: 'text-brand-900' },
  ];

  const currentXp = user.xp;
  const nextLevelXp = user.level * 1000;
  const progress = (currentXp / nextLevelXp) * 100;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <header className="flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200 rotate-6">
          <Cat className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Уровень Котика</h1>
          <p className="text-slate-400 text-lg font-medium">Растите вместе с нами и открывайте новые возможности</p>
        </div>
      </header>

      <section className="bg-white p-8 lg:p-12 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-50/50 to-transparent opacity-50" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="w-48 h-48 bg-brand-600 rounded-[2.5rem] flex flex-col items-center justify-center text-white shadow-2xl shadow-brand-200 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Ваш уровень</p>
            <p className="text-8xl font-black leading-none">{user.level}</p>
          </div>
          <div className="flex-1 w-full space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4">
              <div className="text-center sm:text-left">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Прогресс до LVL {user.level + 1}</h3>
                <p className="text-slate-400 font-bold text-lg">{currentXp.toFixed(0)} <span className="text-slate-200 mx-1">/</span> {nextLevelXp} XP</p>
              </div>
              <div className="bg-brand-50 px-6 py-2 rounded-2xl border border-brand-100">
                <p className="text-brand-600 font-black text-2xl">{progress.toFixed(1)}%</p>
              </div>
            </div>
            <div className="w-full h-8 bg-slate-50 rounded-full border border-slate-100 overflow-hidden p-1.5 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                className="h-full bg-brand-600 rounded-full shadow-lg shadow-brand-200 relative overflow-hidden"
              >
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {levels.map((lvl, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "bg-white p-8 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden group",
              user.level >= lvl.level 
                ? "border-brand-200 shadow-xl shadow-brand-100/50" 
                : "border-slate-100 shadow-lg shadow-slate-100/50 opacity-60 grayscale-[0.5]"
            )}
          >
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500",
              user.level >= lvl.level ? "bg-brand-50 text-brand-600" : "bg-slate-50 text-slate-300",
              "group-hover:scale-110 group-hover:rotate-3"
            )}>
              <lvl.icon className="w-7 h-7" />
            </div>
            <div className="space-y-2 mb-6">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">LVL {lvl.level}: {lvl.name}</h3>
              <p className="text-slate-400 text-sm font-bold leading-relaxed">{lvl.bonus}</p>
            </div>
            <div className={cn(
              "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
              user.level >= lvl.level ? "text-emerald-500" : "text-slate-400"
            )}>
              {user.level >= lvl.level ? (
                <><CheckCircle2 className="w-4 h-4" /> Достигнуто</>
              ) : (
                <><ArrowRight className="w-4 h-4" /> Нужно {lvl.xp} XP</>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

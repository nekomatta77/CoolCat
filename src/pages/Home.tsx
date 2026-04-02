import { Link } from 'react-router-dom';
import { UserProfile } from '../types';
import { Dice5, Grid3X3, Layers, Trophy, Sparkles, Star, Zap, ChevronRight, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface HomeProps {
  user: UserProfile;
}

export default function Home({ user }: HomeProps) {
  const games = [
    { id: 'dice', name: 'Dice', icon: Dice5, color: 'bg-brand-600', path: '/dice', desc: 'Угадай число и выиграй!' },
    { id: 'mines', name: 'Mines', icon: Grid3X3, color: 'bg-brand-500', path: '/mines', desc: 'Найди сокровища котика!' },
    { id: 'keno', name: 'Keno', icon: Layers, color: 'bg-brand-400', path: '/keno', desc: 'Выбери счастливые числа!' },
    { id: 'jackpot', name: 'Jackpot', icon: Trophy, color: 'bg-brand-700', path: '/jackpot', desc: 'Сорви большой куш!' },
  ];

  return (
    <div className="space-y-8 lg:space-y-12 pb-8 lg:pb-12">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
        <div className="space-y-3 lg:space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-brand-600 font-bold text-[10px] lg:text-xs uppercase tracking-[0.2em]"
          >
            <Sparkles className="w-3 h-3 lg:w-4 lg:h-4" />
            <span>С возвращением в CoolCat</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]"
          >
            Привет, {user.nickname}!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 font-medium text-sm lg:text-xl max-w-xl"
          >
            Выберите игру и начните побеждать сегодня. Твоя удача ждет тебя!
          </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="hidden lg:flex items-center gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center group-hover:bg-brand-600 transition-colors">
            <Zap className="w-8 h-8 text-brand-600 group-hover:text-white transition-colors" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ваш текущий уровень</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-slate-900 leading-none">{user.level}</p>
              <p className="text-sm font-black text-brand-500 uppercase tracking-widest">LVL</p>
            </div>
          </div>
          <Link to="/level" className="relative z-10 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all">
            <ChevronRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {games.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Link
              to={game.path}
              className="group relative bg-white p-4 lg:p-8 rounded-[2rem] lg:rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-brand-200/50 hover:-translate-y-1 lg:hover:-translate-y-2 transition-all flex flex-col items-center text-center overflow-hidden h-full"
            >
              <div className={cn(
                "w-14 h-14 lg:w-24 lg:h-24 rounded-2xl lg:rounded-[2rem] flex items-center justify-center mb-4 lg:mb-8 shadow-xl lg:shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6",
                game.color,
                game.id === 'dice' ? "shadow-brand-200" : 
                game.id === 'mines' ? "shadow-brand-100" :
                game.id === 'keno' ? "shadow-brand-50" : "shadow-brand-300"
              )}>
                <game.icon className="w-7 h-7 lg:w-12 lg:h-12 text-white" />
              </div>
              <h3 className="text-base lg:text-2xl font-black text-slate-900 mb-1 lg:mb-3 tracking-tight">{game.name}</h3>
              <p className="text-[10px] lg:text-sm text-slate-400 font-medium leading-tight lg:leading-relaxed mb-4 lg:mb-8 px-1 lg:px-0">{game.desc}</p>
              
              <div className="mt-auto w-full py-3 lg:py-5 bg-slate-50 rounded-xl lg:rounded-2xl text-slate-600 font-black text-[10px] lg:text-xs uppercase tracking-[0.2em] group-hover:bg-brand-600 group-hover:text-white transition-all flex items-center justify-center gap-1 lg:gap-2">
                Играть <Play className="w-3 h-3 lg:w-4 lg:h-4 fill-current" />
              </div>

              <div className="absolute -right-4 -top-4 w-20 h-20 lg:-right-8 lg:-top-8 lg:w-32 lg:h-32 bg-brand-50 rounded-full blur-2xl lg:blur-3xl group-hover:bg-brand-200 transition-all opacity-50" />
            </Link>
          </motion.div>
        ))}
      </div>

      <section className="relative bg-slate-900 rounded-[2.5rem] lg:rounded-[4rem] p-6 lg:p-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-500/20 via-transparent to-transparent" />
        <div className="absolute -bottom-12 -left-12 lg:-bottom-24 lg:-left-24 w-64 h-64 lg:w-96 lg:h-96 bg-brand-600/20 rounded-full blur-[80px] lg:blur-[120px]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          <div className="flex-1 space-y-6 lg:space-y-10 text-center lg:text-left mt-4 lg:mt-0">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-400 px-4 py-2 lg:px-6 lg:py-3 rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] border border-brand-500/20">
              <Star className="w-3 h-3 lg:w-4 lg:h-4 fill-brand-400" />
              <span>Программа лояльности</span>
            </div>
            <h2 className="text-4xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter">
              Станьте Королем <br className="hidden lg:block" /> Котиков!
            </h2>
            <p className="text-slate-400 text-sm lg:text-xl leading-relaxed font-medium max-w-2xl px-2 lg:px-0">
              Повышайте свой уровень, делайте депозиты и открывайте эксклюзивные бонусы, 
              персонализированные карточки и уникальные обводки для вашего профиля.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6 justify-center lg:justify-start w-full">
              <Link to="/level" className="w-full sm:w-auto bg-brand-500 text-white px-8 py-4 lg:px-12 lg:py-6 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-sm uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl lg:shadow-2xl shadow-brand-500/40 text-center">
                Узнать больше о LVL
              </Link>
              <Link to="/bonuses" className="w-full sm:w-auto bg-white/5 text-white border border-white/10 px-8 py-4 lg:px-12 lg:py-6 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-sm uppercase tracking-widest hover:bg-white/10 transition-all text-center">
                Бонусы
              </Link>
            </div>
          </div>
          
          <div className="w-full lg:w-2/5 aspect-square bg-white/5 backdrop-blur-sm rounded-[2.5rem] lg:rounded-[4rem] flex items-center justify-center border border-white/10 relative group">
            <div className="absolute inset-0 bg-brand-500/20 blur-[60px] lg:blur-[100px] group-hover:bg-brand-500/40 transition-all" />
            <div className="relative z-10 flex flex-col items-center gap-4 lg:gap-6">
              <div className="w-24 h-24 lg:w-40 lg:h-40 bg-brand-500 rounded-[1.5rem] lg:rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-brand-500/50 animate-float">
                <Trophy className="w-12 h-12 lg:w-20 lg:h-20 text-white" />
              </div>
              <div className="text-center">
                <span className="text-white text-3xl lg:text-5xl font-black tracking-tighter block mb-1 lg:mb-2">CAT KING</span>
                <span className="text-brand-400 text-[10px] lg:text-xs font-black uppercase tracking-[0.3em]">Exclusive Rank</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
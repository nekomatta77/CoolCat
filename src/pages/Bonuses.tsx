import { useState } from 'react';
import { UserProfile, PromoCode } from '../types';
import { doc, updateDoc, getDocs, query, collection, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Gift, Zap, Coins, MessageCircle, Send, CheckCircle2, Sparkles, AlertCircle, ArrowRight, TrendingUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Оригинальная иконка VK
function VkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="512" cy="512" r="512" fill="#2787f5" />
      <path d="M585.83 271.5H438.17c-134.76 0-166.67 31.91-166.67 166.67v147.66c0 134.76 31.91 166.67 166.67 166.67h147.66c134.76 0 166.67-31.91 166.67-166.67V438.17c0-134.76-32.25-166.67-166.67-166.67zm74 343.18h-35c-13.24 0-17.31-10.52-41.07-34.62-20.71-20-29.87-22.74-35-22.74-7.13 0-9.17 2-9.17 11.88v31.57c0 8.49-2.72 13.58-25.12 13.58-37 0-78.07-22.4-106.93-64.16-43.45-61.1-55.33-116.43 0-5.09 2-9.84 11.88-9.84h35c8.83 0 12.22 4.07 15.61 13.58 17.31 49.9 46.17 93.69 58 93.69 4.41 0 6.45-2 6.45-13.24v-51.6c-1.36-23.76-13.92-25.8-13.92-34.28 0-4.07 3.39-8.15 8.83-8.15h55c7.47 0 10.18 4.07 10.18 12.9v69.58c0 7.47 3.39 10.18 5.43 10.18 4.41 0 8.15-2.72 16.29-10.86 25.12-28.17 43.11-71.62 43.11-71.62 2.38-5.09 6.45-9.84 15.28-9.84h35c10.52 0 12.9 5.43 10.52 12.9-4.41 20.37-47.18 80.79-47.18 80.79-3.73 6.11-5.09 8.83 0 15.61 3.73 5.09 16 15.61 24.1 25.12 14.94 17 26.48 31.23 29.53 41.07 3.45 9.84-1.65 14.93-11.49 14.93z" fill="#fff" />
    </svg>
  );
}

interface BonusesProps {
  user: UserProfile;
}

const giftConfig = {
  mobile: {
    size: '140px',
    x: '0px',
    y: '-10px',
    scale: 1,
  },
  desktop: {
    size: '180px',
    x: '0px',
    y: '-20px',
    scale: 1.1,
  }
};

export default function Bonuses({ user }: BonusesProps) {
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);

  const getRandomBonus = () => {
    const rand = Math.random() * 100;

    if (rand < 85) {
      return Math.floor(Math.random() * (10 - 1 + 1)) + 1;
    } else if (rand < 98) {
      return Math.floor(Math.random() * (15 - 11 + 1)) + 11;
    } else if (rand < 99.5) {
      return Math.floor(Math.random() * (50 - 16 + 1)) + 16;
    } else {
      return Math.floor(Math.random() * (100 - 51 + 1)) + 51;
    }
  };

  const handleClaimDaily = async () => {
    const now = new Date();
    const lastClaimed = user.lastDailyBonus ? new Date(user.lastDailyBonus) : null;
    
    if (lastClaimed && now.getTime() - lastClaimed.getTime() < 24 * 60 * 60 * 1000) {
      setMessage({ text: 'Вы уже получили бонус сегодня!', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null); 
    
    const bonusAmount = getRandomBonus(); 
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: user.balance + bonusAmount,
        lastDailyBonus: now.toISOString()
      });
      
      setClaimedAmount(bonusAmount);
      setShowModal(true);
      
    } catch (error) {
      console.error('Daily bonus error:', error);
      setMessage({ text: 'Произошла ошибка при получении бонуса', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePromo = async () => {
    if (!promoCode) return;
    setLoading(true);
    setMessage(null);

    try {
      const q = query(collection(db, 'promoCodes'), where('code', '==', promoCode), limit(1));
      const snap = await getDocs(q);

      if (snap.empty) {
        setMessage({ text: 'Промокод не найден', type: 'error' });
      } else {
        const promo = { id: snap.docs[0].id, ...snap.docs[0].data() } as PromoCode;
        if (promo.activations >= promo.maxActivations) {
          setMessage({ text: 'Промокод закончился', type: 'error' });
        } else {
          await updateDoc(doc(db, 'promoCodes', promo.id), { activations: promo.activations + 1 });
          await updateDoc(doc(db, 'users', user.uid), {
            balance: user.balance + promo.amount,
            wagerRequirement: user.wagerRequirement + promo.amount * promo.wager
          });
          setMessage({ text: `Промокод активирован! +${promo.amount} CAT`, type: 'success' });
          setPromoCode('');
        }
      }
    } catch (error) {
      console.error('Promo error:', error);
      setMessage({ text: 'Произошла ошибка при активации', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const bonusCards = [
    { title: 'Ежедневный бонус', desc: 'Заходите каждый день и получайте бесплатные монеты!', icon: Gift, action: handleClaimDaily, color: 'bg-brand-500' },
    { title: 'Кешбек', desc: 'Возвращаем часть проигранных средств каждую неделю.', icon: Zap, action: () => {}, color: 'bg-brand-400' },
    { title: 'Рейкбек', desc: 'Получайте процент от каждой вашей ставки.', icon: TrendingUp, action: () => {}, color: 'bg-brand-300' },
    { title: 'ВКонтакте', desc: 'Подпишитесь на нашу группу и получите 100 CAT.', icon: VkIcon, action: () => {}, color: 'bg-[#2787f5]' },
    { title: 'Telegram', desc: 'Подпишитесь на наш канал и получите 100 CAT.', icon: Send, action: () => {}, color: 'bg-sky-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <header className="flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200 -rotate-3">
          <Gift className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Бонусы Котика</h1>
          <p className="text-slate-400 text-lg font-medium">Получайте больше выгоды от игры в CoolCat Casino</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8 sticky top-24">
            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-brand-600" /> Промокод
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Введите код..."
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:border-brand-500 outline-none transition-all placeholder:text-slate-300"
                  />
                  <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-200" />
                </div>
                <button
                  onClick={handleActivatePromo}
                  disabled={loading || !promoCode}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-5 rounded-2xl transition-all shadow-lg shadow-brand-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Активировать <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "p-6 rounded-3xl text-center space-y-2 border",
                    message.type === 'success' 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                      : "bg-rose-50 text-rose-600 border-rose-100"
                  )}
                >
                  <div className="flex justify-center">
                    {message.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                  </div>
                  <p className="font-black text-sm uppercase tracking-widest">{message.text}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {bonusCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between group hover:border-brand-200 transition-all"
            >
              <div className="space-y-6">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3",
                  card.color,
                  "shadow-brand-100"
                )}>
                  <card.icon className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 group-hover:text-brand-600 transition-colors">{card.title}</h3>
                  <p className="text-slate-400 text-sm font-bold leading-relaxed">{card.desc}</p>
                </div>
              </div>
              <button
                onClick={card.action}
                disabled={loading && card.title === 'Ежедневный бонус'}
                className="mt-8 w-full py-4 bg-slate-50 rounded-2xl text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-brand-600 hover:text-white transition-all border border-slate-100 flex items-center justify-center gap-2 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Получить <ArrowRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-all -translate-x-2 group-hover/btn:translate-x-0" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm md:max-w-md bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col items-center text-center z-10 mx-4"
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-200 transition-all z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <style>{`
                .dynamic-gift-wrapper {
                  width: ${giftConfig.mobile.size};
                  height: ${giftConfig.mobile.size};
                  transform: translate(${giftConfig.mobile.x}, ${giftConfig.mobile.y}) scale(${giftConfig.mobile.scale});
                }
                @media (min-width: 768px) {
                  .dynamic-gift-wrapper {
                    width: ${giftConfig.desktop.size};
                    height: ${giftConfig.desktop.size};
                    transform: translate(${giftConfig.desktop.x}, ${giftConfig.desktop.y}) scale(${giftConfig.desktop.scale});
                  }
                }
              `}</style>

              <div className="relative w-full flex justify-center mb-6 mt-4">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-brand-300 blur-[50px] opacity-40 rounded-full"></div>
                <div className="dynamic-gift-wrapper relative z-10 transition-transform duration-300">
                  <img 
                    src="/assets/CoolCat_gift.webp" 
                    alt="Подарок" 
                    className="w-full h-full object-contain animate-float drop-shadow-2xl" 
                  />
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">Ежедневный бонус!</h2>
              <p className="text-slate-500 font-medium mb-6 text-sm md:text-base">Вы успешно забрали свою награду.</p>

              <div className="w-full bg-brand-50 border border-brand-100 rounded-2xl py-4 md:py-5 px-6 mb-6 flex items-center justify-center gap-3 shadow-inner">
                 <Coins className="w-6 h-6 md:w-8 md:h-8 text-brand-500" />
                 <span className="text-3xl md:text-4xl font-black text-brand-600">+{claimedAmount} <span className="text-xl md:text-2xl text-brand-400">CAT</span></span>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-brand-200 uppercase tracking-widest text-xs md:text-sm"
              >
                Отлично
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { UserProfile, PromoCode } from '../types';
import { doc, updateDoc, getDocs, query, collection, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Gift, Zap, Coins, MessageCircle, Send, CheckCircle2, Sparkles, AlertCircle, ArrowRight, TrendingUp, X, HelpCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Turnstile } from '@marsidev/react-turnstile'; 

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RANKS = [
  { id: 1, points: 0, minDeposit: 100, cashback: 1, rakeback: 0.05 },
  { id: 2, points: 100, minDeposit: 1000, cashback: 2, rakeback: 0.06 },
  { id: 3, points: 500, minDeposit: 2500, cashback: 3, rakeback: 0.07 },
  { id: 4, points: 1500, minDeposit: 5000, cashback: 4, rakeback: 0.08 },
  { id: 5, points: 3000, minDeposit: 10000, cashback: 5, rakeback: 0.09 },
  { id: 6, points: 5000, minDeposit: 25000, cashback: 6, rakeback: 0.10 },
  { id: 7, points: 10000, minDeposit: 50000, cashback: 7, rakeback: 0.10 },
  { id: 8, points: 25000, minDeposit: 100000, cashback: 8, rakeback: 0.11 },
  { id: 9, points: 50000, minDeposit: 250000, cashback: 9, rakeback: 0.11 },
  { id: 10, points: 100000, minDeposit: 500000, cashback: 10, rakeback: 0.11 },
  { id: 11, points: 250000, minDeposit: 1000000, cashback: 11, rakeback: 0.12 },
  { id: 12, points: 500000, minDeposit: 2500000, cashback: 12, rakeback: 0.12 },
  { id: 13, points: 1000000, minDeposit: 5000000, cashback: 13, rakeback: 0.13 },
  { id: 14, points: 2500000, minDeposit: 10000000, cashback: 14, rakeback: 0.13 },
  { id: 15, points: 5000000, minDeposit: 25000000, cashback: 15, rakeback: 0.14 },
];

function VkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M15.073 21.053c-8.47 0-13.315-5.835-13.315-15.54h4.156c0 7.375 2.923 10.415 5.143 11.041v-11.04h3.94v6.311c2.18-.24 4.568-2.585 5.35-5.328h3.945c-.538 3.51-3.21 6.066-5.112 7.15 1.902.88 4.908 3.09 5.86 7.406h-4.3c-.71-2.924-3.13-5.188-5.683-5.504v5.504h-4.084z" />
    </svg>
  );
}

interface BonusesProps {
  user: UserProfile;
}

const giftConfig = {
  mobile: { size: '140px', x: '0px', y: '-10px', scale: 1 },
  desktop: { size: '180px', x: '0px', y: '-20px', scale: 1.1 }
};

export default function Bonuses({ user }: BonusesProps) {
  const [promoCode, setPromoCode] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  // Таймер ежедневного бонуса (в миллисекундах)
  const [timeToNextBonus, setTimeToNextBonus] = useState<number | null>(null);

  useEffect(() => {
    const checkTime = () => {
      if (!user.lastDailyBonus) {
        setTimeToNextBonus(0); // Можно забирать
        return;
      }
      const lastClaimed = new Date(user.lastDailyBonus).getTime();
      const now = new Date().getTime();
      const diff = (lastClaimed + 24 * 60 * 60 * 1000) - now;
      
      if (diff > 0) {
        setTimeToNextBonus(diff);
      } else {
        setTimeToNextBonus(0);
      }
    };

    checkTime(); // Первичная проверка
    const interval = setInterval(checkTime, 1000); // Обновляем каждую секунду
    return () => clearInterval(interval);
  }, [user.lastDailyBonus]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const userExp = user?.xp || 0;
  const userDeposits = (user as any)?.totalDeposits || 0;
  let unlockedRank = RANKS[0];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (userExp >= RANKS[i].points && userDeposits >= RANKS[i].minDeposit) {
      unlockedRank = RANKS[i];
      break;
    }
  }

  const getRandomBonus = () => {
    const rand = Math.random() * 100;
    if (rand < 85) return Math.floor(Math.random() * (10 - 1 + 1)) + 1;
    else if (rand < 98) return Math.floor(Math.random() * (15 - 11 + 1)) + 11;
    else if (rand < 99.5) return Math.floor(Math.random() * (50 - 16 + 1)) + 16;
    else return Math.floor(Math.random() * (100 - 51 + 1)) + 51;
  };

  const handleClaimDaily = async () => {
    // Двойная проверка на всякий случай
    if (timeToNextBonus === null || timeToNextBonus > 0) return;

    setLoading(true);
    
    const bonusAmount = getRandomBonus(); 
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: user.balance + bonusAmount,
        lastDailyBonus: new Date().toISOString()
      });
      
      setClaimedAmount(bonusAmount);
      setShowModal(true);
      
    } catch (error) {
      console.error('Daily bonus error:', error);
      // Тихая ошибка в консоль
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePromo = async () => {
    if (!promoCode) return;
    
    if (!captchaToken) {
      setMessage({ text: 'Пожалуйста, пройдите проверку на робота', type: 'error' });
      return;
    }

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

  const secondaryBonuses = [
    { title: 'Кешбэк', desc: 'Возвращаем часть проигранных средств каждую неделю.', icon: Zap, action: () => {}, color: 'bg-brand-400', tooltip: `Ваш текущий кешбэк: ${unlockedRank.cashback}%` },
    { title: 'Рейкбек', desc: 'Получайте процент от каждой вашей ставки.', icon: TrendingUp, action: () => {}, color: 'bg-brand-300', tooltip: `Ваш текущий рейкбек: ${unlockedRank.rakeback}%` },
    { title: 'ВКонтакте', desc: 'Подпишитесь на нашу группу и получите бонус.', icon: VkIcon, action: () => {}, color: 'bg-[#2787f5]' },
    { title: 'Telegram', desc: 'Подпишитесь на канал и получите бонус.', icon: Send, action: () => {}, color: 'bg-sky-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      <header className="flex flex-col items-center text-center space-y-6 mb-4">
        <div className="w-20 h-20 bg-brand-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-200 -rotate-3">
          <Gift className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Бонусы Котика</h1>
          <p className="text-slate-400 text-lg font-medium">Получайте больше выгоды от игры в CoolCat Casino</p>
        </div>
      </header>

      {/* ВЕРХНИЙ БЛОК: ПРОМОКОД + ЕЖЕДНЕВНЫЙ БОНУС */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* КАРТОЧКА ПРОМОКОДА (СЛЕВА) */}
        <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center shrink-0">
                <MessageCircle className="w-7 h-7 text-brand-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Промокод</h3>
            </div>
            
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              Нашли секретный код в наших соцсетях? Введите его ниже и получите мгновенное зачисление CAT на ваш баланс.
            </p>

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
              
              <div className="flex justify-center w-full overflow-hidden rounded-xl">
                <Turnstile 
                  siteKey="1x00000000000000000000AA"
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                  options={{ theme: 'light' }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "p-4 rounded-2xl text-center flex items-center gap-3 justify-center",
                    message.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}
                >
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <span className="font-bold text-sm leading-tight">{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleActivatePromo}
              disabled={loading || !promoCode}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-brand-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Активировать <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>

        {/* КАРТОЧКА ЕЖЕДНЕВНОГО БОНУСА (СПРАВА) */}
        <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 group">
          {/* Свечение на фоне */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-400/10 rounded-full blur-[60px]" />
          
          <div className="flex-1 space-y-6 z-10 relative w-full text-center md:text-left">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-100 mx-auto md:mx-0">
              <Gift className="w-8 h-8 text-brand-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Ежедневный бонус</h3>
              <p className="text-slate-500 font-bold leading-relaxed text-sm max-w-sm mx-auto md:mx-0">
                Заходите каждый день и получайте бесплатные монеты на баланс! Ваша верность котикам щедро вознаграждается.
              </p>
            </div>

            <div className="pt-2 flex justify-center md:justify-start">
              {timeToNextBonus === null ? (
                 <div className="h-14 w-[240px] bg-slate-100 rounded-2xl animate-pulse" />
              ) : timeToNextBonus > 0 ? (
                 <button disabled className="w-full md:w-auto bg-slate-100 text-slate-400 font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-3 cursor-not-allowed border border-slate-200 shadow-inner">
                   <Clock className="w-5 h-5 text-slate-400" />
                   Через {formatTime(timeToNextBonus)}
                 </button>
              ) : (
                 <button 
                   onClick={handleClaimDaily} 
                   disabled={loading} 
                   className="w-full md:w-auto bg-brand-600 hover:bg-brand-700 text-white font-black py-4 px-8 rounded-2xl transition-all shadow-lg shadow-brand-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2 group/btn"
                 >
                   {loading ? (
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   ) : (
                     <>Получить награду <ArrowRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-all -translate-x-2 group-hover/btn:translate-x-0" /></>
                   )}
                 </button>
              )}
            </div>
          </div>

          {/* Иллюстрация подарка */}
          <div className="w-48 h-48 shrink-0 relative z-10 hidden md:block">
            <div className="absolute inset-0 bg-brand-300 blur-2xl opacity-30 rounded-full group-hover:scale-110 transition-transform duration-700" />
            <img 
              src="/assets/CoolCat_gift.webp" 
              alt="Подарок" 
              className="w-full h-full object-contain animate-float drop-shadow-2xl" 
            />
          </div>
        </div>
      </div>

      {/* НИЖНИЙ РЯД (МИНИ КАРТОЧКИ) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {secondaryBonuses.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40 flex flex-col justify-between group hover:border-brand-200 transition-all relative overflow-visible"
          >
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3",
                  card.color,
                  "shadow-slate-200"
                )}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Подсказки */}
                {card.tooltip && (
                  <div 
                    className="relative flex items-center"
                    onMouseEnter={() => setActiveTooltip(i)}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <button 
                      onClick={() => setActiveTooltip(activeTooltip === i ? null : i)}
                      className="outline-none"
                    >
                      <HelpCircle className="w-5 h-5 text-slate-300 hover:text-brand-500 transition-colors" />
                    </button>
                    <AnimatePresence>
                      {activeTooltip === i && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full right-0 mb-2 w-max bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg z-20 pointer-events-none"
                        >
                          {card.tooltip}
                          <div className="absolute top-full right-1.5 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 group-hover:text-brand-600 transition-colors">{card.title}</h3>
                <p className="text-slate-400 text-xs font-bold leading-relaxed">{card.desc}</p>
              </div>
            </div>

            <button
              onClick={card.action}
              className="mt-5 w-full py-3 bg-slate-50 rounded-xl text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-brand-600 hover:text-white transition-all border border-slate-100 flex items-center justify-center gap-2"
            >
              Подробнее
            </button>
          </motion.div>
        ))}
      </div>

      {/* МОДАЛКА УСПЕШНОГО ПОЛУЧЕНИЯ БОНУСА */}
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

              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">Отличный улов!</h2>
              <p className="text-slate-500 font-medium mb-6 text-sm md:text-base">Ваш ежедневный бонус успешно зачислен.</p>

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
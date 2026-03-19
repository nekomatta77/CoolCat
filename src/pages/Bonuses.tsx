import { useState } from 'react';
import { UserProfile, PromoCode } from '../types';
import { doc, updateDoc, getDocs, query, collection, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Gift, Zap, Coins, Share2, MessageCircle, Send, CheckCircle2, Sparkles, AlertCircle, ArrowRight, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BonusesProps {
  user: UserProfile;
}

export default function Bonuses({ user }: BonusesProps) {
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleClaimDaily = async () => {
    const now = new Date();
    const lastClaimed = user.lastDailyBonus ? new Date(user.lastDailyBonus) : null;
    
    if (lastClaimed && now.getTime() - lastClaimed.getTime() < 24 * 60 * 60 * 1000) {
      setMessage({ text: 'Вы уже получили бонус сегодня!', type: 'error' });
      return;
    }

    setLoading(true);
    const bonusAmount = 50 + user.level * 10;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: user.balance + bonusAmount,
        lastDailyBonus: now.toISOString()
      });
      setMessage({ text: `Вы получили ${bonusAmount} CAT!`, type: 'success' });
    } catch (error) {
      console.error('Daily bonus error:', error);
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
    } finally {
      setLoading(false);
    }
  };

  const bonusCards = [
    { title: 'Ежедневный бонус', desc: 'Заходите каждый день и получайте бесплатные монеты!', icon: Gift, action: handleClaimDaily, color: 'bg-brand-500' },
    { title: 'Кешбек', desc: 'Возвращаем часть проигранных средств каждую неделю.', icon: Zap, action: () => {}, color: 'bg-brand-400' },
    { title: 'Рейкбек', desc: 'Получайте процент от каждой вашей ставки.', icon: TrendingUp, action: () => {}, color: 'bg-brand-300' },
    { title: 'ВКонтакте', desc: 'Подпишитесь на нашу группу и получите 100 CAT.', icon: Share2, action: () => {}, color: 'bg-blue-500' },
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
                  <card.icon className="w-7 h-7 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 group-hover:text-brand-600 transition-colors">{card.title}</h3>
                  <p className="text-slate-400 text-sm font-bold leading-relaxed">{card.desc}</p>
                </div>
              </div>
              <button
                onClick={card.action}
                className="mt-8 w-full py-4 bg-slate-50 rounded-2xl text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-brand-600 hover:text-white transition-all border border-slate-100 flex items-center justify-center gap-2 group/btn"
              >
                Получить <ArrowRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-all -translate-x-2 group-hover/btn:translate-x-0" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

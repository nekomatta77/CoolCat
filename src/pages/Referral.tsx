// src/pages/Referral.tsx
import { useState } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Network, Send, Clock, Copy, TrendingUp, Users, DollarSign, Wallet, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ReferralProps {
  user: UserProfile;
}

export default function Referral({ user }: ReferralProps) {
  const [telegram, setTelegram] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const refStatus = user.referralData?.status || 'none';
  const plan = user.referralData?.plan;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegram || !source) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        referralData: {
          status: 'pending',
          telegram,
          source,
          appliedAt: new Date().toISOString(),
          balance: 0
        }
      });
    } catch (error) {
      console.error('Ошибка подачи заявки:', error);
    }
    setLoading(false);
  };

  const copyRefLink = () => {
    const link = `${window.location.origin}/?ref=${user.referralData?.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-[90rem] mx-auto space-y-6 md:space-y-8 pb-12 relative px-2 md:px-0">
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-5 lg:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl shadow-brand-200 shrink-0">
            <Network className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter">Партнерская программа</h1>
            <p className="text-slate-400 font-medium text-xs md:text-sm mt-1">
              {refStatus === 'approved' ? 'Зарабатывайте на приглашении игроков' : 'Станьте партнером CoolCat Casino'}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          
          {/* СТЕЙТ 1: ПОДАЧА ЗАЯВКИ ИЛИ ОТКЛОНЕНО */}
          {(refStatus === 'none' || refStatus === 'rejected') && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="max-w-2xl mx-auto text-center space-y-8">
                {refStatus === 'rejected' && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-2xl font-bold text-sm">Ваша предыдущая заявка была отклонена. Вы можете подать новую.</div>
                )}
                <div className="space-y-4">
                  <h2 className="text-2xl font-black text-slate-900">Заявка на партнерство</h2>
                  <p className="text-slate-500 font-medium">Опишите, откуда вы планируете привлекать игроков. Мы предлагаем индивидуальные условия по модели <span className="font-bold text-brand-500">RevShare</span>.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Telegram для связи</label>
                    <input required type="text" placeholder="@your_username" value={telegram} onChange={(e) => setTelegram(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:border-brand-500 outline-none transition-all placeholder:text-slate-300" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Где будет опубликована ссылка?</label>
                    <textarea required placeholder="Укажите ссылку на ваш канал, сайт или опишите источник трафика..." rows={4} value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:border-brand-500 outline-none transition-all placeholder:text-slate-300 resize-none" />
                  </div>
                  <button disabled={loading} type="submit" className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-brand-200 uppercase tracking-widest flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" /> {loading ? 'Отправка...' : 'Отправить заявку'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* СТЕЙТ 2: ОЖИДАНИЕ */}
          {refStatus === 'pending' && (
            <motion.div key="pending" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-10 md:p-16 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Clock className="w-10 h-10 text-brand-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 tracking-tighter">Заявка на рассмотрении</h2>
              <p className="text-slate-500 font-medium max-w-md mx-auto">Мы уже изучаем ваши источники трафика. Обычно процесс занимает от 1 до 24 часов.</p>
            </motion.div>
          )}

          {/* СТЕЙТ 3: ДАШБОРД ПАРТНЕРА */}
          {refStatus === 'approved' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Блок со ссылкой */}
              <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col lg:flex-row items-center gap-6">
                <div className="flex-1 w-full space-y-2">
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">Ваша персональная ссылка</p>
                  <div className="flex bg-slate-50 border border-slate-100 rounded-2xl p-2 items-center">
                    <span className="px-4 text-slate-600 font-bold truncate flex-1 text-sm md:text-base">
                      {window.location.origin}/?ref={user.referralData?.code}
                    </span>
                    <button onClick={copyRefLink} className="bg-brand-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-brand-600 transition-all shadow-md shadow-brand-200 flex items-center gap-2 shrink-0">
                      {copied ? <span className="text-emerald-300">Скопировано</span> : <><Copy className="w-4 h-4" /> Копировать</>}
                    </button>
                  </div>
                </div>
                
                <div className="w-full lg:w-auto bg-slate-50 rounded-2xl p-6 border border-slate-100 shrink-0 min-w-[250px]">
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Заработано</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-brand-600 tracking-tighter">{user.referralData?.balance || 0}</span>
                    <span className="text-brand-400 font-bold pb-1">CAT</span>
                  </div>
                </div>
              </div>

              {/* ДАШБОРД REVSHARE */}
              {plan === 'revshare' && (
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-6 h-6 text-brand-500" />
                    <h3 className="text-xl font-black text-slate-900">Модель RevShare</h3>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-8 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">Формула расчета прибыли:</p>
                      <p className="text-xs text-slate-500 mt-1"><span className="font-black text-brand-500">Прибыль</span> = (Депозиты – Выводы – Комиссии – Балансы) × 10%</p>
                      <p className="text-xs text-slate-500 mt-1"><span className="font-black text-brand-500">Комиссия</span> = 10% с депозитов + 10% с разницы выигрышных/проигрышных ставок</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <Wallet className="w-5 h-5 text-emerald-500 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Депозиты</p>
                      <p className="text-lg font-black text-slate-900">{user.referralData?.rsDeposits || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <DollarSign className="w-5 h-5 text-red-500 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Выводы</p>
                      <p className="text-lg font-black text-slate-900">{user.referralData?.rsWithdrawals || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <TrendingUp className="w-5 h-5 text-amber-500 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Комиссии</p>
                      <p className="text-lg font-black text-slate-900">{user.referralData?.rsCommissions || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <Users className="w-5 h-5 text-brand-500 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Балансы</p>
                      <p className="text-lg font-black text-slate-900">{user.referralData?.rsBalances || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ДАШБОРД SPECIAL (Логика оставлена на случай, если админ всё же её выдаст) */}
              {plan === 'special' && (
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50">
                  <div className="flex items-center gap-3 mb-6">
                    <Star className="w-6 h-6 text-amber-400" />
                    <h3 className="text-xl font-black text-slate-900">Особенная многоуровневая модель</h3>
                  </div>

                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-8">
                    <p className="text-sm font-bold text-amber-900">Как это работает:</p>
                    <ul className="text-xs text-amber-700 mt-2 space-y-1 font-medium">
                      <li>• <span className="font-black">Уровень 1:</span> Рефералы, приглашенные лично вами — <span className="font-black text-amber-600">10% от депозитов</span></li>
                      <li>• <span className="font-black">Уровень 2:</span> Рефералы ваших рефералов — <span className="font-black text-amber-600">3% от депозитов</span></li>
                      <li>• <span className="font-black">Уровень 3:</span> Рефералы 2-го уровня — <span className="font-black text-amber-600">2% от депозитов</span></li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tier 1 */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-amber-100 text-amber-600 font-black text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-widest">10%</div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Уровень 1</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <span className="text-sm font-bold text-slate-500">Игроков</span>
                          <span className="text-base font-black text-slate-900">{user.referralData?.spTier1Count || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-500">Доход</span>
                          <span className="text-base font-black text-emerald-600">{user.referralData?.spTier1Profit || 0} CAT</span>
                        </div>
                      </div>
                    </div>

                    {/* Tier 2 */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-slate-200 text-slate-600 font-black text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-widest">3%</div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Уровень 2</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <span className="text-sm font-bold text-slate-500">Игроков</span>
                          <span className="text-base font-black text-slate-900">{user.referralData?.spTier2Count || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-500">Доход</span>
                          <span className="text-base font-black text-emerald-600">{user.referralData?.spTier2Profit || 0} CAT</span>
                        </div>
                      </div>
                    </div>

                    {/* Tier 3 */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 font-black text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-widest">2%</div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Уровень 3</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <span className="text-sm font-bold text-slate-500">Игроков</span>
                          <span className="text-base font-black text-slate-900">{user.referralData?.spTier3Count || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-500">Доход</span>
                          <span className="text-base font-black text-emerald-600">{user.referralData?.spTier3Profit || 0} CAT</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
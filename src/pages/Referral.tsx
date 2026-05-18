// src/pages/Referral.tsx
import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
// Добавили иконки X и Activity
import { Network, Send, Clock, Copy, TrendingUp, Users, DollarSign, Wallet, Star, MessageCircle, Check, Gift, X, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReferralProps {
  user: UserProfile;
}

export default function Referral({ user }: ReferralProps) {
  const [telegram, setTelegram] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  
  const [referralsList, setReferralsList] = useState<UserProfile[]>([]);
  const [referralsCount, setReferralsCount] = useState(0);
  
  // НОВЫЙ СТЕЙТ: Хранит выбранного реферала для показа модалки
  const [selectedRef, setSelectedRef] = useState<UserProfile | null>(null);

  const refStatus = user.referralData?.status || 'none';
  const plan = user.referralData?.plan;

  const refCode = user.referralData?.code || user.uid;
  const refLink = `${window.location.origin}/?ref=${refCode}`;

  useEffect(() => {
    if (refStatus === 'approved') {
      const fetchReferrals = async () => {
        try {
          const q = query(collection(db, 'users'), where('invitedBy', '==', refCode));
          const snapshot = await getDocs(q);
          const refs: UserProfile[] = [];
          snapshot.forEach((doc) => {
            refs.push(doc.data() as UserProfile);
          });
          setReferralsList(refs);
          setReferralsCount(refs.length);
        } catch (error) {
          console.error("Ошибка загрузки рефералов:", error);
        }
      };
      fetchReferrals();
    }
  }, [refStatus, refCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegram || !source) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        referralData: { status: 'pending', telegram, source, appliedAt: new Date().toISOString(), balance: 0 }
      });
    } catch (error) { console.error('Ошибка подачи заявки:', error); }
    setLoading(false);
  };

  const copyRefLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = async () => {
    const earnings = user.referralData?.balance || 0;
    if (earnings <= 0 || claiming) return;
    setClaiming(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(earnings),
        'referralData.balance': 0
      });
    } catch (error) { console.error("Ошибка при выводе средств:", error); } 
    finally { setClaiming(false); }
  };

  // Предотвращаем скролл страницы, когда открыта модалка
  useEffect(() => {
    if (selectedRef) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedRef]);

  return (
    <div className="max-w-[90rem] mx-auto space-y-6 md:space-y-8 pb-12 relative px-2 md:px-0">
      
      {/* КРАСИВЫЙ ХЕДЕР ПАРТНЕРКИ */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-5 lg:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl shadow-brand-200 shrink-0">
            <Network className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter">Партнерская программа</h1>
            <p className="text-slate-400 font-medium text-xs md:text-sm mt-1">
              {refStatus === 'approved' ? 'Управляйте своей партнерской сетью' : 'Станьте партнером CoolCat Casino'}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          
          {(refStatus === 'none' || refStatus === 'rejected') && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="max-w-2xl mx-auto text-center space-y-8">
                {refStatus === 'rejected' && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-2xl font-bold text-sm">Ваша предыдущая заявка была отклонена. Вы можете подать новую.</div>
                )}
                <div className="space-y-4">
                  <h2 className="text-2xl font-black text-slate-900">Заявка на партнерство</h2>
                  <p className="text-slate-500 font-medium">Опишите, откуда вы планируете привлекать игроков. Мы предлагаем индивидуальные условия сотрудничества.</p>
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

          {refStatus === 'disabled' && (
             <motion.div key="disabled" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 md:p-16 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-red-100"><Network className="w-10 h-10" /></div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 tracking-tighter">Реферальная система отключена</h2>
                <p className="text-slate-500 font-medium max-w-md mx-auto mb-8 leading-relaxed">На данный момент вам отключили реферальную систему. Обратитесь в поддержку.</p>
                <a href="https://t.me/coolcat_support" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-brand-200 group"><MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" /> Поддержка в Telegram</a>
             </motion.div>
          )}

          {refStatus === 'pending' && (
            <motion.div key="pending" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-10 md:p-16 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mb-6 animate-pulse"><Clock className="w-10 h-10 text-brand-500" /></div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 tracking-tighter">Заявка на рассмотрении</h2>
              <p className="text-slate-500 font-medium max-w-md mx-auto">Мы изучаем ваши источники трафика. Обычно процесс занимает до 24 часов.</p>
            </motion.div>
          )}

          {refStatus === 'approved' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col lg:flex-row gap-6">
                
                {/* Ссылка */}
                <div className="flex-1 w-full flex flex-col justify-center gap-3 lg:pr-6">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Ваша персональная ссылка</p>
                  <div className="flex bg-slate-50 border border-slate-100 rounded-2xl p-2 items-center">
                    <span className="px-4 text-slate-600 font-bold truncate flex-1 text-sm md:text-base select-all">{refLink}</span>
                    <button onClick={copyRefLink} className="bg-brand-500 text-white px-5 py-3 md:px-6 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-brand-600 transition-all shadow-md shadow-brand-200 flex items-center gap-2 shrink-0 active:scale-95">
                      {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      <span className="hidden sm:block">{copied ? 'Скопировано' : 'Копировать'}</span>
                    </button>
                  </div>
                </div>
                
                {/* Стата и вывод */}
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto shrink-0">
                  <div className="bg-slate-50 rounded-[1.5rem] lg:rounded-[2.5rem] p-6 lg:p-10 border border-slate-100 flex-1 min-w-[140px] lg:min-w-[200px] flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-brand-100 rounded-full blur-2xl opacity-50" />
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Рефералов</p>
                    <div className="flex items-end gap-2 relative z-10">
                      <span className="text-4xl lg:text-6xl font-black text-slate-700 tracking-tighter leading-none">{referralsCount}</span>
                      <Users className="w-5 h-5 lg:w-8 lg:h-8 text-slate-400 pb-1 lg:pb-2" />
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[1.5rem] lg:rounded-[2.5rem] p-6 lg:p-10 flex-1 min-w-[200px] lg:min-w-[360px] flex flex-col justify-between relative overflow-hidden shadow-2xl shadow-slate-900/20 group">
                    <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-all duration-500" />
                    <div className="relative z-10 mb-8">
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 mb-2 lg:mb-3">Доступно для снятия</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl lg:text-6xl font-black text-white tracking-tighter leading-none">{(user.referralData?.balance || 0).toFixed(2)}</span>
                        <span className="text-emerald-400 font-black text-sm lg:text-xl">CAT</span>
                      </div>
                    </div>
                    <button onClick={handleClaim} disabled={claiming || (user.referralData?.balance || 0) <= 0} className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white font-black text-sm lg:text-base py-4 lg:py-5 rounded-xl lg:rounded-2xl uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-3 relative z-10">
                      {claiming ? 'Перевод...' : <><Gift className="w-5 h-5 lg:w-6 lg:h-6" /> Забрать на баланс</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* СПИСОК РЕФЕРАЛОВ (Теперь кликабельный) */}
              <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6 text-brand-500" />
                  <h3 className="text-xl font-black text-slate-900">Список ваших игроков</h3>
                </div>
                
                {referralsList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {referralsList.map((refUser) => (
                      <div 
                        key={refUser.uid} 
                        onClick={() => setSelectedRef(refUser)}
                        className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-4 hover:border-brand-300 hover:bg-brand-50 transition-all cursor-pointer active:scale-95 group shadow-sm"
                      >
                        <img src={refUser.avatar || '/assets/avatars/ava1.webp'} alt="avatar" className="w-12 h-12 rounded-full bg-slate-200 shadow-sm group-hover:scale-105 transition-transform" />
                        <div className="flex-1">
                          <p className="font-black text-slate-900 leading-tight group-hover:text-brand-600 transition-colors">{refUser.nickname}</p>
                          <p className="text-xs font-bold text-brand-500 mt-0.5">Уровень {refUser.level}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-brand-500 transition-colors">
                           <Activity className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    <p className="text-slate-400 font-medium">У вас пока нет приглашенных игроков.</p>
                  </div>
                )}
              </div>

              {/* Модели RevShare / Special */}
              {plan === 'revshare' && (
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-6 h-6 text-brand-500" />
                    <h3 className="text-xl font-black text-slate-900">Модель RevShare</h3>
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

              {plan === 'special' && (
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50">
                  <div className="flex items-center gap-3 mb-6">
                    <Star className="w-6 h-6 text-amber-400" />
                    <h3 className="text-xl font-black text-slate-900">Особенная модель</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* МОДАЛЬНОЕ ОКНО СТАТИСТИКИ РЕФЕРАЛА */}
      <AnimatePresence>
        {selectedRef && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setSelectedRef(null)} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white w-full max-w-sm md:max-w-md rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col z-10"
            >
              {/* Шапка модалки (Цветной фон) */}
              <div className="h-28 md:h-32 bg-gradient-to-br from-brand-400 to-brand-600 relative flex items-center justify-center">
                 <button 
                   onClick={() => setSelectedRef(null)} 
                   className="absolute top-4 right-4 w-8 h-8 bg-black/20 hover:bg-black/30 text-white rounded-full flex items-center justify-center transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              {/* Аватар и Основная информация */}
              <div className="px-6 pb-8 pt-0 flex flex-col items-center -mt-12 md:-mt-14 relative z-10">
                 <img 
                   src={selectedRef.avatar || '/assets/avatars/ava1.webp'} 
                   className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-lg bg-slate-200 mb-3 object-cover" 
                   alt="avatar" 
                 />
                 <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight text-center">{selectedRef.nickname}</h3>
                 
                 <div className="flex gap-2 mt-2">
                   <span className="px-3 py-1 bg-brand-50 text-brand-600 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm">
                     Уровень {selectedRef.level}
                   </span>
                   {selectedRef.rank === 'admin' && (
                     <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm">
                       {selectedRef.rank}
                     </span>
                   )}
                 </div>

                 {/* Плитки со статистикой */}
                 <div className="w-full mt-8 grid grid-cols-2 gap-3">
                   
                   <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center shadow-inner">
                      <Wallet className="w-6 h-6 md:w-7 md:h-7 text-emerald-500 mb-2 drop-shadow-sm" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Сумма депозитов</span>
                      <span className="text-lg md:text-xl font-black text-slate-900">{selectedRef.totalDeposits || 0} ₽</span>
                   </div>
                   
                   <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center shadow-inner">
                      <DollarSign className="w-6 h-6 md:w-7 md:h-7 text-rose-500 mb-2 drop-shadow-sm" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Сумма выводов</span>
                      <span className="text-lg md:text-xl font-black text-slate-900">{selectedRef.totalWithdrawals || 0} ₽</span>
                   </div>
                   
                   <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 flex flex-col items-center text-center col-span-2 shadow-lg">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Текущий баланс</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl md:text-3xl font-black text-white">{selectedRef.balance?.toFixed(2) || 0}</span>
                        <span className="text-brand-400 font-bold text-sm">CAT</span>
                      </div>
                   </div>

                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
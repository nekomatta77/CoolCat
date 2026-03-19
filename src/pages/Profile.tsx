import { useState } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Settings, Shield, LogOut, Camera, Palette, Box, CheckCircle2, Trophy, Coins, Wallet, CreditCard, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProfileProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function Profile({ user, onLogout }: ProfileProps) {
  const [nickname, setNickname] = useState(user.nickname);
  const [avatar, setAvatar] = useState(user.avatar);
  const [cardBg, setCardBg] = useState(user.cardStyle.background);
  const [cardBorder, setCardBorder] = useState(user.cardStyle.border);
  const [cardColor, setCardColor] = useState(user.cardStyle.color);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        nickname,
        avatar,
        cardStyle: {
          ...user.cardStyle,
          background: cardBg,
          border: cardBorder,
          color: cardColor
        }
      });
    } catch (error) {
      console.error('Save profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const colors = ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b', '#10b981', '#059669', '#047857', '#ef4444', '#dc2626', '#b91c1c'];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <header className="flex flex-col md:flex-row items-center gap-8 bg-white p-8 lg:p-12 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-50/50 to-transparent opacity-50" />
        
        <div className="relative z-10 w-32 h-32 lg:w-40 lg:h-40 rounded-[2.5rem] overflow-hidden border-4 border-brand-600 shadow-2xl shadow-brand-200">
          <img src={user.avatar} alt={user.nickname} className="w-full h-full object-cover" />
          <button className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-all">
            <Camera className="w-8 h-8 text-white" />
          </button>
        </div>

        <div className="relative z-10 flex-1 space-y-4 text-center md:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Trophy className="w-4 h-4 text-brand-500" />
              <p className="text-xs font-black uppercase tracking-widest text-brand-400">Ранг: {user.rank}</p>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter">{user.nickname}</h1>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Отыгрыш</p>
              <p className="text-xl font-black text-slate-900">{user.wagerRequirement.toFixed(0)} CAT</p>
            </div>
            <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Профит</p>
              <p className="text-xl font-black text-emerald-600">{(user.totalDeposits - user.totalWithdrawals).toFixed(0)} CAT</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Palette className="w-6 h-6 text-brand-600" /> Кастомизация
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Никнейм</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:border-brand-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">URL Аватарки</label>
                  <input
                    type="text"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:border-brand-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Цвет фона</label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(c => (
                      <button
                        key={c}
                        onClick={() => setCardBg(c)}
                        className={cn(
                          "w-8 h-8 rounded-lg border-2 transition-all",
                          cardBg === c ? "border-brand-600 scale-110 shadow-lg" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Цвет обводки</label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(c => (
                      <button
                        key={c}
                        onClick={() => setCardBorder(c)}
                        className={cn(
                          "w-8 h-8 rounded-lg border-2 transition-all",
                          cardBorder === c ? "border-brand-600 scale-110 shadow-lg" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-5 rounded-2xl transition-all shadow-lg shadow-brand-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><CheckCircle2 className="w-5 h-5" /> Сохранить изменения</>
              )}
            </button>
          </section>

          <section id="settings" className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Settings className="w-6 h-6 text-brand-600" /> Настройки
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Безопасность</h3>
                <button className="w-full text-left px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-900 hover:bg-slate-100 transition-all border border-slate-100 flex items-center justify-between group">
                  Сменить пароль 
                  <Shield className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                </button>
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Финансы</h3>
                <button className="w-full text-left px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-900 hover:bg-slate-100 transition-all border border-slate-100 flex items-center justify-between group">
                  История транзакций
                  <Wallet className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                </button>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50">
              <button
                onClick={onLogout}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
              >
                <LogOut className="w-5 h-5" /> Выйти из аккаунта
              </button>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="sticky top-24 space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-4">Предпросмотр</h3>
              <div
                className="p-8 rounded-[2.5rem] border-4 shadow-2xl space-y-6 transition-all duration-500"
                style={{ backgroundColor: cardBg, borderColor: cardBorder, color: cardColor }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-current/20">
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-xl font-black leading-none mb-1">{nickname}</p>
                    <p className="text-[10px] uppercase tracking-widest font-black opacity-60">LVL {user.level} • {user.rank}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-2 bg-current/10 rounded-full overflow-hidden">
                    <div className="h-full bg-current/40 rounded-full" style={{ width: '65%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                    <span>Прогресс</span>
                    <span>65%</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-current/10 flex justify-between items-center">
                  <div className="w-8 h-8 bg-current/10 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest">CoolCat Elite</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Быстрые действия</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-200 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                      <Coins className="w-5 h-5 text-brand-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">Пополнить</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-all" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-200 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">Вывести</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-all" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { User, Settings, Shield, LogOut, Camera, Palette, CheckCircle2, Trophy, Wallet, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// 🎨 НАСТРОЙКА АВАТАРОК
// ============================================================================
const DEFAULT_AVATARS = [
  '/assets/avatars/ava1.webp',
  '/assets/avatars/ava2.webp',
  '/assets/avatars/ava3.webp',
];

const ACHIEVEMENT_AVATARS = [
  { id: '/assets/avatars/dice_ava1.webp', hint: 'Достижение Dice' },
  { id: '/assets/avatars/mines_ava1.webp', hint: 'Достижение Mines' },
  { id: '/assets/avatars/keno_ava1.webp', hint: 'Достижение Keno' },
];

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
    if (!nickname.trim()) {
      alert('Никнейм не может быть пустым');
      return;
    }

    setLoading(true);
    try {
      // ИЗМЕНЕНИЕ: Проверка на занятость ника, если пользователь его меняет
      if (nickname.trim() !== user.nickname) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('nickname', '==', nickname.trim()));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          alert('Этот никнейм уже занят другим игроком!');
          setLoading(false);
          return;
        }
      }

      await updateDoc(doc(db, 'users', user.uid), {
        nickname: nickname.trim(),
        avatar,
        cardStyle: {
          ...user.cardStyle,
          background: cardBg,
          border: cardBorder,
          color: cardColor
        }
      });
      
      // Синхронизируем имя в Firebase Auth
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: nickname.trim() });
      }
      
      alert('Профиль успешно обновлен!');
    } catch (error) {
      console.error('Save profile error:', error);
      alert('Ошибка при сохранении профиля');
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (avId: string) => {
    if (DEFAULT_AVATARS.includes(avId)) return true;
    return user.unlockedAvatars?.includes(avId) || false;
  };

  const hasAchievementAvatars = ACHIEVEMENT_AVATARS.some(av => user.unlockedAvatars?.includes(av.id));

  const colors = ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b', '#10b981', '#059669', '#047857', '#ef4444', '#dc2626', '#b91c1c'];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <header className="flex flex-col md:flex-row items-center gap-8 bg-white p-8 lg:p-12 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-50/50 to-transparent opacity-50" />
        
        <div 
          className="relative z-10 w-32 h-32 lg:w-40 lg:h-40 rounded-[2.5rem] overflow-hidden border-4 shadow-2xl transition-colors duration-300 flex-shrink-0"
          style={{
            backgroundColor: cardBg,
            borderColor: cardBorder
          }}
        >
          <img src={avatar} alt={nickname} className="w-full h-full object-cover" />
          <button className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-all">
            <Camera className="w-8 h-8 text-white" />
          </button>
        </div>

        <div className="relative z-10 flex-1 space-y-4 text-center md:text-left w-full">
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Trophy className="w-4 h-4 text-brand-500" />
              <p className="text-xs font-black uppercase tracking-widest text-brand-400">Ранг: {user.rank}</p>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter truncate">{nickname}</h1>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch justify-center md:justify-start gap-4 w-full">
            <div className="bg-slate-50 px-6 py-4 sm:py-3 rounded-2xl border border-slate-100 w-full sm:w-auto flex flex-col items-center sm:items-start transition-all">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Отыгрыш</p>
              <p className="text-2xl sm:text-xl font-black text-slate-900 leading-none">{user.wagerRequirement.toFixed(0)} CAT</p>
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
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Никнейм</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:border-brand-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Базовые</label>
                    <div className="grid grid-cols-3 gap-3">
                      {DEFAULT_AVATARS.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setAvatar(av)}
                          className={cn(
                            "relative aspect-square rounded-2xl overflow-hidden border-4 transition-all duration-300",
                            avatar === av 
                              ? "border-brand-500 scale-105 shadow-xl shadow-brand-200 z-10" 
                              : "border-slate-900 hover:border-slate-700 hover:scale-105 hover:shadow-lg"
                          )}
                        >
                          <img src={av} alt="Avatar option" className="w-full h-full object-cover bg-white" />
                          {avatar === av && <div className="absolute inset-0 bg-brand-500/10" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasAchievementAvatars && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-brand-500 flex items-center gap-2">
                        <Trophy className="w-3 h-3" /> Эксклюзивные
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {ACHIEVEMENT_AVATARS.map((av) => {
                          const unlocked = isUnlocked(av.id);
                          return (
                            <button
                              key={av.id}
                              type="button"
                              onClick={() => unlocked && setAvatar(av.id)}
                              disabled={!unlocked}
                              title={!unlocked ? av.hint : "Выбрать аватар"}
                              className={cn(
                                "relative aspect-square rounded-2xl overflow-hidden border-4 transition-all duration-300 group",
                                unlocked && avatar === av.id 
                                  ? "border-brand-500 scale-105 shadow-xl shadow-brand-200 z-10" 
                                  : unlocked 
                                    ? "border-slate-900 hover:border-slate-700 hover:scale-105 hover:shadow-lg"
                                    : "border-slate-200 cursor-not-allowed"
                              )}
                            >
                              <img 
                                src={av.id} 
                                alt="Achievement Avatar" 
                                className={cn("w-full h-full object-cover transition-all bg-white", !unlocked && "grayscale opacity-40 blur-[2px]")} 
                              />
                              {unlocked && avatar === av.id && <div className="absolute inset-0 bg-brand-500/10" />}
                              {!unlocked && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 group-hover:bg-slate-900/60 transition-colors">
                                  <Lock className="w-5 h-5 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
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
                <div className="space-y-3">
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
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-5 rounded-2xl transition-all shadow-lg shadow-brand-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2 mt-4"
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
                    <img src={avatar} alt="" className="w-full h-full object-cover bg-white" />
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
          </div>
        </div>
      </div>
    </div>
  );
}
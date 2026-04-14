import { useState } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { 
  User, Settings, Shield, LogOut, Palette, CheckCircle2, 
  Trophy, Wallet, Lock, Image as ImageIcon, MessageSquare, Frame, Package
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AVATARS, FRAMES, PREFIXES, BACKGROUNDS, COLORS } from '../lib/customization';

interface ProfileProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function Profile({ user, onLogout }: ProfileProps) {
  const [mainTab, setMainTab] = useState<'profile' | 'inventory' | 'settings'>('inventory');
  const [invTab, setInvTab] = useState<'avatars' | 'frames' | 'backgrounds' | 'prefixes'>('avatars');
  
  const [nickname, setNickname] = useState(user.nickname);
  const [avatar, setAvatar] = useState(user.avatar);
  const [cardBg, setCardBg] = useState(user.cardStyle?.background || '#ffffff');
  const [cardBorder, setCardBorder] = useState(user.cardStyle?.border || '#6366f1');
  
  const [activeFrame, setActiveFrame] = useState(user.equippedFrame || 'none');
  const [activePrefix, setActivePrefix] = useState(user.equippedPrefix || 'none');
  const [activeBg, setActiveBg] = useState(user.equippedBg || 'default');
  
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) {
      alert('Никнейм не может быть пустым');
      return;
    }

    setLoading(true);
    try {
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
        },
        equippedFrame: activeFrame,
        equippedPrefix: activePrefix,
        equippedBg: activeBg
      });
      
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

  // ЗАГЛУШКА: Все аватары всегда доступны для тестирования
  const isAvatarUnlocked = (av: typeof AVATARS[0]) => {
    return true; 
  };

  // ЗАГЛУШКА: Все рамки, префиксы и фоны всегда доступны для тестирования
  const isItemUnlocked = (id: string, reqLevel: number, category: 'frames' | 'prefixes' | 'backgrounds', isAch?: boolean) => {
    return true; 
  };

  const activeFrameObj = FRAMES.find(f => f.id === activeFrame) || FRAMES[0];
  const activePrefixObj = PREFIXES.find(p => p.id === activePrefix);
  const activeBgObj = BACKGROUNDS.find(b => b.id === activeBg);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      
      {/* HEADER ПРОФИЛЯ */}
      <header className="flex flex-col md:flex-row items-center gap-8 bg-white p-8 lg:p-12 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        <div className={cn("absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] opacity-50 transition-colors duration-700", activeBgObj?.gradient)} />
        
        <div className="relative z-10 flex items-center justify-center">
          <div className="relative w-32 h-32 lg:w-40 lg:h-40 flex-shrink-0">
             <div 
               className={cn(
                 "absolute inset-0 rounded-[2.5rem] overflow-hidden border-4 bg-white transition-all duration-500",
                 activeFrameObj.css
               )}
               style={{ 
                 backgroundColor: cardBg, 
                 borderColor: activeFrameObj.id === 'none' ? cardBorder : undefined 
               }}
             >
               <img src={avatar} alt={nickname} className="w-full h-full object-cover" />
             </div>
             
             {activeFrameObj.img && (
               <img 
                 src={activeFrameObj.img} 
                 alt="frame" 
                 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[125%] h-[125%] object-contain pointer-events-none z-20 drop-shadow-xl" 
               />
             )}
          </div>
        </div>

        <div className="relative z-10 flex-1 space-y-4 text-center md:text-left w-full mt-4 md:mt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Trophy className="w-5 h-5 text-brand-500" />
              <p className="text-sm font-black uppercase tracking-widest text-brand-500">{user.rank} • LVL {user.level || 0}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {activePrefix !== 'none' && (
                <span className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest", activePrefixObj?.color)}>
                  {activePrefixObj?.name}
                </span>
              )}
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter truncate">{nickname}</h1>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch justify-center md:justify-start gap-4 w-full pt-2">
            <div className="bg-white/60 backdrop-blur-md px-6 py-4 sm:py-3 rounded-2xl border border-slate-200 w-full sm:w-auto flex flex-col items-center sm:items-start shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Отыгрыш</p>
              <p className="text-xl font-black text-slate-900 leading-none">{(user.wagerRequirement || 0).toFixed(0)} CAT</p>
            </div>
            <div className="bg-white/60 backdrop-blur-md px-6 py-4 sm:py-3 rounded-2xl border border-slate-200 w-full sm:w-auto flex flex-col items-center sm:items-start shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Опыт</p>
              <p className="text-xl font-black text-slate-900 leading-none">{user.xp?.toLocaleString() || 0} XP</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-2">
             <button onClick={() => setMainTab('inventory')} className={cn("flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", mainTab === 'inventory' ? "bg-brand-50 text-brand-600 shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600")}>
               <Package className="w-4 h-4" /> Инвентарь
             </button>
             <button onClick={() => setMainTab('profile')} className={cn("flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", mainTab === 'profile' ? "bg-brand-50 text-brand-600 shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600")}>
               <User className="w-4 h-4" /> Профиль
             </button>
             <button onClick={() => setMainTab('settings')} className={cn("flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", mainTab === 'settings' ? "bg-brand-50 text-brand-600 shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600")}>
               <Settings className="w-4 h-4" /> Настройки
             </button>
          </div>

          <AnimatePresence mode="wait">
            
            {mainTab === 'inventory' && (
              <motion.div key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
                
                <div className="flex overflow-x-auto pb-2 gap-2 border-b border-slate-100 scrollbar-hide">
                  {[
                    { id: 'avatars', name: 'Аватарки', icon: ImageIcon },
                    { id: 'frames', name: 'Рамки', icon: Frame },
                    { id: 'backgrounds', name: 'Фоны', icon: Palette },
                    { id: 'prefixes', name: 'Префиксы', icon: MessageSquare }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setInvTab(tab.id as any)}
                      className={cn(
                        "whitespace-nowrap px-5 py-3 rounded-t-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border-b-2",
                        invTab === tab.id ? "border-brand-500 text-brand-600 bg-brand-50/50" : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <tab.icon className="w-4 h-4" /> {tab.name}
                    </button>
                  ))}
                </div>

                <div className="min-h-[400px]">
                  
                  {invTab === 'avatars' && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {AVATARS.map((av) => {
                        const unlocked = isAvatarUnlocked(av);
                        const isEquipped = avatar === av.id;
                        return (
                          <div key={av.id} className="space-y-2">
                            <button
                              onClick={() => unlocked && setAvatar(av.id)}
                              disabled={!unlocked}
                              className={cn(
                                "relative w-full aspect-square rounded-2xl overflow-hidden border-4 transition-all duration-300 group",
                                isEquipped ? "border-brand-500 scale-105 shadow-xl shadow-brand-200 z-10" : unlocked ? "border-slate-100 hover:border-slate-300" : "border-slate-100 cursor-not-allowed"
                              )}
                            >
                              <img src={av.id} alt="Avatar" className={cn("w-full h-full object-cover bg-white transition-all", !unlocked && "grayscale opacity-30 blur-[2px]")} />
                              {isEquipped && <div className="absolute inset-0 bg-brand-500/10 flex items-end p-2"><CheckCircle2 className="w-5 h-5 text-brand-600 drop-shadow-md" /></div>}
                              {!unlocked && <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10"><Lock className="w-6 h-6 text-slate-600 drop-shadow-lg" /></div>}
                            </button>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center truncate px-1" title={av.hint}>{av.hint}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {invTab === 'frames' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {FRAMES.map((frame) => {
                        const unlocked = frame.reqLevel === 0 || isItemUnlocked(frame.id, frame.reqLevel, 'frames', frame.isAch);
                        const isEquipped = activeFrame === frame.id;
                        return (
                          <button
                            key={frame.id}
                            onClick={() => unlocked && setActiveFrame(frame.id)}
                            disabled={!unlocked}
                            className={cn(
                              "relative p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group",
                              isEquipped ? "border-brand-500 bg-brand-50 shadow-md" : unlocked ? "border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm" : "border-slate-100 bg-slate-50 cursor-not-allowed opacity-70"
                            )}
                          >
                            <div className="relative w-16 h-16 flex items-center justify-center">
                              {frame.img ? (
                                <>
                                  <div className="absolute inset-0 rounded-3xl bg-slate-200 border-2 border-slate-300" />
                                  <img src={frame.img} className="absolute w-[130%] h-[130%] object-contain pointer-events-none z-10" />
                                </>
                              ) : (
                                <div className={cn("w-full h-full rounded-3xl border-4 bg-slate-100", frame.css)} />
                              )}
                            </div>
                            
                            <div className="text-center space-y-1">
                              <p className="font-black text-sm text-slate-900 leading-tight">{frame.name}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {unlocked ? (isEquipped ? 'Надето' : 'Выбрать') : (frame.hint || `Уровень ${frame.reqLevel}`)}
                              </p>
                            </div>
                            {!unlocked && <Lock className="absolute top-3 right-3 w-4 h-4 text-slate-400" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {invTab === 'prefixes' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {PREFIXES.map((prefix) => {
                        const unlocked = prefix.reqLevel === 0 || isItemUnlocked(prefix.id, prefix.reqLevel, 'prefixes', prefix.isAch);
                        const isEquipped = activePrefix === prefix.id;
                        return (
                          <button
                            key={prefix.id}
                            onClick={() => unlocked && setActivePrefix(prefix.id)}
                            disabled={!unlocked}
                            className={cn(
                              "relative p-5 rounded-2xl border-2 transition-all flex items-center justify-between group",
                              isEquipped ? "border-brand-500 bg-brand-50 shadow-md" : unlocked ? "border-slate-100 bg-white hover:border-slate-300" : "border-slate-100 bg-slate-50 cursor-not-allowed opacity-70"
                            )}
                          >
                            <div className="flex items-center gap-3">
                               <div className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest", prefix.color, !unlocked && "grayscale opacity-50")}>
                                 {prefix.name}
                               </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 max-w-[100px] truncate" title={prefix.hint || `Ур. ${prefix.reqLevel}`}>
                                {unlocked ? (isEquipped ? 'Надето' : 'Выбрать') : (prefix.hint || `Ур. ${prefix.reqLevel}`)}
                              </p>
                            </div>
                            {!unlocked && <Lock className="absolute top-1/2 -translate-y-1/2 right-4 w-4 h-4 text-slate-400 opacity-50" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {invTab === 'backgrounds' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {BACKGROUNDS.map((bg) => {
                        const unlocked = bg.reqLevel === 0 || isItemUnlocked(bg.id, bg.reqLevel, 'backgrounds', bg.isAch);
                        const isEquipped = activeBg === bg.id;
                        return (
                          <button
                            key={bg.id}
                            onClick={() => unlocked && setActiveBg(bg.id)}
                            disabled={!unlocked}
                            className={cn(
                              "relative h-32 rounded-3xl border-2 transition-all flex flex-col justify-end p-4 overflow-hidden group text-left",
                              isEquipped ? "border-brand-500 shadow-md ring-2 ring-brand-200" : unlocked ? "border-slate-200 hover:border-slate-400" : "border-slate-100 cursor-not-allowed grayscale opacity-60"
                            )}
                          >
                            <div className={cn("absolute inset-0 bg-gradient-to-tr opacity-80", bg.gradient)} />
                            <div className="relative z-10">
                              <p className="font-black text-lg text-slate-900 truncate pr-6" title={bg.name}>{bg.name}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 truncate">
                                {unlocked ? (isEquipped ? 'Надето' : 'Доступно') : (bg.hint || `Уровень ${bg.reqLevel}`)}
                              </p>
                            </div>
                            {!unlocked && <Lock className="absolute top-4 right-4 w-5 h-5 text-slate-500" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              </motion.div>
            )}

            {mainTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <Palette className="w-6 h-6 text-brand-600" /> Базовые настройки
                </h2>
                
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Цвет фона аватарки</label>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map(c => (
                          <button
                            key={`bg-${c}`}
                            onClick={() => setCardBg(c)}
                            className={cn(
                              "w-8 h-8 rounded-lg border-2 transition-all",
                              cardBg === c ? "border-brand-600 scale-110 shadow-lg" : "border-transparent shadow-sm"
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Цвет обводки аватарки</label>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map(c => (
                          <button
                            key={`border-${c}`}
                            onClick={() => setCardBorder(c)}
                            className={cn(
                              "w-8 h-8 rounded-lg border-2 transition-all",
                              cardBorder === c ? "border-brand-600 scale-110 shadow-lg" : "border-transparent shadow-sm"
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {mainTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <Settings className="w-6 h-6 text-brand-600" /> Настройки аккаунта
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Безопасность</h3>
                    <button className="w-full text-left px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-900 hover:bg-slate-100 transition-all border border-slate-100 flex items-center justify-between group">
                      Сменить пароль 
                      <Shield className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Финансы</h3>
                    <button className="w-full text-left px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-900 hover:bg-slate-100 transition-all border border-slate-100 flex items-center justify-between group">
                      История транзакций
                      <Wallet className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button
                    onClick={onLogout}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                  >
                    <LogOut className="w-4 h-4" /> Выйти из аккаунта
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-brand-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2 sticky bottom-4 z-40"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><CheckCircle2 className="w-5 h-5" /> Сохранить изменения</>
            )}
          </button>

        </div>

        <div className="lg:col-span-4 space-y-8 hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2">Предпросмотр профиля</h3>
            
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden relative">
              <div className={cn("absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] opacity-60", activeBgObj?.gradient)} />
              
              <div className="relative z-10 p-8 flex flex-col items-center text-center space-y-5">
                
                <div className="relative w-28 h-28 flex-shrink-0">
                  <div 
                    className={cn(
                      "absolute inset-0 rounded-[2.5rem] overflow-hidden border-4 bg-white transition-all duration-500",
                      activeFrameObj.css
                    )}
                    style={{ 
                      backgroundColor: cardBg, 
                      borderColor: activeFrameObj.id === 'none' ? cardBorder : undefined 
                    }}
                  >
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                  </div>
                  {activeFrameObj.img && (
                    <img 
                      src={activeFrameObj.img} 
                      alt="frame preview" 
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[125%] h-[125%] object-contain pointer-events-none z-20 drop-shadow-xl" 
                    />
                  )}
                </div>
                
                <div className="space-y-1">
                   <div className="flex justify-center mb-2 h-5">
                     {activePrefix !== 'none' && (
                       <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest", activePrefixObj?.color)}>
                         {activePrefixObj?.name}
                       </span>
                     )}
                   </div>
                   <p className="text-2xl font-black leading-none text-slate-900 truncate w-full px-4">{nickname}</p>
                   <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">LVL {user.level || 0} • {user.rank}</p>
                </div>

                <div className="w-full bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 shadow-sm">
                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                     <span>Опыт</span>
                     <span className="text-brand-600">{user.xp?.toLocaleString() || 0} XP</span>
                   </div>
                   <div className="h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                     <div className="h-full bg-brand-500 rounded-full w-[60%]" />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
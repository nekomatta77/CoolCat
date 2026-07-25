import { useState, useEffect } from 'react';
import { 
  signInWithRedirect, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User, 
  Chrome, 
  Send, 
  ArrowRight, 
  Cat, 
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import TermsModal from './TermsModal';

function VkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M15.073 21.053c-8.47 0-13.315-5.835-13.315-15.54h4.156c0 7.375 2.923 10.415 5.143 11.041v-11.04h3.94v6.311c2.18-.24 4.568-2.585 5.35-5.328h3.945c-.538 3.51-3.21 6.066-5.112 7.15 1.902.88 4.908 3.09 5.86 7.406h-4.3c-.71-2.924-3.13-5.188-5.683-5.504v5.504h-4.084z" />
    </svg>
  );
}

interface AuthProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'register';
}

export default function Auth({ isOpen, onClose, initialView = 'login' }: AuthProps) {
  const [isLogin, setIsLogin] = useState(initialView === 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // Синхронизируем вкладку, если модалка открывается извне с конкретной целью
  useEffect(() => {
    if (isOpen) {
      setIsLogin(initialView === 'login');
      setError(null);
    }
  }, [isOpen, initialView]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error('Google login error:', err);
      let message = err.message;
      if (err.code === 'auth/unauthorized-domain') message = 'Ошибка: Домен не авторизован. Добавьте ваш домен в Authorized domains в Firebase.';
      else if (err.code === 'auth/operation-not-allowed') message = 'Вход через Google не включен в настройках Firebase.';
      setError(message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        let finalEmail = loginId.trim();
        if (!finalEmail.includes('@')) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('nickname', '==', finalEmail));
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) throw new Error('Пользователь с таким никнеймом не найден');
          const userData = querySnapshot.docs[0].data();
          if (!userData.email) throw new Error('К этому никнейму не привязан Email. Войдите по Email.');
          finalEmail = userData.email;
        }
        await signInWithEmailAndPassword(auth, finalEmail, password);
      } else {
        if (password !== confirmPassword) throw new Error('Пароли не совпадают');
        if (!nickname.trim()) throw new Error('Пожалуйста, введите никнейм');
        
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('nickname', '==', nickname.trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) throw new Error('Этот никнейм уже занят другим игроком');

        const userCredential = await createUserWithEmailAndPassword(auth, loginId.trim(), password);
        await updateProfile(userCredential.user, { displayName: nickname.trim() });
      }
      // При успешном входе onClose вызовется из App.tsx через onAuthStateChanged
    } catch (err: any) {
      let message = err.message;
      if (err.code === 'auth/email-already-in-use') message = 'Этот email уже используется';
      if (err.code === 'auth/weak-password') message = 'Пароль слишком слабый (минимум 6 символов)';
      if (err.code === 'auth/invalid-email') message = 'Некорректный формат email';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') message = 'Неверный логин или пароль';
      setError(message);
      setLoading(false);
    }
  };

  if (!isOpen && !isTermsOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-full max-w-md relative z-10 my-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white p-6 sm:p-8 relative overflow-hidden">
              
              <button 
                onClick={onClose}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-100 rounded-full blur-[80px] opacity-60 pointer-events-none" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-100 rounded-full blur-[80px] opacity-60 pointer-events-none" />

              <div className="flex flex-col items-center mb-6 relative z-10">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 mb-3">
                  <Cat className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter">CoolCat</h1>
                <p className="text-slate-400 font-medium text-xs mt-1">Твой путь к победе начинается здесь</p>
              </div>

              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 relative z-10">
                <button 
                  onClick={() => { setIsLogin(true); setError(null); }}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    isLogin ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Вход
                </button>
                <button 
                  onClick={() => { setIsLogin(false); setError(null); }}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    !isLogin ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Регистрация
                </button>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    key="error-alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-5 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-start gap-2.5 overflow-hidden relative z-10"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-snug">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleEmailAuth} className="space-y-3 relative z-10">
                {!isLogin && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Никнейм</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                      <input type="text" required value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ваш крутой никнейм" className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{isLogin ? 'Email или Никнейм' : 'Email'}</label>
                  <div className="relative group">
                    {isLogin ? <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" /> : <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />}
                    <input type={isLogin ? "text" : "email"} required value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder={isLogin ? "example@mail.com или CoolCat" : "example@mail.com"} className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300" />
                  </div>
                </div>

                {isLogin ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Пароль</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Пароль</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Повторите пароль</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300" />
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-200 uppercase tracking-widest text-xs flex items-center justify-center gap-3 group disabled:opacity-50 mt-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isLogin ? 'Войти' : 'Создать аккаунт'} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                </button>
              </form>

              <div className="my-6 flex items-center gap-4 relative z-10">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Или через</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              <div className="grid grid-cols-3 gap-3 relative z-10">
                <button onClick={handleGoogleLogin} disabled={loading} className="flex items-center justify-center h-12 bg-white border-2 border-slate-100 rounded-xl hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group"><Chrome className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" /></button>
                <button disabled className="flex items-center justify-center h-12 bg-white border-2 border-slate-100 rounded-xl hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group opacity-50 cursor-not-allowed"><VkIcon className="w-5 h-5 text-slate-400 transition-colors" /></button>
                <button disabled className="flex items-center justify-center h-12 bg-white border-2 border-slate-100 rounded-xl hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group opacity-50 cursor-not-allowed"><Send className="w-5 h-5 text-slate-400 transition-colors" /></button>
              </div>

              <p className="mt-6 text-center text-[10px] text-slate-400 font-medium relative z-10">
                Продолжая, вы соглашаетесь с нашими <br />
                <span onClick={() => setIsTermsOpen(true)} className="text-indigo-600 cursor-pointer hover:underline">Условиями использования</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </AnimatePresence>
  );
}
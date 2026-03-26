import { useState } from 'react';
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
  Share2, 
  ArrowRight, 
  Cat, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import TermsModal from './TermsModal';

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  // Состояния для полей формы
  const [loginId, setLoginId] = useState(''); // Здесь хранится либо Email, либо Никнейм
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // Авторизация через Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error('Google login error:', err);
      let message = err.message;
      if (err.code === 'auth/unauthorized-domain') {
        message = 'Ошибка: Домен не авторизован. Добавьте ваш домен в Authorized domains в Firebase.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'Вход через Google не включен в настройках Firebase.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Авторизация и регистрация через Email/Никнейм
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        let finalEmail = loginId.trim();

        // Проверяем, ввел ли пользователь никнейм (нет символа @)
        if (!finalEmail.includes('@')) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('nickname', '==', finalEmail));
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
            throw new Error('Пользователь с таким никнеймом не найден');
          }
          
          const userData = querySnapshot.docs[0].data();
          if (!userData.email) {
            throw new Error('К этому никнейму не привязан Email. Войдите по Email.');
          }
          finalEmail = userData.email;
        }

        // Логика входа
        await signInWithEmailAndPassword(auth, finalEmail, password);
      } else {
        // Логика регистрации
        if (password !== confirmPassword) {
          throw new Error('Пароли не совпадают');
        }
        if (!nickname.trim()) {
          throw new Error('Пожалуйста, введите никнейм');
        }
        
        // Проверяем, не занят ли никнейм другим игроком
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('nickname', '==', nickname.trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          throw new Error('Этот никнейм уже занят другим игроком');
        }

        // Создаем пользователя
        const userCredential = await createUserWithEmailAndPassword(auth, loginId.trim(), password);
        
        // Сразу обновляем его профиль в Auth
        await updateProfile(userCredential.user, {
          displayName: nickname.trim()
        });
      }
      onSuccess();
    } catch (err: any) {
      console.error('Email auth error:', err);
      let message = err.message;
      
      // Ловим наши кастомные ошибки
      if (
        message === 'Пользователь с таким никнеймом не найден' || 
        message === 'Этот никнейм уже занят другим игроком' ||
        message === 'К этому никнейму не привязан Email. Войдите по Email.'
      ) {
         // Оставляем текст как есть
      } else {
        // Переводим стандартные ошибки Firebase
        if (err.code === 'auth/email-already-in-use') message = 'Этот email уже используется';
        if (err.code === 'auth/weak-password') message = 'Пароль слишком слабый (минимум 6 символов)';
        if (err.code === 'auth/invalid-email') message = 'Некорректный формат email';
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          message = 'Неверный email или пароль';
        }
        if (err.code === 'auth/operation-not-allowed') {
          message = 'Авторизация по почте отключена в Firebase Console.';
        }
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialPlaceholder = (provider: string) => {
    setError(`Авторизация через ${provider} будет доступна в ближайшее время!`);
  };

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full blur-[120px] opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-200 rounded-full blur-[120px] opacity-50" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl shadow-indigo-200/50 border border-white p-8 lg:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 mb-4">
              <Cat className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-indigo-900 tracking-tighter">CoolCat</h1>
            <p className="text-slate-400 font-medium text-sm">Твой путь к победе начинается здесь</p>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => { setIsLogin(true); setError(null); }}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                isLogin ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Вход
            </button>
            <button 
              onClick={() => { setIsLogin(false); setError(null); }}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                !isLogin ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Регистрация
            </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl flex items-start gap-3 overflow-hidden"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Никнейм</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ваш крутой никнейм"
                    className="w-full bg-white border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-4 font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                {isLogin ? 'Email или Никнейм' : 'Email'}
              </label>
              <div className="relative group">
                {isLogin ? (
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                ) : (
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                )}
                <input 
                  type={isLogin ? "text" : "email"}
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder={isLogin ? "example@mail.com или CoolCat" : "example@mail.com"}
                  className="w-full bg-white border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-4 font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Пароль</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-4 font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Повторите пароль</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-4 font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-indigo-200 uppercase tracking-widest text-sm flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Войти' : 'Создать аккаунт'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-slate-100" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Или через</span>
            <div className="h-[1px] flex-1 bg-slate-100" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center h-14 bg-white border-2 border-slate-50 rounded-2xl hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group"
              title="Google"
            >
              <Chrome className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </button>
            <button 
              onClick={() => handleSocialPlaceholder('VK')}
              disabled={loading}
              className="flex items-center justify-center h-14 bg-white border-2 border-slate-50 rounded-2xl hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group"
              title="VK"
            >
              <Share2 className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </button>
            <button 
              onClick={() => handleSocialPlaceholder('Telegram')}
              disabled={loading}
              className="flex items-center justify-center h-14 bg-white border-2 border-slate-50 rounded-2xl hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group"
              title="Telegram"
            >
              <Send className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400 font-medium">
            Продолжая, вы соглашаетесь с нашими <br />
            <span 
              onClick={() => setIsTermsOpen(true)}
              className="text-indigo-600 cursor-pointer hover:underline"
            >
              Условиями использования
            </span>
          </p>
        </div>
      </motion.div>

      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
}
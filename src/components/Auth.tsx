import { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User, 
  Chrome, 
  Send, 
  ArrowRight, 
  Cat, 
  CheckCircle2, 
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

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onSuccess();
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (password !== confirmPassword) {
          throw new Error('Пароли не совпадают');
        }
        if (!nickname) {
          throw new Error('Пожалуйста, введите никнейм');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: nickname
        });
      }
      onSuccess();
    } catch (err: any) {
      console.error('Email auth error:', err);
      let message = err.message;
      if (err.code === 'auth/email-already-in-use') message = 'Этот email уже используется';
      if (err.code === 'auth/weak-password') message = 'Пароль слишком слабый (минимум 6 символов)';
      if (err.code === 'auth/invalid-email') message = 'Некорректный email';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') message = 'Неверный email или пароль';
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
      {/* Background Decorations */}
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
              onClick={() => setIsLogin(true)}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                isLogin ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Вход
            </button>
            <button 
              onClick={() => setIsLogin(false)}
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
                className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
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
                    placeholder="Ваш никнейм"
                    className="w-full bg-white border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-4 font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
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
              <svg 
                className="w-6 h-6 text-slate-400 group-hover:text-[#0077FF] transition-colors fill-current" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M15.077 7.234c.154-.486 0-.84-.66-.84h-1.928c-.55 0-.792.29-.924.616 0 0-1.012 2.45-2.442 4.056-.462.462-.682.607-.957.607-.132 0-.33-.145-.33-.616V7.234c0-.55-.165-.84-.638-.84H5.08c-.352 0-.572.261-.572.507 0 .54.803.66 8.85 2.871v4.323c0 .55.154.84.44.84.55 0 1.254-.53 2.057-1.42 1.342-1.463 2.277-3.839 2.277-3.839.154-.319.308-.473.869-.473zM21 7.234h-1.914c-.616 0-.891.319-1.056.67 0 0-1.023 2.508-2.464 4.103-.792.87-1.155 1.133-1.573 1.133-.209 0-.418-.116-.583-.348-.22-.308-.22-.841-.22-1.43V7.234c0-.55-.165-.84-.638-.84h-2.112c-.352 0-.572.261-.572.507 0 .54.803.66.885 2.871v2.794c0 1.056-.187 1.243-.539 1.243-.946 0-3.245-2.552-4.609-5.467C5.357 7.422 5.148 7.234 4.5 7.234H2.57C1.888 7.234 1.745 7.553 1.745 7.857c0 .536 1.034 4.818 4.84 10.164C8.976 20.373 10.747 21 12.353 21c1.232 0 1.408-.275 1.408-.759V18.5c0-.627.132-.748.572-.748.33 0 .891.165 2.222 1.452 1.507 1.474 1.76 2.145 2.53 2.145h1.914c.682 0 1.023-.341.836-1.012-.22-.759-1.045-1.76-2.123-2.981-.594-.682-1.485-1.408-1.749-1.76-.352-.462-.253-.671 0-1.078.011-.011 3.091-4.356 3.421-5.654.143-.462 0-.84-.66-.84z"/>
              </svg>
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
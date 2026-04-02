import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Home from './pages/Home';
import Dice from './pages/Dice';
import Mines from './pages/Mines';
import Keno from './pages/Keno';
import Jackpot from './pages/Jackpot';
import FAQ from './pages/FAQ';
import Bonuses from './pages/Bonuses';
import Level from './pages/Level';
import Achievements from './pages/Achievements';
import Profile from './pages/Profile';
import Contacts from './pages/Contacts';
import Admin from './pages/Admin';

// ============================================================================
// 🛠 НАСТРОЙКИ ПОЗИЦИОНИРОВАНИЯ И РАЗМЕРА ЛОАДЕРА (ЭКРАН ЗАГРУЗКИ)
// ============================================================================
const LOADER_CONFIG = {
  pc: { size: 160, x: 0, y: 0 },   // size - размер картинки в пикселях
  mobile: { size: 126, x: 0, y: 0 } // x, y - сдвиг (в пикселях)
};
// ============================================================================

// Вспомогательный хук для определения устройства
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const isMobile = useIsMobile();
  const loaderCfg = isMobile ? LOADER_CONFIG.mobile : LOADER_CONFIG.pc;

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      if (firebaseUser) {
        setLoading(true);
        setDbError(null);
        
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          await firebaseUser.reload();
          const currentUser = auth.currentUser || firebaseUser;

          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            if (currentUser.displayName && userData.nickname.startsWith('Cat') && userData.nickname !== currentUser.displayName) {
              await updateDoc(userRef, { nickname: currentUser.displayName });
            }
            setUser(userData);
            setLoading(false);

            unsubscribeUser = onSnapshot(userRef, (doc) => {
              if (doc.exists()) {
                setUser(doc.data() as UserProfile);
              }
            }, (error) => {
              console.error("User snapshot error:", error);
            });
          } else {
            const newUser: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || undefined,
              nickname: currentUser.displayName || `Cat${Math.floor(Math.random() * 10000)}`,
              balance: 1000, 
              rank: 'user',
              xp: 0,
              level: 1,
              avatar: currentUser.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=CoolCat',
              cardStyle: {
                background: '#ffffff',
                border: '#6366f1',
                color: '#1e293b',
                pattern: 'none'
              },
              socialLinks: {},
              banned: false,
              totalDeposits: 0,
              totalWithdrawals: 0,
              wagerRequirement: 0
            };
            await setDoc(userRef, newUser);
            setUser(newUser);
            setLoading(false);
          }
        } catch (error) {
          console.error("Error fetching/creating user profile:", error);
          setDbError("Ошибка подключения к базе данных (Firestore). Убедитесь, что вы создали базу данных Firestore Database в Firebase Console.");
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (dbError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Ошибка Базы Данных</h1>
          <p className="text-slate-700 mb-6">{dbError}</p>
          <button
            onClick={() => { setDbError(null); handleLogout(); }}
            className="bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-700 transition-colors"
          >
            Выйти и попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-8">
        <div className="relative flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-brand-400 rounded-full blur-[60px] opacity-20 animate-pulse" />
          
          {/* КОНТЕЙНЕР ЛОАДЕРА С ПРИМЕНЕНИЕМ НАСТРОЕК */}
          <div 
            style={{ 
              width: `${loaderCfg.size}px`, 
              height: `${loaderCfg.size}px`,
              transform: `translate(${loaderCfg.x}px, ${loaderCfg.y}px)`
            }}
            className="relative z-10 flex items-center justify-center"
          >
            <img 
              src="/assets/CoolCat_loader.webp" 
              alt="Loading CoolCat" 
              className="w-full h-full object-contain drop-shadow-xl animate-bounce" 
            />
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter uppercase">CoolCat</h2>
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onSuccess={() => {}} />;
  }

  if (user.banned) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl">
          <h1 className="text-4xl font-bold text-red-600 mb-4">Вы забанены</h1>
          <p className="text-slate-600">Обратитесь в поддержку для выяснения причин.</p>
          <button onClick={handleLogout} className="mt-6 text-brand-600 underline">Выйти</button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/dice" element={<Dice user={user} />} />
          <Route path="/mines" element={<Mines user={user} />} />
          <Route path="/keno" element={<Keno user={user} />} />
          <Route path="/jackpot" element={<Jackpot user={user} />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/bonuses" element={<Bonuses user={user} />} />
          <Route path="/level" element={<Level user={user} />} />
          <Route path="/achievements" element={<Achievements user={user} />} />
          <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/admin" element={user.rank === 'admin' ? <Admin user={user} /> : <Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}
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

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

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

  // НОВЫЙ ЭКРАН ЗАГРУЗКИ С АНИМИРОВАННЫМ КОТОМ ИЗ СТАРОГО ПРОЕКТА
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-8">
        <div className="relative flex flex-col items-center justify-center">
          {/* Свечение на фоне */}
          <div className="absolute inset-0 bg-brand-400 rounded-full blur-[60px] opacity-20 animate-pulse" />
          
          {/* SVG Кота */}
          <svg 
            className="w-32 h-32 text-brand-600 relative z-10 animate-draw-cat drop-shadow-xl" 
            viewBox="0 0 413.928 413.928" 
            stroke="currentColor" 
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <g>
              <path d="M244.873,161.937c6.655,0,12.045,5.392,12.045,12.044c0,6.65-5.39,12.04-12.045,12.04c-6.649,0-12.044-5.389-12.044-12.04 C232.829,167.328,238.223,161.937,244.873,161.937z"></path>
              <path d="M371.029,339.641c-8.379-15.763-17.871-33.634-17.871-61.678c0-46.918,26.024-63.424,27.084-64.072 c3.85-2.278,5.115-7.246,2.837-11.096c-2.283-3.857-7.256-5.121-11.101-2.843c-1.429,0.85-35.021,21.39-35.021,78.011 c0,32.083,10.958,52.708,19.76,69.282c6.312,11.865,11.29,21.246,11.29,31.968c0,7.683-1.672,13.23-4.83,16.062 c-3.217,2.879-7.42,2.452-7.499,2.452c-0.385-0.058-0.78-0.084-1.171-0.084h-29.815c3.47-5.432,5.516-11.855,5.516-18.769V13.703 c0-3.636-2.426-6.827-5.933-7.805c-3.496-0.986-7.225,0.503-9.107,3.615l-39.562,65.485c-12.139-0.231-47.809-0.509-154.588-0.509 c-22.673,0-33.895,0.016-39.564,0.056L45.009,4.371c-1.724-3.317-5.508-5.028-9.109-4.137c-3.631,0.886-6.184,4.137-6.184,7.868 v370.762c0,19.28,15.681,34.969,34.966,34.969H188.46h106.784h58.82c0.532,0.047,1.286,0.095,2.225,0.095 c3.961,0,11.085-0.881,17.36-6.297c7.003-6.054,10.558-15.614,10.558-28.429C384.208,364.452,377.811,352.397,371.029,339.641z M115.041,202.22c-15.572,0-28.242-12.667-28.242-28.239c0-15.575,12.675-28.244,28.242-28.244 c15.57,0,28.242,12.669,28.242,28.244C143.283,189.553,130.616,202.22,115.041,202.22z M194.134,234.763h-5.982l-0.654,11.253 c-0.248,4.304-3.818,7.631-8.079,7.631c-0.156,0-0.316-0.005-0.475-0.011c-4.464-0.264-7.878-4.097-7.612-8.554l0.599-10.314 h-6.146c-4.47,0-8.101-3.623-8.101-8.1c0-4.478,3.631-8.101,8.101-8.101h28.35c4.472,0,8.1,3.623,8.1,8.101 C202.234,231.145,198.606,234.763,194.134,234.763z M244.873,202.22c-15.572,0-28.244-12.667-28.244-28.239 c0-15.575,12.677-28.244,28.244-28.244c15.578,0,28.255,12.669,28.255,28.244C273.127,189.553,260.451,202.22,244.873,202.22z"></path>
              <circle cx="115.041" cy="173.978" r="12.042"></circle>
            </g>
          </svg>
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
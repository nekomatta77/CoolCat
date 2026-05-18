// src/App.tsx
import { useEffect, useState, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, User } from 'firebase/auth'; 
import { doc, getDoc, setDoc, onSnapshot, updateDoc, DocumentSnapshot, FirestoreError, increment } from 'firebase/firestore'; 
import { auth, db } from './firebase';
import { UserProfile } from './types';
import { useIsMobile } from './lib/utils';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Home from './pages/Home';
import Dice from './pages/Dice';
import Mines from './pages/Mines';
import Keno from './pages/Keno';
import WheelX from './pages/WheelX';
import FAQ from './pages/FAQ';
import Bonuses from './pages/Bonuses';
import Level from './pages/Level';
import Achievements from './pages/Achievements';
import Profile from './pages/Profile';
import Contacts from './pages/Contacts';
import Admin from './pages/Admin';
import Referral from './pages/Referral';

const LOADER_CONFIG = {
  pc: { size: 160, x: 0, y: 65 },
  mobile: { size: 126, x: 0, y: 60 }
};

function ProtectedRoute({ user, children, onOpenAuth }: { user: UserProfile | null; children: ReactNode; onOpenAuth: (view: 'login' | 'register') => void; }) {
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <img src="/assets/CoolCat_logo.webp" className="w-16 h-16 opacity-50 grayscale" alt="Lock" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Требуется авторизация</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto font-medium">Войдите в свой аккаунт или зарегистрируйтесь, чтобы получить полный доступ к играм и функциям CoolCat.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button onClick={() => onOpenAuth('login')} className="px-8 py-3.5 bg-white text-slate-700 hover:text-brand-600 font-black uppercase tracking-widest rounded-2xl shadow-sm border border-slate-200 transition-all">Войти</button>
          <button onClick={() => onOpenAuth('register')} className="px-8 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-200 transition-all">Регистрация</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

type AuthConfigState = { isOpen: boolean; view: 'login' | 'register' };

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  
  const [authConfig, setAuthConfig] = useState<AuthConfigState>({ isOpen: false, view: 'login' });

  const isMobile = useIsMobile();
  const loaderCfg = isMobile ? LOADER_CONFIG.mobile : LOADER_CONFIG.pc;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      localStorage.setItem('coolcat_ref', refCode);
    }
  }, []);

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      if (firebaseUser) {
        setLoading(true);
        setDbError(null);
        
        const deletedRef = doc(db, 'deleted_users', firebaseUser.uid);
        const deletedSnap = await getDoc(deletedRef);
        
        if (deletedSnap.exists()) {
          setDbError("Ваш аккаунт был навсегда удален администратором.");
          await signOut(auth);
          setLoading(false);
          return;
        }
        
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          await firebaseUser.reload();
          const currentUser = auth.currentUser || firebaseUser;
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            let dbData = userSnap.data() as Partial<UserProfile>;
            let needsDbUpdate = false;

            if (!dbData.cardStyle) { dbData.cardStyle = { background: '#ffffff', border: '#6366f1', color: '#1e293b', pattern: 'none' }; needsDbUpdate = true; }
            if (!dbData.unlockedAvatars) { dbData.unlockedAvatars = ['/assets/avatars/ava1.webp', '/assets/avatars/ava2.webp', '/assets/avatars/ava3.webp']; needsDbUpdate = true; }
            if (!dbData.avatar) { dbData.avatar = currentUser.photoURL || '/assets/avatars/ava1.webp'; needsDbUpdate = true; }
            if (currentUser.displayName && dbData.nickname?.startsWith('Cat') && dbData.nickname !== currentUser.displayName) { dbData.nickname = currentUser.displayName; needsDbUpdate = true; }
            if (dbData.avatar && dbData.avatar.includes('api.dicebear.com')) { dbData.avatar = '/assets/avatars/ava1.webp'; needsDbUpdate = true; }

            if (needsDbUpdate) {
              await updateDoc(userRef, { 
                nickname: dbData.nickname,
                avatar: dbData.avatar,
                unlockedAvatars: dbData.unlockedAvatars,
                cardStyle: dbData.cardStyle
              });
            }

            setUser(dbData as UserProfile);
            setAuthConfig((prev: AuthConfigState) => ({ ...prev, isOpen: false }));
            setLoading(false);

            unsubscribeUser = onSnapshot(userRef, (docSnapshot: DocumentSnapshot) => {
              if (docSnapshot.exists()) {
                setUser(docSnapshot.data() as UserProfile);
              }
            }, (error: FirestoreError) => {
              console.error("User snapshot error:", error);
            });
          } else {
            const savedRef = localStorage.getItem('coolcat_ref');
            
            const newUser: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || undefined,
              nickname: currentUser.displayName || `Cat${Math.floor(Math.random() * 10000)}`,
              balance: 1000, 
              rank: 'user',
              xp: 0,
              level: 1,
              avatar: currentUser.photoURL || '/assets/avatars/ava1.webp',
              cardStyle: { background: '#ffffff', border: '#6366f1', color: '#1e293b', pattern: 'none' },
              socialLinks: {},
              banned: false,
              totalDeposits: 0,
              totalWithdrawals: 0,
              wagerRequirement: 0,
              unlockedAvatars: ['/assets/avatars/ava1.webp', '/assets/avatars/ava2.webp', '/assets/avatars/ava3.webp'],
              // ИСПРАВЛЕНИЕ: Используем правильное имя поля из types.ts
              invitedBy: savedRef || undefined
            };
            
            await setDoc(userRef, newUser);

            // Автоматически добавляем +1 к счетчику рефералов у пригласившего
            if (savedRef) {
              try {
                const referrerRef = doc(db, 'users', savedRef);
                const refSnap = await getDoc(referrerRef);
                if (refSnap.exists()) {
                  const refData = refSnap.data();
                  if (refData.referralData) {
                    await updateDoc(referrerRef, {
                      'referralData.registeredCount': increment(1)
                    });
                  } else {
                    await updateDoc(referrerRef, {
                      referralData: {
                        status: 'none',
                        balance: 0,
                        registeredCount: 1
                      }
                    });
                  }
                }
              } catch (e) {
                console.error("Ошибка начисления реферала:", e);
              }
            }

            setUser(newUser);
            setAuthConfig((prev: AuthConfigState) => ({ ...prev, isOpen: false }));
            setLoading(false);
          }
        } catch (error) {
          console.error("Error fetching/creating user profile:", error);
          setDbError("Ошибка подключения к базе данных (Firestore).");
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

  const handleLogout = async () => { try { await signOut(auth); } catch (error) { console.error('Logout error:', error); } };
  const handleOpenAuth = (view: 'login' | 'register') => { setAuthConfig({ isOpen: true, view }); };

  if (dbError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border-2 border-red-100">
          <h1 className="text-2xl font-black text-red-600 mb-4 tracking-tighter">ОШИБКА ДОСТУПА</h1>
          <p className="text-slate-700 font-medium mb-6 leading-relaxed">{dbError}</p>
          <button onClick={() => { setDbError(null); handleLogout(); }} className="w-full bg-red-500 text-white px-6 py-4 rounded-2xl font-black hover:bg-red-600 transition-colors uppercase tracking-widest shadow-lg shadow-red-200">Вернуться на главную</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-8">
        <div className="relative flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-brand-400 rounded-full blur-[60px] opacity-20 animate-pulse" />
          <div style={{ width: `${loaderCfg.size}px`, height: `${loaderCfg.size}px`, transform: `translate(${loaderCfg.x}px, ${loaderCfg.y}px)` }} className="relative z-10 flex items-center justify-center">
            <img src="/assets/CoolCat_loader.webp" alt="Loading" className="w-full h-full object-contain drop-shadow-xl animate-bounce" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="relative inline-block pb-1">
            <span className="absolute inset-0 z-0 drop-shadow-sm block text-4xl lg:text-5xl font-black tracking-tighter" style={{ WebkitTextStroke: '8px #5c2f3c', color: 'transparent' }} aria-hidden="true">CoolCat</span>
            <span className="relative z-10 block text-4xl lg:text-5xl font-black tracking-tighter"><span style={{ color: '#feb1d1' }}>Cool</span><span className="text-white">Cat</span></span>
          </div>
        </div>
      </div>
    );
  }

  if (user?.banned) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-md w-full border-2 border-red-100">
          <h1 className="text-4xl font-black text-red-600 mb-4 tracking-tighter">ВЫ ЗАБАНЕНЫ</h1>
          <p className="text-slate-600 font-medium leading-relaxed">Доступ к вашему аккаунту ограничен. Обратитесь в поддержку для выяснения причин.</p>
          <button onClick={handleLogout} className="mt-8 text-brand-600 font-bold hover:underline">Выйти из аккаунта</button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout} onLogin={() => handleOpenAuth('login')} onRegister={() => handleOpenAuth('register')}>
        <Routes>
          <Route path="/" element={<Home user={user} onLogin={() => handleOpenAuth('login')} />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/dice" element={<ProtectedRoute user={user} onOpenAuth={handleOpenAuth}><Dice user={user!} /></ProtectedRoute>} />
          <Route path="/mines" element={<ProtectedRoute user={user} onOpenAuth={handleOpenAuth}><Mines user={user!} /></ProtectedRoute>} />
          <Route path="/keno" element={<ProtectedRoute user={user} onOpenAuth={handleOpenAuth}><Keno user={user!} /></ProtectedRoute>} />
          <Route path="/wheelx" element={<ProtectedRoute user={user} onOpenAuth={handleOpenAuth}><WheelX user={user!} /></ProtectedRoute>} />
          <Route path="/bonuses" element={<ProtectedRoute user={user} onOpenAuth={handleOpenAuth}><Bonuses user={user!} /></ProtectedRoute>} />
          <Route path="/level" element={<ProtectedRoute user={user} onOpenAuth={handleOpenAuth}><Level user={user!} /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute user={user} onOpenAuth={handleOpenAuth}><Achievements user={user!} /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute user={user} onOpenAuth={handleOpenAuth}><Profile user={user!} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path="/referral" element={<ProtectedRoute user={user} onOpenAuth={handleOpenAuth}><Referral user={user!} /></ProtectedRoute>} />
          <Route path="/admin" element={user?.rank === 'admin' ? <Admin user={user} /> : <Navigate to="/" />} />
        </Routes>
      </Layout>
      <Auth isOpen={authConfig.isOpen} onClose={() => setAuthConfig((prev: AuthConfigState) => ({ ...prev, isOpen: false }))} initialView={authConfig.view} />
    </Router>
  );
}
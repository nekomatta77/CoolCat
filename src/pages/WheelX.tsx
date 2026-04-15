// src/pages/WheelX.tsx
import { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, increment, setDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Coins } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WheelXProps {
  user: UserProfile;
}

interface BetData {
  userId: string;
  nickname: string;
  avatar: string;
  black: number;
  blue: number;
  pink: number;
  orange: number;
}

// ------------------------------------------
// КОНФИГУРАЦИИ ЛАПКИ
// ------------------------------------------
const PAW_CONFIG_PC = {
  scale: 2.5,
  x: -55,
  y: 60,
  baseRotation: -110 
};

const PAW_CONFIG_MOBILE = {
  scale: 1.8,
  x: 0,
  y: 10,
  baseRotation: 0 
};

// ------------------------------------------
// КОНФИГУРАЦИИ КОЛЕСА
// ------------------------------------------
const WHEEL_CONFIG_PC = {
  size: 680,
  scale: 1,
  x: 0,
  y: '50%' 
};

const WHEEL_CONFIG_MOBILE = {
  size: 350,
  scale: 1.05, 
  x: 0,
  y: '50%'
};

const WHEEL_PATTERN = [
  { type: 'orange', mult: 30, color: '#f97316' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'pink', mult: 5, color: '#ec4899' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'pink', mult: 5, color: '#ec4899' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'pink', mult: 5, color: '#ec4899' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'pink', mult: 5, color: '#ec4899' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'pink', mult: 5, color: '#ec4899' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'pink', mult: 5, color: '#ec4899' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'black', mult: 2, color: '#1e293b' },
  { type: 'blue', mult: 3, color: '#3b82f6' }, { type: 'blue', mult: 3, color: '#3b82f6' }
];

export default function WheelX({ user }: WheelXProps) {
  const [globalBet, setGlobalBet] = useState('10');
  const currentBetNum = parseFloat(globalBet.replace(',', '.')) || 0;

  const [allBets, setAllBets] = useState<BetData[]>([]);
  const [myBets, setMyBets] = useState({ black: 0, blue: 0, pink: 0, orange: 0 });
  const [history, setHistory] = useState<number[]>([]);
  
  const [gameState, setGameState] = useState<'betting' | 'spinning'>('betting');
  const [timeLeft, setTimeLeft] = useState(20);
  const [endTime, setEndTime] = useState<number | null>(null); 
  const [rotation, setRotation] = useState(0);
  const [lastWinInfo, setLastWinInfo] = useState<{ mult: number, payout: number } | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activePawConfig = isMobile ? PAW_CONFIG_MOBILE : PAW_CONFIG_PC;
  const activeWheelConfig = isMobile ? WHEEL_CONFIG_MOBILE : WHEEL_CONFIG_PC;

  const wheelRotValue = useMotionValue(0);
  
  const pawFlick = useTransform(wheelRotValue, (r) => {
    const sliceAngle = 360 / 32;
    const normalizedRot = (Math.abs(r) % sliceAngle);
    const progress = normalizedRot / sliceAngle;
    
    let flickRotation = 0;
    if (progress < 0.85) {
        flickRotation = (progress / 0.85) * 22; 
    } else {
        const snapProgress = (progress - 0.85) / 0.15;
        flickRotation = 22 * (1 - snapProgress); 
    }
    return flickRotation;
  });

  const pawRotation = useTransform(pawFlick, (flick) => activePawConfig.baseRotation + flick);

  const myBetsRef = useRef(myBets);
  useEffect(() => {
    myBetsRef.current = myBets;
  }, [myBets]);

  const hasSpunRef = useRef(false);

  useEffect(() => {
    const betsRef = collection(db, 'live', 'wheelx', 'bets');
    const unsubscribeBets = onSnapshot(betsRef, (snapshot) => {
      const betsList: BetData[] = [];
      let myCurrentBets = { black: 0, blue: 0, pink: 0, orange: 0 };

      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<BetData, 'userId'>;
        betsList.push({ userId: doc.id, ...data } as BetData);

        if (doc.id === user.uid) {
          myCurrentBets = {
            black: data.black || 0,
            blue: data.blue || 0,
            pink: data.pink || 0,
            orange: data.orange || 0
          };
        }
      });

      setAllBets(betsList);
      setMyBets(myCurrentBets); 
    });

    return () => unsubscribeBets();
  }, [user.uid]);

  useEffect(() => {
    const unsubscribeGame = onSnapshot(doc(db, 'live', 'wheelx'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        setGameState(data.gameState);

        if (data.gameState === 'betting') {
          if (data.history && data.history.length > 0) setHistory(data.history);
          setEndTime(data.bettingEndsAt || null); 
          hasSpunRef.current = false;
          setLastWinInfo(null);
        } 
        else if (data.gameState === 'spinning' && !hasSpunRef.current && data.winningIndex !== undefined) {
          hasSpunRef.current = true;
          
          const winningIndex = data.winningIndex;
          const winningSlice = WHEEL_PATTERN[winningIndex];
          const betPlacedAtSpin = myBetsRef.current[winningSlice.type as keyof typeof myBetsRef.current] || 0;
          
          setRotation(prev => {
              const currentSpins = Math.floor(prev / 360);
              const nextSpins = currentSpins + 12; 
              return (nextSpins * 360) + (winningIndex * (360 / 32));
          });

          setTimeout(() => {
            if (betPlacedAtSpin > 0) {
              const expectedPayout = betPlacedAtSpin * winningSlice.mult;
              setLastWinInfo({ mult: winningSlice.mult, payout: expectedPayout });
            }
            setHistory(prev => [winningSlice.mult, ...prev].slice(0, 10));
          }, 8000); 
        }
      }
    });
    return () => unsubscribeGame();
  }, []); 

  useEffect(() => {
    if (gameState !== 'betting' || !endTime) {
        if (gameState === 'spinning') setTimeLeft(0);
        return;
    }

    const tick = () => {
        const now = Date.now();
        const diff = Math.ceil((endTime - now) / 1000);
        setTimeLeft(Math.max(0, diff));
    };

    tick(); 
    const interval = setInterval(tick, 200); 
    
    return () => clearInterval(interval);
  }, [gameState, endTime]);

  useEffect(() => {
    if (gameState === 'spinning' && hasSpunRef.current) {
        animate(wheelRotValue, -rotation, {
            duration: 8, 
            type: "tween", 
            ease: [0.1, 0.9, 0.2, 1] 
        });
    }
  }, [rotation, gameState, wheelRotValue]);

  const placeBet = async (color: 'black' | 'blue' | 'pink' | 'orange') => {
    if (gameState !== 'betting' || currentBetNum <= 0 || currentBetNum > user.balance) return;
    
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
    }
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { balance: increment(-currentBetNum) });
      const betRef = doc(db, 'live', 'wheelx', 'bets', user.uid);
      await setDoc(betRef, {
        [color]: increment(currentBetNum),
        nickname: user.nickname,
        avatar: user.avatar,
        timestamp: serverTimestamp()
      }, { merge: true });

    } catch (e) {
      console.error('Ошибка ставки', e);
    }
  };

  const BetCard = ({ 
    type, mult, titleColor, btnClass 
  }: { 
    type: 'black'|'blue'|'pink'|'orange', mult: number, titleColor: string, btnClass: string 
  }) => {
    const playersList = allBets
      .filter(b => (b[type as keyof BetData] as number) > 0)
      .map(b => ({
        nick: b.nickname,
        avatar: b.avatar,
        bet: b[type as keyof BetData] as number
      }))
      .sort((a, b) => b.bet - a.bet); 

    const currentPool = playersList.reduce((sum, p) => sum + p.bet, 0);

    return (
      <div className="bg-white rounded-2xl p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 border border-slate-100 shadow-md h-[220px] sm:h-[280px]">
        <div className="flex justify-between items-center px-1">
            <span className={cn("text-2xl sm:text-4xl font-black leading-none", titleColor)}>{mult}x</span>
            <div className="text-slate-400 text-[10px] sm:text-xs font-bold flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {playersList.length}
            </div>
        </div>
        
        <button 
          disabled={gameState !== 'betting'} 
          onClick={() => placeBet(type)}
          className={cn("w-full py-2.5 sm:py-3.5 rounded-xl font-black text-xs sm:text-sm text-white tracking-wider transition-all disabled:opacity-50 hover:-translate-y-0.5 active:scale-95 shadow-sm", btnClass)}
        >
          ПОСТАВИТЬ
        </button>

        <div className="flex justify-between items-center px-2 bg-slate-50 rounded-lg py-1.5 border border-slate-100">
            <Coins className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-xs sm:text-sm font-black text-slate-700">{currentPool.toFixed(0)}</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {playersList.map((p, i) => (
            <div key={i} className="flex items-center justify-between hover:bg-slate-50 p-1 rounded-md transition-colors">
              <div className="flex items-center gap-2 overflow-hidden">
                <img src={p.avatar} alt="ava" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-200" />
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 truncate max-w-[60px] sm:max-w-[80px]">{p.nick}</span>
              </div>
              <span className="text-[10px] sm:text-xs font-black text-slate-900">{p.bet.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 sm:space-y-8 pb-12 overflow-visible">
      
      {/* Единый монолитный блок */}
      <div className="bg-white rounded-none sm:rounded-[3rem] border-0 sm:border border-slate-100 shadow-xl shadow-slate-200/50 pt-4 sm:pt-8 relative overflow-visible flex flex-col">
        
        {/* История */}
        <div className="w-full flex items-center justify-between mb-2 sm:mb-4 z-20 relative px-4 sm:px-8">
           <div className="flex flex-col gap-2">
               <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">История</span>
               <div className="flex gap-1.5 sm:gap-2">
                  {history.map((mult, i) => (
                      <div key={i} className={cn(
                          "w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[10px] sm:text-sm font-black text-white shadow-sm",
                          mult === 30 ? "bg-orange-500" :
                          mult === 5 ? "bg-pink-500" :
                          mult === 3 ? "bg-blue-500" : "bg-slate-800"
                      )}>
                          {mult}x
                      </div>
                  ))}
                  {history.length === 0 && <span className="text-xs text-slate-400 font-bold ml-2">Ожидание...</span>}
               </div>
           </div>
        </div>

        {/* Колесо с clipPath */}
        <div 
          className="relative w-full max-w-[800px] mx-auto h-[220px] sm:h-[350px] mt-2 flex justify-center"
          style={{ clipPath: 'polygon(-50% -200%, 150% -200%, 150% 100%, -50% 100%)' }}
        >
          
          <motion.img
              src="/assets/wheelx/paw_wheel.webp"
              alt="Pointer"
              style={{ 
                  rotate: pawRotation, 
                  originY: 0.2, 
                  originX: 0.5,
                  x: activePawConfig.x,
                  y: activePawConfig.y,
                  scale: activePawConfig.scale
              }}
              className="absolute top-0 w-16 sm:w-24 drop-shadow-2xl z-40 transition-transform duration-300"
          />

          <motion.div
            style={{ 
                rotate: wheelRotValue,
                width: activeWheelConfig.size,
                height: activeWheelConfig.size,
                x: activeWheelConfig.x,
                y: activeWheelConfig.y,
                scale: activeWheelConfig.scale
            }}
            // Убрана внешняя тень, чтобы белый фон оставался идеально белым
            className="absolute bottom-0 rounded-full bg-slate-900 border-[16px] sm:border-[24px] border-slate-800 z-10"
          >
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
              <g transform="translate(50,50)">
                {WHEEL_PATTERN.map((slice, i) => (
                  <path 
                    key={`slice-${i}`} 
                    d="M0,0 L-4.89,-49.76 A50,50 0 0,1 4.89,-49.76 Z" 
                    fill={slice.color} 
                    stroke="rgba(0,0,0,0.15)"
                    strokeWidth="0.3"
                    transform={`rotate(${i * 11.25})`} 
                  />
                ))}
                
                {WHEEL_PATTERN.map((slice, i) => (
                  <text
                    key={`txt-${i}`}
                    x="0"
                    y="-36"
                    fill="#ffffff"
                    fontSize="5"
                    fontWeight="900"
                    textAnchor="middle"
                    transform={`rotate(${i * 11.25})`}
                    className="drop-shadow-md font-sans"
                    style={{ letterSpacing: '-0.5px' }}
                  >
                    {slice.mult === 2 ? "" : `${slice.mult}x`}
                  </text>
                ))}

                {WHEEL_PATTERN.map((_, i) => (
                  <circle
                    key={`pin-${i}`}
                    cx="0"
                    cy="-47"
                    r="1.2"
                    fill="#cbd5e1"
                    stroke="#334155"
                    strokeWidth="0.4"
                    transform={`rotate(${i * 11.25})`}
                    className="shadow-inner"
                  />
                ))}
              </g>
            </svg>
          </motion.div>

          {/* Втулка по центру - тоже без тени, чтобы было чисто */}
          <div className="absolute bottom-0 translate-y-1/2 w-28 h-28 sm:w-48 sm:h-48 bg-white rounded-full z-30 border-[6px] sm:border-[10px] border-slate-100 flex flex-col items-center justify-start pt-3 sm:pt-6">
            {gameState === 'betting' ? (
              <>
                  <span className="text-3xl sm:text-5xl font-black text-slate-800 leading-none tracking-tighter">{timeLeft}</span>
                  <span className="text-[9px] sm:text-[11px] uppercase tracking-widest text-slate-400 font-bold mt-1">Секунд</span>
              </>
            ) : (
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }} 
                transition={{ repeat: Infinity, duration: 1 }}
                className="flex flex-col items-center justify-center h-full pb-6 sm:pb-12"
              >
                <span className="text-brand-500 font-black text-xs sm:text-lg uppercase tracking-tighter">Cool</span>
                <span className="text-slate-800 font-black text-xs sm:text-lg uppercase tracking-tighter -mt-1 sm:-mt-2">Cat</span>
              </motion.div>
            )}
          </div>

          <AnimatePresence mode="wait">
              {lastWinInfo && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, y: -20 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                >
                  <div className="bg-white/90 backdrop-blur-md px-6 sm:px-10 py-4 sm:py-8 rounded-3xl shadow-2xl border-4 border-emerald-400 text-center">
                      <p className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-widest mb-1">Выиграл</p>
                      <p className="text-4xl sm:text-6xl font-black text-emerald-500 drop-shadow-sm">{lastWinInfo.mult}x</p>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>
        </div>

        {/* Плашка ставки (Убрали border-t-4, теперь полностью сливается с фоном) */}
        <div className={cn(
            "w-full bg-white relative z-20 px-4 sm:px-8 pb-6 sm:pb-10 pt-4 sm:pt-6 rounded-b-none sm:rounded-b-[3rem]",
            gameState !== 'betting' && "opacity-50 pointer-events-none"
        )}>
            <div className="flex flex-col md:flex-row gap-3 sm:gap-6 items-center max-w-[1000px] mx-auto">
                <div className="relative w-full md:w-1/2">
                    <span className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm sm:text-lg">₽</span>
                    <input
                        type="text"
                        value={globalBet}
                        onChange={(e) => setGlobalBet(e.target.value.replace(',', '.'))}
                        className="w-full bg-slate-50 text-slate-900 text-base sm:text-xl font-black rounded-xl py-3 sm:py-4 pl-10 sm:pl-12 pr-4 outline-none border-2 border-slate-100 focus:border-brand-500 transition-all shadow-inner"
                    />
                </div>
                
                <div className="flex w-full md:w-1/2 gap-1.5 sm:gap-2">
                    <button onClick={() => setGlobalBet((currentBetNum / 2).toString())} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs sm:text-sm py-3 sm:py-4 rounded-xl transition-colors">
                        /2
                    </button>
                    <button onClick={() => setGlobalBet((currentBetNum * 2).toString())} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs sm:text-sm py-3 sm:py-4 rounded-xl transition-colors">
                        X2
                    </button>
                    <button onClick={() => setGlobalBet('10')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs sm:text-sm py-3 sm:py-4 rounded-xl transition-colors">
                        MIN
                    </button>
                    <button onClick={() => setGlobalBet(user.balance.toString())} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs sm:text-sm py-3 sm:py-4 rounded-xl transition-colors">
                        MAX
                    </button>
                </div>
            </div>
        </div>

      </div>

      {/* Карточки с выбором сектора ставки */}
      <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 px-4 sm:px-0 mt-4 sm:mt-6", gameState !== 'betting' && "opacity-50 pointer-events-none")}>
          <BetCard type="black" mult={2} titleColor="text-slate-800" btnClass="bg-slate-800 hover:bg-slate-700" />
          <BetCard type="blue" mult={3} titleColor="text-blue-500" btnClass="bg-blue-500 hover:bg-blue-600" />
          <BetCard type="pink" mult={5} titleColor="text-pink-500" btnClass="bg-pink-500 hover:bg-pink-600" />
          <BetCard type="orange" mult={30} titleColor="text-orange-500" btnClass="bg-orange-500 hover:bg-orange-600 shadow-orange-500/30" />
      </div>

    </div>
  );
}
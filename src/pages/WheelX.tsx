// src/pages/WheelX.tsx
import { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, increment, setDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Coins, AlertCircle } from 'lucide-react';
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
// КОНФИГУРАЦИИ
// ------------------------------------------
const PAW_CONFIG_PC = { scale: 1.8, x: 0, y: -5, baseRotation: 0 };
const PAW_CONFIG_MOBILE = { scale: 1.8, x: 0, y: 10, baseRotation: 0 };

const MASK_CONFIG_PC = { width: 800, height: 40, x: 0, y: -33 };
const MASK_CONFIG_MOBILE = { width: 360, height: 30, x: 0, y: -20 };

const WHEEL_CONFIG_PC = { size: 680, scale: 1.015, x: 0, y: '50%' };
const WHEEL_CONFIG_MOBILE = { size: 320, scale: 1, x: 0, y: '50%' };

const CENTER_CONFIG_PC = { timerScale: 1, timerX: 0, timerY: -25, textScale: 1, textX: 0, textY: -20 };
const CENTER_CONFIG_MOBILE = { timerScale: 1, timerX: 0, timerY: -15, textScale: 0.85, textX: 0, textY: -15 };

const LOGO_COLOR_COOL = "#feb1d1";

const WHEEL_PATTERN = [
  { type: 'orange', mult: 30, color: 'url(#gradOrange)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'blue', mult: 3, color: 'url(#gradBlue)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'pink', mult: 5, color: 'url(#gradPink)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'blue', mult: 3, color: 'url(#gradBlue)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'pink', mult: 5, color: 'url(#gradPink)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'blue', mult: 3, color: 'url(#gradBlue)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'pink', mult: 5, color: 'url(#gradPink)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'blue', mult: 3, color: 'url(#gradBlue)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'pink', mult: 5, color: 'url(#gradPink)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'blue', mult: 3, color: 'url(#gradBlue)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'pink', mult: 5, color: 'url(#gradPink)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'blue', mult: 3, color: 'url(#gradBlue)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'pink', mult: 5, color: 'url(#gradPink)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'blue', mult: 3, color: 'url(#gradBlue)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'blue', mult: 3, color: 'url(#gradBlue)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' },
  { type: 'blue', mult: 3, color: 'url(#gradBlue)' }, { type: 'black', mult: 2, color: 'url(#gradBlack)' }
];

export default function WheelX({ user }: WheelXProps) {
  const [globalBet, setGlobalBet] = useState('10');
  const currentBetNum = parseFloat(globalBet.replace(',', '.')) || 0;

  const [allBets, setAllBets] = useState<BetData[]>([]);
  const [myBets, setMyBets] = useState({ black: 0, blue: 0, pink: 0, orange: 0 });
  const [history, setHistory] = useState<number[]>([]);
  
  const [gameState, setGameState] = useState<'betting' | 'spinning'>('betting');
  const [timeLeft, setTimeLeft] = useState(20);
  const [rotation, setRotation] = useState(0);
  const [lastWinInfo, setLastWinInfo] = useState<{ mult: number, payout: number } | null>(null);
  
  const [betError, setBetError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const [maxHistory, setMaxHistory] = useState(10);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateHistoryCount = () => {
      if (historyContainerRef.current) {
        const width = historyContainerRef.current.clientWidth;
        const isMob = window.innerWidth < 640;
        
        const itemWidth = isMob ? 20 : 28; 
        const gap = isMob ? 6 : 8; 
        
        const count = Math.floor(width / (itemWidth + gap));
        setMaxHistory(Math.max(1, count));
      }
    };

    setTimeout(updateHistoryCount, 100); 
    window.addEventListener('resize', updateHistoryCount);
    return () => window.removeEventListener('resize', updateHistoryCount);
  }, []);

  const activePawConfig = isMobile ? PAW_CONFIG_MOBILE : PAW_CONFIG_PC;
  const activeMaskConfig = isMobile ? MASK_CONFIG_MOBILE : MASK_CONFIG_PC;
  const activeWheelConfig = isMobile ? WHEEL_CONFIG_MOBILE : WHEEL_CONFIG_PC;
  const activeCenterConfig = isMobile ? CENTER_CONFIG_MOBILE : CENTER_CONFIG_PC;

  const wheelRotValue = useMotionValue(0);
  
  const pawFlick = useTransform(wheelRotValue, (r) => {
    const sliceAngle = 360 / 32;
    const normalizedRot = (Math.abs(r) % sliceAngle);
    const progress = normalizedRot / sliceAngle;
    
    let flickRotation = 0;
    if (progress < 0.85) flickRotation = (progress / 0.85) * 22; 
    else flickRotation = 22 * (1 - (progress - 0.85) / 0.15); 
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
              const nextSpins = currentSpins + 20; 
              return (nextSpins * 360) + (winningIndex * (360 / 32));
          });

          setTimeout(() => {
            if (betPlacedAtSpin > 0) {
              const expectedPayout = betPlacedAtSpin * winningSlice.mult;
              setLastWinInfo({ mult: winningSlice.mult, payout: expectedPayout });
            } else {
              setLastWinInfo(null);
            }
            setHistory(prev => [winningSlice.mult, ...prev].slice(0, 30));
          }, 8000); 
        }
      }
    });
    return () => unsubscribeGame();
  }, []); 

  useEffect(() => {
    if (gameState !== 'betting') {
        setTimeLeft(0);
        return;
    }

    setTimeLeft(20);
    const interval = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 1) return 0;
            return prev - 1;
        });
    }, 1000); 
    
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'spinning' && hasSpunRef.current) {
        animate(wheelRotValue, -rotation, {
            duration: 8, 
            type: "tween", 
            ease: [0.05, 0.95, 0.1, 1] 
        });
    }
  }, [rotation, gameState, wheelRotValue]);

  const handleHalfBet = () => {
    if (gameState !== 'betting') return;
    let next = currentBetNum / 2;
    if (next < 1) next = 1;
    setGlobalBet(Number(next.toFixed(2)).toString());
  };

  const handleDoubleBet = () => {
    if (gameState !== 'betting') return;
    let next = currentBetNum * 2;
    if (next > user.balance) next = user.balance;
    if (next < 1) next = 1;
    setGlobalBet(Number(next.toFixed(2)).toString());
  };

  const handleMinBet = () => {
    if (gameState !== 'betting') return;
    setGlobalBet('1');
  };

  const handleMaxBet = () => {
    if (gameState !== 'betting') return;
    setGlobalBet(Math.max(1, Number(user.balance.toFixed(2))).toString());
  };

  const placeBet = async (color: 'black' | 'blue' | 'pink' | 'orange') => {
    if (gameState !== 'betting' || currentBetNum < 1 || currentBetNum > user.balance) return;
    
    const currentBetOnColor = myBetsRef.current[color] || 0;
    if (currentBetOnColor + currentBetNum > 5000) {
        setBetError(`Лимит ставки: не более 5000 CAT на один цвет! (Уже поставлено: ${currentBetOnColor})`);
        setTimeout(() => setBetError(null), 3500);
        return;
    }
    
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

  const getWinPanelStyle = (mult: number) => {
    switch(mult) {
      case 30: return { bg: 'bg-gradient-to-br from-orange-400 to-orange-600', shadow: 'shadow-orange-500/50', border: 'border-orange-300/50' };
      case 5: return { bg: 'bg-gradient-to-br from-pink-400 to-pink-600', shadow: 'shadow-pink-500/50', border: 'border-pink-300/50' };
      case 3: return { bg: 'bg-gradient-to-br from-blue-400 to-blue-600', shadow: 'shadow-blue-500/50', border: 'border-blue-300/50' };
      default: return { bg: 'bg-gradient-to-br from-slate-700 to-slate-900', shadow: 'shadow-slate-900/50', border: 'border-slate-500/50' };
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
    <div className="max-w-[1200px] mx-auto space-y-6 sm:space-y-8 pb-12 overflow-visible relative">
      
      <AnimatePresence>
        {betError && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -50, scale: 0.9 }} 
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-white px-6 py-4 rounded-3xl shadow-2xl border-2 border-rose-200 flex items-center gap-4 min-w-[300px]"
          >
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-0.5">Ошибка ставки</p>
              <p className="text-sm sm:text-base font-black text-slate-900 leading-tight">{betError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-none sm:rounded-[3rem] border-0 sm:border border-slate-100 shadow-xl shadow-slate-200/50 pt-8 sm:pt-12 relative overflow-visible flex flex-col">
        
        {/* КОЛЕСО */}
        <div 
          className="relative w-full max-w-[800px] mx-auto h-[220px] sm:h-[350px] flex justify-center"
          style={{ clipPath: 'polygon(-50% -200%, 150% -200%, 150% 100%, -50% 100%)' }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[45] pointer-events-none">
              <motion.div
                  className="bg-white"
                  style={{
                      width: activeMaskConfig.width,
                      height: activeMaskConfig.height,
                      x: activeMaskConfig.x,
                      y: activeMaskConfig.y,
                  }}
              />
          </div>

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
            className="absolute bottom-0 rounded-full bg-slate-900 border-[16px] sm:border-[24px] border-slate-800 z-10"
          >
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
              <defs>
                <linearGradient id="gradOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb923c" />
                  <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
                <linearGradient id="gradPink" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f472b6" />
                  <stop offset="100%" stopColor="#be185d" />
                </linearGradient>
                <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="gradBlack" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>

              <g transform="translate(50,50)">
                {WHEEL_PATTERN.map((slice, i) => (
                  <path 
                    key={`slice-${i}`} 
                    d="M0,0 L-4.89,-49.76 A50,50 0 0,1 4.89,-49.76 Z" 
                    fill={slice.color} 
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth="0.4"
                    transform={`rotate(${i * 11.25})`} 
                  />
                ))}
                
                {WHEEL_PATTERN.map((slice, i) => (
                  <text
                    key={`txt-${i}`}
                    x="0"
                    y="-35"
                    fill="#ffffff"
                    fontSize="4.5"
                    fontWeight="900"
                    textAnchor="middle"
                    transform={`rotate(${i * 11.25})`}
                    className="font-sans"
                    style={{ letterSpacing: '-0.2px', textShadow: '0px 1px 2px rgba(0,0,0,0.7)' }}
                  >
                    {slice.mult === 2 ? "" : `${slice.mult}x`}
                  </text>
                ))}

                {WHEEL_PATTERN.map((_, i) => (
                  <circle
                    key={`pin-${i}`}
                    cx="0"
                    cy="-47.5"
                    r="1.2"
                    fill="#cbd5e1"
                    stroke="#1e293b"
                    strokeWidth="0.4"
                    transform={`rotate(${i * 11.25})`}
                    className="shadow-inner"
                  />
                ))}
              </g>
            </svg>
          </motion.div>

          <div className="absolute bottom-0 translate-y-1/2 w-28 h-28 sm:w-48 sm:h-48 bg-white rounded-full z-30 border-[6px] sm:border-[10px] border-slate-100 flex flex-col items-center justify-start pt-3 sm:pt-6">
            {gameState === 'betting' ? (
              <motion.div 
                style={{ scale: activeCenterConfig.timerScale, x: activeCenterConfig.timerX, y: activeCenterConfig.timerY }}
                className="flex items-center justify-center h-full pb-6 sm:pb-12"
              >
                  <span className="text-4xl sm:text-6xl font-black text-slate-800 leading-none tracking-tighter">{timeLeft}</span>
              </motion.div>
            ) : (
              <motion.div 
                animate={{ scale: [activeCenterConfig.textScale, activeCenterConfig.textScale * 1.05, activeCenterConfig.textScale] }} 
                transition={{ repeat: Infinity, duration: 1 }}
                style={{ x: activeCenterConfig.textX, y: activeCenterConfig.textY }}
                className="flex items-center justify-center h-full pb-6 sm:pb-12"
              >
                <span className="text-2xl sm:text-4xl font-black tracking-tighter block relative">
                  <span className="absolute inset-0 z-0 drop-shadow-sm" style={{ WebkitTextStroke: '6px #5c2f3c', color: 'transparent' }} aria-hidden="true">
                    CoolCat
                  </span>
                  <span className="relative z-10">
                    <span style={{ color: LOGO_COLOR_COOL }}>Cool</span>
                    <span className="text-white">Cat</span>
                  </span>
                </span>
              </motion.div>
            )}
          </div>

          <AnimatePresence mode="wait">
              {lastWinInfo && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 0 }}
                  animate={{ scale: 1, opacity: 1, y: -40 }}
                  exit={{ scale: 0.5, opacity: 0, y: -60 }}
                  transition={{ type: "spring", damping: 14, stiffness: 120 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none flex flex-col items-center"
                >
                  <div className={cn("absolute inset-0 blur-3xl opacity-60 rounded-full", getWinPanelStyle(lastWinInfo.mult).bg)} />

                  <div className={cn(
                      "relative px-10 py-3 sm:px-14 sm:py-5 rounded-[2rem] sm:rounded-[2.5rem] border-[3px] shadow-2xl flex flex-row items-center gap-6 sm:gap-10 min-w-[280px] sm:min-w-[380px] justify-center",
                      getWinPanelStyle(lastWinInfo.mult).bg, 
                      getWinPanelStyle(lastWinInfo.mult).border, 
                      getWinPanelStyle(lastWinInfo.mult).shadow
                  )}>
                      <div className="flex flex-col items-start">
                          <p className="text-[10px] sm:text-[12px] font-black text-white/80 uppercase tracking-[0.2em] mb-0.5 drop-shadow-md">Победа</p>
                          <span className="text-4xl sm:text-6xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)] leading-none">
                            {lastWinInfo.mult}x
                          </span>
                      </div>

                      {lastWinInfo.payout > 0 && (
                          <motion.div 
                              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                              className="bg-black/25 backdrop-blur-sm rounded-[1rem] sm:rounded-2xl px-4 py-2 sm:px-6 sm:py-3 flex items-center gap-2 border border-white/20 shadow-inner"
                          >
                              <Coins className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 drop-shadow-md" />
                              <span className="text-lg sm:text-2xl font-black text-white">+{lastWinInfo.payout.toFixed(0)}</span>
                          </motion.div>
                      )}
                  </div>
                </motion.div>
              )}
          </AnimatePresence>
        </div>

        {/* ИСТОРИЯ ИГР (СНИЗУ КОЛЕСА, НЕ ЗАТЕМНЯЕТСЯ ПРИ СПИНЕ) */}
        <div className="w-full bg-white relative z-20 px-4 sm:px-8 pt-4 sm:pt-6">
            <div className="max-w-[1000px] mx-auto">
                <div className="flex flex-col gap-2 w-full overflow-hidden">
                    <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">История игр</span>
                    
                    <div ref={historyContainerRef} className="flex gap-1.5 sm:gap-2 w-full overflow-hidden items-end h-10 sm:h-14">
                        {history.slice(0, maxHistory).map((mult, i) => (
                            <motion.div
                                key={i} 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ 
                                    height: mult === 30 ? '100%' : mult === 5 ? '75%' : mult === 3 ? '55%' : '35%', 
                                    opacity: 1 
                                }}
                                className={cn(
                                    "w-5 sm:w-7 rounded-t-md sm:rounded-t-lg rounded-b-sm flex items-end justify-center pb-0.5 sm:pb-1 shrink-0 transition-colors",
                                    mult === 30 ? "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]" :
                                    mult === 5 ? "bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.3)]" :
                                    mult === 3 ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "bg-slate-800"
                                )}
                            >
                                <span className="text-[8px] sm:text-[10px] font-black text-white leading-none">{mult}x</span>
                            </motion.div>
                        ))}
                        {history.length === 0 && <span className="text-xs text-slate-400 font-bold ml-2 pb-2">Ожидание...</span>}
                    </div>
                </div>
            </div>
            
            {/* Тонкий красивый разделитель между историей и ставками */}
            <div className="w-full h-[1px] bg-slate-100 max-w-[1000px] mx-auto mt-4 sm:mt-6"></div>
        </div>

        {/* ПАНЕЛЬ ВВОДА СТАВКИ (ЗАТЕМНЯЕТСЯ ПРИ СПИНЕ) */}
        <div className={cn(
            "w-full bg-white relative z-20 px-4 sm:px-8 pb-6 sm:pb-10 pt-4 sm:pt-6 rounded-b-none sm:rounded-b-[3rem] transition-opacity duration-300",
            gameState !== 'betting' && "opacity-50 pointer-events-none"
        )}>
            <div className="flex flex-col md:flex-row gap-3 sm:gap-6 items-center max-w-[1000px] mx-auto">
                <div className="relative w-full md:w-1/2">
                    <span className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm sm:text-lg">₽</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={globalBet}
                        disabled={gameState !== 'betting'}
                        onChange={(e) => {
                            const val = e.target.value.replace(',', '.');
                            if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                setGlobalBet(val);
                            }
                        }}
                        onBlur={() => {
                            let val = parseFloat(globalBet.replace(',', '.'));
                            if (isNaN(val) || val < 1) val = 1;
                            else if (val > user.balance) val = Math.max(1, user.balance);
                            setGlobalBet(Number(val.toFixed(2)).toString());
                        }}
                        className="w-full bg-slate-50 text-slate-900 text-base sm:text-xl font-black rounded-xl py-3 sm:py-4 pl-10 sm:pl-12 pr-4 outline-none border-2 border-slate-100 focus:border-brand-500 transition-all shadow-inner"
                    />
                </div>
                
                <div className="flex w-full md:w-1/2 gap-1.5 sm:gap-2">
                    <button onClick={handleHalfBet} disabled={gameState !== 'betting'} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs sm:text-sm py-3 sm:py-4 rounded-xl transition-colors disabled:opacity-50">/2</button>
                    <button onClick={handleDoubleBet} disabled={gameState !== 'betting'} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs sm:text-sm py-3 sm:py-4 rounded-xl transition-colors disabled:opacity-50">X2</button>
                    <button onClick={handleMinBet} disabled={gameState !== 'betting'} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs sm:text-sm py-3 sm:py-4 rounded-xl transition-colors disabled:opacity-50">MIN</button>
                    <button onClick={handleMaxBet} disabled={gameState !== 'betting'} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs sm:text-sm py-3 sm:py-4 rounded-xl transition-colors disabled:opacity-50">MAX</button>
                </div>
            </div>
        </div>

      </div>

      <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 px-4 sm:px-0 mt-4 sm:mt-6", gameState !== 'betting' && "opacity-50 pointer-events-none")}>
          <BetCard type="black" mult={2} titleColor="text-slate-800" btnClass="bg-slate-800 hover:bg-slate-700" />
          <BetCard type="blue" mult={3} titleColor="text-blue-500" btnClass="bg-blue-500 hover:bg-blue-600" />
          <BetCard type="pink" mult={5} titleColor="text-pink-500" btnClass="bg-pink-500 hover:bg-pink-600" />
          <BetCard type="orange" mult={30} titleColor="text-orange-500" btnClass="bg-orange-500 hover:bg-orange-600 shadow-orange-500/30" />
      </div>

    </div>
  );
}
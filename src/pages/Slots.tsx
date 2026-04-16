// src/pages/Slots.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const ASSETS_URL = "https://raw.githubusercontent.com/nekomatta77/whatsacas/main/";

export interface TransformConfig {
  x?: number;
  y?: number;
  scale?: number;
  mobile?: {
    x?: number;
    y?: number;
    scale?: number;
  };
}

export interface SlotSymbol {
  id: string;
  weight: number;
  mult?: number[];
  e: string;
  c: string;
  isWild?: boolean;
  isBonus?: boolean;
  hasBig?: boolean;
  transforms?: Record<number, TransformConfig>;
}

// Настройки mobile сильно уменьшены, так как теперь барабаны на телефоне будут низкими (по горизонтали)
const SLOT_SYMBOLS: SlotSymbol[] = [
  // === ВЫСОКООПЛАЧИВАЕМЫЕ СИМВОЛЫ (КОТЫ) ===
  { 
    id: 'slots_meinkun', weight: 2, mult: [0, 0, 2, 5, 10, 25], e: 'М', c: 'bg-yellow-500/20 border-yellow-600', hasBig: true,
    transforms: {
      2: { scale: 2.3, x: 10, y: 10, mobile: { scale: 2.2, x: 4, y: 2 } }, 
      3: { scale: 1.9, y: -5, mobile: { scale: 1.8, x: 2, y: -1 } }, 
      4: { scale: 1.4, y: -2, mobile: { scale: 1.3, y: 0 } }, 
      5: { scale: 1.6, y: -10, mobile: { scale: 1.25, y: 0 } },  
      6: { scale: 1.6, y: -5, mobile: { scale: 1.4, y: -1 } },  
      7: { scale: 1.70, y: -6, mobile: { scale: 1.5, y: -2.3 } },  
    }
  },
  { 
    id: 'slots_sphinx', weight: 4, mult: [0, 0, 1.5, 3, 8, 15], e: 'С', c: 'bg-purple-500/20 border-purple-600', hasBig: true,
    transforms: {
      2: { scale: 2.5, y: -4, x: -5, mobile: { scale: 2, y: 15, x: -1 } },
      3: { scale: 1.6, y: -2, x: -36, mobile: { scale: 1.7, y: 5, x: -3 } },
      4: { scale: 1.4, y: -2, x: 4, mobile: { scale: 1.35, y: 0, x: 1 } },
      5: { scale: 1.5, y: -3, x: 4, mobile: { scale: 1.4, y: -2, x: 1 } },
      6: { scale: 1.6, y: -6, x: 5, mobile: { scale: 1.5, y: -2, x: 1 } },
      7: { scale: 1.7, y: -6, x: 5, mobile: { scale: 1.5, y: -2, x: 1 } },
    }
  },
  { 
    id: 'slots_british', weight: 6, mult: [0, 0, 1, 2, 5, 10], e: 'Б', c: 'bg-blue-500/20 border-blue-600', hasBig: true,
    transforms: {
      2: { scale: 2, y: 30, x: -50, mobile: { scale: 2, y: 10, x: -15 } },
      3: { scale: 1.8, y: -6, x: -45, mobile: { scale: 1.7, y: -2, x: -12 } },
      4: { scale: 1.6, y: -12, mobile: { scale: 1.5, y: -3.5 } },
      5: { scale: 1.5, y: -4, mobile: { scale: 1.5, y: -3 } },
      6: { scale: 1.5, y: -4, mobile: { scale: 1.4, y: -1 } },
      7: { scale: 1.6, y: -4, mobile: { scale: 1.7, y: -3 } },
    }
  },
  { 
    id: 'slots_black', weight: 8, mult: [0, 0, 0.5, 1, 2, 5], e: 'Ч', c: 'bg-gray-700/20 border-gray-600', hasBig: true,
    transforms: {
      2: { scale: 2, y: -10, x: 60, mobile: { scale: 2, y: -3, x: 25 } },
      3: { scale: 1.4, y: -8, x: 50, mobile: { scale: 1.7, y: -2, x: 20 } },
      4: { scale: 1.55, y: -9.5, mobile: { scale: 1.5, y: -3.5 } },
      5: { scale: 1.6, y: -7, mobile: { scale: 1.3, y: -1 } },
      6: { scale: 1.55, y: -5, mobile: { scale: 1.3, y: 0 } },
      7: { scale: 1.7, y: -6, mobile: { scale: 1.4, y: -1 } },
    }
  },
  
  // === БУКВЫ ===
  { id: 'slots_a', weight: 12, mult: [0, 0, 0.2, 0.5, 1, 2], e: 'A', c: 'bg-red-500/20 border-red-600',
    transforms: { 
      2: { scale: 1.8, y: 0, mobile: { scale: 1.8 } }, 
      3: { scale: 1.5, y: 0, mobile: { scale: 1.4 } }, 
      4: { scale: 1.7, y: -2, mobile: { scale: 1.3 } }, 
      5: { scale: 1.8, y: 0, mobile: { scale: 1.4 } },  
      6: { scale: 2, y: 0, mobile: { scale: 1.4 } },  
      7: { scale: 2.5, y: 0, mobile: { scale: 1.5 } } 
    } 
  },
  { id: 'slots_k', weight: 14, mult: [0, 0, 0.2, 0.4, 0.8, 1.5], e: 'K', c: 'bg-orange-500/20 border-orange-600',
    transforms: { 
      2: { scale: 1.7, y: 0, mobile: { scale: 2 } }, 
      3: { scale: 1.5, y: 0, mobile: { scale: 1.7 } }, 
      4: { scale: 1.6, y: 0, mobile: { scale: 1.6 } }, 
      5: { scale: 2, y: 0, mobile: { scale: 1.7} },  
      6: { scale: 2, y: 0, mobile: { scale: 1.75 } },  
      7: { scale: 2.4, y: 0, mobile: { scale: 1.6 } } 
    }
  },
  { id: 'slots_q', weight: 16, mult: [0, 0, 0.1, 0.2, 0.5, 1], e: 'Q', c: 'bg-green-500/20 border-green-600',
    transforms: { 
      2: { scale: 1.6, y: 0, mobile: { scale: 1.75 } }, 
      3: { scale: 1.4, y: 0, mobile: { scale: 1.4 } }, 
      4: { scale: 1.45, y: 0, mobile: { scale: 1.5 } }, 
      5: { scale: 1.6, y: 0, mobile: { scale: 1.5 } },  
      6: { scale: 1.7, y: 0, mobile: { scale: 1.75 } },  
      7: { scale: 1.9, y: 0, mobile: { scale: 1.7 } } 
    }
  },
  
  // === СПЕЦИАЛЬНЫЕ ===
  { id: 'slots_fishbone', weight: 4, isWild: true, e: 'W', c: 'bg-teal-500/20 border-teal-500',
    transforms: {
      2: { scale: 1.8, y: 0, mobile: { scale: 1.75, x: 1 } }, 
      3: { scale: 1.6, y: 0, mobile: { scale: 1.6 } }, 
      4: { scale: 1.7, y: 0, mobile: { scale: 1.55 } }, 
      5: { scale: 1.9, y: 0, mobile: { scale: 1.7 } },  
      6: { scale: 2, y: 0, mobile: { scale: 1.8 } }, 
      7: { scale: 2.2, y: 0, mobile: { scale: 1.8 } },
    }
  },
  { id: 'slots_food', weight: 3, isBonus: true, e: 'B', c: 'bg-pink-500/20 border-pink-500',
    transforms: {
      2: { scale: 1.9, y: 0, mobile: { scale: 2 } }, 
      3: { scale: 1.7, y: 0, mobile: { scale: 1.8 } }, 
      4: { scale: 1.8, y: 0, mobile: { scale: 1.85 } }, 
      5: { scale: 1.9, y: 0, mobile: { scale: 1.9 } },  
      6: { scale: 2.2, y: 0, mobile: { scale: 1.9 } }, 
      7: { scale: 2.4, y: 0, mobile: { scale: 2 } }
    }
  }
];

interface SlotsProps {
  user: UserProfile;
}

export default function Slots({ user }: SlotsProps) {
  const [balance, setBalance] = useState(user.balance);
  const [bet, setBet] = useState(10);
  const [grid, setGrid] = useState<SlotSymbol[][]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [spinId, setSpinId] = useState(0);
  const [debugSymbol, setDebugSymbol] = useState<string>('none');
  
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      setBalance(docSnap.data()?.balance || 0);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const initialGrid: SlotSymbol[][] = [];
    for (let i = 0; i < 6; i++) {
      const rowsCount = Math.floor(Math.random() * 6) + 2;
      initialGrid.push(Array.from({ length: rowsCount }, () => getRandomSymbol()));
    }
    setGrid(initialGrid);
  }, []);

  const getRandomSymbol = (): SlotSymbol => {
    const totalWeight = SLOT_SYMBOLS.reduce((acc, s) => acc + s.weight, 0);
    let random = Math.random() * totalWeight;
    for (let s of SLOT_SYMBOLS) {
      if (random < s.weight) return s;
      random -= s.weight;
    }
    return SLOT_SYMBOLS[0];
  };

  const calculateMegawaysWin = (currentGrid: SlotSymbol[][], currentBet: number) => {
    let totalWin = 0;
    const symbolsToTest = SLOT_SYMBOLS.filter(s => !s.isWild && !s.isBonus);

    symbolsToTest.forEach(sym => {
      let ways = 1;
      let matchedReels = 0;
      for (let r = 0; r < 6; r++) {
        const count = currentGrid[r].filter(s => s.id === sym.id || s.isWild).length;
        if (count > 0) {
          matchedReels++;
          ways *= count;
        } else {
          break;
        }
      }
      if (matchedReels >= 3 && sym.mult) {
        totalWin += currentBet * sym.mult[matchedReels - 1] * ways;
      }
    });

    return { win: totalWin };
  };

  const spin = async () => {
    if (balance < bet && debugSymbol === 'none') return;
    if (isSpinning) return;
    setIsSpinning(true);
    setLastWin(0);

    try {
      if (debugSymbol !== 'none') {
        const forcedGrid: SlotSymbol[][] = [];
        const forcedSizes = [2, 3, 4, 5, 6, 7]; 
        const targetSymbol = SLOT_SYMBOLS.find(s => s.id === debugSymbol) || SLOT_SYMBOLS[0];
        
        for (let i = 0; i < 6; i++) {
          forcedGrid.push(Array.from({ length: forcedSizes[i] }, () => targetSymbol));
        }

        setSpinId(prev => prev + 1);
        setGrid(forcedGrid);
        
        setTimeout(() => setIsSpinning(false), 800);
        return;
      }

      await updateDoc(doc(db, 'users', user.uid), { balance: increment(-bet) });

      const newGrid: SlotSymbol[][] = [];
      for (let i = 0; i < 6; i++) {
        const rowsCount = Math.floor(Math.random() * 6) + 2;
        newGrid.push(Array.from({ length: rowsCount }, () => getRandomSymbol()));
      }

      const result = calculateMegawaysWin(newGrid, bet);

      setSpinId(prev => prev + 1);
      setGrid(newGrid);

      setTimeout(async () => {
        if (result.win > 0) {
          await updateDoc(doc(db, 'users', user.uid), { 
            balance: increment(result.win),
            xp: increment(bet / 5)
          });
          setLastWin(result.win);
        }
        setIsSpinning(false);
      }, 1000);

    } catch (error) {
      console.error("Spin error:", error);
      setIsSpinning(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-2 md:p-4 font-sans bg-[#0a0a0c]">
      {/* КОРПУС АВТОМАТА: p-2 для смартфонов, чтобы сэкономить место и сделать его "шире" */}
      <div className="w-full max-w-6xl bg-gradient-to-b from-gray-900 to-black p-2 md:p-6 rounded-[16px] md:rounded-[40px] border-t-2 md:border-t-4 border-yellow-500 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
        
        {/* ШАПКА АВТОМАТА */}
        <div className="flex justify-between items-end mb-2 md:mb-6 px-1 md:px-4 relative z-20">
          <div>
            <h2 className="text-xl md:text-4xl font-black text-white italic tracking-tighter leading-none drop-shadow-md">CAT HOUSE</h2>
            <span className="text-yellow-500 font-bold text-[8px] md:text-xs tracking-widest uppercase drop-shadow-sm">HD Megaways</span>
          </div>
          <div className="bg-black/50 px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-2xl border border-white/5 text-right shadow-md">
            <span className="text-gray-500 text-[8px] md:text-[10px] block font-bold uppercase">Баланс</span>
            <span className="text-sm md:text-2xl font-black text-green-400">{balance.toFixed(2)} ₽</span>
          </div>
        </div>

        {/* ИГРОВОЕ ПОЛЕ: Ключевое изменение здесь. 
            h-[220px] - делает рамку слота строго горизонтальной (широкой и низкой) на смартфонах.
            md:h-[600px] - оставляет слоты высокими и крупными на ПК. */}
        <div className="grid grid-cols-6 gap-[2px] md:gap-2 bg-black/80 p-1 md:p-3 rounded-xl md:rounded-3xl border md:border-2 border-white/5 h-[220px] sm:h-[280px] md:h-[600px] relative z-10">
          {grid.map((reel, rIdx) => (
            <div key={rIdx} className="relative w-full h-full rounded-md md:rounded-xl bg-black/40">
              <AnimatePresence>
                {reel.map((sym, sIdx) => {
                  const rowsCount = reel.length; 
                  const isEnlarged = rowsCount <= 3;
                  const imagePath = (isEnlarged && sym.hasBig) ? `${sym.id}_big.webp` : `${sym.id}.webp`;
                  const heightPct = 100 / rowsCount; 
                  
                  const config = sym.transforms?.[rowsCount] || {};
                  const mobileConfig = config.mobile || {};
                  
                  const scale = isMobile && mobileConfig.scale !== undefined ? mobileConfig.scale : (config.scale !== undefined ? config.scale : 1);
                  const x = isMobile && mobileConfig.x !== undefined ? mobileConfig.x : (config.x || 0);
                  const y = isMobile && mobileConfig.y !== undefined ? mobileConfig.y : (config.y || 0);

                  const shouldClip = isEnlarged && sym.hasBig && sym.id !== 'slots_meinkun';

                  return (
                    <motion.div
                      key={`${spinId}-${rIdx}-${sIdx}`}
                      initial={{ y: -800, filter: 'blur(4px)' }}
                      animate={{ y: 0, filter: 'blur(0px)' }}
                      exit={{ y: 800, filter: 'blur(4px)' }}
                      transition={{ 
                        type: 'tween', 
                        duration: 0.4, 
                        ease: "easeOut",
                        delay: rIdx * 0.1
                      }}
                      className={`absolute rounded-[4px] md:rounded-[12px] border-b-[2px] md:border-b-[6px] border-t border-white/10 shadow-xl flex items-center justify-center ${sym.c} ${shouldClip ? 'overflow-hidden' : ''}`}
                      style={{
                        height: `calc(${heightPct}% - 2px)`, // минимальный отступ на мобилках
                        top: `calc(${sIdx * heightPct}% + 1px)`, 
                        left: '1px',
                        right: '1px'
                      }}
                    >
                      <img 
                        src={`${ASSETS_URL}${imagePath}`} 
                        alt={sym.id}
                        className={`relative z-10 object-contain drop-shadow-xl transition-transform duration-300 ${isEnlarged ? 'w-full h-full p-[2px] md:p-2' : 'w-4/5 h-4/5 p-[1px] md:p-1'}`}
                        style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}
                        draggable="false"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) parent.innerHTML = `<span class="text-lg md:text-4xl text-white font-bold drop-shadow-md">${sym.e}</span>`;
                        }}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* ПАНЕЛЬ УПРАВЛЕНИЯ */}
        <div className="mt-2 md:mt-8 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-6 relative z-20 bg-gray-900/50 p-2 md:p-4 rounded-xl md:rounded-3xl backdrop-blur-sm border border-white/5">
          <div className="flex items-center justify-between md:justify-start gap-2 md:gap-4 bg-black/40 p-1 md:p-2 rounded-lg md:rounded-2xl border border-white/10 w-full md:w-auto">
            <button onClick={() => setBet(Math.max(10, bet - 10))} disabled={isSpinning || debugSymbol !== 'none'} className="w-10 h-10 md:w-14 md:h-14 rounded-md md:rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-lg md:text-xl transition-colors">-</button>
            <div className="text-center min-w-[80px] md:min-w-[120px]">
              <span className="text-gray-500 text-[8px] md:text-[10px] block font-bold uppercase tracking-wider">Ставка</span>
              <span className="text-lg md:text-2xl font-black text-white">{bet} ₽</span>
            </div>
            <button onClick={() => setBet(bet + 10)} disabled={isSpinning || debugSymbol !== 'none'} className="w-10 h-10 md:w-14 md:h-14 rounded-md md:rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-lg md:text-xl transition-colors">+</button>
          </div>

          <div className="h-10 md:h-16 flex items-center justify-center w-full md:w-48">
            <select 
              value={debugSymbol} 
              onChange={(e) => setDebugSymbol(e.target.value)}
              className="w-full bg-black/60 border border-yellow-500/50 text-yellow-400 font-bold p-2 md:p-3 rounded-lg md:rounded-xl outline-none hover:border-yellow-500 transition-colors cursor-pointer text-xs md:text-base"
            >
              <option value="none">🕹️ Обычная игра</option>
              <optgroup label="Тест: Картинки">
                {SLOT_SYMBOLS.map(sym => (
                  <option key={sym.id} value={sym.id}>{sym.e} {sym.id.replace('slots_', '')}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <button 
            onClick={spin}
            disabled={isSpinning || (balance < bet && debugSymbol === 'none')}
            className={`w-full md:w-64 py-2 md:py-5 rounded-lg md:rounded-2xl font-black text-lg md:text-2xl uppercase tracking-wider transition-all duration-200 ${
              isSpinning 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed scale-95' 
                : debugSymbol !== 'none'
                  ? 'bg-gradient-to-t from-purple-600 to-blue-500 text-white shadow-[0_10px_30px_rgba(147,51,234,0.3)] hover:scale-[1.02] active:scale-95'
                  : 'bg-gradient-to-t from-yellow-600 to-yellow-400 text-black shadow-[0_10px_30px_rgba(202,138,4,0.3)] hover:scale-[1.02] active:scale-95'
            }`}
          >
            {isSpinning ? 'Крутим...' : (debugSymbol !== 'none' ? 'ТЕСТ СПИН' : 'Спин')}
          </button>
        </div>
      </div>
    </div>
  );
}
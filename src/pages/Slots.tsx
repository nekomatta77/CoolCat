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

const SLOT_SYMBOLS: SlotSymbol[] = [
  // === ВЫСОКООПЛАЧИВАЕМЫЕ СИМВОЛЫ (КОТЫ) ===
  { 
    id: 'slots_meinkun', weight: 2, mult: [0, 0, 2, 5, 10, 25], e: 'М', c: 'bg-yellow-500/20 border-yellow-600', hasBig: true,
    transforms: {
      2: { scale: 2.3, x: 10, y: 10 }, 
      3: { scale: 1.9, y: -5 }, 
      4: { scale: 1.4, y: -2 }, 
      5: { scale: 1.6, y: -7 },  
      6: { scale: 1.6, y: -5 },  
      7: { scale: 1.70, y: -6 },  
    }
  },
  { 
    id: 'slots_sphinx', weight: 4, mult: [0, 0, 1.5, 3, 8, 15], e: 'С', c: 'bg-purple-500/20 border-purple-600', hasBig: true,
    transforms: {
      2: { scale: 2.5, y: -4, x: -5 },
      3: { scale: 1.6, y: -2, x: -36 },
      4: { scale: 1.4, y: -2, x: 4 },
      5: { scale: 1.5, y: -3, x: 4 },
      6: { scale: 1.6, y: -6, x: 5 },
      7: { scale: 1.7, y: -6, x: 5 },
    }
  },
  { 
    id: 'slots_british', weight: 6, mult: [0, 0, 1, 2, 5, 10], e: 'Б', c: 'bg-blue-500/20 border-blue-600', hasBig: true,
    transforms: {
      2: { scale: 2, y: 30, x: -50 },
      3: { scale: 1.8, y: -6, x: -45 },
      4: { scale: 1.6, y: -12 },
      5: { scale: 1.5, y: -4 },
      6: { scale: 1.5, y: -4 },
      7: { scale: 1.6, y: -4 },
    }
  },
  { 
    id: 'slots_black', weight: 8, mult: [0, 0, 0.5, 1, 2, 5], e: 'Ч', c: 'bg-gray-700/20 border-gray-600', hasBig: true,
    transforms: {
      2: { scale: 2, y: -10, x: 60 },
      3: { scale: 1.4, y: -8, x: 50 },
      4: { scale: 1.55, y: -9.5 },
      5: { scale: 1.6, y: -7 },
      6: { scale: 1.55, y: -5 },
      7: { scale: 1.7, y: -6 },
    }
  },
  
  // === БУКВЫ ===
  { id: 'slots_a', weight: 12, mult: [0, 0, 0.2, 0.5, 1, 2], e: 'A', c: 'bg-red-500/20 border-red-600',
    transforms: { 2: {scale: 0.8}, 3: {scale: 0.8}, 4: {scale: 0.8}, 5: {scale: 0.8}, 6: {scale: 0.8}, 7: {scale: 0.8} } 
  },
  { id: 'slots_k', weight: 14, mult: [0, 0, 0.2, 0.4, 0.8, 1.5], e: 'K', c: 'bg-orange-500/20 border-orange-600',
    transforms: { 2: {scale: 0.8}, 3: {scale: 0.8}, 4: {scale: 0.8}, 5: {scale: 0.8}, 6: {scale: 0.8}, 7: {scale: 0.8} }
  },
  { id: 'slots_q', weight: 16, mult: [0, 0, 0.1, 0.2, 0.5, 1], e: 'Q', c: 'bg-green-500/20 border-green-600',
    transforms: { 2: {scale: 0.8}, 3: {scale: 0.8}, 4: {scale: 0.8}, 5: {scale: 0.8}, 6: {scale: 0.8}, 7: {scale: 0.8} }
  },
  
  // === СПЕЦИАЛЬНЫЕ ===
  { id: 'slots_fishbone', weight: 4, isWild: true, e: 'W', c: 'bg-teal-500/20 border-teal-500',
    transforms: {
      2: { scale: 1.15, y: -5 }, 3: { scale: 1.20, y: -5 }, 4: { scale: 1.25, y: -5 }, 
      5: { scale: 1.30, y: -5 }, 6: { scale: 1.35, y: -5 }, 7: { scale: 1.40, y: -5 },
    }
  },
  { id: 'slots_food', weight: 3, isBonus: true, e: 'B', c: 'bg-pink-500/20 border-pink-500',
    transforms: {
      2: { scale: 1.1 }, 3: { scale: 1.1 }, 4: { scale: 1.15 }, 5: { scale: 1.15 }, 6: { scale: 1.2 }, 7: { scale: 1.2 }
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

  // СТЕЙТ ДЛЯ ДЕБАГА: хранит ID выбранного для настройки символа
  const [debugSymbol, setDebugSymbol] = useState<string>('none');

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
    if (balance < bet && debugSymbol === 'none') return; // В режиме дебага игнорируем баланс
    if (isSpinning) return;
    setIsSpinning(true);
    setLastWin(0);

    try {
      // === ЛОГИКА ДЕБАГ-РЕЖИМА ===
      if (debugSymbol !== 'none') {
        const forcedGrid: SlotSymbol[][] = [];
        const forcedSizes = [2, 3, 4, 5, 6, 7]; // Принудительно генерируем все 6 размеров
        const targetSymbol = SLOT_SYMBOLS.find(s => s.id === debugSymbol) || SLOT_SYMBOLS[0];
        
        for (let i = 0; i < 6; i++) {
          forcedGrid.push(Array.from({ length: forcedSizes[i] }, () => targetSymbol));
        }

        setSpinId(prev => prev + 1);
        setGrid(forcedGrid);
        
        // В дебаге деньги не снимаем, выигрыши не начисляем
        setTimeout(() => setIsSpinning(false), 800);
        return;
      }
      // ============================

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
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 font-sans bg-[#0a0a0c]">
      <div className="w-full max-w-6xl bg-gradient-to-b from-gray-900 to-black p-6 rounded-[40px] border-t-4 border-yellow-500 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        
        <div className="flex justify-between items-end mb-6 px-4">
          <div>
            <h2 className="text-4xl font-black text-white italic tracking-tighter leading-none">CAT HOUSE</h2>
            <span className="text-yellow-500 font-bold text-xs tracking-widest uppercase">HD Megaways</span>
          </div>
          <div className="bg-black/50 px-4 py-2 rounded-2xl border border-white/5 text-right">
            <span className="text-gray-500 text-[10px] block font-bold uppercase">Баланс</span>
            <span className="text-2xl font-black text-green-400">{balance.toFixed(2)} ₽</span>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2 bg-black/80 p-3 rounded-3xl border-2 border-white/5 h-[600px] overflow-hidden">
          {grid.map((reel, rIdx) => (
            <div key={rIdx} className="relative w-full h-full rounded-xl bg-black/40 overflow-hidden">
              <AnimatePresence>
                {reel.map((sym, sIdx) => {
                  const rowsCount = reel.length; 
                  const isEnlarged = rowsCount <= 3;
                  const imagePath = (isEnlarged && sym.hasBig) ? `${sym.id}_big.webp` : `${sym.id}.webp`;
                  const heightPct = 100 / rowsCount; 
                  
                  const config = sym.transforms?.[rowsCount] || {};
                  const scale = config.scale !== undefined ? config.scale : 1;
                  const x = config.x || 0;
                  const y = config.y || 0;

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
                      className={`absolute rounded-[12px] border-b-[6px] border-t border-white/10 shadow-xl flex items-center justify-center ${sym.c}`}
                      style={{
                        height: `calc(${heightPct}% - 8px)`,
                        top: `calc(${sIdx * heightPct}% + 4px)`, 
                        left: '4px',
                        right: '4px'
                      }}
                    >
                      <img 
                        src={`${ASSETS_URL}${imagePath}`} 
                        alt={sym.id}
                        className={`relative z-10 object-contain drop-shadow-xl transition-transform duration-300 ${isEnlarged ? 'w-full h-full p-2' : 'w-4/5 h-4/5 p-1'}`}
                        style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}
                        draggable="false"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) parent.innerHTML = `<span class="text-4xl text-white font-bold drop-shadow-md">${sym.e}</span>`;
                        }}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 w-full md:w-auto">
            <button onClick={() => setBet(Math.max(10, bet - 10))} disabled={isSpinning || debugSymbol !== 'none'} className="w-14 h-14 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-xl transition-colors">-</button>
            <div className="text-center min-w-[120px]">
              <span className="text-gray-500 text-[10px] block font-bold uppercase tracking-wider">Ставка</span>
              <span className="text-2xl font-black text-white">{bet} ₽</span>
            </div>
            <button onClick={() => setBet(bet + 10)} disabled={isSpinning || debugSymbol !== 'none'} className="w-14 h-14 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-xl transition-colors">+</button>
          </div>

          <div className="h-16 flex items-center justify-center w-full md:w-48">
            {/* ВЫБОР СИМВОЛА ДЛЯ ТЕСТА */}
            <select 
              value={debugSymbol} 
              onChange={(e) => setDebugSymbol(e.target.value)}
              className="bg-gray-800 border-2 border-yellow-500/50 text-yellow-400 font-bold p-3 rounded-xl outline-none hover:border-yellow-500 transition-colors cursor-pointer"
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
            className={`w-full md:w-64 py-5 rounded-2xl font-black text-2xl uppercase tracking-wider transition-all duration-200 ${
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
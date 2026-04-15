// src/pages/Slots.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { UserProfile } from '../types';

// Символы и их коэффициенты (на основе вашего Paytable)
const SYMBOLS = [
  { id: 'gem', emoji: '💎', mult: { 3: 1, 4: 5, 5: 50 }, weight: 5 },
  { id: 'cat_blue', emoji: '🔵', mult: { 3: 0.4, 4: 2, 5: 20 }, weight: 10 },
  { id: 'cat_orange', emoji: '🟠', mult: { 3: 0.2, 4: 1, 5: 10 }, weight: 15 },
  { id: 'fish', emoji: '🐟', mult: { 3: 0.04, 4: 0.2, 5: 0.4 }, weight: 25 },
  { id: 'bowl', emoji: '🥣', mult: { 3: 0.02, 4: 0.1, 5: 0.2 }, weight: 35 },
  { id: 'wild', emoji: '🌟', isWild: true, weight: 3 },
  { id: 'bonus', emoji: '🎁', isBonus: true, weight: 2 }
];

// 10 выигрышных линий
const LINES = [
  [2, 2, 2, 2, 2], // 1: Центральная горизонталь
  [1, 1, 1, 1, 1], // 2: Вторая сверху
  [3, 3, 3, 3, 3], // 3: Вторая снизу
  [0, 1, 2, 3, 4], // 4: Диагональ вниз
  [4, 3, 2, 1, 0], // 5: Диагональ вверх
  [0, 0, 0, 0, 0], // 6: Верхняя горизонталь
  [4, 4, 4, 4, 4], // 7: Нижняя горизонталь
  [1, 2, 3, 2, 1], // 8: Зигзаг малый
  [3, 2, 1, 2, 3], // 9: Зигзаг инвертированный
  [0, 1, 0, 1, 0], // 10: Волна
];

interface SlotsProps {
  user: UserProfile;
}

export default function Slots({ user }: SlotsProps) {
  const [balance, setBalance] = useState(user.balance);
  const [bet, setBet] = useState(10);
  const [grid, setGrid] = useState<any[][]>(Array(5).fill(Array(5).fill(SYMBOLS[0])));
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [showBonus, setShowBonus] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      setBalance(doc.data()?.balance || 0);
    });
    return () => unsubscribe();
  }, [user]);

  const getRandomSymbol = () => {
    const totalWeight = SYMBOLS.reduce((acc, s) => acc + s.weight, 0);
    let random = Math.random() * totalWeight;
    for (let s of SYMBOLS) {
      if (random < s.weight) return s;
      random -= s.weight;
    }
    return SYMBOLS[0];
  };

  const calculateWin = (currentGrid: any[][]) => {
    let totalMult = 0;
    LINES.forEach(line => {
      let matches = 1;
      let firstSym = currentGrid[line[0]][0];
      
      if (firstSym.isBonus) return;

      for (let i = 1; i < 5; i++) {
        let currentSym = currentGrid[line[i]][i];
        if (currentSym.id === firstSym.id || currentSym.isWild || (firstSym.isWild && !currentSym.isBonus)) {
          matches++;
          if (firstSym.isWild && !currentSym.isWild) firstSym = currentSym;
        } else {
          break;
        }
      }
      
      if (firstSym.mult && firstSym.mult[matches as keyof typeof firstSym.mult]) {
        totalMult += firstSym.mult[matches as keyof typeof firstSym.mult];
      }
    });

    const bonusCount = currentGrid.flat().filter(s => s.isBonus).length;
    return { win: totalMult * bet, isBonus: bonusCount >= 3 };
  };

  const spin = async () => {
    if (balance < bet || isSpinning) return;
    setIsSpinning(true);
    setLastWin(0);

    // Списание баланса напрямую в Firebase
    await updateDoc(doc(db, 'users', user.uid), { balance: increment(-bet) });

    const newGrid = Array(5).fill(0).map(() => Array(5).fill(0).map(() => getRandomSymbol()));

    let intervals = 0;
    const timer = setInterval(() => {
      setGrid(Array(5).fill(0).map(() => Array(5).fill(0).map(() => getRandomSymbol())));
      intervals++;
      if (intervals > 15) {
        clearInterval(timer);
        setGrid(newGrid);
        const result = calculateWin(newGrid);
        
        if (result.win > 0) {
          updateDoc(doc(db, 'users', user.uid), { balance: increment(result.win) });
          setLastWin(result.win);
        }
        
        if (result.isBonus) setShowBonus(true);
        setIsSpinning(false);
      }
    }, 100);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 font-sans">
      <div className="w-full max-w-4xl bg-gray-900/50 backdrop-blur-xl p-4 md:p-8 rounded-[40px] border border-white/10 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-yellow-400 italic tracking-tighter">SLOTS: CAT PARADISE</h2>
          <div className="bg-black/40 px-4 py-2 rounded-2xl border border-white/5">
            <span className="text-gray-400 text-xs block">БАЛАНС</span>
            <span className="text-green-400 font-bold">{balance.toFixed(2)} ₽</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1 md:gap-3 bg-black/60 p-2 md:p-4 rounded-3xl border-4 border-gray-800 mb-8 aspect-square md:aspect-auto">
          {grid.map((row, rIdx) => 
            row.map((sym, cIdx) => (
              <div key={`${rIdx}-${cIdx}`} className="bg-gray-800/50 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-5xl border border-white/5 shadow-inner transition-all">
                {sym.emoji}
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5 w-full md:w-auto">
            <button onClick={() => setBet(Math.max(10, bet - 10))} className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-colors">-</button>
            <div className="flex-1 text-center min-w-[80px]">
              <span className="text-gray-500 text-[10px] block uppercase font-bold">Ставка</span>
              <span className="text-white font-black">{bet} ₽</span>
            </div>
            <button onClick={() => setBet(bet + 10)} className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-colors">+</button>
          </div>

          <div className="text-center">
            {lastWin > 0 && (
              <div className="animate-bounce text-green-400 font-black text-2xl mb-2">+{lastWin.toFixed(2)} ₽</div>
            )}
          </div>

          <button 
            onClick={spin}
            disabled={isSpinning || balance < bet}
            className={`w-full md:w-48 py-4 rounded-2xl font-black text-xl transition-all active:scale-95 shadow-lg ${
              isSpinning ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:shadow-yellow-500/20'
            }`}
          >
            {isSpinning ? 'КРУТИМ...' : 'ВРАЩАТЬ'}
          </button>
        </div>
      </div>

      {showBonus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-gray-900 border-2 border-yellow-400 p-8 rounded-[40px] max-w-lg text-center shadow-[0_0_50px_rgba(250,204,21,0.3)]">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-3xl font-black text-white mb-2 uppercase italic">Охота за котиками!</h3>
            <p className="text-gray-400 mb-6">Вы поймали 3+ бонусных символа! Вам начислен супер-бонус в размере <span className="text-yellow-400 font-bold">x50</span> от вашей ставки!</p>
            <button 
              onClick={() => {
                updateDoc(doc(db, 'users', user.uid), { balance: increment(bet * 50) });
                setShowBonus(false);
              }}
              className="px-10 py-4 bg-yellow-400 text-black font-black rounded-2xl hover:bg-yellow-300 transition-colors uppercase"
            >
              Забрать {(bet * 50).toFixed(2)} ₽
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
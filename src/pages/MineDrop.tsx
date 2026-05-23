// src/pages/MineDrop.tsx
import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Pickaxe, Eye, Coins, ShieldCheck, Play, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface MineDropProps {
  user: UserProfile;
}

const PICKAXE_TIERS = ['wood', 'stone', 'gold', 'iron', 'diamond'];
const PICKAXE_MULT = { wood: 1, stone: 1.5, gold: 2, iron: 3, diamond: 5 };

// Пути к твоим картинкам
const ASSETS = {
  pickaxes: {
    wood: '/assets/minedrop/pix1.webp',
    stone: '/assets/minedrop/pix2.webp',
    gold: '/assets/minedrop/pix3.webp',
    iron: '/assets/minedrop/pix4.webp',
    diamond: '/assets/minedrop/pix5.webp',
  },
  book: '/assets/minedrop/book.webp',
  eye: '/assets/minedrop/endereye.webp',
  bomb: '/assets/minedrop/tnt.webp',
  bg: '/assets/minedrop/bg.webp',
};

const BLOCK_TYPES = ['dirt', 'stone', 'emerald', 'gold', 'diamond', 'obsidian'];
const BLOCK_VALUES = { dirt: 0.1, stone: 0.2, emerald: 0.5, gold: 1, diamond: 2, obsidian: 5 };
// Цвета для блоков оставили пока CSS-стилями (позже их тоже можно заменить на картинки)
const BLOCK_COLORS: Record<string, string> = {
  dirt: 'bg-[#8B5A2B] border-[#5C3A21]', stone: 'bg-[#808080] border-[#555555]', emerald: 'bg-[#50C878] border-[#2E8B57]',
  gold: 'bg-[#FFD700] border-[#DAA520]', diamond: 'bg-[#00FFFF] border-[#00CED1]', obsidian: 'bg-[#4B0082] border-[#290066]',
};

type InvItem = { type: 'empty' | 'pickaxe' | 'bomb' | 'book' | 'eye'; tier?: string; dur?: number; glow?: boolean };
type BlockItem = { type: string; destroyed: boolean; value: number; highlight?: boolean };

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
const formatBalance = (val: number) => (Math.floor(val * 100) / 100).toFixed(2);

export default function MineDrop({ user }: MineDropProps) {
  const [betInput, setBetInput] = useState('10');
  const bet = parseFloat(betInput.replace(',', '.')) || 0;
  
  const [loading, setLoading] = useState(false);
  const [enderEyes, setEnderEyes] = useState(0); 
  const [totalWin, setTotalWin] = useState(0);

  const [inventory, setInventory] = useState<InvItem[][]>(Array(5).fill(Array(3).fill({ type: 'empty' })));
  const [blocks, setBlocks] = useState<BlockItem[][]>(Array(5).fill(Array(5).fill({ type: 'dirt', destroyed: false, value: 0 })));
  const [chests, setChests] = useState<{open: boolean, mult: number}[]>(Array(5).fill({open: false, mult: 0}));

  const generateGrid = () => {
    const newInv: InvItem[][] = [];
    const newBlocks: BlockItem[][] = [];
    
    for (let c = 0; c < 5; c++) {
      const colInv: InvItem[] = [];
      for (let r = 0; r < 3; r++) {
        const rand = Math.random();
        if (rand < 0.20) colInv.push({ type: 'pickaxe', tier: PICKAXE_TIERS[Math.floor(Math.random() * 3)], dur: Math.floor(Math.random() * 3) + 1 });
        else if (rand < 0.25) colInv.push({ type: 'bomb' });
        else if (rand < 0.30) colInv.push({ type: 'book' });
        else if (rand < 0.32) colInv.push({ type: 'eye' });
        else colInv.push({ type: 'empty' });
      }
      newInv.push(colInv);

      const colBlocks: BlockItem[] = [];
      for (let r = 0; r < 5; r++) {
        const rand = Math.random();
        let bType = 'dirt';
        if (rand > 0.98) bType = 'obsidian';
        else if (rand > 0.9) bType = 'diamond';
        else if (rand > 0.7) bType = 'gold';
        else if (rand > 0.4) bType = 'emerald';
        else if (rand > 0.2) bType = 'stone';
        colBlocks.push({ type: bType, destroyed: false, value: BLOCK_VALUES[bType as keyof typeof BLOCK_VALUES] });
      }
      newBlocks.push(colBlocks);
    }
    return { newInv, newBlocks };
  };

  const handlePlay = async () => {
    if (loading || bet > user.balance || bet < 1) return;
    setLoading(true);
    setTotalWin(0);
    setChests(Array(5).fill({open: false, mult: 0}));

    try {
      await updateDoc(doc(db, 'users', user.uid), { balance: increment(-bet) });
    } catch (e) { setLoading(false); return; }

    const { newInv, newBlocks } = generateGrid();
    let currentInv = JSON.parse(JSON.stringify(newInv));
    let currentBlocks = JSON.parse(JSON.stringify(newBlocks));
    let currentWin = 0;

    setInventory(currentInv);
    setBlocks(currentBlocks);
    await delay(600); 

    // ЭТАП 1: Книги
    let hasBooks = false;
    for (let c = 0; c < 5; c++) {
      const hasBook = currentInv[c].some((item: InvItem) => item.type === 'book');
      if (hasBook) {
        hasBooks = true;
        currentInv[c] = currentInv[c].map((item: InvItem) => {
          if (item.type === 'book') return { ...item, glow: true };
          if (item.type === 'pickaxe') {
             const curTierIdx = PICKAXE_TIERS.indexOf(item.tier!);
             const newTier = PICKAXE_TIERS[Math.min(curTierIdx + 1, PICKAXE_TIERS.length - 1)];
             return { ...item, tier: newTier, glow: true };
          }
          return item;
        });
      }
    }
    if (hasBooks) {
      setInventory([...currentInv]);
      await delay(800);
      currentInv = currentInv.map((col: InvItem[]) => col.map(item => item.type === 'book' ? { type: 'empty' } : { ...item, glow: false }));
      setInventory([...currentInv]);
      await delay(400);
    }

    // ЭТАП 2: Глаза
    let eyesFound = 0;
    currentInv.forEach((col: InvItem[]) => col.forEach((item: InvItem) => { if (item.type === 'eye') eyesFound++; }));
    if (eyesFound > 0) {
      setEnderEyes(prev => Math.min(3, prev + eyesFound));
      currentInv = currentInv.map((col: InvItem[]) => col.map(item => item.type === 'eye' ? { type: 'empty' } : item));
      setInventory([...currentInv]);
      await delay(500);
    }

    // ЭТАП 3: Динамит
    let hasBombs = false;
    for (let c = 0; c < 5; c++) {
      if (currentInv[c].some((item: InvItem) => item.type === 'bomb')) {
        hasBombs = true;
        for (let r = 0; r < 5; r++) {
          if (!currentBlocks[c][r].destroyed) {
            currentBlocks[c][r].destroyed = true;
            currentWin += currentBlocks[c][r].value * bet;
            break;
          }
        }
      }
    }
    if (hasBombs) {
      currentInv = currentInv.map((col: InvItem[]) => col.map(item => item.type === 'bomb' ? { type: 'empty' } : item));
      setInventory([...currentInv]);
      setBlocks([...currentBlocks]);
      setTotalWin(currentWin);
      await delay(600);
    }

    // ЭТАП 4: Кирки
    let hasPickaxes = false;
    for (let c = 0; c < 5; c++) {
      let totalDur = 0;
      let maxMult = 1;
      currentInv[c].forEach((item: InvItem) => {
        if (item.type === 'pickaxe') {
          hasPickaxes = true;
          totalDur += item.dur || 0;
          const mult = PICKAXE_MULT[item.tier as keyof typeof PICKAXE_MULT] || 1;
          if (mult > maxMult) maxMult = mult;
        }
      });

      for (let r = 0; r < 5; r++) {
        if (totalDur <= 0) break;
        if (!currentBlocks[c][r].destroyed) {
          currentBlocks[c][r].destroyed = true;
          currentBlocks[c][r].highlight = true;
          currentWin += (currentBlocks[c][r].value * bet * maxMult);
          totalDur--;
        }
      }
    }

    if (hasPickaxes) {
      setBlocks([...currentBlocks]);
      setTotalWin(currentWin);
      await delay(800);
      currentBlocks = currentBlocks.map((col: BlockItem[]) => col.map(b => ({ ...b, highlight: false })));
      setBlocks([...currentBlocks]);
    }

    // ЭТАП 5: Сундуки
    let finalWin = currentWin;
    const newChests = [...chests];
    let chestOpened = false;
    
    for (let c = 0; c < 5; c++) {
      const allDestroyed = currentBlocks[c].every((b: BlockItem) => b.destroyed);
      if (allDestroyed) {
        chestOpened = true;
        const rand = Math.random();
        let mult = 2;
        if (rand > 0.9) mult = 10;
        else if (rand > 0.7) mult = 5;
        else if (rand > 0.4) mult = 3;
        
        newChests[c] = { open: true, mult };
        finalWin += (bet * mult); 
      }
    }

    if (chestOpened) {
      setChests(newChests);
      setTotalWin(finalWin);
      await delay(800);
    }

    if (finalWin > 0) {
      const payout = Math.round(finalWin * 100) / 100;
      try { await updateDoc(doc(db, 'users', user.uid), { balance: increment(payout) }); } catch (e) { console.error(e); }
    }

    setLoading(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6 pb-12 relative flex flex-col min-h-[calc(100vh-120px)] px-2 sm:px-0">
      
      {/* ХЕДЕР */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 shrink-0 pt-4 sm:pt-0 mb-2">
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded-[1.2rem] lg:rounded-3xl flex items-center justify-center shadow-lg shadow-amber-900/30 shrink-0 border-b-4 border-amber-900">
            <Pickaxe className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-1">MineDrop</h1>
            <p className="text-slate-400 font-medium text-xs lg:text-base hidden sm:block">Ломай блоки, ищи сокровища и открывай сундуки.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 flex-1">
        
        {/* ЛЕВАЯ ПАНЕЛЬ (УПРАВЛЕНИЕ) */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col gap-5">
            
            <div className="bg-slate-900 p-4 rounded-2xl flex items-center justify-between border-4 border-slate-700 shadow-inner">
              <div className="flex items-center gap-2">
                {/* Око Эндера из ассетов, если картинка не загрузится - будет фоллбэк */}
                <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center">
                   <img src={ASSETS.eye} alt="eye" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                   <Eye className="w-6 h-6 text-emerald-400 absolute -z-10" />
                </div>
                <span className="font-black text-slate-300 uppercase text-xs tracking-widest">Око Эндера</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={cn("w-3 h-3 rounded-full transition-all", enderEyes >= i ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]" : "bg-slate-700")} />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200 focus-within:border-brand-300 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ставка</span>
                  <span className="text-[10px] font-black uppercase text-brand-500 tracking-widest bg-brand-100/50 px-2 py-0.5 rounded-md">
                    {formatBalance(user.balance)}
                  </span>
                </div>
                <div className="flex items-center">
                  <Coins className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={betInput}
                    disabled={loading}
                    onChange={(e) => { const val = e.target.value.replace(',', '.'); if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) setBetInput(val); }}
                    className="w-full bg-transparent font-black text-slate-900 text-xl outline-none disabled:opacity-50 min-w-0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { if(!loading) setBetInput(Math.max(1, (bet / 2)).toFixed(0)); }} disabled={loading} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs py-3 rounded-xl transition-colors disabled:opacity-50">/2</button>
                <button onClick={() => { if(!loading) setBetInput(Math.min(user.balance, Math.max(1, bet * 2)).toFixed(0)); }} disabled={loading} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs py-3 rounded-xl transition-colors disabled:opacity-50">X2</button>
              </div>
            </div>

            <button
              onClick={handlePlay}
              disabled={loading || bet > user.balance || bet < 1}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-brand-200 uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading ? 'ИГРАЕМ...' : 'НАЧАТЬ (СПИН)'} <Play className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* ИГРОВОЕ ПОЛЕ */}
        <div 
          className="xl:col-span-9 rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-8 flex flex-col items-center justify-between relative overflow-hidden shadow-2xl border-[6px] sm:border-[12px] border-slate-800"
          style={{ backgroundImage: `url(${ASSETS.bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          {/* Затемнение фона, чтобы элементы лучше читались */}
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />
          
          <div className="relative z-10 w-full flex flex-col items-center">
            {/* ИНВЕНТАРЬ (5 колонок x 3 строки) */}
            <div className="w-full max-w-[600px] bg-slate-800/80 backdrop-blur-md p-3 rounded-xl border-[4px] border-slate-600 shadow-inner mb-6">
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2].map((r) => (
                  [0, 1, 2, 3, 4].map((c) => {
                    const item = inventory[c][r];
                    return (
                      <div key={`inv-${c}-${r}`} className={cn("aspect-square bg-[#8B8B8B] border-t-4 border-l-4 border-t-[#AFAFAF] border-l-[#AFAFAF] border-b-4 border-r-4 border-b-[#505050] border-r-[#505050] flex items-center justify-center relative transition-all duration-300", item.glow ? "shadow-[0_0_15px_#facc15] z-10 scale-110" : "")}>
                        <AnimatePresence mode="popLayout">
                          {item.type !== 'empty' && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }} className="relative z-10 w-full h-full flex items-center justify-center p-1 sm:p-2">
                              
                              {/* Рендер Текстур */}
                              {item.type === 'pickaxe' && <img src={ASSETS.pickaxes[item.tier as keyof typeof ASSETS.pickaxes]} className="w-full h-full object-contain drop-shadow-md" alt="pickaxe" />}
                              {item.type === 'bomb' && <img src={ASSETS.bomb} className="w-full h-full object-contain drop-shadow-md" alt="bomb" />}
                              {item.type === 'book' && <img src={ASSETS.book} className="w-full h-full object-contain drop-shadow-md" alt="book" />}
                              {item.type === 'eye' && <img src={ASSETS.eye} className="w-full h-full object-contain drop-shadow-md" alt="eye" />}
                              
                              {item.type === 'pickaxe' && <span className="absolute bottom-0 right-0 bg-slate-900 text-white text-[8px] sm:text-[10px] font-black px-1 rounded">{item.dur}</span>}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                ))}
              </div>
            </div>

            {/* ПОЛЕ БЛОКОВ (5 колонок x 5 строк) */}
            <div className="w-full max-w-[600px] mb-4 relative">
              <div className="grid grid-cols-5 gap-1 sm:gap-2">
                {[0, 1, 2, 3, 4].map((r) => (
                  [0, 1, 2, 3, 4].map((c) => {
                    const block = blocks[c][r];
                    return (
                      <div key={`block-${c}-${r}`} className="aspect-square relative flex items-center justify-center">
                        <AnimatePresence>
                          {!block.destroyed && (
                            <motion.div exit={{ scale: 0, opacity: 0, rotate: 10 }} className={cn("absolute inset-0 rounded-sm sm:rounded-md border-b-4 border-r-4 shadow-md", BLOCK_COLORS[block.type], block.highlight ? "brightness-150" : "")}>
                              <div className="w-full h-full bg-white/10 mix-blend-overlay"></div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {block.destroyed && <div className="absolute inset-0 bg-black/40 rounded-md shadow-inner" />}
                      </div>
                    );
                  })
                ))}
              </div>
            </div>

            {/* СУНДУКИ (1 строка x 5 колонок) */}
            <div className="w-full max-w-[600px] border-t-4 border-dashed border-slate-600/50 pt-4">
              <div className="grid grid-cols-5 gap-1 sm:gap-2">
                {chests.map((chest, i) => (
                  <div key={`chest-${i}`} className={cn("aspect-square rounded-lg flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500", chest.open ? "bg-amber-400 border-4 border-amber-500 shadow-[0_0_20px_#fbbf24] scale-110 z-10" : "bg-amber-800 border-4 border-amber-950 opacity-90")}>
                    {chest.open ? (
                      <>
                        <span className="text-[10px] font-black text-amber-900 uppercase">Win</span>
                        <span className="text-xl font-black text-amber-900 leading-none">x{chest.mult}</span>
                      </>
                    ) : (
                      <>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-2 bg-slate-300 border border-slate-800 rounded-sm z-10" />
                        <Box className="w-8 h-8 text-amber-600 opacity-50" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* СТРОКА ВЫИГРЫША */}
            <div className="mt-8 w-full max-w-[600px] bg-slate-900/80 backdrop-blur-sm rounded-xl p-4 border-2 border-slate-700 flex items-center justify-center gap-4">
              <span className="text-slate-400 font-mono text-sm sm:text-base uppercase">Total Win:</span>
              <span className={cn("font-black text-2xl sm:text-3xl transition-colors duration-300", totalWin > 0 ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "text-slate-500")}>
                {formatBalance(totalWin)} <span className="text-sm">CAT</span>
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
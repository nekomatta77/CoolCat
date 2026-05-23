// src/pages/MineDrop.tsx
import { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { RotateCcw, Diamond, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface MineDropProps {
  user: UserProfile;
}

const PICKAXE_TIERS = ['wood', 'stone', 'gold', 'iron', 'diamond'];
const PICKAXE_MULT = { wood: 1, stone: 1.5, gold: 2, iron: 3, diamond: 5 };

// Прямые ссылки на твой репозиторий whatsacas
const GH_BASE = 'https://raw.githubusercontent.com/nekomatta77/whatsacas/main/MineDrop';

const ASSETS = {
  pickaxes: {
    wood: `${GH_BASE}/pix1.webp`,
    stone: `${GH_BASE}/pix2.webp`,
    gold: `${GH_BASE}/pix3.webp`,
    iron: `${GH_BASE}/pix4.webp`,
    diamond: `${GH_BASE}/pix5.webp`,
  },
  book: `${GH_BASE}/book.webp`,
  eye: `${GH_BASE}/endereye.webp`,
  bomb: `${GH_BASE}/tnt.webp`,
  bg: `${GH_BASE}/bg.webp`,
  clouds: `${GH_BASE}/clouds.webp`,
  chests: {
    closed: `${GH_BASE}/chest_closed.webp`,
    opened: `${GH_BASE}/chest_opened.webp`,
  },
  blocks: {
    dirt: `${GH_BASE}/dirt.webp`,
    stone: `${GH_BASE}/stone.webp`,
    redstone: `${GH_BASE}/redstone.webp`,
    gold: `${GH_BASE}/gold.webp`,
    diamond: `${GH_BASE}/diamond.webp`,
    obsidian: `${GH_BASE}/obsidian_1.webp`,
  }
};

const BLOCK_TYPES = ['dirt', 'stone', 'redstone', 'gold', 'diamond', 'obsidian'];
const BLOCK_VALUES = { dirt: 0.1, stone: 0.2, redstone: 0.5, gold: 1, diamond: 2, obsidian: 5 };

type InvItem = { type: 'empty' | 'pickaxe' | 'bomb' | 'book' | 'eye'; tier?: string; dur?: number; glow?: boolean; striking?: boolean };
type BlockItem = { type: string; destroyed: boolean; value: number; highlight?: boolean; shattering?: boolean };

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
const formatBalance = (val: number) => (Math.floor(val * 100) / 100).toFixed(2);

export default function MineDrop({ user }: MineDropProps) {
  // === СОСТОЯНИЯ ЗАГРУЗКИ И ФУЛЛСКРИНА ===
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // === ИГРОВЫЕ СОСТОЯНИЯ ===
  const [betInput, setBetInput] = useState('10');
  const bet = parseFloat(betInput.replace(',', '.')) || 0;
  const [loading, setLoading] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [enderEyes, setEnderEyes] = useState(0); 
  const [totalWin, setTotalWin] = useState(0);
  const [isBonusMode, setIsBonusMode] = useState(false);
  const [bonusSpinsLeft, setBonusSpinsLeft] = useState(0);

  const [inventory, setInventory] = useState<InvItem[][]>(Array(5).fill(Array(3).fill({ type: 'empty' })));
  const [blocks, setBlocks] = useState<BlockItem[][]>(Array(5).fill(Array(5).fill({ type: 'dirt', destroyed: false, value: 0 })));
  const [chests, setChests] = useState<{open: boolean, mult: number}[]>(Array(5).fill({open: false, mult: 0}));

  const autoPlayRef = useRef(autoPlay);
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  // === ПРЕДЗАГРУЗКА ТЕКСТУР (PRELOADER) ===
  useEffect(() => {
    const imageUrls = [
      ...Object.values(ASSETS.pickaxes),
      ASSETS.book, ASSETS.eye, ASSETS.bomb, ASSETS.bg, ASSETS.clouds,
      ...Object.values(ASSETS.chests),
      ...Object.values(ASSETS.blocks)
    ];
    let loadedCount = 0;
    
    if (imageUrls.length === 0) {
        setIsLoaded(true);
        return;
    }

    imageUrls.forEach(url => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loadedCount++;
        setLoadProgress(Math.floor((loadedCount / imageUrls.length) * 100));
        if (loadedCount === imageUrls.length) setTimeout(() => setIsLoaded(true), 500);
      };
      img.onerror = () => {
        loadedCount++;
        setLoadProgress(Math.floor((loadedCount / imageUrls.length) * 100));
        if (loadedCount === imageUrls.length) setTimeout(() => setIsLoaded(true), 500);
      };
    });
  }, []);

  // === ПЕРЕХОД В ПОЛНЫЙ ЭКРАН ===
  const handleStartFullscreen = async () => {
    if (containerRef.current) {
      try {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } catch (e) {
        console.error("Ошибка перехода в полный экран", e);
      }
    }
    setIsStarted(true);
  };

  const handleHalfBet = () => {
    if (loading || autoPlay || isBonusMode) return;
    setBetInput(Math.max(1, (bet / 2)).toFixed(0));
  };
  const handleDoubleBet = () => {
    if (loading || autoPlay || isBonusMode) return;
    setBetInput(Math.min(user.balance, Math.max(1, bet * 2)).toFixed(0));
  };

  const generateGrid = (bonus: boolean = false) => {
    const newInv: InvItem[][] = [];
    const newBlocks: BlockItem[][] = [];
    
    for (let c = 0; c < 5; c++) {
      const colInv: InvItem[] = [];
      for (let r = 0; r < 3; r++) {
        const rand = Math.random();
        if (bonus) {
            if (rand < 0.40) colInv.push({ type: 'pickaxe', tier: PICKAXE_TIERS[Math.floor(Math.random() * 3) + 2], dur: Math.floor(Math.random() * 3) + 2 });
            else if (rand < 0.60) colInv.push({ type: 'bomb' });
            else colInv.push({ type: 'empty' });
        } else {
            if (rand < 0.20) colInv.push({ type: 'pickaxe', tier: PICKAXE_TIERS[Math.floor(Math.random() * 3)], dur: Math.floor(Math.random() * 3) + 1 });
            else if (rand < 0.25) colInv.push({ type: 'bomb' });
            else if (rand < 0.30) colInv.push({ type: 'book' });
            else if (rand < 0.32) colInv.push({ type: 'eye' });
            else colInv.push({ type: 'empty' });
        }
      }
      newInv.push(colInv);

      const colBlocks: BlockItem[] = [];
      for (let r = 0; r < 5; r++) {
        const rand = Math.random();
        let bType = 'dirt';
        if (bonus) {
            if (rand > 0.8) bType = 'obsidian'; else if (rand > 0.5) bType = 'diamond'; else if (rand > 0.2) bType = 'gold'; else bType = 'redstone';
        } else {
            if (rand > 0.98) bType = 'obsidian'; else if (rand > 0.9) bType = 'diamond'; else if (rand > 0.7) bType = 'gold'; else if (rand > 0.4) bType = 'redstone'; else if (rand > 0.2) bType = 'stone';
        }
        colBlocks.push({ type: bType, destroyed: false, value: BLOCK_VALUES[bType as keyof typeof BLOCK_VALUES] });
      }
      newBlocks.push(colBlocks);
    }
    return { newInv, newBlocks };
  };

  const executeSpin = async (isBonusSpin: boolean = false) => {
    setLoading(true);
    setTotalWin(0);
    setChests(Array(5).fill({open: false, mult: 0}));

    if (!isBonusSpin) {
      try { await updateDoc(doc(db, 'users', user.uid), { balance: increment(-bet) }); } catch (e) { setLoading(false); setAutoPlay(false); return; }
    }

    const { newInv, newBlocks } = generateGrid(isBonusSpin);
    let currentInv = JSON.parse(JSON.stringify(newInv));
    let currentBlocks = JSON.parse(JSON.stringify(newBlocks));
    let currentWin = 0;

    setInventory(currentInv);
    setBlocks(currentBlocks);
    await delay(600); 

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

    if (!isBonusSpin) {
        let eyesFound = 0;
        currentInv.forEach((col: InvItem[]) => col.forEach((item: InvItem) => { if (item.type === 'eye') eyesFound++; }));
        if (eyesFound > 0) {
          setEnderEyes(prev => {
              const next = prev + eyesFound;
              if (next >= 3) { setTimeout(() => startBonusGame(), 2000); return 0; }
              return next;
          });
          currentInv = currentInv.map((col: InvItem[]) => col.map(item => item.type === 'eye' ? { type: 'empty' } : item));
          setInventory([...currentInv]);
          await delay(500);
        }
    }

    let hasBombs = false;
    for (let c = 0; c < 5; c++) {
      if (currentInv[c].some((item: InvItem) => item.type === 'bomb')) {
        hasBombs = true;
        for (let r = 0; r < 5; r++) {
          if (!currentBlocks[c][r].destroyed) {
            currentBlocks[c][r].shattering = true;
            setBlocks([...currentBlocks]);
            await delay(200);
            currentBlocks[c][r].shattering = false;
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
      await delay(400);
    }

    let maxDurability = 0;
    currentInv.forEach((col: InvItem[]) => col.forEach((item: InvItem) => { if (item.type === 'pickaxe' && item.dur! > maxDurability) maxDurability = item.dur!; }));

    if (maxDurability > 0) {
        for (let strike = 0; strike < maxDurability; strike++) {
            let struckThisTurn = false;
            
            for (let c = 0; c < 5; c++) {
                currentInv[c] = currentInv[c].map((item: InvItem) => {
                    if (item.type === 'pickaxe' && item.dur! > 0) return { ...item, striking: true };
                    return item;
                });
            }
            setInventory([...currentInv]);
            await delay(150); 

            for (let c = 0; c < 5; c++) {
                let colHasActivePickaxe = false;
                let maxMult = 1;
                let pickaxeIdx = -1;

                currentInv[c].forEach((item: InvItem, idx: number) => {
                    if (item.type === 'pickaxe' && item.dur! > 0) {
                        colHasActivePickaxe = true; pickaxeIdx = idx;
                        const mult = PICKAXE_MULT[item.tier as keyof typeof PICKAXE_MULT] || 1;
                        if (mult > maxMult) maxMult = mult;
                    }
                });

                if (colHasActivePickaxe) {
                    for (let r = 0; r < 5; r++) {
                        if (!currentBlocks[c][r].destroyed) {
                            struckThisTurn = true;
                            currentBlocks[c][r].shattering = true;
                            setBlocks([...currentBlocks]);
                            currentInv[c][pickaxeIdx].dur! -= 1;
                            break;
                        }
                    }
                }
            }

            if (struckThisTurn) {
                await delay(200);
                for (let c = 0; c < 5; c++) {
                    let maxMult = 1;
                    currentInv[c].forEach((item: InvItem) => {
                        if (item.type === 'pickaxe') {
                            const mult = PICKAXE_MULT[item.tier as keyof typeof PICKAXE_MULT] || 1;
                            if (mult > maxMult) maxMult = mult;
                        }
                    });

                    for (let r = 0; r < 5; r++) {
                        if (currentBlocks[c][r].shattering) {
                            currentBlocks[c][r].shattering = false;
                            currentBlocks[c][r].destroyed = true;
                            currentWin += (currentBlocks[c][r].value * bet * maxMult);
                        }
                    }
                }
            }

            for (let c = 0; c < 5; c++) {
                currentInv[c] = currentInv[c].map((item: InvItem) => item.striking ? { ...item, striking: false } : item);
            }
            setInventory([...currentInv]);
            setBlocks([...currentBlocks]);
            setTotalWin(currentWin);
            
            if (struckThisTurn) await delay(300);
        }
    }

    let finalWin = currentWin;
    const newChests = [...chests];
    let chestOpened = false;
    
    for (let c = 0; c < 5; c++) {
      const allDestroyed = currentBlocks[c].every((b: BlockItem) => b.destroyed);
      if (allDestroyed) {
        chestOpened = true;
        const rand = Math.random();
        let mult = 2;
        if (rand > 0.95) mult = 30;
        else if (rand > 0.8) mult = 10;
        else if (rand > 0.5) mult = 5;
        else if (rand > 0.2) mult = 3;
        
        newChests[c] = { open: true, mult };
        finalWin += (bet * mult); 
      }
    }

    if (chestOpened) {
      setChests(newChests);
      setTotalWin(finalWin);
      await delay(1000);
    }

    if (finalWin > 0) {
      const payout = Math.round(finalWin * 100) / 100;
      try { await updateDoc(doc(db, 'users', user.uid), { balance: increment(payout) }); } catch (e) { console.error(e); }
    }

    setLoading(false);

    if (isBonusSpin) {
        setBonusSpinsLeft(prev => prev - 1);
    } else if (autoPlayRef.current) {
        setTimeout(() => executeSpin(), 1000);
    }
  };

  const handlePlayClick = () => { if (autoPlay) setAutoPlay(false); else executeSpin(); };
  const handleAutoPlayClick = () => { setAutoPlay(!autoPlay); if (!autoPlay && !loading) executeSpin(); };

  const buyBonus = async () => {
      if (loading || isBonusMode || bet * 100 > user.balance) return;
      try {
        await updateDoc(doc(db, 'users', user.uid), { balance: increment(-(bet * 100)) });
        startBonusGame();
      } catch (e) { console.error(e); }
  };

  const startBonusGame = () => { setIsBonusMode(true); setBonusSpinsLeft(4); };

  useEffect(() => {
      if (isBonusMode && bonusSpinsLeft > 0 && !loading) setTimeout(() => executeSpin(true), 1500);
      else if (isBonusMode && bonusSpinsLeft === 0 && !loading) setTimeout(() => setIsBonusMode(false), 2000);
  }, [bonusSpinsLeft, isBonusMode, loading]);

  return (
    <div 
      ref={containerRef} 
      className={cn(
          "relative w-full flex flex-col items-center bg-slate-950 font-mono overflow-hidden transition-all duration-500",
          isStarted ? "fixed inset-0 z-[9999] h-screen w-screen" : "h-[calc(100vh-120px)] mt-4 rounded-[2rem] sm:rounded-[3rem] border-8 border-slate-900"
      )}
    >
        {/* ФОН ИГРЫ */}
        <div className="absolute inset-0 z-0 bg-cover bg-bottom opacity-80" style={{ backgroundImage: `url(${ASSETS.bg})`, imageRendering: 'pixelated' }} />
        <div className="absolute inset-0 bg-black/40 z-0" />

        {/* ПРЕЛОАДЕР (ЭКРАН ЗАГРУЗКИ) */}
        {!isLoaded && (
            <div className="absolute inset-0 z-[100] bg-[#78A7FF] flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-clouds opacity-70" style={{ backgroundImage: `url(${ASSETS.clouds})`, backgroundSize: 'cover', imageRendering: 'pixelated' }} />
                
                <div className="relative z-10 flex flex-col items-center gap-6 p-8 bg-black/40 backdrop-blur-sm border-4 border-slate-800 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <h2 className="text-4xl sm:text-5xl font-black text-white drop-shadow-[2px_2px_0_#000] tracking-widest">MINEDROP</h2>
                    <p className="text-white font-bold drop-shadow-md">Загрузка текстур...</p>
                    
                    <div className="w-64 sm:w-80 h-8 bg-slate-800 border-[4px] border-slate-900 rounded-sm relative overflow-hidden shadow-inner">
                       <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${loadProgress}%` }}>
                          <div className="w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:20px_20px] opacity-50" />
                       </div>
                    </div>
                    <span className="text-white font-black drop-shadow-md">{loadProgress}%</span>
                </div>
            </div>
        )}

        {/* OVERLAY С КНОПКОЙ "НАЧАТЬ" */}
        {isLoaded && !isStarted && (
            <div className="absolute inset-0 z-[90] bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
                <motion.button 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    onClick={handleStartFullscreen}
                    className="px-12 py-5 bg-[#c6c6c6] text-[#333] font-black text-3xl border-[6px] border-t-[#fff] border-l-[#fff] border-b-[#555] border-r-[#555] active:border-t-[#555] active:border-l-[#555] active:border-b-[#fff] active:border-r-[#fff] hover:bg-[#d6d6d6] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.8)] uppercase tracking-widest flex items-center gap-4"
                >
                    Начать <Maximize className="w-8 h-8" />
                </motion.button>
                <p className="text-slate-400 mt-6 font-medium tracking-wide">Развернуть игру на весь экран</p>
            </div>
        )}

        {/* ИГРОВОЙ ИНТЕРФЕЙС */}
        <div className="relative z-10 w-full max-w-[800px] flex flex-col items-center justify-between h-full pt-4 pb-[130px] sm:pb-[100px] px-2 sm:px-4">
            
            {/* ИНДИКАТОР БОНУСА / ГЛАЗ */}
            <div className="w-full flex justify-between items-center mb-2 sm:mb-4">
               <div className="flex items-center gap-2 bg-black/60 border-[3px] border-slate-700 px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-md">
                  <img src={ASSETS.eye} alt="eye" className="w-5 h-5 sm:w-6 sm:h-6 object-contain drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <div className="flex gap-1.5 ml-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3 border border-slate-900 transition-all duration-300", enderEyes >= i ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]" : "bg-slate-700")} />
                    ))}
                  </div>
               </div>
               
               <AnimatePresence>
                   {isBonusMode && (
                       <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-purple-600/90 border-[3px] border-purple-400 px-4 py-1.5 rounded-lg text-white font-black tracking-widest uppercase shadow-[0_0_15px_#a855f7]">
                           Bonus: {bonusSpinsLeft}
                       </motion.div>
                   )}
               </AnimatePresence>
               
               {isStarted && (
                   <button onClick={() => { if(document.fullscreenElement) document.exitFullscreen(); setIsStarted(false); }} className="p-2 bg-black/60 border-[3px] border-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors">
                       <Maximize className="w-5 h-5 sm:w-6 sm:h-6 rotate-180" />
                   </button>
               )}
            </div>

            {/* ОСНОВНАЯ СЕТКА (Инвентарь + Блоки) */}
            <div className="w-full flex flex-col items-center justify-center flex-1 min-h-0 gap-2 sm:gap-4">
                
                {/* ИНВЕНТАРЬ */}
                <div className="w-full max-w-[500px] bg-[#3c3c3c]/90 p-1.5 sm:p-2 border-[4px] border-[#222] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] shrink-0">
                  <div className="grid grid-cols-5 gap-1 relative z-10">
                    {[0, 1, 2].map((r) => (
                      [0, 1, 2, 3, 4].map((c) => {
                        const item = inventory[c][r];
                        return (
                          <div key={`inv-${c}-${r}`} className={cn("aspect-square bg-[#8B8B8B] border-t-[3px] border-l-[3px] border-t-[#AFAFAF] border-l-[#AFAFAF] border-b-[3px] border-r-[3px] border-b-[#505050] border-r-[#505050] flex items-center justify-center relative transition-all duration-300", item.glow ? "shadow-[0_0_15px_#facc15] z-10 scale-110" : "")}>
                            <AnimatePresence mode="popLayout">
                              {item.type !== 'empty' && (
                                <motion.div 
                                    initial={{ scale: 0 }} animate={{ scale: 1, y: item.striking ? 20 : 0, rotate: item.striking ? 25 : 0 }} exit={{ scale: 0, opacity: 0 }} 
                                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                    className="relative z-10 w-full h-full flex items-center justify-center p-1"
                                >
                                  {item.type === 'pickaxe' && <img src={ASSETS.pickaxes[item.tier as keyof typeof ASSETS.pickaxes]} className="w-[80%] h-[80%] object-contain drop-shadow-md" style={{ imageRendering: 'pixelated' }} alt="pickaxe" />}
                                  {item.type === 'bomb' && <img src={ASSETS.bomb} className="w-[80%] h-[80%] object-contain drop-shadow-md animate-pulse" style={{ imageRendering: 'pixelated' }} alt="bomb" />}
                                  {item.type === 'book' && <img src={ASSETS.book} className="w-[80%] h-[80%] object-contain drop-shadow-md" style={{ imageRendering: 'pixelated' }} alt="book" />}
                                  {item.type === 'eye' && <img src={ASSETS.eye} className="w-[80%] h-[80%] object-contain drop-shadow-md" style={{ imageRendering: 'pixelated' }} alt="eye" />}
                                  {item.type === 'pickaxe' && <span className="absolute bottom-0 right-0 bg-black/80 text-white text-[9px] sm:text-[11px] font-bold px-1 rounded-sm leading-none">{item.dur}</span>}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    ))}
                  </div>
                </div>

                {/* БЛОКИ */}
                <div className="w-full max-w-[500px] shrink-1 min-h-0">
                  <div className="grid grid-cols-5 gap-0.5 sm:gap-1 h-full">
                    {[0, 1, 2, 3, 4].map((r) => (
                      [0, 1, 2, 3, 4].map((c) => {
                        const block = blocks[c][r];
                        return (
                          <div key={`block-${c}-${r}`} className="aspect-square relative flex items-center justify-center transition-all duration-300">
                            <AnimatePresence>
                              {!block.destroyed && !block.shattering && (
                                <motion.div exit={{ opacity: 0 }} className={cn("absolute inset-0 shadow-md transition-all", block.highlight ? "brightness-150 scale-105" : "")}>
                                   <img src={ASSETS.blocks[block.type as keyof typeof ASSETS.blocks]} className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} alt={block.type} />
                                </motion.div>
                              )}
                              {block.shattering && (
                                  <motion.div initial={{ scale: 1 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 flex flex-wrap">
                                      <div className="w-1/2 h-1/2 bg-white/50" /><div className="w-1/2 h-1/2 bg-black/30" />
                                      <div className="w-1/2 h-1/2 bg-black/50" /><div className="w-1/2 h-1/2 bg-white/30" />
                                  </motion.div>
                              )}
                            </AnimatePresence>
                            {block.destroyed && !block.shattering && <div className="absolute inset-0 bg-black/40 shadow-inner rounded-sm" />}
                          </div>
                        );
                      })
                    ))}
                  </div>
                </div>

                {/* СУНДУКИ */}
                <div className="w-full max-w-[500px] border-t-4 border-dashed border-slate-600/50 pt-2 shrink-0">
                  <div className="grid grid-cols-5 gap-0.5 sm:gap-1">
                    {chests.map((chest, i) => (
                      <div key={`chest-${i}`} className="aspect-square flex items-center justify-center relative transition-all duration-500">
                        <AnimatePresence mode="popLayout">
                          {chest.open ? (
                            <motion.div key="opened" initial={{ scale: 0 }} animate={{ scale: 1.2 }} className="absolute inset-0 flex flex-col items-center justify-center z-20">
                               <img src={ASSETS.chests.opened} alt="opened" className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" style={{ imageRendering: 'pixelated' }} />
                               <div className="relative z-10 text-center flex flex-col -mt-4 bg-black/60 px-1 sm:px-2 rounded border border-yellow-500/50">
                                  <span className="text-[10px] sm:text-[12px] font-black text-yellow-400 drop-shadow-md">x{chest.mult}</span>
                               </div>
                            </motion.div>
                          ) : (
                            <motion.div key="closed" initial={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute inset-0 p-1 bg-black/50 rounded shadow-inner border border-black/80">
                              <img src={ASSETS.chests.closed} alt="closed" className="w-full h-full object-contain opacity-90 hover:opacity-100 transition-opacity" style={{ imageRendering: 'pixelated' }} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
            </div>
            
            {/* ЛЕТЯЩИЙ ВЫИГРЫШ */}
            <AnimatePresence>
                {totalWin > 0 && !loading && (
                    <motion.div initial={{ opacity: 0, y: 50, scale: 0.5 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 border-[4px] border-emerald-500 px-6 py-4 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                        <span className="text-4xl sm:text-6xl font-black text-emerald-400 drop-shadow-[4px_4px_0_#000]">{formatBalance(totalWin)} CAT</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* МИНЕКРАФТ ПАНЕЛЬ УПРАВЛЕНИЯ */}
        <div className="absolute bottom-0 left-0 w-full bg-[#c6c6c6] border-t-[6px] border-t-[#ffffff] shadow-[inset_0_-6px_0_#555555] p-2 sm:p-4 z-20 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-6">
            
            <div className="flex items-center gap-1 sm:gap-2 bg-[#8b8b8b] border-[4px] border-t-[#555] border-l-[#555] border-b-[#fff] border-r-[#fff] p-1.5 sm:p-2 w-full sm:w-auto justify-between sm:justify-start">
               <span className="text-[#333] font-bold text-xs sm:text-sm px-1 sm:px-2">BET:</span>
               <input 
                  type="text" 
                  value={betInput} 
                  disabled={loading || autoPlay || isBonusMode}
                  onChange={(e) => { const val = e.target.value.replace(',', '.'); if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) setBetInput(val); }}
                  className="w-16 sm:w-24 bg-[#c6c6c6] text-black font-bold text-center outline-none border-[3px] sm:border-[4px] border-t-[#555] border-l-[#555] border-b-[#fff] border-r-[#fff] p-1 text-sm sm:text-base"
               />
               <div className="flex sm:flex-col gap-1">
                  <button onClick={handleDoubleBet} disabled={loading || autoPlay || isBonusMode} className="bg-[#c6c6c6] border-[3px] border-t-[#fff] border-l-[#fff] border-b-[#555] border-r-[#555] px-2 text-[10px] active:border-t-[#555] active:border-l-[#555] active:border-b-[#fff] active:border-r-[#fff]">x2</button>
                  <button onClick={handleHalfBet} disabled={loading || autoPlay || isBonusMode} className="bg-[#c6c6c6] border-[3px] border-t-[#fff] border-l-[#fff] border-b-[#555] border-r-[#555] px-2 text-[10px] active:border-t-[#555] active:border-l-[#555] active:border-b-[#fff] active:border-r-[#fff]">/2</button>
               </div>
            </div>

            <button 
               onClick={handlePlayClick}
               disabled={(loading && !autoPlay) || isBonusMode}
               className={cn(
                   "flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 text-white font-bold text-lg sm:text-xl border-[4px] sm:border-[6px] active:border-t-[#555] active:border-l-[#555] active:border-b-[#fff] active:border-r-[#fff] uppercase tracking-widest",
                   autoPlay ? "bg-rose-600 border-t-[#f43f5e] border-l-[#f43f5e] border-b-[#881337] border-r-[#881337]" : "bg-emerald-600 border-t-[#34d399] border-l-[#34d399] border-b-[#064e3b] border-r-[#064e3b]",
                   (loading && !autoPlay) || isBonusMode ? "opacity-50" : ""
               )}
            >
               {autoPlay ? 'STOP' : 'SPIN'}
            </button>

            <div className="flex gap-2 w-full sm:w-auto">
                <button 
                   onClick={handleAutoPlayClick}
                   disabled={isBonusMode}
                   className={cn(
                      "flex-1 sm:flex-none px-2 sm:px-4 py-2 sm:py-3 bg-[#c6c6c6] text-[#333] font-bold text-[10px] sm:text-xs border-[3px] sm:border-[4px] border-t-[#fff] border-l-[#fff] border-b-[#555] border-r-[#555] active:border-t-[#555] active:border-l-[#555] active:border-b-[#fff] active:border-r-[#fff] flex items-center justify-center gap-1 sm:gap-2",
                      autoPlay ? "border-t-[#555] border-l-[#555] border-b-[#fff] border-r-[#fff] bg-[#999]" : ""
                   )}
                >
                   <RotateCcw className={cn("w-3 h-3 sm:w-4 sm:h-4", autoPlay ? "animate-spin" : "")} /> AUTO
                </button>

                <button 
                   onClick={buyBonus}
                   disabled={loading || autoPlay || isBonusMode || bet * 100 > user.balance}
                   className="flex-1 sm:flex-none px-2 sm:px-4 py-2 sm:py-3 bg-purple-600 text-white font-bold text-[10px] sm:text-xs border-[3px] sm:border-[4px] border-t-purple-400 border-l-purple-400 border-b-purple-900 border-r-purple-900 active:border-t-purple-900 active:border-l-purple-900 active:border-b-purple-400 active:border-r-purple-400 flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-50"
                >
                   <Diamond className="w-3 h-3 sm:w-4 sm:h-4 fill-current" /> BUY ({(bet * 100).toFixed(0)})
                </button>
            </div>

        </div>
    </div>
  );
}
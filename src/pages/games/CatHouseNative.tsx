// src/pages/Slots.tsx
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { doc, onSnapshot, updateDoc, increment, arrayUnion, Timestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Zap, Target, X, Settings2, Trash2, Layers3 } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { UserProfile, SpinResult, LogEntry } from '../types';

// Ссылка на твой репозиторий с ассетами
const ASSETS_URL = "https://raw.githubusercontent.com/nekomatta77/whatsacas/main/";

// Константы размеров для расчета высот и позиций
const MOBILE_SYMBOL_SIZE = 52;
const DESKTOP_SYMBOL_SIZE = 80;
const MOBILE_ROW_GAP = 6;
const DESKTOP_ROW_GAP = 8;
const EXTRA_SPIN_CELLS = 40; // Количество дополнительных ячеек для анимации прокрутки

export interface SymbolConfig {
    id: string;
    text: string;
    value: string;
    weight: number;
    color: string;
    mult: Record<number, number>;
    scale: number;
    mobileScale?: number;
}

// Восстановили все твои картинки (id соответствует названию файла на github)
const SLOT_SYMBOLS: SymbolConfig[] = [
    { id: 'slots_a', text: 'A', value: 'A', weight: 18, color: '#f34e4e', mult: { 3: 0.2, 4: 0.4, 5: 1.0, 6: 2.0 }, scale: 1 },
    { id: 'slots_k', text: 'K', value: 'K', weight: 18, color: '#f28e2c', mult: { 3: 0.2, 4: 0.4, 5: 1.0, 6: 2.0 }, scale: 1 },
    { id: 'slots_q', text: 'Q', value: 'Q', weight: 18, color: '#76b7b2', mult: { 3: 0.1, 4: 0.2, 5: 0.6, 6: 1.6 }, scale: 1 },
    { id: 'slots_j', text: 'J', value: 'J', weight: 18, color: '#edc949', mult: { 3: 0.1, 4: 0.2, 5: 0.6, 6: 1.6 }, scale: 1 },
    { id: 'slots_10', text: '10', value: '10', weight: 22, color: '#af7aa1', mult: { 3: 0.1, 4: 0.1, 5: 0.4, 6: 1.2 }, scale: 1 },
    
    // Предметы
    { id: 'slots_food', text: 'FOOD', value: 'FOOD', weight: 12, color: '#fff', mult: { 3: 0.3, 4: 0.6, 5: 1.2, 6: 2.5 }, scale: 1.1 },
    { id: 'slots_fishbone', text: 'FISH', value: 'FISH', weight: 10, color: '#fff', mult: { 3: 0.4, 4: 0.8, 5: 1.5, 6: 3.0 }, scale: 1.1 },
    
    // Коты
    { id: 'slots_black', text: 'CAT_1', value: 'BLACK_CAT', weight: 8, color: '#fff', mult: { 3: 0.5, 4: 1.0, 5: 2.0, 6: 5.0 }, scale: 1.2 },
    { id: 'slots_british', text: 'CAT_2', value: 'BRITISH_CAT', weight: 6, color: '#fff', mult: { 3: 1.0, 4: 2.0, 5: 5.0, 6: 10.0 }, scale: 1.2 },
    { id: 'slots_sphinx', text: 'CAT_3', value: 'SPHINX', weight: 4, color: '#fff', mult: { 3: 1.5, 4: 3.0, 5: 8.0, 6: 15.0 }, scale: 1.2 },
    { id: 'slots_meinkun', text: 'CAT_MAIN', value: 'MAIN_COON', weight: 2, color: '#fff', mult: { 2: 1.0, 3: 4.0, 4: 8.0, 5: 20.0, 6: 50.0 }, scale: 1.3, mobileScale: 1.1 },
];

type SlotSymbol = SymbolConfig;

const SPEED_SETTINGS = {
    normal: { baseDelay: 200, reelDelay: 250, totalDuration: 1.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    fast: { baseDelay: 100, reelDelay: 150, totalDuration: 1.0, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
    turbo: {
        baseDelay: 0,
        reelDelay: 100,
        totalDuration: 0.6,
        ease: { type: "spring", damping: 12, stiffness: 100 } as any 
    },
};

const BET_AMOUNTS = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

const getRandomSymbol = (debugSymbolValue: string | null = null): SlotSymbol => {
    if (debugSymbolValue) {
        return SLOT_SYMBOLS.find(s => s.value === debugSymbolValue) || SLOT_SYMBOLS[0];
    }

    const totalWeight = SLOT_SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const s of SLOT_SYMBOLS) {
        if (rand < s.weight) return s;
        rand -= s.weight;
    }
    return SLOT_SYMBOLS[0];
};

const calculateMegawaysWin = (grid: SlotSymbol[][], bet: number): SpinResult => {
    const symbolsOnReels: Map<string, number>[] = grid.map(reel => {
        const counts = new Map<string, number>();
        reel.forEach(sym => counts.set(sym.value, (counts.get(sym.value) || 0) + 1));
        return counts;
    });

    const winningCombinations: Array<{ symbol: string; count: number; ways: number; mult: number; win: number }> = [];
    let totalWin = 0;

    symbolsOnReels[0].forEach((countInFirstReel, symbolValue) => {
        const symbolData = SLOT_SYMBOLS.find(s => s.value === symbolValue)!;
        let consecutiveReels = 1;
        let totalWays = countInFirstReel;

        for (let i = 1; i < symbolsOnReels.length; i++) {
            const countInNextReel = symbolsOnReels[i].get(symbolValue);
            if (countInNextReel && countInNextReel > 0) {
                consecutiveReels++;
                totalWays *= countInNextReel;
            } else {
                break;
            }
        }

        const multipliers = symbolData.mult;
        if (consecutiveReels in multipliers) {
            const multiplier = multipliers[consecutiveReels];
            const winAmount = bet * multiplier * totalWays;
            if (winAmount > 0) {
                winningCombinations.push({
                    symbol: symbolValue,
                    count: consecutiveReels,
                    ways: totalWays,
                    mult: multiplier,
                    win: winAmount,
                });
                totalWin += winAmount;
            }
        }
    });

    const xpGained = Math.floor(bet / 10) + Math.floor(totalWin / 10);

    return {
        totalWin: parseFloat(totalWin.toFixed(2)),
        xpGained: xpGained,
        winningCombinations,
        grid: grid.map(reel => reel.map(sym => sym.value)),
    };
};

const SlotCard = React.memo(({ symbol, isMobile, isWinning }: { symbol: SlotSymbol; isMobile: boolean; isWinning?: boolean }) => {
    const baseSize = isMobile ? MOBILE_SYMBOL_SIZE : DESKTOP_SYMBOL_SIZE;
    const finalSize = baseSize * (isMobile ? (symbol.mobileScale || symbol.scale) : symbol.scale);

    // Берем текстуры напрямую из твоего гитхаба
    const getBgImage = () => {
        if (symbol.value === '10') return `${ASSETS_URL}slots_purpleplace.webp`;
        if (['J', 'Q', 'K', 'A'].includes(symbol.value)) return `${ASSETS_URL}slots_whiteplace.webp`;
        return `${ASSETS_URL}slots_galaxyplace.webp`;
    };

    return (
        <div
            style={{ width: `${baseSize}px`, height: `${baseSize}px` }}
            className={`
                relative flex items-center justify-center rounded-2xl p-1 transition-all duration-300
                ${isWinning ? 'animate-pulse' : ''}
            `}
        >
            <div className={`
                absolute inset-[2px] rounded-xl flex items-center justify-center overflow-hidden bg-cover bg-center
                ${isWinning ? 'shadow-[0_0_15px_2px_rgba(252,211,77,0.7)]' : 'shadow-[inset_0_0_12px_rgba(0,0,0,0.4)]'}
            `}
                style={{ backgroundImage: `url(${getBgImage()})` }}
            >
                {/* Золотая обводка при победе */}
                <div className={`
                    absolute inset-0 rounded-xl border-2 transition-colors duration-300
                    ${isWinning ? 'border-amber-400 opacity-100' : 'border-white/10 opacity-60'}
                `}
                />
                
                {/* Свечение карточки */}
                <div className={`
                    absolute -inset-1 rounded-2xl blur-md transition-opacity duration-300
                    ${isWinning ? 'bg-amber-400/30 opacity-100' : 'bg-transparent opacity-0'}
                `} />

                {/* САМ СИМВОЛ ИЗ ГИТХАБА */}
                <img 
                    src={`${ASSETS_URL}${symbol.id}.webp`}
                    alt={symbol.value}
                    className={`
                        relative z-10 object-contain drop-shadow-xl transition-transform duration-300
                        ${isWinning ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''}
                    `}
                    style={{ 
                        width: `${finalSize * 0.7}px`, 
                        height: `${finalSize * 0.7}px` 
                    }}
                    draggable="false"
                    onError={(e) => {
                        // Fallback, если картинка вдруг не загрузится (покажет текст)
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) parent.innerHTML += `<span style="font-size:${finalSize*0.5}px; color:${symbol.color}" class="relative z-10 font-black">${symbol.text || symbol.value}</span>`;
                    }}
                />
            </div>
        </div>
    );
});

const ReelColumn = React.memo(({
    reel,
    reelIndex,
    speed,
    isSpinning,
    symbolHeight,
    rowGap,
    targetY,
    onAnimationComplete,
    winningPositions
}: {
    reel: SlotSymbol[];
    reelIndex: number;
    speed: keyof typeof SPEED_SETTINGS;
    isSpinning: boolean;
    symbolHeight: number;
    rowGap: number;
    targetY: number;
    onAnimationComplete: (index: number) => void;
    winningPositions: Set<string>;
}) => {
    const settings = SPEED_SETTINGS[speed];
    const initialY = -((reel.length - 7) * (symbolHeight + rowGap));

    return (
        <div className="flex-1 min-w-0 bg-[#0E1119]/60 rounded-xl px-1 py-1 relative overflow-hidden">
            <motion.div
                className="flex flex-col relative"
                style={{ gap: `${rowGap}px`, y: isSpinning ? initialY : 0 }}
                animate={{ y: isSpinning ? targetY : 0 }}
                transition={isSpinning ? {
                    delay: reelIndex * settings.reelDelay / 1000,
                    duration: settings.totalDuration,
                    ease: settings.ease,
                } : { duration: 0 }}
                onAnimationComplete={() => isSpinning && onAnimationComplete(reelIndex)}
            >
                {reel.map((symbol, rowIdx) => (
                    <div
                        key={`${reelIndex}-${rowIdx}`}
                        className="flex items-center justify-center"
                        style={{ height: `${symbolHeight}px` }}
                    >
                        <SlotCard
                            symbol={symbol}
                            isMobile={symbolHeight === MOBILE_SYMBOL_SIZE}
                            isWinning={winningPositions.has(`${reelIndex}-${rowIdx}`)}
                        />
                    </div>
                ))}
            </motion.div>
        </div>
    );
});

const DebugPanel = React.memo(({ isOpen, onClose, userProfile }: { isOpen: boolean; onClose: () => void; userProfile: UserProfile | null }) => {
    const setDebugSymbol = (symbolValue: string | null) => {
        if (!auth.currentUser) return;
        updateDoc(doc(db, 'users', auth.currentUser.uid), {
            debugSymbol: symbolValue
        }).then(() => {
            toast.success(symbolValue ? `Debug: Сет символ ${symbolValue}` : 'Debug символ сброшен');
        });
    };

    const clearLogs = () => {
        if (!auth.currentUser) return;
        updateDoc(doc(db, 'users', auth.currentUser.uid), { logs: [] });
    }

    if (!isOpen || !userProfile) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute right-0 top-16 bg-[#1A1F2E] border border-white/10 p-5 rounded-2xl shadow-2xl z-50 w-96 max-h-[80vh] flex flex-col space-y-4"
        >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className='flex items-center gap-2'>
                    <Settings2 className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-lg font-bold text-white">Админ Панель</h3>
                </div>
                <button onClick={onClose} className="text-[#636A81] hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-[#8F96A9]">Дебаг символ (Force Win)</label>
                <div className="grid grid-cols-5 gap-1.5 p-2 bg-[#141824] rounded-xl border border-white/5">
                    <button
                        onClick={() => setDebugSymbol(null)}
                        className={`flex items-center justify-center p-2 h-10 rounded-lg text-sm border-2 transition ${!userProfile.debugSymbol ? 'bg-indigo-500/20 border-indigo-400' : 'bg-[#1A1F2E] border-white/5'}`}
                    >
                        Auto
                    </button>
                    {SLOT_SYMBOLS.map(sym => (
                        <button
                            key={sym.value}
                            onClick={() => setDebugSymbol(sym.value)}
                            className={`flex items-center justify-center h-10 rounded-lg text-xl border-2 transition ${userProfile.debugSymbol === sym.value ? 'bg-indigo-500/20 border-indigo-400' : 'bg-[#1A1F2E] border-white/5'}`}
                        >
                            {sym.text}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-0">
                <div className='flex items-center justify-between'>
                    <label className="text-sm font-medium text-[#8F96A9]">Системные логи</label>
                    <button onClick={clearLogs} className='text-xs text-red-400 flex items-center gap-1 hover:text-red-300'>
                        <Trash2 size={12} /> Очистить
                    </button>
                </div>
                <div className="bg-[#141824] rounded-xl border border-white/5 p-3 flex-1 overflow-y-auto space-y-1.5 text-xs font-mono">
                    {userProfile.logs && userProfile.logs.length > 0 ? (
                        [...userProfile.logs].reverse().map(log => (
                            <div key={log.id} className={`${log.type === 'error' ? 'text-red-400' : log.type === 'win' ? 'text-emerald-400' : 'text-[#8F96A9]'}`}>
                                <span className='opacity-60'>[{log.timestamp.toDate().toLocaleTimeString()}]</span> {log.message}
                            </div>
                        ))
                    ) : (
                        <div className='text-[#636A81] text-center pt-4 italic'>Логи пусты...</div>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

interface SlotsProps {
  user: UserProfile;
}

export default function Slots({ user }: SlotsProps) {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [bet, setBet] = useState(10);
    const [speed, setSpeed] = useState<keyof typeof SPEED_SETTINGS>('normal');
    const [autoSpin, setAutoSpin] = useState(false);
    const [isDebugOpen, setIsDebugOpen] = useState(false);

    const [reels, setReels] = useState<SlotSymbol[][]>([[], [], [], [], [], []]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
    const spinningReelsCount = useRef(0);
    const autoSpinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    const symbolHeight = isMobile ? MOBILE_SYMBOL_SIZE : DESKTOP_SYMBOL_SIZE;
    const rowGap = isMobile ? MOBILE_ROW_GAP : DESKTOP_ROW_GAP;
    const gridHeight = 7 * symbolHeight + 6 * rowGap;
    const targetY = -((reelLength(0) - 7) * (symbolHeight + rowGap));

    function reelLength(index: number) { return 7 + EXTRA_SPIN_CELLS; }

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                setUserProfile(data);
                if (!data.isAdmin && isDebugOpen) setIsDebugOpen(false);
            }
        });
        return () => unsubscribe();
    }, [user, isDebugOpen]);

    const addLog = useCallback(async (message: string, type: LogEntry['type'] = 'info') => {
        if (!user?.uid) return;
        await updateDoc(doc(db, 'users', user.uid), {
            logs: arrayUnion({ id: Date.now(), timestamp: Timestamp.now(), message, type })
        });
    }, [user]);

    const onReelAnimationComplete = useCallback((reelIndex: number) => {
        spinningReelsCount.current++;
        if (spinningReelsCount.current === 6) {
            setIsSpinning(false);
            if (!spinResult || !user?.uid) return;

            const userRef = doc(db, 'users', user.uid);
            updateDoc(userRef, {
                balance: increment(spinResult.totalWin),
                xp: increment(spinResult.xpGained),
            }).then(() => {
                if (spinResult.totalWin > 0) {
                    toast.success(`🎉 Выигрыш: ${spinResult.totalWin.toFixed(2)} FC! (+${spinResult.xpGained} XP)`);
                    addLog(`Spin win: ${spinResult.totalWin.toFixed(2)} FC (Bet: ${bet}, Ways: ${spinResult.winningCombinations.length})`, 'win');
                } else if (spinResult.xpGained > 0) {
                    toast.info(`+${spinResult.xpGained} XP за спин`);
                }
                spinningReelsCount.current = 0;
            }).catch((error) => {
                toast.error('Ошибка начисления выигрыша');
                addLog(`Firestore win error: ${error.message}`, 'error');
                spinningReelsCount.current = 0;
            });
        }
    }, [spinResult, user, addLog, bet]);

    useEffect(() => {
        if (autoSpin && !isSpinning && userProfile && userProfile.balance >= bet) {
            autoSpinTimeoutRef.current = setTimeout(() => {
                handleSpin();
            }, 1000);
        } else if (!autoSpin && autoSpinTimeoutRef.current) {
            clearTimeout(autoSpinTimeoutRef.current);
        }
        return () => {
            if (autoSpinTimeoutRef.current) clearTimeout(autoSpinTimeoutRef.current);
        };
    }, [autoSpin, isSpinning, userProfile, bet]);

    const handleSpin = async () => {
        if (!user?.uid || !userProfile || isSpinning) return;

        if (userProfile.balance < bet) {
            toast.error('Недостаточно баланса для ставки!');
            setAutoSpin(false);
            return;
        }

        setIsSpinning(true);
        setSpinResult(null);
        spinningReelsCount.current = 0;

        const userRef = doc(db, 'users', user.uid);
        try {
            await updateDoc(userRef, { balance: increment(-bet) });
        } catch (error) {
            toast.error('Ошибка Firebase при списании ставки');
            setIsSpinning(false);
            return;
        }

        const finalGrid: SlotSymbol[][] = [];
        const resultGridForCalculation: SlotSymbol[][] = [];

        for (let r = 0; r < 6; r++) {
            const reelSymbolCount = reelLength(r);
            const column: SlotSymbol[] = [];
            for (let i = 0; i < reelSymbolCount; i++) {
                const isFinalVisibleSymbol = i >= reelSymbolCount - 7;
                column.push(getRandomSymbol(isFinalVisibleSymbol ? userProfile.debugSymbol : null));
            }
            finalGrid.push(column);
            resultGridForCalculation.push(column.slice(reelSymbolCount - 7));
        }

        const result = calculateMegawaysWin(resultGridForCalculation, bet);
        setReels(finalGrid);
        setSpinResult(result);
    };

    const winningPositions = useMemo(() => {
        const positions = new Set<string>();
        if (!spinResult || spinResult.totalWin <= 0) return positions;

        spinResult.winningCombinations.forEach((comb: { symbol: string, count: number }) => {
            for (let r = 0; r < comb.count; r++) {
                reels[r].slice(reels[r].length - 7).forEach((sym, rowIdx) => {
                    if (sym.value === comb.symbol) {
                        positions.add(`${r}-${rowIdx}`);
                    }
                });
            }
        });
        return positions;
    }, [spinResult, reels]);

    return (
        <div 
            className="Slots relative text-[#636A81] min-h-screen pt-[var(--header-height)] relative overflow-hidden bg-cover bg-center"
            style={{ backgroundImage: `url(${ASSETS_URL}slots_bg.webp)` }}
        >
            <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
                <div className="flex items-center justify-between gap-4 p-4 bg-[#141824]/80 backdrop-blur-sm rounded-2xl border border-white/5 shadow-lg">
                    <div className='flex items-center gap-4'>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                                FC
                            </div>
                            <div>
                                <div className="text-xs text-[#8F96A9]">Баланс</div>
                                <motion.div key={userProfile?.balance} animate={{ scale: [1, 1.1, 1] }} className="text-xl font-bold text-white">
                                    {userProfile ? userProfile.balance.toFixed(2) : '---'} <span className='text-sm text-[#636A81]'>FC</span>
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 p-1 bg-[#1A1F2E] rounded-full border border-white/5">
                            {(['normal', 'fast', 'turbo'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSpeed(s)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition flex items-center gap-1.5 ${speed === s ? 'bg-indigo-500 text-white' : 'text-[#8F96A9] hover:bg-white/5'}`}
                                >
                                    <Zap size={14} className={speed === s ? 'text-indigo-200' : 'text-[#636A81]'} />
                                    {s}
                                </button>
                            ))}
                        </div>

                        {userProfile?.isAdmin && (
                            <div className='relative'>
                                <button
                                    onClick={() => setIsDebugOpen(!isDebugOpen)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${isDebugOpen ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-[#1A1F2E] border-white/5 text-[#636A81] hover:border-indigo-400/50 hover:text-indigo-400'}`}
                                >
                                    <Settings2 size={20} />
                                </button>
                                <AnimatePresence>
                                    <DebugPanel isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} userProfile={userProfile} />
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>

                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                    className="SlotsMachine bg-[#141824]/90 backdrop-blur-sm p-4 rounded-3xl border-2 border-white/10 relative shadow-[0_0_40px_8px_rgba(252,211,77,0.15)] space-y-4"
                >
                    <div
                        ref={containerRef}
                        className="flex relative rounded-2xl p-1 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]"
                        style={{ height: `${gridHeight}px`, gap: isMobile ? '4px' : '6px' }}
                    >
                        {reels.map((reel, reelIndex) => (
                            <ReelColumn
                                key={reelIndex}
                                reel={reel}
                                reelIndex={reelIndex}
                                speed={speed}
                                isSpinning={isSpinning}
                                symbolHeight={symbolHeight}
                                rowGap={rowGap}
                                targetY={targetY}
                                onAnimationComplete={onReelAnimationComplete}
                                winningPositions={winningPositions}
                            />
                        ))}
                    </div>

                    <div className="flex items-center justify-between gap-4 p-3 bg-[#1A1F2E] rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <Layers3 className="w-9 h-9 text-indigo-400 bg-indigo-500/10 p-2 rounded-xl" />
                            <div>
                                <div className="text-xs text-[#8F96A9]">Тип игры</div>
                                <div className="text-lg font-bold text-white">Megaways <span className='text-xs text-emerald-400'>117,649 Ways</span></div>
                            </div>
                        </div>

                        <div className='flex items-center gap-4'>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-[#8F96A9]">Ставка:</label>
                                <div className="flex items-center gap-1.5 p-1.5 bg-[#141824] rounded-full border border-white/5 max-w-sm overflow-x-auto">
                                    {BET_AMOUNTS.map(amount => (
                                        <button
                                            key={amount}
                                            onClick={() => setBet(amount)}
                                            disabled={isSpinning}
                                            className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition ${bet === amount ? 'bg-indigo-500 text-white' : 'text-[#636A81] hover:bg-white/5'} disabled:opacity-50`}
                                        >
                                            {amount}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => setAutoSpin(!autoSpin)}
                                disabled={isSpinning && !autoSpin}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition ${autoSpin ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-[#141824] border-white/5 text-[#8F96A9] hover:border-white/10'}`}
                            >
                                <Target size={18} />
                                {autoSpin ? 'Auto ON' : 'Auto'}
                            </button>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSpin}
                                disabled={isSpinning}
                                className="px-10 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl text-lg font-extrabold shadow-lg hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 relative overflow-hidden"
                            >
                                {isSpinning && speed !== 'turbo' && (
                                    <motion.div
                                        className='absolute inset-0 bg-white/20'
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '100%' }}
                                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                    />
                                )}
                                <Zap size={20} className={isSpinning ? 'animate-pulse' : ''} />
                                {isSpinning ? 'Spinning...' : 'SPIN'}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </main>Ы
        </div>
    );
}
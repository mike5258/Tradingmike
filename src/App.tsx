import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Plus, 
  Minus, 
  Activity, 
  ShieldCheck, 
  Lock, 
  ChevronRight,
  BarChart3,
  Wallet,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Asset, User, MarketSettings, Trade } from './types';

// --- Constants & Initial Data ---
const ASSETS: Asset[] = [
  { id: 'btc', name: 'BTC/USD', price: 65420.50, change: 2.4 },
  { id: 'eth', name: 'ETH/USD', price: 3450.20, change: -1.2 },
  { id: 'gold', name: 'GOLD', price: 2150.80, change: 0.5 },
  { id: 'tesla', name: 'TESLA', price: 175.40, change: -3.1 },
];

const INITIAL_MARKET_SETTINGS: MarketSettings = {
  trend: 'RANDOM',
  volatility: 0.002,
  isPaused: false,
  targetAssetId: 'btc',
  duration: { days: 0, hours: 1 }
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'AUTH' | 'TRADE' | 'ADMIN' | 'PROFILE'>('AUTH');
  const [activeAsset, setActiveAsset] = useState<Asset>(ASSETS[0]);
  const [priceHistory, setPriceHistory] = useState<{ time: string; price: number }[]>([]);
  const [marketSettings, setMarketSettings] = useState<MarketSettings>(INITIAL_MARKET_SETTINGS);
  const [tradeAmount, setTradeAmount] = useState(10);
  const [activeTrade, setActiveTrade] = useState<Trade | null>(null);
  const [tradeResult, setTradeResult] = useState<'WIN' | 'LOSS' | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Simulation Ref
  const currentPriceRef = useRef(activeAsset.price);

  // --- Initialization ---
  useEffect(() => {
    // Load users from local storage
    const savedUsers = localStorage.getItem('xtrade_users');
    if (savedUsers) {
      setAllUsers(JSON.parse(savedUsers));
    }
    
    // Initial history
    const initialHistory = Array.from({ length: 20 }, (_, i) => ({
      time: new Date(Date.now() - (20 - i) * 5000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      price: activeAsset.price + (Math.random() - 0.5) * 100
    }));
    setPriceHistory(initialHistory);
  }, []);

  // --- Market Simulation Logic ---
  useEffect(() => {
    if (marketSettings.isPaused) return;

    const interval = setInterval(() => {
      let change = (Math.random() - 0.5) * marketSettings.volatility * currentPriceRef.current;
      
      // Check if manipulation is active for THIS asset
      const isTargeted = marketSettings.targetAssetId === activeAsset.id;
      const now = Date.now();
      const isExpired = marketSettings.endTime ? (now > marketSettings.endTime) : false;

      if (isTargeted && !isExpired) {
        if (marketSettings.trend === 'UP') {
          change = Math.abs(change) + (Math.random() * marketSettings.volatility * 0.5 * currentPriceRef.current);
        } else if (marketSettings.trend === 'DOWN') {
          change = -Math.abs(change) - (Math.random() * marketSettings.volatility * 0.5 * currentPriceRef.current);
        }
      }

      const newPrice = currentPriceRef.current + change;
      currentPriceRef.current = newPrice;

      setPriceHistory(prev => {
        const next = [...prev, { 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
          price: newPrice 
        }];
        return next.slice(-30); // Keep last 30 points
      });

      // Update active asset price for UI
      setActiveAsset(prev => ({ ...prev, price: newPrice }));
    }, 500);

    return () => clearInterval(interval);
  }, [marketSettings, activeAsset.id]);

  // --- Auth Handlers ---
  const handleLogin = (email: string, pass: string) => {
    const isAdmin = email === 'admin@zero.com' || email === 'ZERO_ADMIN';
    
    // Password check for the new admin
    if (email === 'ZERO_ADMIN' && pass !== 'ZERO_MONTANO') {
      alert('Invalid password for ZERO_ADMIN');
      return;
    }

    const existingUser = allUsers.find(u => u.email === email);
    
    if (existingUser) {
      if (existingUser.status === 'Banned') {
        alert('Your account is banned.');
        return;
      }
      setUser(existingUser);
      setView('TRADE');
    } else {
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        balance: isAdmin ? 1000000 : 50, // Admins get more initial balance
        totalProfit: 0,
        status: 'Verified',
        winRate: isAdmin ? 100 : 70
      };
      const updatedUsers = [...allUsers, newUser];
      setAllUsers(updatedUsers);
      localStorage.setItem('xtrade_users', JSON.stringify(updatedUsers));
      setUser(newUser);
      setView('TRADE');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('AUTH');
  };

  // --- Trading Handlers ---
  const executeTrade = (type: 'BUY' | 'SELL') => {
    if (!user || user.balance < tradeAmount) return;
    if (activeTrade) return;

    const trade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      assetId: activeAsset.id,
      amount: tradeAmount,
      type,
      entryPrice: activeAsset.price,
      timestamp: Date.now(),
      status: 'OPEN'
    };

    setActiveTrade(trade);

    // Simulate trade duration (5 seconds)
    setTimeout(() => {
      const exitPrice = currentPriceRef.current;
      const isWin = type === 'BUY' ? exitPrice > trade.entryPrice : exitPrice < trade.entryPrice;
      
      // Apply Win Rate manipulation
      const finalWin = Math.random() * 100 < user.winRate ? isWin : !isWin;

      const result = finalWin ? 'WIN' : 'LOSS';
      setTradeResult(result);
      
      const profit = finalWin ? tradeAmount * 0.85 : -tradeAmount;
      
      setUser(prev => {
        if (!prev) return null;
        const updated = {
          ...prev,
          balance: prev.balance + profit,
          totalProfit: prev.totalProfit + profit
        };
        // Update in all users list
        const updatedUsers = allUsers.map(u => u.id === updated.id ? updated : u);
        setAllUsers(updatedUsers);
        localStorage.setItem('xtrade_users', JSON.stringify(updatedUsers));
        return updated;
      });

      setActiveTrade(null);
      setTimeout(() => setTradeResult(null), 3000);
    }, 5000);
  };

  // --- Views ---

  if (view === 'AUTH') {
    return <AuthView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background text-white flex flex-col max-w-[500px] mx-auto border-x border-white/5 relative overflow-hidden">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/5 glass sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center neon-glow">
            <Activity className="text-black w-5 h-5" />
          </div>
          <h1 className="font-bold italic tracking-tighter text-xl">ZERO <span className="text-primary">TRADING</span></h1>
        </div>
        <div className="flex items-center gap-3">
          {(user?.email === 'admin@zero.com' || user?.email === 'ZERO_ADMIN') && (
            <button onClick={() => setView('ADMIN')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <Settings className="w-5 h-5 text-white/60" />
            </button>
          )}
          <button onClick={() => setView('PROFILE')} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm">${user?.balance.toFixed(2)}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {view === 'TRADE' && (
          <>
            {/* Asset Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {ASSETS.map(asset => (
                <button
                  key={asset.id}
                  onClick={() => setActiveAsset(asset)}
                  className={cn(
                    "px-4 py-2 rounded-xl border transition-all whitespace-nowrap flex flex-col items-start gap-1",
                    activeAsset.id === asset.id 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                  )}
                >
                  <span className="text-xs font-medium uppercase">{asset.name}</span>
                  <span className="font-mono text-sm">${asset.price.toFixed(2)}</span>
                </button>
              ))}
            </div>

            {/* Chart Card */}
            <div className="glass rounded-3xl p-4 aspect-[4/3] relative overflow-hidden">
              <div className="absolute top-4 left-4 z-10">
                <h2 className="text-2xl font-bold italic tracking-tighter">{activeAsset.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-primary text-lg">${activeAsset.price.toFixed(2)}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    activeAsset.change > 0 ? "bg-primary/20 text-primary" : "bg-red-500/20 text-red-500"
                  )}>
                    {activeAsset.change > 0 ? '+' : ''}{activeAsset.change}%
                  </span>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c896" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00c896" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#00c896' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#00c896" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                    animationDuration={300}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Trade Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-between glass p-4 rounded-2xl">
                <div className="flex flex-col">
                  <span className="text-xs text-white/40 uppercase font-bold tracking-wider">Investment</span>
                  <span className="text-xl font-mono">${tradeAmount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setTradeAmount(prev => Math.max(1, prev - 10))}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setTradeAmount(prev => prev + 10)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  disabled={!!activeTrade}
                  onClick={() => executeTrade('BUY')}
                  className={cn(
                    "h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                    activeTrade?.type === 'BUY' ? "bg-primary/50 cursor-not-allowed" : "bg-primary text-black hover:opacity-90 neon-glow"
                  )}
                >
                  <TrendingUp className="w-6 h-6" />
                  <span className="font-bold text-sm uppercase">Buy / Long</span>
                </button>
                <button
                  disabled={!!activeTrade}
                  onClick={() => executeTrade('SELL')}
                  className={cn(
                    "h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                    activeTrade?.type === 'SELL' ? "bg-red-500/50 cursor-not-allowed" : "bg-red-500 text-white hover:opacity-90"
                  )}
                >
                  <TrendingDown className="w-6 h-6" />
                  <span className="font-bold text-sm uppercase">Sell / Short</span>
                </button>
              </div>
            </div>
          </>
        )}

        {view === 'ADMIN' && (
          <AdminView 
            settings={marketSettings} 
            onUpdateSettings={setMarketSettings} 
            users={allUsers}
            onUpdateUser={(updatedUser) => {
              const updated = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
              setAllUsers(updated);
              localStorage.setItem('xtrade_users', JSON.stringify(updated));
            }}
            onBack={() => setView('TRADE')} 
          />
        )}

        {view === 'PROFILE' && (
          <ProfileView 
            user={user!} 
            onBack={() => setView('TRADE')} 
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Trade Result Overlay */}
      <AnimatePresence>
        {tradeResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <div className={cn(
              "p-8 rounded-3xl glass flex flex-col items-center gap-4 border-2 shadow-2xl",
              tradeResult === 'WIN' ? "border-primary text-primary" : "border-red-500 text-red-500"
            )}>
              {tradeResult === 'WIN' ? <CheckCircle2 className="w-20 h-20" /> : <XCircle className="w-20 h-20" />}
              <h3 className="text-5xl font-black italic tracking-tighter">{tradeResult}</h3>
              <p className="text-white/60 font-mono">
                {tradeResult === 'WIN' ? `+$${(tradeAmount * 0.85).toFixed(2)}` : `-$${tradeAmount.toFixed(2)}`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Trade Progress */}
      {activeTrade && (
        <div className="fixed bottom-20 left-4 right-4 max-w-[468px] mx-auto z-50">
          <div className="glass p-4 rounded-2xl border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-white/40">Active {activeTrade.type} Position</span>
              <span className="text-xs font-mono text-primary">Closing in 5s...</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="h-full bg-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[500px] mx-auto bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-white/5 px-6 py-3 flex items-center justify-between z-50">
        <button 
          onClick={() => setView('TRADE')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'TRADE' ? "text-primary" : "text-white/40 hover:text-white/60"
          )}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Trade</span>
        </button>
        <button 
          onClick={() => setView('PROFILE')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'PROFILE' ? "text-primary" : "text-white/40 hover:text-white/60"
          )}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Profile</span>
        </button>
        {(user?.email === 'admin@zero.com' || user?.email === 'ZERO_ADMIN') && (
          <button 
            onClick={() => setView('ADMIN')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              view === 'ADMIN' ? "text-primary" : "text-white/40 hover:text-white/60"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Panel</span>
          </button>
        )}
      </nav>
    </div>
  );
}

// --- Sub-Views ---

function AuthView({ onLogin }: { onLogin: (email: string, pass: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6 max-w-[500px] mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full space-y-8"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center neon-glow rotate-12">
            <Activity className="text-black w-10 h-10" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black italic tracking-tighter">ZERO <span className="text-primary">TRADING</span></h1>
            <p className="text-white/40 text-sm mt-2">The future of luxury trading</p>
          </div>
        </div>

        <div className="glass p-8 rounded-[2rem] space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-white/40 ml-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@luxury.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-white/40 ml-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          <button 
            onClick={() => email && onLogin(email, password)}
            className="w-full bg-primary text-black font-bold py-4 rounded-xl neon-glow hover:opacity-90 active:scale-95 transition-all"
          >
            ENTER PLATFORM
          </button>

          <div className="flex items-center gap-4 text-white/20">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[10px] font-bold uppercase">Secure Access</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <p className="text-center text-xs text-white/40">
            New users receive a <span className="text-primary font-bold">$50 welcome bonus</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function AdminView({ settings, onUpdateSettings, users, onUpdateUser, onBack }: { 
  settings: MarketSettings; 
  onUpdateSettings: (s: MarketSettings) => void;
  users: User[];
  onUpdateUser: (u: User) => void;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'USERS' | 'MARKET'>('MARKET');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(settings.endTime ? new Date(settings.endTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));

  const handleSetDate = () => {
    const endTime = new Date(tempDate).getTime();
    onUpdateSettings({ ...settings, endTime, startTime: Date.now() });
    setShowDatePicker(false);
  };

  const handleRemoveDate = () => {
    onUpdateSettings({ ...settings, endTime: undefined });
    setShowDatePicker(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-1">
        <h2 className="text-3xl font-black italic tracking-tighter uppercase">Control Panel</h2>
        <p className="text-[10px] font-bold uppercase text-white/40 tracking-widest">System Administrator Interface</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
        <button 
          onClick={() => setActiveTab('USERS')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
            activeTab === 'USERS' ? "bg-white/10 text-white" : "text-white/40"
          )}
        >
          <UserIcon className="w-4 h-4" /> USERS
        </button>
        <button 
          onClick={() => setActiveTab('MARKET')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
            activeTab === 'MARKET' ? "bg-white/10 text-white" : "text-white/40"
          )}
        >
          <BarChart3 className="w-4 h-4" /> MARKET
        </button>
      </div>

      {activeTab === 'MARKET' && (
        <section className="space-y-6">
          <div className="glass rounded-2xl p-6 space-y-6">
            {/* Asset Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Target Asset</label>
              <div className="grid grid-cols-2 gap-2">
                {ASSETS.map(asset => (
                  <button
                    key={asset.id}
                    onClick={() => onUpdateSettings({ ...settings, targetAssetId: asset.id, startTime: Date.now() })}
                    className={cn(
                      "py-2 rounded-lg border text-[10px] font-bold transition-all",
                      settings.targetAssetId === asset.id ? "bg-primary border-primary text-black" : "bg-white/5 border-white/10 text-white/60"
                    )}
                  >
                    {asset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Market Trend</label>
              <div className="grid grid-cols-3 gap-2">
                {(['UP', 'DOWN', 'RANDOM'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => onUpdateSettings({ ...settings, trend: t, startTime: Date.now() })}
                    className={cn(
                      "py-2 rounded-lg border text-xs font-bold transition-all",
                      settings.trend === t ? "bg-primary border-primary text-black" : "bg-white/5 border-white/10 text-white/60"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Date/Time Trigger */}
            <button 
              onClick={() => setShowDatePicker(true)}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/10 transition-all flex flex-col items-center gap-1"
            >
              <span>{settings.endTime ? 'Manipulation Active' : 'Set Duration (Date & Time)'}</span>
              {settings.endTime && (
                <span className="text-[10px] text-primary font-mono">
                  Ends: {new Date(settings.endTime).toLocaleString()}
                </span>
              )}
            </button>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Volatility</label>
                <span className="text-primary font-mono text-xs">{(settings.volatility * 1000).toFixed(1)}x</span>
              </div>
              <input 
                type="range" 
                min="0.001" 
                max="0.01" 
                step="0.001"
                value={settings.volatility}
                onChange={(e) => onUpdateSettings({ ...settings, volatility: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex flex-col">
                <span className="text-sm font-bold">Market Pause</span>
                <span className="text-[10px] text-white/40">Freeze all price movements</span>
              </div>
              <button 
                onClick={() => onUpdateSettings({ ...settings, isPaused: !settings.isPaused })}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-all",
                  settings.isPaused ? "bg-red-500" : "bg-white/20"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  settings.isPaused ? "left-7" : "left-1"
                )} />
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'USERS' && (
        <section className="space-y-4">
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="glass p-4 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-white/40" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold truncate max-w-[120px]">{u.email}</span>
                      <span className="text-[10px] font-mono text-primary">${u.balance.toFixed(2)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onUpdateUser({ ...u, status: u.status === 'Verified' ? 'Banned' : 'Verified' })}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold uppercase",
                      u.status === 'Verified' ? "bg-white/5 text-white/40" : "bg-red-500/20 text-red-500"
                    )}
                  >
                    {u.status === 'Verified' ? 'Active' : 'Banned'}
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-white/40">
                    <span>Win Rate</span>
                    <span className="text-primary">{u.winRate}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={u.winRate}
                    onChange={(e) => onUpdateUser({ ...u, winRate: parseInt(e.target.value) })}
                    className="w-full accent-primary h-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Date Picker Modal */}
      <AnimatePresence>
        {showDatePicker && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDatePicker(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 space-y-8 relative z-10 text-black"
            >
              <h3 className="text-2xl font-bold text-center">Установите дату и время</h3>
              
              <div className="flex flex-col items-center gap-6">
                <input 
                  type="datetime-local" 
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="w-full bg-gray-100 border-none rounded-2xl px-4 py-4 text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
                
                <div className="text-center space-y-1">
                  <p className="text-xs text-black/40 uppercase font-bold">Selected End Time</p>
                  <p className="text-sm font-mono font-bold">
                    {new Date(tempDate).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button onClick={handleRemoveDate} className="text-red-500 font-medium">Удалить</button>
                <div className="flex gap-6">
                  <button onClick={() => setShowDatePicker(false)} className="text-black/60 font-medium">Отмена</button>
                  <button onClick={handleSetDate} className="text-blue-500 font-bold">Установить</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileView({ user, onBack, onLogout }: { user: User; onBack: () => void; onLogout: () => void }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold italic tracking-tighter">MY <span className="text-primary">PROFILE</span></h2>
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full"><ChevronRight className="w-6 h-6 rotate-180" /></button>
      </div>

      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-24 h-24 bg-primary/10 rounded-full border-2 border-primary flex items-center justify-center neon-glow">
          <UserIcon className="w-12 h-12 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold">{user.email}</h3>
          <div className="flex items-center justify-center gap-2 mt-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-bold uppercase tracking-widest">{user.status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-6 rounded-3xl space-y-2">
          <Wallet className="w-6 h-6 text-primary" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-white/40">Balance</span>
            <span className="text-xl font-mono">${user.balance.toFixed(2)}</span>
          </div>
        </div>
        <div className="glass p-6 rounded-3xl space-y-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-white/40">Total Profit</span>
            <span className={cn(
              "text-xl font-mono",
              user.totalProfit >= 0 ? "text-primary" : "text-red-500"
            )}>
              {user.totalProfit >= 0 ? '+' : ''}${user.totalProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-sm font-medium">Account ID</span>
          <span className="text-xs font-mono text-white/40">{user.id}</span>
        </div>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-sm font-medium">Verification</span>
          <span className="text-xs text-primary font-bold">Level 2</span>
        </div>
        <button 
          onClick={onLogout}
          className="w-full p-4 flex items-center justify-between text-red-500 hover:bg-red-500/5 transition-colors"
        >
          <span className="text-sm font-bold uppercase">Sign Out</span>
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

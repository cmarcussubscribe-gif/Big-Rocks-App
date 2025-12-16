import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, ActivityLog, AppSettings } from './types';
import { loadInitialData, saveData } from './utils/storage';
import { Menu, X, Plus, Check, Trash2, Settings as SettingsIcon, Bell, Info } from 'lucide-react';
import StatsView from './components/StatsView';

// --- Components defined internally for simplicity of the single-file requirement structure where possible ---

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<'HOME' | 'SETTINGS' | 'ABOUT'>('HOME');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    minNotifications: 1,
    maxNotifications: 5,
    notificationsToday: 3,
    lastGeneratedDate: '',
  });
  const [currentRock, setCurrentRock] = useState<Activity | null>(null);
  const [isSummaryPending, setIsSummaryPending] = useState(false);
  const [lastActivityId, setLastActivityId] = useState<string | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  
  // UI State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [newActivityText, setNewActivityText] = useState('');

  // --- Initialization ---
  useEffect(() => {
    const data = loadInitialData();
    setActivities(data.activities);
    setLogs(data.logs);
    setLastActivityId(data.lastActivityId);
    setHasSeenOnboarding(data.hasSeenOnboarding);

    // Show onboarding if not seen yet
    if (!data.hasSeenOnboarding) {
      setView('ABOUT');
    }

    // Check if we need to regenerate today's quota and reset daily state
    const today = new Date().toISOString().split('T')[0];
    
    if (data.settings.lastGeneratedDate !== today) {
        // New Day: Regenerate quota and reset daily state
        const range = data.settings.maxNotifications - data.settings.minNotifications;
        const randomAdd = Math.floor(Math.random() * (range + 1));
        const newCount = data.settings.minNotifications + randomAdd;

        const newSettings = {
            ...data.settings,
            notificationsToday: newCount,
            lastGeneratedDate: today
        };
        setSettings(newSettings);
        
        // Reset daily state (clear summary and pending rocks from yesterday)
        setIsSummaryPending(false);
        setCurrentRock(null);
    } else {
        // Same Day: Load persisted state as is
        setSettings(data.settings);
        setIsSummaryPending(data.isSummaryPending);
        setCurrentRock(data.currentRock);
    }
  }, []);

  // --- Visibility Change Listener (Handle overnight background) ---
  useEffect(() => {
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            // Read directly from storage to get the most recent saved state (avoid stale closure)
            // or we could depend on state, but reading storage is safer for "last saved" truth
            try {
                const savedSettingsStr = localStorage.getItem('bigrocks_settings');
                if (savedSettingsStr) {
                    const savedSettings: AppSettings = JSON.parse(savedSettingsStr);
                    const today = new Date().toISOString().split('T')[0];
                    
                    if (savedSettings.lastGeneratedDate !== today) {
                        // It's a new day and the app just came to foreground
                        const range = savedSettings.maxNotifications - savedSettings.minNotifications;
                        const randomAdd = Math.floor(Math.random() * (range + 1));
                        const newCount = savedSettings.minNotifications + randomAdd;

                        const newSettings = {
                            ...savedSettings,
                            notificationsToday: newCount,
                            lastGeneratedDate: today
                        };
                        
                        setSettings(newSettings);
                        setIsSummaryPending(false);
                        setCurrentRock(null);
                    }
                }
            } catch (e) {
                console.error("Error checking day change", e);
            }
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // --- Persistence ---
  useEffect(() => {
    saveData(activities, logs, settings, currentRock, lastActivityId, isSummaryPending, hasSeenOnboarding);
  }, [activities, logs, settings, currentRock, lastActivityId, isSummaryPending, hasSeenOnboarding]);

  // --- Logic ---

  const addActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityText.trim()) return;
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      text: newActivityText.trim(),
      createdAt: Date.now()
    };
    setActivities(prev => [...prev, newActivity]);
    setNewActivityText('');
  };

  const removeActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const triggerNotification = useCallback(() => {
    if (currentRock || isSummaryPending) return; // Already active

    // Count how many notifications sent today
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysLogs = logs.filter(l => 
        new Date(l.timestamp).toISOString().split('T')[0] === todayStr && 
        l.activityId !== 'SUMMARY'
    );
    
    // Check if we hit the limit
    if (todaysLogs.length >= settings.notificationsToday) {
      setIsSummaryPending(true);
      return;
    }

    if (activities.length === 0) return;

    // Pick a rock logic
    let pool = activities;
    
    // Filter out last one if possible
    if (pool.length > 1 && lastActivityId) {
      pool = pool.filter(a => a.id !== lastActivityId);
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const selected = pool[randomIndex];

    setCurrentRock(selected);
  }, [activities, currentRock, isSummaryPending, lastActivityId, logs, settings.notificationsToday]);

  const handleRockResponse = (completed: boolean) => {
    if (!currentRock) return;

    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      activityId: currentRock.id,
      activityText: currentRock.text,
      timestamp: Date.now(),
      completed
    };

    setLogs(prev => [...prev, newLog]);
    setLastActivityId(currentRock.id);
    setCurrentRock(null);
  };

  const handleSummaryDismiss = () => {
    setIsSummaryPending(false);
  };

  const dismissOnboarding = () => {
    setHasSeenOnboarding(true);
    setView('HOME');
  };

  // --- Render Helpers ---

  const renderAbout = () => {
    return (
        <div className="flex flex-col h-full p-8 animate-fade-in overflow-y-auto no-scrollbar">
            <div className="flex-1 flex flex-col justify-center">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-light text-slate-800 mb-2">Welcome to <span className="font-bold text-primary">Big Rocks</span></h1>
                </div>
                
                <div className="space-y-6 text-slate-600 leading-relaxed text-lg">
                    <p>
                        This app helps you focus on what’s most important in your life. It works by creating a list of activities that matter most to you.
                    </p>
                    <p>
                        The idea behind this list is that each item should only take a few moments to complete. This way, we can make what’s truly most important to us part of our day.
                    </p>
                    <p className="italic text-slate-500 border-l-4 border-indigo-100 pl-4 py-2">
                        Some examples from my list are: “Practice Spanish”, “Draw a Picture”, “Tell someone you care about that you love them.”
                    </p>
                    <p className="font-medium text-slate-700">
                        What’s on your list? What’s important to you?
                    </p>
                    <p>
                        The app will prompt you at random times during the day to take a break and focus on what matters most to you!
                    </p>
                </div>
            </div>

            <button 
                onClick={dismissOnboarding}
                className="mt-8 w-full bg-slate-900 text-white py-4 rounded-2xl font-medium shadow-lg hover:bg-slate-800 transition-all"
            >
                {hasSeenOnboarding ? "Back to App" : "Ok"}
            </button>
        </div>
    );
  };

  const renderHome = () => {
    // 1. Summary State
    if (isSummaryPending) {
      // Calculate today's percentage
      const todayStr = new Date().toISOString().split('T')[0];
      const todaysLogs = logs.filter(l => 
          new Date(l.timestamp).toISOString().split('T')[0] === todayStr && 
          l.activityId !== 'SUMMARY'
      );
      const completed = todaysLogs.filter(l => l.completed).length;
      const percent = todaysLogs.length > 0 ? Math.round((completed / todaysLogs.length) * 100) : 0;

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
          <h2 className="text-3xl font-light text-slate-800 mb-2">Day Complete</h2>
          <p className="text-slate-500 mb-8">Here is your summary for today.</p>
          
          <div className="relative w-48 h-48 flex items-center justify-center rounded-full border-8 border-slate-100 mb-8">
             <span className="text-5xl font-bold text-primary">{percent}%</span>
          </div>
          
          <button 
            onClick={handleSummaryDismiss}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-medium shadow-lg hover:bg-slate-800 transition-all"
          >
            Close Summary
          </button>
        </div>
      );
    }

    // 2. Active Notification State
    if (currentRock) {
      return (
        <div className="flex flex-col h-full p-6 animate-slide-up">
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wide mb-6">
              Happening Now
            </span>
            <h1 className="text-4xl md:text-5xl font-light text-slate-900 leading-tight mb-8">
              {currentRock.text}
            </h1>
            <p className="text-slate-400">Did you complete this activity?</p>
          </div>

          <div className="flex flex-col gap-4 mb-8">
            <button 
              onClick={() => handleRockResponse(true)}
              className="w-full bg-emerald-500 active:bg-emerald-600 text-white py-5 rounded-3xl text-xl font-medium shadow-lg shadow-emerald-200 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Check size={24} /> Yes, I did it
            </button>
            <button 
              onClick={() => handleRockResponse(false)}
              className="w-full bg-white border-2 border-slate-100 text-slate-400 py-5 rounded-3xl text-xl font-medium hover:bg-slate-50 active:bg-slate-100 transition-all transform active:scale-95"
            >
              No, not this time
            </button>
          </div>
        </div>
      );
    }

    // 3. Idle State (List Management)
    return (
      <div className="flex flex-col h-full p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-light text-slate-800">My Big Rocks</h2>
          <p className="text-sm text-slate-400 mt-1">Activities that matter most to you.</p>
        </div>

        <form onSubmit={addActivity} className="mb-6 relative">
          <input
            type="text"
            value={newActivityText}
            onChange={(e) => setNewActivityText(e.target.value)}
            placeholder="Add a new activity..."
            className="w-full pl-5 pr-12 py-4 rounded-2xl bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm text-slate-700"
          />
          <button 
            type="submit"
            disabled={!newActivityText.trim()}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-slate-900 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:bg-slate-200"
          >
            <Plus size={20} />
          </button>
        </form>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-20">
          {activities.length === 0 ? (
            <div className="text-center py-10 opacity-40">
              <div className="mx-auto w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                <Bell size={24} className="text-slate-400" />
              </div>
              <p className="text-slate-500">No activities yet.<br/>Add one to get started.</p>
            </div>
          ) : (
            activities.map(activity => (
              <div key={activity.id} className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-slate-700 font-medium">{activity.text}</span>
                <button 
                  onClick={() => removeActivity(activity.id)}
                  className="text-slate-300 hover:text-red-400 transition-colors p-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Simulation Control for Demo Purposes */}
        <div className="pt-4 border-t border-slate-100">
           <button 
             onClick={triggerNotification}
             disabled={activities.length === 0}
             className="w-full py-3 text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
           >
             Simulate Next Notification
           </button>
           <p className="text-[10px] text-center text-slate-300 mt-2">
             (In a real app, this happens automatically {settings.notificationsToday} times/day)
           </p>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="flex flex-col h-full p-6 overflow-y-auto no-scrollbar">
        <h2 className="text-2xl font-light text-slate-800 mb-8">Settings</h2>

        <section className="mb-10">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Daily Notifications</h3>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex items-center justify-between gap-4 mb-4">
               <div>
                  <label className="block text-xs text-slate-400 mb-1">Minimum</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="98"
                    value={settings.minNotifications}
                    onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setSettings(s => ({...s, minNotifications: Math.min(val, s.maxNotifications) }));
                    }}
                    className="w-20 p-3 bg-slate-50 rounded-xl text-center font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                  />
               </div>
               <div className="h-px bg-slate-200 flex-1"></div>
               <div>
                  <label className="block text-xs text-slate-400 mb-1">Maximum</label>
                  <input 
                    type="number" 
                    min="2" 
                    max="99"
                    value={settings.maxNotifications}
                    onChange={(e) => {
                        const val = parseInt(e.target.value) || 2;
                        setSettings(s => ({...s, maxNotifications: Math.max(val, s.minNotifications) }));
                    }}
                    className="w-20 p-3 bg-slate-50 rounded-xl text-center font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                  />
               </div>
             </div>
             <p className="text-xs text-slate-400 text-center">
               You will receive between {settings.minNotifications} and {settings.maxNotifications} notifications daily.
             </p>
          </div>
        </section>

        <section className="mb-8">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Statistics</h3>
           <StatsView logs={logs} />
        </section>
        
        <div className="mt-auto text-center text-xs text-slate-300 py-4">
           Big Rocks App v1.0
        </div>
      </div>
    );
  };

  // --- Main Layout ---
  return (
    <div className="min-h-screen bg-surface flex justify-center">
      <div className="w-full max-w-md bg-surface-highlight min-h-screen shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-50">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Menu size={24} />
          </button>
          
          <div className="font-bold text-lg tracking-tight text-slate-800">
            Big<span className="text-primary font-light">Rocks</span>
          </div>
          
          <div className="w-10"></div> {/* Spacer for balance */}
        </header>

        {/* Menu Sidebar (Drawer) */}
        {isMenuOpen && (
           <div className="absolute inset-0 z-50 flex">
              <div 
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
                onClick={() => setIsMenuOpen(false)}
              ></div>
              <div className="relative w-3/4 max-w-xs bg-white h-full shadow-2xl p-6 flex flex-col animate-slide-right">
                 <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-slate-800">Menu</h2>
                    <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                       <X size={20} className="text-slate-500" />
                    </button>
                 </div>

                 <nav className="space-y-2">
                    <button 
                      onClick={() => { setView('HOME'); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'HOME' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                       <Bell size={18} /> Activities
                    </button>
                    <button 
                      onClick={() => { setView('SETTINGS'); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'SETTINGS' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                       <SettingsIcon size={18} /> Settings
                    </button>
                    <button 
                      onClick={() => { setView('ABOUT'); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'ABOUT' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                       <Info size={18} /> About
                    </button>
                 </nav>
              </div>
           </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 relative overflow-hidden">
           {view === 'HOME' && renderHome()}
           {view === 'SETTINGS' && renderSettings()}
           {view === 'ABOUT' && renderAbout()}
        </main>

      </div>
      
      {/* Global CSS for Animations */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-right {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.4s ease-out; }
        .animate-slide-right { animation: slide-right 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default App;
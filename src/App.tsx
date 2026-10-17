import { useState, useEffect } from 'react';
import { Video, Image, Settings as SettingsIcon, Home, Mic, Monitor } from 'lucide-react';
import LandingPage from '@/views/LandingPage';
import RecorderView from '@/views/RecorderView';
import LibraryView from '@/views/LibraryView';
import ScreenshotsView from '@/views/ScreenshotsView';
import SettingsView from '@/views/SettingsView';
import { useSettings } from '@/hooks/useSettings';

export type View = 'landing' | 'recorder' | 'library' | 'screenshots' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [hasInteracted, setHasInteracted] = useState(false);
  const { settings, loading } = useSettings();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        setView('recorder');
        setHasInteracted(true);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setView('screenshots');
        setHasInteracted(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const navigate = (v: View) => {
    setView(v);
    if (v !== 'landing') setHasInteracted(true);
  };

  if (view === 'landing' && !hasInteracted) {
    return <LandingPage onEnter={() => navigate('recorder')} />;
  }

  const navItems: { id: View; label: string; icon: typeof Video }[] = [
    { id: 'recorder', label: 'Record', icon: Monitor },
    { id: 'library', label: 'Library', icon: Video },
    { id: 'screenshots', label: 'Screenshots', icon: Image },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-[#26262f] bg-[#0d0d12] flex flex-col">
        <button
          onClick={() => navigate('landing')}
          className="px-5 py-5 flex items-center gap-2.5 hover:bg-[#13131a] transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">SmoothRec</div>
            <div className="text-[10px] text-zinc-500">for Linux</div>
          </div>
        </button>

        <nav className="flex-1 px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-blue-500/15 text-blue-400 font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-[#13131a]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={() => navigate('recorder')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/20"
          >
            <Monitor className="w-4 h-4" />
            New Recording
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {view === 'landing' && <LandingPage onEnter={() => navigate('recorder')} />}
        {view === 'recorder' && <RecorderView settings={settings} onSaved={() => navigate('library')} />}
        {view === 'library' && <LibraryView onBack={() => navigate('recorder')} />}
        {view === 'screenshots' && <ScreenshotsView onBack={() => navigate('recorder')} />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

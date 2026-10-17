import { useState } from 'react';
import {
  Monitor,
  Mic,
  Video,
  Volume2,
  MousePointer2,
  Captions,
  Keyboard,
  Eye,
  EyeOff,
  Save,
  Check,
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export default function SettingsView() {
  const { settings, updateSettings } = useSettings();
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof typeof settings) => {
    updateSettings({ [key]: !settings[key] } as typeof settings);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-sm text-zinc-500 mb-8">Configure your recording and screenshot preferences</p>

        {/* Recording settings */}
        <Section title="Recording" icon={Monitor}>
          <Row label="Frame rate" desc="Higher FPS for smoother recordings">
            <select
              value={settings.recording_fps}
              onChange={(e) => updateSettings({ recording_fps: Number(e.target.value) })}
              className="px-3 py-2 rounded-lg bg-[#13131a] border border-[#26262f] text-sm text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value={24}>24 FPS</option>
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </Row>

          <ToggleRow
            icon={MousePointer2}
            label="Auto-zoom on clicks"
            desc="Zoom follows your cursor clicks"
            value={settings.auto_zoom}
            onToggle={() => toggle('auto_zoom')}
          />

          <ToggleRow
            icon={MousePointer2}
            label="Smooth cursor"
            desc="Interpolate cursor movement for polish"
            value={settings.smooth_cursor}
            onToggle={() => toggle('smooth_cursor')}
          />

          <ToggleRow
            icon={Captions}
            label="Captions"
            desc="Show word-by-word captions on recordings"
            value={settings.captions_enabled}
            onToggle={() => toggle('captions_enabled')}
          />

          <ToggleRow
            icon={Video}
            label="Show webcam by default"
            desc="Enable webcam overlay when starting a recording"
            value={settings.show_webcam}
            onToggle={() => toggle('show_webcam')}
          />
        </Section>

        {/* Shortcuts */}
        <Section title="Keyboard Shortcuts" icon={Keyboard}>
          <Row label="Start recording" desc="Press this combination to start recording">
            <KeyDisplay keys={settings.shortcut_record} />
          </Row>
          <Row label="Take screenshot" desc="Press this combination to capture screen">
            <KeyDisplay keys={settings.shortcut_screenshot} />
          </Row>
        </Section>

        {/* Appearance */}
        <Section title="Appearance" icon={Eye}>
          <Row label="Theme" desc="Choose the app appearance">
            <select
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value })}
              className="px-3 py-2 rounded-lg bg-[#13131a] border border-[#26262f] text-sm text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </Row>
        </Section>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium flex items-center gap-2 transition-all"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Monitor; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon className="w-4 h-4 text-blue-400" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="rounded-xl bg-[#13131a] border border-[#26262f] divide-y divide-[#26262f] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  desc,
  value,
  onToggle,
}: {
  icon: typeof Monitor;
  label: string;
  desc: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-zinc-500" />
        <div>
          <p className="text-sm text-white">{label}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`w-10 h-5.5 rounded-full transition-all relative flex-shrink-0 ${
          value ? 'bg-blue-500' : 'bg-[#26262f]'
        }`}
        style={{ width: 40, height: 22 }}
      >
        <div
          className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white transition-all ${
            value ? 'left-[20px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function KeyDisplay({ keys }: { keys: string }) {
  const parts = keys.split('+');
  return (
    <div className="flex items-center gap-1">
      {parts.map((k, i) => (
        <span key={i} className="flex items-center gap-1">
          <kbd className="px-2 py-1 rounded-md bg-[#0a0a0f] border border-[#26262f] text-xs text-zinc-300 font-mono">
            {k}
          </kbd>
          {i < parts.length - 1 && <span className="text-zinc-600 text-xs">+</span>}
        </span>
      ))}
    </div>
  );
}

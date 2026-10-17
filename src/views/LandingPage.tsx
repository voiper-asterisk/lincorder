import { Monitor, Mic, Captions, Scissors, Eye, Sparkles, ArrowRight, Check, Image as ImageIcon } from 'lucide-react';

type Props = {
  onEnter: () => void;
};

export default function LandingPage({ onEnter }: Props) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-y-auto">
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass border-b border-[#26262f]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold">SmoothRec</span>
              <span className="ml-2 text-xs text-zinc-500">for Linux</span>
            </div>
          </div>
          <button
            onClick={onEnter}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-[#26262f] text-sm font-medium transition-all flex items-center gap-2"
          >
            Open App
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Open-source screen recorder for Linux
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Record beautiful demos
            <br />
            <span className="gradient-text">without editing</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The screen recorder that adds zooms, cursor glides, and polish for you.
            Built for Linux, in your browser. No downloads, no subscriptions.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onEnter}
              className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-xl shadow-blue-500/25 flex items-center gap-2"
            >
              <Monitor className="w-5 h-5" />
              Start Recording
            </button>
            <button
              onClick={onEnter}
              className="px-7 py-3.5 rounded-xl border border-[#26262f] hover:bg-[#13131a] text-zinc-300 font-medium transition-all"
            >
              View Features
            </button>
          </div>
          <p className="text-xs text-zinc-600 mt-4">Free · No account needed · Runs in your browser</p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">More than a screen recorder</h2>
          <p className="text-zinc-400">Everything you need to create polished demos, in one place</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <FeatureCard
            icon={Monitor}
            title="Record once. Edited when you stop."
            desc="Zooms that follow your clicks. Smooth cursor. 3D angles. The polish is done by the time you finish recording."
          />
          <FeatureCard
            icon={Captions}
            title="Cut the video by editing the words"
            desc="Transcribed right in your browser. Delete a word or a sentence and it's gone from the video."
          />
          <FeatureCard
            icon={Scissors}
            title="Transcript editing"
            desc="Remove filler words with one click. Edit any segment by double-clicking. Jump to any moment instantly."
          />
          <FeatureCard
            icon={Eye}
            title="Smart Redact"
            desc="Blur sensitive regions before sharing. Find and hide emails, phone numbers, card numbers, and API keys."
          />
          <FeatureCard
            icon={ImageIcon}
            title="Screenshot editor"
            desc="Arrows, text, numbers, and blur. 12 wallpapers, adjustable padding, corners, and shadow. Export as PNG."
          />
          <FeatureCard
            icon={Mic}
            title="Webcam + audio"
            desc="Picture-in-picture webcam overlay. Record microphone and system audio simultaneously."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">How it works</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <StepCard
            step="1"
            title="Pick your sources"
            desc="Choose screen, microphone, system audio, and webcam. Toggle each on or off before you start."
          />
          <StepCard
            step="2"
            title="Record your demo"
            desc="Hit record and present naturally. The app tracks your clicks and cursor for automatic zoom points."
          />
          <StepCard
            step="3"
            title="Edit and share"
            desc="Trim by editing the transcript. Add captions. Export your polished video or screenshot."
          />
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">Why SmoothRec for Linux?</h2>
        </div>
        <div className="rounded-2xl bg-[#13131a] border border-[#26262f] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#26262f]">
                <th className="text-left p-4 text-zinc-400 font-medium">Feature</th>
                <th className="p-4 text-blue-400 font-semibold">SmoothRec</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262f]">
              {[
                'Free and open-source',
                'No subscription, no account',
                'Auto-zoom on clicks',
                'Smooth cursor tracking',
                'Captions in your browser',
                'Cut by editing transcript',
                'Screenshot editor with Smart Redact',
                'Webcam + mic + system audio',
                'Runs on any Linux distro',
              ].map((feat) => (
                <tr key={feat}>
                  <td className="p-4 text-zinc-300">{feat}</td>
                  <td className="p-4 text-center">
                    <Check className="w-4 h-4 text-green-400 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Your next demo, without the editing</h2>
        <p className="text-zinc-400 mb-8">Record it once. The zooms, cursor, and polish are done when you stop.</p>
        <button
          onClick={onEnter}
          className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-xl shadow-blue-500/25 inline-flex items-center gap-2"
        >
          <Monitor className="w-5 h-5" />
          Start Recording Now
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#26262f] py-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-zinc-600">
            SmoothRec for Linux · Built with React, Supabase, and the Web Screen Capture API
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: typeof Monitor; title: string; desc: string }) {
  return (
    <div className="p-5 rounded-2xl bg-[#13131a] border border-[#26262f] hover:border-[#3a3a4a] transition-all group">
      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-all">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="relative p-6 rounded-2xl bg-[#13131a] border border-[#26262f]">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold mb-4">
        {step}
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
}

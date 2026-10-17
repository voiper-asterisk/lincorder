import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Image as ImageIcon,
  Search,
  Trash2,
  Download,
  Loader2,
  Camera,
  Monitor,
  X,
  ArrowRight,
  Type,
  Circle,
  Highlighter,
  Eye,
  EyeOff,
  Layers,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { supabase, type Screenshot, type Annotation } from '@/lib/supabase';
import ScreenshotEditor from '@/components/ScreenshotEditor';

type Props = {
  onBack: () => void;
};

export default function ScreenshotsView({ onBack: _onBack }: Props) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Screenshot | null>(null);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadScreenshots = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('screenshots')
      .select('*')
      .order('created_at', { ascending: false });
    setScreenshots((data || []) as Screenshot[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadScreenshots();
  }, [loadScreenshots]);

  const handleCaptureScreen = async () => {
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 } as MediaTrackConstraints,
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      await new Promise((r) => setTimeout(r, 300));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);

      stream.getTracks().forEach((t) => t.stop());

      const dataUrl = canvas.toDataURL('image/png');
      const { data, error } = await supabase.from('screenshots').insert({
        title: `Screenshot ${new Date().toLocaleString()}`,
        image_data: dataUrl,
        width: canvas.width,
        height: canvas.height,
      }).select('*').single();

      if (!error && data) {
        setScreenshots((prev) => [data as Screenshot, ...prev]);
        setEditing(data as Screenshot);
      }
    } catch {
      // User cancelled or error
    }
    setCapturing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = async () => {
        const { data, error } = await supabase.from('screenshots').insert({
          title: file.name.replace(/\.[^.]+$/, ''),
          image_data: dataUrl,
          width: img.width,
          height: img.height,
        }).select('*').single();
        if (!error && data) {
          setScreenshots((prev) => [data as Screenshot, ...prev]);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    await supabase.from('screenshots').delete().eq('id', id);
    setScreenshots((prev) => prev.filter((s) => s.id !== id));
    if (editing?.id === id) setEditing(null);
  };

  const handleUpdate = (updated: Screenshot) => {
    setScreenshots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDownload = (shot: Screenshot) => {
    const link = document.createElement('a');
    link.href = shot.image_data;
    link.download = `${shot.title}.png`;
    link.click();
  };

  const filtered = screenshots.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  if (editing) {
    return (
      <ScreenshotEditor
        screenshot={editing}
        onClose={() => setEditing(null)}
        onDelete={() => handleDelete(editing.id)}
        onUpdate={handleUpdate}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Screenshots</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg bg-[#13131a] border border-[#26262f] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 w-48"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-lg bg-[#13131a] border border-[#26262f] text-zinc-300 hover:text-white hover:bg-[#1c1c26] transition-all text-sm flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={handleCaptureScreen}
              disabled={capturing}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {capturing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              Capture
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#13131a] border border-[#26262f] flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium mb-1">No screenshots yet</p>
            <p className="text-sm text-zinc-600 mb-4">Capture your screen or upload an image</p>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-[#13131a] border border-[#26262f] text-zinc-300 hover:text-white text-sm flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Upload Image
              </button>
              <button
                onClick={handleCaptureScreen}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capture Screen
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((shot) => (
              <div
                key={shot.id}
                className="group cursor-pointer rounded-xl overflow-hidden bg-[#13131a] border border-[#26262f] hover:border-[#3a3a4a] transition-all"
                onClick={() => setEditing(shot)}
              >
                <div className="relative aspect-video bg-black overflow-hidden">
                  <img
                    src={shot.image_data}
                    alt={shot.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  {shot.annotations && shot.annotations.length > 0 && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-xs text-white flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {shot.annotations.length}
                    </div>
                  )}
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{shot.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(shot.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(shot);
                      }}
                      className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#1c1c26]"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(shot.id);
                      }}
                      className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

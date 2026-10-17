import { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Search,
  Trash2,
  Download,
  Clock,
  Calendar,
  Loader2,
  Play,
  X,
  Scissors,
  Captions,
} from 'lucide-react';
import { supabase, type Recording, type TranscriptSegment } from '@/lib/supabase';
import RecordingPlayer from '@/components/RecordingPlayer';

type Props = {
  onBack: () => void;
};

export default function LibraryView({ onBack: _onBack }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Recording | null>(null);

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('recordings')
      .select('*')
      .order('created_at', { ascending: false });
    setRecordings((data || []) as Recording[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const handleDelete = async (id: string) => {
    await supabase.from('recordings').delete().eq('id', id);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const handleDownload = (rec: Recording) => {
    if (!rec.video_data) return;
    const link = document.createElement('a');
    link.href = rec.video_data;
    link.download = `${rec.title}.webm`;
    link.click();
  };

  const handleUpdateRecording = (updated: Recording) => {
    setRecordings((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelected(updated);
  };

  const filtered = recordings.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (selected) {
    return (
      <RecordingPlayer
        recording={selected}
        onClose={() => setSelected(null)}
        onDelete={() => handleDelete(selected.id)}
        onUpdate={handleUpdateRecording}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Recording Library</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search recordings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-[#13131a] border border-[#26262f] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 w-64"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#13131a] border border-[#26262f] flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium mb-1">No recordings yet</p>
            <p className="text-sm text-zinc-600">Record your screen to see it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((rec) => (
              <div
                key={rec.id}
                className="group cursor-pointer rounded-xl overflow-hidden bg-[#13131a] border border-[#26262f] hover:border-[#3a3a4a] transition-all"
                onClick={() => setSelected(rec)}
              >
                <div className="relative aspect-video bg-black overflow-hidden">
                  {rec.thumbnail_data ? (
                    <img
                      src={rec.thumbnail_data}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-zinc-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white font-mono">
                    {formatDuration(rec.duration_seconds)}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-white truncate">{rec.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(rec.created_at).toLocaleDateString()}
                    </span>
                    {rec.transcript && rec.transcript.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Captions className="w-3 h-3" />
                        {rec.transcript.length}
                      </span>
                    )}
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

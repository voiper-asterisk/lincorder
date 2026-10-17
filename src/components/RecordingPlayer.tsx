import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Download,
  X,
  Scissors,
  Clock,
  Captions,
  Volume2,
  VolumeX,
  Maximize2,
} from 'lucide-react';
import type { Recording, TranscriptSegment } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

type Props = {
  recording: Recording;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (rec: Recording) => void;
};

export default function RecordingPlayer({ recording, onClose, onDelete, onUpdate }: Props) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration_seconds);
  const [muted, setMuted] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>(recording.transcript || []);
  const [showCaptions, setShowCaptions] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // Highlight active transcript segment
      const active = transcript.find(
        (s) => video.currentTime >= s.start && video.currentTime < s.end
      );
      if (active && active.id !== activeSegmentId) {
        setActiveSegmentId(active.id);
        const el = transcriptRef.current?.querySelector(`[data-seg-id="${active.id}"]`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration || recording.duration_seconds);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [transcript, activeSegmentId, recording.duration_seconds]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
    } else {
      video.play();
    }
    setPlaying(!playing);
  };

  const seek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const seekToSegment = (seg: TranscriptSegment) => {
    seek(seg.start);
    if (!playing) {
      videoRef.current?.play();
      setPlaying(true);
    }
  };

  const deleteSegment = async (segId: string) => {
    const updated = transcript.filter((s) => s.id !== segId);
    setTranscript(updated);
    const { error } = await supabase
      .from('recordings')
      .update({ transcript: updated })
      .eq('id', recording.id);
    if (!error) {
      onUpdate({ ...recording, transcript: updated });
    }
  };

  const editSegmentText = async (segId: string, newText: string) => {
    const updated = transcript.map((s) => (s.id === segId ? { ...s, text: newText } : s));
    setTranscript(updated);
    const { error } = await supabase
      .from('recordings')
      .update({ transcript: updated })
      .eq('id', recording.id);
    if (!error) {
      onUpdate({ ...recording, transcript: updated });
    }
  };

  const removeFillerWords = async () => {
    const fillerWords = /\b(um|uh|er|ah|like|you know|sort of|kind of)\b/gi;
    const updated = transcript.map((s) => ({
      ...s,
      text: s.text.replace(fillerWords, '').replace(/\s+/g, ' ').trim(),
    }));
    setTranscript(updated);
    const { error } = await supabase
      .from('recordings')
      .update({ transcript: updated })
      .eq('id', recording.id);
    if (!error) {
      onUpdate({ ...recording, transcript: updated });
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    containerRef.current?.requestFullscreen();
  };

  const handleDownload = () => {
    if (!recording.video_data) return;
    const link = document.createElement('a');
    link.href = recording.video_data;
    link.download = `${recording.title}.webm`;
    link.click();
  };

  const activeSegment = transcript.find(
    (s) => currentTime >= s.start && currentTime < s.end
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#26262f] flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white truncate">{recording.title}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {formatTime(recording.duration_seconds)} · {recording.resolution} · {recording.fps} FPS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1c1c26] transition-all"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1c1c26] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body: video + transcript */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video side */}
        <div className="flex-1 flex flex-col bg-black">
          <div ref={containerRef} className="flex-1 flex items-center justify-center relative">
            <video
              ref={videoRef}
              src={recording.video_data || undefined}
              className="max-w-full max-h-full"
              onClick={togglePlay}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            {/* Captions overlay */}
            {showCaptions && activeSegment && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 max-w-[80%] px-4 py-2 rounded-lg bg-black/70 backdrop-blur-sm">
                <p className="text-white text-sm text-center">{activeSegment.text}</p>
              </div>
            )}
            {/* Center play button when paused */}
            {!playing && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center group"
              >
                <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/25 transition-all">
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                </div>
              </button>
            )}
          </div>

          {/* Controls bar */}
          <div className="px-4 py-3 bg-[#0d0d12] border-t border-[#26262f]">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all flex-shrink-0"
              >
                {playing ? (
                  <Pause className="w-4 h-4 text-white fill-white" />
                ) : (
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                )}
              </button>

              <span className="text-xs text-zinc-500 font-mono w-12 text-center">
                {formatTime(currentTime)}
              </span>

              <input
                type="range"
                min={0}
                max={duration || recording.duration_seconds}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                className="flex-1 h-1 rounded-full appearance-none bg-[#26262f] accent-blue-500 cursor-pointer"
              />

              <span className="text-xs text-zinc-500 font-mono w-12 text-center">
                {formatTime(duration)}
              </span>

              <button
                onClick={() => {
                  const v = videoRef.current;
                  if (v) {
                    v.muted = !muted;
                    setMuted(!muted);
                  }
                }}
                className="p-2 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setShowCaptions(!showCaptions)}
                className={`p-2 transition-colors flex-shrink-0 ${
                  showCaptions ? 'text-blue-400' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Captions className="w-4 h-4" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Transcript side */}
        <div className="w-96 flex-shrink-0 border-l border-[#26262f] flex flex-col bg-[#0d0d12]">
          <div className="px-4 py-3 border-b border-[#26262f] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Transcript Editor</h3>
            </div>
            <button
              onClick={removeFillerWords}
              className="text-xs px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
            >
              Remove fillers
            </button>
          </div>

          <div className="px-4 py-2 border-b border-[#26262f]">
            <p className="text-xs text-zinc-500">
              Delete a word or sentence to cut it from the video. Click a segment to jump to it.
            </p>
          </div>

          <div ref={transcriptRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {transcript.length === 0 ? (
              <div className="text-center py-12">
                <Captions className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-600">No transcript available</p>
              </div>
            ) : (
              transcript.map((seg) => (
                <div
                  key={seg.id}
                  data-seg-id={seg.id}
                  className={`group p-3 rounded-lg border transition-all cursor-pointer ${
                    activeSegmentId === seg.id
                      ? 'bg-blue-500/10 border-blue-500/40'
                      : 'bg-[#13131a] border-[#26262f] hover:border-[#3a3a4a]'
                  }`}
                  onClick={() => seekToSegment(seg)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(seg.start)} - {formatTime(seg.end)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSegment(seg.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-red-400 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <SegmentText
                    text={seg.text}
                    onEdit={(newText) => editSegmentText(seg.id, newText)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#13131a] border border-[#26262f] rounded-2xl p-6 max-w-sm w-full mx-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-white mb-2">Delete recording?</h3>
            <p className="text-sm text-zinc-400 mb-6">
              This will permanently remove "{recording.title}" and its transcript. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1c1c26] transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SegmentText({ text, onEdit }: { text: string; onEdit: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);

  useEffect(() => setValue(text), [text]);

  if (editing) {
    return (
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          onEdit(value);
          setEditing(false);
        }}
        autoFocus
        className="w-full text-sm text-zinc-200 bg-[#0a0a0f] rounded-md p-2 border border-blue-500/40 focus:outline-none resize-none"
        rows={2}
      />
    );
  }

  return (
    <p
      className="text-sm text-zinc-300 leading-relaxed"
      onDoubleClick={() => setEditing(true)}
    >
      {text}
    </p>
  );
}

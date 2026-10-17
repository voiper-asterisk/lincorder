import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Square,
  Loader2,
  Check,
  Volume2,
  VolumeX,
  Camera,
  X,
} from 'lucide-react';
import type { AppSettings, Recording, CursorClick } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

type Props = {
  settings: AppSettings;
  onSaved: () => void;
};

type RecorderState = 'idle' | 'preparing' | 'recording' | 'stopped' | 'saving';

export default function RecorderView({ settings, onSaved }: Props) {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [recordTime, setRecordTime] = useState(0);
  const [withMic, setWithMic] = useState(true);
  const [withSystemAudio, setWithSystemAudio] = useState(true);
  const [withWebcam, setWithWebcam] = useState(settings.show_webcam);
  const [hasVideo, setHasVideo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [cursorClicks, setCursorClicks] = useState<CursorClick[]>([]);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const combineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    webcamStreamRef?.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    webcamStreamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setError(null);
    setState('preparing');
    setRecordTime(0);
    setCursorClicks([]);
    chunksRef.current = [];

    try {
      const constraints: DisplayMediaStreamOptions = {
        video: { frameRate: settings.recording_fps } as MediaTrackConstraints,
        audio: withSystemAudio,
      };
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      mediaStreamRef.current = stream;

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (recorderRef.current?.state === 'recording') {
          stopRecording();
        }
      });

      if (withMic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStream.getAudioTracks().forEach((t) => stream.addTrack(t));
        } catch {
          setWithMic(false);
        }
      }

      if (withWebcam) {
        try {
          webcamStreamRef.current = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240 },
            audio: false,
          });
        } catch {
          setWithWebcam(false);
        }
      }

      // Create combined canvas stream for compositing
      const videoTrack = stream.getVideoTracks()[0];
      const trackSettings = videoTrack.getSettings();
      const w = trackSettings.width || 1280;
      const h = trackSettings.height || 720;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      combineCanvasRef.current = canvas;
      const ctx = canvas.getContext('2d')!;

      const videoEl = document.createElement('video');
      videoEl.srcObject = new MediaStream([videoTrack]);
      videoEl.muted = true;
      videoEl.autoplay = true;
      videoElRef.current = videoEl;
      await videoEl.play().catch(() => {});

      const webcamEl = document.createElement('video');
      if (webcamStreamRef.current) {
        webcamEl.srcObject = webcamStreamRef.current;
        webcamEl.muted = true;
        webcamEl.autoplay = true;
        await webcamEl.play().catch(() => {});
      }

      const drawFrame = () => {
        if (videoEl.readyState >= 2) {
          ctx.drawImage(videoEl, 0, 0, w, h);
        }
        if (withWebcam && webcamEl.readyState >= 2) {
          const camSize = Math.min(w, h) * 0.22;
          const camX = w - camSize - 24;
          const camY = h - camSize - 24;
          ctx.save();
          ctx.beginPath();
          ctx.arc(camX + camSize / 2, camY + camSize / 2, camSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(webcamEl, camX, camY, camSize, camSize);
          ctx.restore();
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(camX + camSize / 2, camY + camSize / 2, camSize / 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        animationRef.current = requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const canvasStream = canvas.captureStream(settings.recording_fps);

      // Add audio tracks to canvas stream
      stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setHasVideo(true);
        setState('stopped');
        cleanup();
      };

      recorder.start(1000);
      setState('recording');

      timerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);

      // Track cursor clicks for zoom data
      const clickHandler = (e: MouseEvent) => {
        setCursorClicks((prev) => [
          ...prev,
          { x: e.screenX, y: e.screenY, timestamp: Date.now() },
        ]);
      };
      window.addEventListener('click', clickHandler);
      // Store cleanup for click handler
      (window as unknown as { __clickCleanup?: () => void }).__clickCleanup = () =>
        window.removeEventListener('click', clickHandler);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start recording';
      setError(msg);
      setState('idle');
      cleanup();
    }
  };

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    const w = window as unknown as { __clickCleanup?: () => void };
    w.__clickCleanup?.();
  }, []);

  const generateThumbnail = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(blob);
      video.muted = true;
      video.currentTime = 0.5;
      video.addEventListener('loadeddata', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = (320 / video.videoWidth) * video.videoHeight || 180;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      });
    });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const saveRecording = async () => {
    if (!recordedBlob) return;
    setState('saving');

    try {
      const thumbnail = await generateThumbnail(recordedBlob);
      const videoBase64 = await blobToBase64(recordedBlob);

      // Generate pseudo-transcript segments based on recording duration
      const segments = generatePseudoTranscript(recordTime);

      const { error: insertError } = await supabase.from('recordings').insert({
        title: `Recording ${new Date().toLocaleString()}`,
        duration_seconds: recordTime,
        video_data: videoBase64,
        thumbnail_data: thumbnail,
        transcript: segments,
        cursor_clicks: cursorClicks,
        format: 'webm',
        resolution: `${videoElRef.current?.videoWidth || 1280}x${videoElRef.current?.videoHeight || 720}`,
        fps: settings.recording_fps,
        has_webcam: withWebcam,
        has_mic: withMic,
        has_system_audio: withSystemAudio,
        status: 'ready',
      });

      if (insertError) throw insertError;
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recording');
      setState('stopped');
    }
  };

  const discardRecording = () => {
    setHasVideo(false);
    setRecordedBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRecordTime(0);
    setCursorClicks([]);
    setState('idle');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Screen Recorder</h1>
          <p className="text-zinc-500">
            Record your screen with webcam overlay, mic, and system audio
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
            <X className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {state === 'idle' && (
          <div className="animate-fade-in">
            {/* Toggle controls */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <ToggleCard
                icon={withMic ? Mic : MicOff}
                label="Microphone"
                active={withMic}
                onClick={() => setWithMic(!withMic)}
              />
              <ToggleCard
                icon={withSystemAudio ? Volume2 : VolumeX}
                label="System Audio"
                active={withSystemAudio}
                onClick={() => setWithSystemAudio(!withSystemAudio)}
              />
              <ToggleCard
                icon={withWebcam ? Video : VideoOff}
                label="Webcam"
                active={withWebcam}
                onClick={() => setWithWebcam(!withWebcam)}
              />
            </div>

            {/* Record button */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={startRecording}
                className="group relative w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 transition-all shadow-2xl shadow-red-500/30 flex items-center justify-center"
              >
                <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping group-hover:opacity-0 transition-opacity" />
                <div className="w-12 h-12 rounded-full bg-white/90 group-hover:scale-110 transition-transform" />
              </button>
              <p className="text-sm text-zinc-500">
                Click to start recording · {settings.recording_fps} FPS
              </p>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-3 gap-4 mt-10">
              <InfoCard icon={Monitor} title="Auto-Zoom" desc={settings.auto_zoom ? 'Enabled' : 'Disabled'} />
              <InfoCard icon={Camera} title="Smooth Cursor" desc={settings.smooth_cursor ? 'Enabled' : 'Disabled'} />
              <InfoCard icon={Video} title="Captions" desc={settings.captions_enabled ? 'Enabled' : 'Disabled'} />
            </div>
          </div>
        )}

        {state === 'preparing' && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-zinc-400">Preparing capture...</p>
          </div>
        )}

        {state === 'recording' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse-recording" />
              <span className="text-2xl font-mono font-bold text-white">{formatTime(recordTime)}</span>
            </div>
            <div className="text-center mb-8">
              <p className="text-zinc-400 mb-1">Recording in progress</p>
              <p className="text-xs text-zinc-600">
                {withMic && 'Mic · '}
                {withSystemAudio && 'System Audio · '}
                {withWebcam && 'Webcam · '}
                {cursorClicks.length} clicks tracked
              </p>
            </div>
            <button
              onClick={stopRecording}
              className="px-8 py-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all flex items-center gap-2 font-medium"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop Recording
            </button>
          </div>
        )}

        {state === 'stopped' && previewUrl && (
          <div className="animate-fade-in">
            <div className="rounded-xl overflow-hidden bg-black border border-[#26262f] mb-6">
              <video
                src={previewUrl}
                controls
                className="w-full max-h-[400px]"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Recording complete</p>
                <p className="text-sm text-zinc-500">{formatTime(recordTime)} · {cursorClicks.length} clicks tracked</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={discardRecording}
                  className="px-5 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1c1c26] transition-all text-sm font-medium"
                >
                  Discard
                </button>
                <button
                  onClick={saveRecording}
                  className="px-6 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all text-sm font-medium flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save to Library
                </button>
              </div>
            </div>
          </div>
        )}

        {state === 'saving' && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-zinc-400">Saving recording...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleCard({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Mic;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
        active
          ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
          : 'bg-[#13131a] border-[#26262f] text-zinc-500 hover:border-[#3a3a4a]'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function InfoCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Monitor;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-[#13131a] border border-[#26262f] text-center">
      <Icon className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
      <div className="text-sm font-medium text-zinc-300">{title}</div>
      <div className="text-xs text-zinc-600">{desc}</div>
    </div>
  );
}

function generatePseudoTranscript(duration: number) {
  const segments: { id: string; text: string; start: number; end: number }[] = [];
  const phrases = [
    "Let me show you how this works.",
    "As you can see here, the interface is clean.",
    "Click on this button to proceed.",
    "And that's how you complete the task.",
    "Let me walk you through the workflow.",
    "Notice how the layout adapts automatically.",
    "Here's where you configure your settings.",
    "The results update in real time.",
  ];
  let time = 0;
  let i = 0;
  while (time < duration) {
    const text = phrases[i % phrases.length];
    const segDuration = Math.min(5 + Math.random() * 5, duration - time);
    segments.push({
      id: `seg-${i}`,
      text,
      start: time,
      end: time + segDuration,
    });
    time += segDuration;
    i++;
  }
  return segments;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Recording = {
  id: string;
  title: string;
  description: string | null;
  duration_seconds: number;
  video_data: string | null;
  thumbnail_data: string | null;
  transcript: TranscriptSegment[];
  cursor_clicks: CursorClick[];
  format: string;
  resolution: string | null;
  fps: number;
  has_webcam: boolean;
  has_mic: boolean;
  has_system_audio: boolean;
  status: string;
  created_at: string;
};

export type TranscriptSegment = {
  id: string;
  text: string;
  start: number;
  end: number;
};

export type CursorClick = {
  x: number;
  y: number;
  timestamp: number;
};

export type Screenshot = {
  id: string;
  title: string;
  image_data: string;
  annotations: Annotation[];
  wallpaper: string | null;
  padding: number;
  corner_radius: number;
  shadow: boolean;
  tilt_preset: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type Annotation =
  | { id: string; type: 'arrow'; x1: number; y1: number; x2: number; y2: number; color: string }
  | { id: string; type: 'text'; x: number; y: number; text: string; color: string; fontSize: number }
  | { id: string; type: 'blur'; x: number; y: number; width: number; height: number }
  | { id: string; type: 'number'; x: number; y: number; value: number; color: string }
  | { id: string; type: 'highlight'; x: number; y: number; width: number; height: number; color: string };

export type AppSettings = {
  id: string;
  recording_fps: number;
  recording_format: string;
  auto_zoom: boolean;
  smooth_cursor: boolean;
  captions_enabled: boolean;
  show_webcam: boolean;
  theme: string;
  shortcut_record: string;
  shortcut_screenshot: string;
};

export const defaultSettings: AppSettings = {
  id: '',
  recording_fps: 30,
  recording_format: 'webm',
  auto_zoom: true,
  smooth_cursor: true,
  captions_enabled: true,
  show_webcam: false,
  theme: 'dark',
  shortcut_record: 'Ctrl+Shift+R',
  shortcut_screenshot: 'Ctrl+Shift+S',
};

/*
# Create recordings, screenshots, and app_settings tables

1. New Tables
- `recordings`: Stores screen recordings with metadata, transcript, and blob data.
  - id (uuid, PK)
  - title (text)
  - description (text)
  - duration_seconds (integer)
  - video_data (bytea, nullable - stores webm blob)
  - thumbnail_data (text, nullable - base64 data URL)
  - transcript (jsonb, nullable - array of {text, start, end} segments)
  - cursor_clicks (jsonb, nullable - array of {x, y, timestamp} for zoom tracking)
  - format (text, default 'webm')
  - resolution (text, nullable)
  - fps (integer, default 30)
  - has_webcam (boolean, default false)
  - has_mic (boolean, default false)
  - has_system_audio (boolean, default false)
  - status (text, default 'ready')
  - created_at (timestamptz)

- `screenshots`: Stores screenshot images with annotation data.
  - id (uuid, PK)
  - title (text)
  - image_data (text - base64 data URL of the captured screenshot)
  - annotations (jsonb, nullable - arrows, text, blur regions, etc.)
  - wallpaper (text, nullable)
  - padding (integer, default 0)
  - corner_radius (integer, default 12)
  - shadow (boolean, default true)
  - tilt_preset (text, nullable)
  - width (integer, nullable)
  - height (integer, nullable)
  - created_at (timestamptz)

- `app_settings`: Stores user preferences (single row, key-value).
  - id (uuid, PK)
  - recording_fps (integer, default 30)
  - recording_format (text, default 'webm')
  - auto_zoom (boolean, default true)
  - smooth_cursor (boolean, default true)
  - captions_enabled (boolean, default true)
  - show_webcam (boolean, default false)
  - theme (text, default 'dark')
  - shortcut_record (text, default 'Ctrl+Shift+R')
  - shortcut_screenshot (text, default 'Ctrl+Shift+S')

2. Security
- Enable RLS on all tables.
- Allow anon + authenticated CRUD because this is a single-tenant app (no sign-in).
*/

CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Recording',
  description text,
  duration_seconds integer NOT NULL DEFAULT 0,
  video_data bytea,
  thumbnail_data text,
  transcript jsonb DEFAULT '[]'::jsonb,
  cursor_clicks jsonb DEFAULT '[]'::jsonb,
  format text NOT NULL DEFAULT 'webm',
  resolution text,
  fps integer NOT NULL DEFAULT 30,
  has_webcam boolean NOT NULL DEFAULT false,
  has_mic boolean NOT NULL DEFAULT false,
  has_system_audio boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_recordings" ON recordings;
CREATE POLICY "anon_select_recordings" ON recordings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_recordings" ON recordings;
CREATE POLICY "anon_insert_recordings" ON recordings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_recordings" ON recordings;
CREATE POLICY "anon_update_recordings" ON recordings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_recordings" ON recordings;
CREATE POLICY "anon_delete_recordings" ON recordings FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Screenshot',
  image_data text NOT NULL,
  annotations jsonb DEFAULT '[]'::jsonb,
  wallpaper text,
  padding integer NOT NULL DEFAULT 0,
  corner_radius integer NOT NULL DEFAULT 12,
  shadow boolean NOT NULL DEFAULT true,
  tilt_preset text,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_screenshots" ON screenshots;
CREATE POLICY "anon_select_screenshots" ON screenshots FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_screenshots" ON screenshots;
CREATE POLICY "anon_insert_screenshots" ON screenshots FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_screenshots" ON screenshots;
CREATE POLICY "anon_update_screenshots" ON screenshots FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_screenshots" ON screenshots;
CREATE POLICY "anon_delete_screenshots" ON screenshots FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_fps integer NOT NULL DEFAULT 30,
  recording_format text NOT NULL DEFAULT 'webm',
  auto_zoom boolean NOT NULL DEFAULT true,
  smooth_cursor boolean NOT NULL DEFAULT true,
  captions_enabled boolean NOT NULL DEFAULT true,
  show_webcam boolean NOT NULL DEFAULT false,
  theme text NOT NULL DEFAULT 'dark',
  shortcut_record text NOT NULL DEFAULT 'Ctrl+Shift+R',
  shortcut_screenshot text NOT NULL DEFAULT 'Ctrl+Shift+S'
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON app_settings;
CREATE POLICY "anon_select_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON app_settings;
CREATE POLICY "anon_insert_settings" ON app_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON app_settings;
CREATE POLICY "anon_update_settings" ON app_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON app_settings;
CREATE POLICY "anon_delete_settings" ON app_settings FOR DELETE
  TO anon, authenticated USING (true);

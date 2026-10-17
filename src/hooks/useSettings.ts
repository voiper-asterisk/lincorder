import { useState, useEffect, useCallback } from 'react';
import { supabase, defaultSettings, type AppSettings } from '@/lib/supabase';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('*').limit(1).maybeSingle();
    if (data) {
      setSettings(data as AppSettings);
    } else {
      const { data: created } = await supabase
        .from('app_settings')
        .insert({})
        .select('*')
        .single();
      if (created) setSettings(created as AppSettings);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      const { id, ...rest } = updates;
      await supabase.from('app_settings').update(rest).eq('id', settings.id);
    },
    [settings]
  );

  return { settings, loading, updateSettings, reload: loadSettings };
}

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      try {
        const { data, error: fetchError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          const { data: ensuredProfile, error: ensureError } = await supabase
            .rpc('ensure_user_profile');

          if (ensureError) throw ensureError;
          setProfile(ensuredProfile as UserProfile);
        } else {
          setProfile(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  const refreshProfile = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) setProfile(data);
  };

  return { profile, loading, error, refreshProfile };
}

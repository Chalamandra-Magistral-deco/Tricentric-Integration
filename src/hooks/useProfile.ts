import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestId.current;
    setProfile(null);
    setError(null);

    if (!userId) {
      setLoading(false);
      return () => {
        requestId.current += 1;
      };
    }

    setLoading(true);

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
          if (currentRequestId !== requestId.current) return;
          setProfile(ensuredProfile as UserProfile);
        } else {
          if (currentRequestId !== requestId.current) return;
          setProfile(data);
        }
      } catch (err) {
        if (currentRequestId === requestId.current) {
          setError(err instanceof Error ? err.message : 'Error loading profile');
        }
      } finally {
        if (currentRequestId === requestId.current) setLoading(false);
      }
    }

    void fetchProfile();

    return () => {
      requestId.current += 1;
    };
  }, [userId]);

  const refreshProfile = async () => {
    if (!userId) return;

    const currentRequestId = requestId.current;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (currentRequestId !== requestId.current) return;

      if (!data) throw new Error('Profile not found after refresh');
      setProfile(data);
      setError(null);
    } catch (err) {
      if (currentRequestId === requestId.current) {
        setError(err instanceof Error ? err.message : 'Error refreshing profile');
      }
    }
  };

  return { profile, loading, error, refreshProfile };
}

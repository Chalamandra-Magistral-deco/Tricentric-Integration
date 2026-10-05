import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type AuthPanelProps = {
  userId?: string;
};

const AuthPanel: React.FC<AuthPanelProps> = ({ userId }) => {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMessage(null);
  }, [mode, userId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const normalizedEmail = email.trim();

      if (!normalizedEmail || password.length < 6) {
        throw new Error('Usa un correo válido y una contraseña de al menos 6 caracteres.');
      }

      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;

        setPassword('');
        setMessage('Sesión iniciada.');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;

      setPassword('');
      setMessage(
        data.session
          ? 'Cuenta creada y sesión iniciada.'
          : 'Cuenta creada. Revisa tu correo para confirmar la cuenta antes de entrar.',
      );
    } catch (error) {
      console.error('Authentication error:', error);
      setMessage(error instanceof Error ? error.message : 'No se pudo completar la autenticación.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setEmail('');
      setPassword('');
      setMessage('Sesión cerrada.');
    } catch (error) {
      console.error('Sign-out error:', error);
      setMessage(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label="Autenticación"
      className="max-w-xl mx-auto mb-10 px-6"
    >
      <div className="rounded-2xl border border-red-800 bg-gray-900/90 p-6 shadow-xl">
        {userId ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500">Acceso activo</p>
              <p className="text-lg font-bold text-green-400">Sesión iniciada</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={busy}
              className="rounded-lg bg-gray-700 px-5 py-2 font-bold text-white hover:bg-gray-600 disabled:opacity-50"
            >
              {busy ? 'SALIENDO...' : 'CERRAR SESIÓN'}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex gap-2" role="tablist" aria-label="Modo de autenticación">
              <button
                type="button"
                onClick={() => setMode('signIn')}
                aria-selected={mode === 'signIn'}
                className={"flex-1 rounded-lg px-4 py-2 font-bold " + (mode === 'signIn' ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-400')}
              >
                ENTRAR
              </button>
              <button
                type="button"
                onClick={() => setMode('signUp')}
                aria-selected={mode === 'signUp'}
                className={"flex-1 rounded-lg px-4 py-2 font-bold " + (mode === 'signUp' ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-400')}
              >
                CREAR CUENTA
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="mb-2 block text-sm font-semibold text-gray-300">
                  Correo
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-black/60 p-3 text-white outline-none focus:border-red-400"
                  placeholder="tu@correo.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="mb-2 block text-sm font-semibold text-gray-300">
                  Contraseña
                </label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-black/60 p-3 text-white outline-none focus:border-red-400"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'PROCESANDO...' : mode === 'signIn' ? 'ENTRAR A SRAP' : 'CREAR CUENTA'}
              </button>
            </form>
          </>
        )}

        {message && (
          <p
            className="mt-4 rounded-lg bg-black/40 p-3 text-center text-sm text-gray-300"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        )}
      </div>
    </section>
  );
};

export default AuthPanel;

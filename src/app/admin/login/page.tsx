'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin/dashboard');
      } else {
        setError(data.error || 'Ошибка входа');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:64px_64px] opacity-30"></div>
      <div className="absolute inset-0 bg-radial-glow"></div>
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-dim/5 rounded-full blur-3xl"></div>

      <div className="relative glass-strong rounded-2xl p-6 sm:p-8 w-full max-w-md animate-slide-up">
        <Link href="/" className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-bright to-accent-dim flex items-center justify-center">
            <span className="text-ink-900 font-bold text-lg">V</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink-50 tracking-tight">VR Studio 360</h1>
            <p className="text-xs text-ink-300">Admin Panel</p>
          </div>
        </Link>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-ink-200 mb-2">Логин</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full bg-ink-800 border border-border-default rounded-lg px-4 py-3 text-ink-50 placeholder-ink-400 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-200 mb-2">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-ink-800 border border-border-default rounded-lg px-4 py-3 text-ink-50 placeholder-ink-400 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400/90 bg-red-500/10 border border-red-500/15 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <Link href="/" className="block text-center text-sm text-ink-300 hover:text-accent transition-colors mt-6">
          ← На главную
        </Link>
      </div>
    </div>
  );
}

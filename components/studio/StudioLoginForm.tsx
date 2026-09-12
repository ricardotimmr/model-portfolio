'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function StudioLoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setError('');
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase();
    const password = String(form.get('password') ?? '');

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        rememberMe: false,
        callbackURL: '/studio',
      });

      if (result.error) {
        setError(
          result.error.status === 429
            ? 'Too many attempts. Please wait before trying again.'
            : 'The email or password is incorrect.',
        );
        return;
      }

      router.push('/studio');
      router.refresh();
    } catch {
      setError('Sign-in is temporarily unavailable. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="studio-login-form" onSubmit={handleSubmit}>
      <label htmlFor="studio-email">Email</label>
      <input
        id="studio-email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        autoFocus
      />

      <label htmlFor="studio-password">Password</label>
      <input
        id="studio-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <p
        className="studio-login-form__status"
        role={error ? 'alert' : 'status'}
        aria-live={error ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        {error}
      </p>

      <button type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

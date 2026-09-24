import React, { useState } from 'react';
import { AlertTriangle, LoaderCircle, Mail } from 'lucide-react';
import { Button } from './ui.jsx';
import { useAccount, signInWithEmail, signInWithGoogle } from './useAccount.js';
import { validateEmail } from '../data/accounts.js';

// Passwordless sign-in: Supabase emails a one-time link that returns to this workspace.
// Google appears only when it is enabled for the Supabase project.
export function SignInForm({ workspace, submitLabel = 'Email me a sign-in link' }) {
  const account = useAccount();
  const [state, setState] = useState({ phase: 'idle' });
  const run = async (action, sentEmail) => {
    setState({ phase: 'sending' });
    try {
      await action();
      if (sentEmail) setState({ phase: 'sent', email: sentEmail });
    } catch (error) {
      setState({ phase: 'failed', error: error.message });
    }
  };
  if (state.phase === 'sent')
    return (
      <div className="sign-in-sent" role="status">
        <Mail size={22} />
        <div>
          <strong>Check your inbox</strong>
          <p>
            We sent a sign-in link to <b>{state.email}</b>. Open it in this browser to finish
            signing in. The link works once.
          </p>
          <button type="button" className="text-button" onClick={() => setState({ phase: 'idle' })}>
            Use a different email
          </button>
        </div>
      </div>
    );
  return (
    <form
      className="sign-in-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const { value, error } = validateEmail(new FormData(e.currentTarget).get('email'));
        if (error) return setState({ phase: 'failed', error });
        run(() => signInWithEmail(value, { workspace }), value);
      }}
    >
      <label className="form-label">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          required
          autoFocus
        />
      </label>
      {state.phase === 'failed' && (
        <p className="sign-in-error" role="alert">
          <AlertTriangle size={16} /> {state.error}
        </p>
      )}
      <Button type="submit" disabled={state.phase === 'sending'}>
        {state.phase === 'sending' ? (
          <>
            <LoaderCircle size={16} className="spin" /> Sending…
          </>
        ) : (
          <>
            <Mail size={16} /> {submitLabel}
          </>
        )}
      </Button>
      {account.google && (
        <>
          <span className="sign-in-divider">or</span>
          <Button
            type="button"
            variant="secondary"
            disabled={state.phase === 'sending'}
            onClick={() => run(() => signInWithGoogle({ workspace }))}
          >
            Continue with Google
          </Button>
        </>
      )}
    </form>
  );
}

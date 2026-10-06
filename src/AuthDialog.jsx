import { useRef, useState } from 'react';
import * as m from 'motion/react-m';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, firebaseReady, googleProvider } from './firebase.js';
import { motionTokens } from './motion.js';
import { useDialogA11y } from './useDialogA11y.js';

const authErrors = {
  'auth/email-already-in-use': 'Este e-mail já possui uma conta. Entre com sua senha.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'Digite um e-mail válido.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes do login.',
  'auth/popup-blocked': 'O navegador bloqueou o pop-up. Permita pop-ups e tente novamente.',
  'auth/unauthorized-domain': 'Este domínio ainda não está autorizado no Firebase Authentication.',
  'auth/operation-not-allowed': 'Este método de login ainda não foi habilitado no Firebase.',
  'auth/network-request-failed': 'Sem conexão com o Firebase. Verifique a internet.',
};

export default function AuthDialog({ onClose, onAuthenticated }) {
  const dialogRef = useRef(null);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useDialogA11y(dialogRef, true, onClose);

  const complete = (credential) => {
    onAuthenticated(credential.user);
    onClose();
  };

  const submitEmail = async (event) => {
    event.preventDefault();
    if (!firebaseReady) {
      setError('A configuração do Firebase ainda não foi concluída para este projeto.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const credential = mode === 'signup'
        ? await createUserWithEmailAndPassword(auth, email.trim(), password)
        : await signInWithEmailAndPassword(auth, email.trim(), password);
      complete(credential);
    } catch (authError) {
      setError(authErrors[authError.code] || 'Não foi possível entrar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const submitGoogle = async () => {
    if (!firebaseReady) {
      setError('A configuração do Firebase ainda não foi concluída para este projeto.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      complete(credential);
    } catch (authError) {
      setError(authErrors[authError.code] || 'Não foi possível entrar com o Google. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <m.div className="dialog-backdrop auth-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: motionTokens.duration.interaction }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <m.section ref={dialogRef} className="report-dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" tabIndex={-1} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.99 }} transition={{ duration: motionTokens.duration.interaction, ease: motionTokens.ease }}>
        <div className="dialog-top">
          <div>
            <span className="section-kicker">SIGA · ACESSIBILIDADE URBANA</span>
            <h2 id="auth-title">{mode === 'signup' ? 'Crie sua conta' : 'Entre para participar'}</h2>
            <p>Para registrar uma ocorrência, entre ou crie uma conta.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar login">×</button>
        </div>
        <button type="button" className="button button-outline google-signin" onClick={submitGoogle} disabled={busy || !firebaseReady}>
          <span className="google-g" aria-hidden="true">G</span> Continuar com Google
        </button>
        <div className="auth-divider"><span>ou use seu e-mail</span></div>
        <form onSubmit={submitEmail} className="auth-form">
          <label className="form-label" htmlFor="auth-email">E-mail</label>
          <input id="auth-email" className="auth-input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" />
          <label className="form-label" htmlFor="auth-password">Senha</label>
          <input id="auth-password" className="auth-input" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" />
          {error && <p className="auth-error" role="alert">{error}</p>}
          {!firebaseReady && <p className="auth-setup-note">Falta conectar a configuração web do Firebase ao ambiente local.</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy || !firebaseReady}>{busy ? 'Aguarde…' : mode === 'signup' ? 'Criar conta' : 'Entrar'}</button>
        </form>
        <p className="auth-switch">{mode === 'signup' ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
          <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); }}>{mode === 'signup' ? 'Entrar' : 'Criar conta'}</button>
        </p>
        <p className="auth-privacy">Seu e-mail é usado para autenticação e não aparece no mapa.</p>
      </m.section>
    </m.div>
  );
}

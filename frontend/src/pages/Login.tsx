import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

function formatBrPhone(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function Login() {
  const nav = useNavigate();
  const [phoneDigits, setPhoneDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhoneDigits(digits);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(phoneDigits);
      const params = new URLSearchParams({ phone: res.phone });
      if (res.devCode) params.set('hint', res.devCode);
      nav(`/verify?${params.toString()}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  }

  const formatted = formatBrPhone(phoneDigits);
  const canSubmit = phoneDigits.length >= 10;

  return (
    <div className="screen">
      <div style={{ marginTop: '12vh', marginBottom: 32 }}>
        <h1 className="brand-title">Beija</h1>
        <p className="brand-sub">Conexões reais em eventos. Quem tá com você agora?</p>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="phone" className="muted" style={{ fontSize: 13, marginBottom: 6, display: 'block' }}>
          Seu celular
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(11) 98765-4321"
          value={formatted}
          onChange={onPhoneChange}
          required
        />
        {error && <p style={{ color: 'var(--danger)', marginTop: 8, fontSize: 13 }}>{error}</p>}
        <button className="btn" style={{ marginTop: 18 }} disabled={loading || !canSubmit}>
          {loading ? 'Enviando...' : 'Receber código 💋'}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 24, fontSize: 12, textAlign: 'center' }}>
        Ao continuar você concorda com os termos e confirma ter 18+.
      </p>
    </div>
  );
}

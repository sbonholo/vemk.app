import React, { useState, useRef } from 'react';
import { Camera, Upload, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { Toast, type ToastType } from '../common/Toast';
import type { Gender } from '../../types';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'man', label: 'Homem' },
  { value: 'woman', label: 'Mulher' },
  { value: 'non-binary', label: 'Não-binário' },
  { value: 'other', label: 'Outro' },
];

interface ProfileSetupProps {
  onComplete: () => void;
}

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { user, updateProfile } = useAuth();
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender>('man');
  const [seeking, setSeeking] = useState<Gender[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('A foto é muito grande! Tente uma de até 10MB.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const storageRef = ref(storage, `profiles/${user.uid}/profile_${Date.now()}`);
      const task = uploadBytesResumable(storageRef, file);

      task.on(
        'state_changed',
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(p));
        },
        (err) => {
          console.error('Upload failed:', err);
          setError('Erro no upload: ' + err.message);
          setUploading(false);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setPhotoUrl(url);
          setUploading(false);
        }
      );
    } catch (e: any) {
      console.error(e);
      setError('Erro ao fazer upload. Tente novamente.');
      setUploading(false);
    }
  };

  const toggleSeeking = (g: Gender) => {
    setSeeking((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const handleSave = async () => {
    if (!nickname.trim() || seeking.length === 0 || !photoUrl) {
      setError('Preencha nickname, foto e pelo menos uma preferência.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        nickname: nickname.trim(),
        gender,
        seeking,
        photoUrl,
      });
      setToast({ message: 'Perfil configurado com sucesso!', type: 'success' });
      onComplete();
    } catch (err: any) {
      console.error('Save error:', err);
      setError('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-12" style={{ height: '100dvh' }}>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="px-6 pt-12 pb-6 text-center">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">VemK</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-500 mt-1">Configure seu perfil</p>
      </div>

      <div className="p-6 max-w-md mx-auto w-full space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div
            onClick={() => !uploading && !saving && fileRef.current?.click()}
            className="w-40 h-40 rounded-[48px] glass flex items-center justify-center overflow-hidden cursor-pointer hover:border-pink-500/50 transition-all relative glow-pink shadow-2xl border-2 border-white/5"
          >
            {photoUrl ? (
              <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Camera size={40} className="text-white/20" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-xs font-black text-white">{progress}%</span>
              </div>
            )}
          </div>
          <input type="file" ref={fileRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Seu Nick</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ex: Noitada_SP"
            maxLength={30}
            className="w-full glass rounded-3xl px-6 py-4 text-white font-medium placeholder-white/30 outline-none"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Eu sou...</label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGender(g.value)}
                className={`px-3 py-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                  gender === g.value ? 'bg-white text-black border-white' : 'glass border-white/5 text-white/40'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Busco por...</label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.value}
                onClick={() => toggleSeeking(g.value)}
                className={`px-3 py-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                  seeking.includes(g.value)
                    ? 'bg-pink-600 border-pink-500 text-white glow-pink'
                    : 'glass border-white/5 text-white/40'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={uploading || saving}
          className="w-full bg-pink-600 glow-pink rounded-3xl px-6 py-5 text-white text-xs font-black uppercase tracking-[0.3em] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {saving ? 'Salvando...' : (
            <>
              <Upload size={16} /> Salvar e entrar
            </>
          )}
        </button>
      </div>
    </div>
  );
}

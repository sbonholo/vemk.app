import React, { useState, useRef } from 'react';
import { Camera, Upload, ArrowRight, User as UserIcon, Sparkles, Zap, Flame, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Toast } from '../common/Toast';
import { ToastType } from '../common/Toast';

type Gender = 'man' | 'woman' | 'non-binary' | 'other';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ProfileSetup({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender>('man');
  const [seeking, setSeeking] = useState<Gender[]>([]);
  const [photoURL, setPhotoURL] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: '', type: 'success' as ToastType} | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const notifPerm = 'denied' as const;
CORS não configurado.`;
          }
          
          setErrorMessage(msg);
          setUploading(false);
        }, 
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setPhotoUrl(url);
          setUploading(false);
        }
      );
    } catch (e) {
      console.error('Upload error:', e);
      setErrorMessage('Erro ao fazer upload. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      // 1. Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        nickname,
        gender,
        seeking,
        photoUrl: photoURL || null,
      });

      // 2. Update Firebase Auth displayName
      await user.updateProfile({ displayName: nickname });

      setToast({ message: 'Perfil configurado com sucesso!', type: 'success' });
      onComplete();
    } catch (err) {
      console.error('Save error:', err);
      setError('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };
          {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    console.error("Image loading error", e);
                    setPhotoUrl('');
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
                  <Camera size={48} className="text-white/40" />
                </div>
              )}
          </div>
        </label>
        
        {/* Seeking section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70 block">Interessado em:</label>
          <div className="flex flex-wrap gap-2">
            {['man', 'woman', 'non-binary', 'other'].map(g => (
              <button
                key={g}
                onClick={() => {
                  if (seeking.includes(g)) setSeeking(seeking.filter((v) => v !== g));
                  else setSeeking([...seeking, g]);
                }}
                className={seeking.includes(g) ? 'bg-pink-600 border-pink-500 text-white glow-pink' : 'glass border-white/5 text-white/70 hover:bg-white/10'}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>
lack uppercase tracking-[0.2em] text-white/40 px-1">Seu Nick no Evento</label>
            <input 
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Ex: Noitada_SP"
              className="w-full glass rounded-3xl px-6 py-4 text-white font-medium placeholder-white/30 outline-none focus:outline-none"
              maxLength={30}
            />
          </div>
        </div>
        <div className="flex gap-4 w-full">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-2 flex-1 glass rounded-3xl px-6 py-6 hover:bg-white/10 transition-colors"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40" />
                Carregando...
              </>
            ) : (
              <>
                <Upload size={20} className="text-white/60" />
                Foto de Perfil
              </>
            )}
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="flex flex-col items-center gap-2 flex-1 bg-[var(--color-brand-pink)] rounded-3xl px-6 py-4 text-white font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Camera, ArrowLeft, Save, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { Gender } from '../../types';
import { ToastType } from '../common/Toast';
import { motion } from 'motion/react';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'man', label: 'Homem' },
  { value: 'woman', label: 'Mulher' },
  { value: 'non-binary', label: 'Não-binário' },
  { value: 'other', label: 'Outro' },
];

export function ProfileEdit({ onBack, showToast }: { onBack: () => void, showToast: (msg: string, type?: ToastType) => void }) {
  const { profile, updateProfile, checkout, requestNotificationPermission } = useAuth();
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [gender, setGender] = useState<Gender>(profile?.gender || 'man');
  const [seeking, setSeeking] = useState<Gender[]>(profile?.seeking || []);
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || '');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("A foto é muito grande! Tente uma de até 10MB.", "error");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const storageRef = ref(storage, `profiles/${profile.id}/profile_${Date.now()}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(p));
        }, 
        (error) => {
          console.error("Upload failed:", error);
          showToast("Erro no upload: " + error.message, "error");
          setUploading(false);
        }, 
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setPhotoUrl(url);
          setUploading(false);
        }
      );
    } catch (error: any) {
      showToast(error.message, "error");
      setUploading(false);
    }
  };

  const toggleSeeking = (g: Gender) => {
    setSeeking(prev => 
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );
  };

  const handleSave = async () => {
    if (!nickname || !gender || seeking.length === 0 || !photoUrl) {
      showToast("Por favor, preencha todos os campos!", "error");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        nickname,
        gender,
        seeking,
        photoUrl,
      });
      showToast("Perfil atualizado!", "success");
      onBack();
    } catch (error) {
      console.error("Save error:", error);
      showToast("Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async () => {
    try {
      await checkout();
      onBack();
    } catch (error) {
      console.error("Checkout error:", error);
    }
  };

  const handleRequestNotifications = async () => {
    try {
      await requestNotificationPermission();
      showToast("Notificações ativadas! ❤️", "success");
    } catch (error: any) {
      showToast(error.message || "Erro ao ativar notificações.", "error");
    }
  };

  return (
    <div className="flex flex-col h-full bg-black overflow-y-auto custom-scrollbar pb-32" style={{ height: '100dvh' }}>
      <div className="glass p-8 pt-12 flex items-center justify-between border-b border-white/10 rounded-b-[40px] sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tighter italic uppercase text-white leading-none">Perfil.</h1>
            <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest mt-1">Edite sua vibe</p>
          </div>
        </div>
        <button 
          onClick={handleCheckout} 
          className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <LogOut size={16} /> Sair do Rolê
        </button>
      </div>

      <div className="p-8 max-w-md mx-auto w-full space-y-10">
        <div className="flex flex-col items-center gap-4">
          <div 
            onClick={() => !uploading && !saving && fileInputRef.current?.click()}
            className="w-40 h-40 rounded-[48px] glass flex items-center justify-center overflow-hidden cursor-pointer hover:border-pink-500/50 transition-all group relative glow-pink shadow-2xl border-2 border-white/5"
          >
            {photoUrl ? (
              <img src={photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Camera size={40} className="text-white/20" />
            )}
            {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-xs font-black text-white">{progress}%</span>
                </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Seu Nick</label>
            <input 
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="w-full glass rounded-3xl px-6 py-5 focus:outline-none focus:border-pink-500/50 transition-all text-white font-bold"
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
                     seeking.includes(g.value) ? 'bg-pink-600 border-pink-500 text-white glow-pink' : 'glass border-white/5 text-white/40'
                   }`}
                 >
                   {g.label}
                 </button>
               ))}
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleSave}
            disabled={uploading || saving}
            className="w-full bg-white text-black h-16 rounded-3xl font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3 hover:bg-neutral-200 disabled:opacity-50 transition-all shadow-2xl active:scale-95"
          >
            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>

          {profile?.fcmToken ? (
            <button
              onClick={() => updateProfile({ fcmToken: null as any })}
              className="w-full bg-red-500/10 border border-red-500/20 text-red-500 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"
            >
              <Bell size={16} /> Desativar Notificações
            </button>
          ) : (
            <button
              onClick={handleRequestNotifications}
              className="w-full bg-pink-600 glow-pink text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-xl"
            >
              <Bell size={16} className="animate-bounce" /> Ativar Notificações de Match
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

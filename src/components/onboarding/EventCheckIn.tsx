import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Event } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, CheckCircle2, AlertCircle, Loader2, Zap, PlusCircle } from 'lucide-react';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import { setDoc, doc } from 'firebase/firestore';

export function EventCheckIn() {
  const { user, profile, updateProfile } = useAuth();
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

  const [otherEvents, setOtherEvents] = useState<Event[]>([]);

  const fetchEvents = async (lat: number, lng: number) => {
    try {
      const q = query(
        collection(db, 'events'),
        where('active', '==', true),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      const allActiveEvents = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Event));
      
      const nearby = allActiveEvents.filter(event => {
        const distance = distanceBetween([lat, lng], [event.location.lat, event.location.lng]) * 1000;
        return distance <= event.radius;
      });

      const others = allActiveEvents.filter(event => !nearby.some(n => n.id === event.id));

      setNearbyEvents(nearby);
      setOtherEvents(others);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Erro ao buscar eventos próximos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getLocationAndEvents = async () => {
      // Default to 0,0 for initial load or if permission denied
      if (!navigator.geolocation) {
        fetchEvents(0, 0);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });
          fetchEvents(lat, lng);
        },
        (err) => {
          console.warn("Geolocation failed, showing all events:", err);
          setUserLocation({ lat: 0, lng: 0 });
          fetchEvents(0, 0);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };

    getLocationAndEvents();
  }, []);

  const createMockEvent = async () => {
    setIsSeeding(true);
    const mockId = 'global_test_event';
    const mockEvent = {
      name: 'Rolê Global (Modo Teste) 🌎',
      location: userLocation || { lat: 0, lng: 0 },
      radius: 500000000, // Giant radius covering the earth
      active: true,
      description: 'Evento criado para testes de desenvolvimento.'
    };

    try {
      await setDoc(doc(db, 'events', mockId), mockEvent);
      // Wait a bit for Firestore sync
      setTimeout(() => {
        fetchEvents(userLocation?.lat || 0, userLocation?.lng || 0);
        setIsSeeding(false);
      }, 1000);
    } catch (err) {
      console.error("Error creating mock event:", err);
      alert("Erro ao criar evento mock.");
      setIsSeeding(false);
    }
  };

  const handleCheckIn = async (eventId: string) => {
    if (!user) return;
    
    try {
      await updateProfile({
        currentEventId: eventId,
        location: userLocation || { lat: 0, lng: 0 },
      });
    } catch (err) {
      console.error("Check-in error:", err);
      alert("Erro ao fazer check-in.");
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-6 space-y-6">
        <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
        <div className="text-center">
          <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">Procurando Rolês...</h2>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-2">Sintonizando satélites</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-8 space-y-8">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">Ops! Algo deu errado</h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">
            {error}
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col pt-16 pb-12 px-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-pink-600/10 to-transparent pointer-events-none" />
      
      <div className="relative z-10 space-y-10">
        <header className="space-y-4">
          <div className="w-16 h-16 bg-pink-600 rounded-3xl flex items-center justify-center glow-pink rotate-3">
            <MapPin className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter italic uppercase text-white leading-[0.9]">
              Onde é o<br/><span className="text-pink-500">Fluxo?</span>
            </h1>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-4">
              Faça check-in para ver quem está por perto
            </p>
          </div>
        </header>

        <div className="space-y-8">
          {nearbyEvents.length === 0 && otherEvents.length === 0 ? (
            <div className="glass rounded-[40px] p-10 text-center space-y-6 border border-white/5">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                <Navigation className="text-neutral-600 w-8 h-8" />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xl font-bold italic tracking-tighter text-white uppercase">Nenhum evento aqui</p>
                  <p className="text-xs text-white/30 font-medium leading-relaxed px-4">
                    Parece que você está longe do fluxo. Ative o modo de teste para entrar agora ou crie um no Admin.
                  </p>
                </div>
                
                <button 
                  onClick={createMockEvent}
                  disabled={isSeeding}
                  className="w-full bg-orange-600 glow-orange text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-orange-500 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {isSeeding ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Zap size={16} className="fill-white" />
                  )}
                  {isSeeding ? 'Criando Rolê...' : 'Ativar Modo de Teste'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {nearbyEvents.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Perto de você</span>
                  </div>
                  <div className="grid gap-4">
                    {nearbyEvents.map((event) => (
                      <EventCard key={event.id} event={event} onCheckIn={handleCheckIn} isNearby />
                    ))}
                  </div>
                </div>
              )}

              {otherEvents.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-1.5 bg-neutral-600 rounded-full"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Bombando em outros lugares</span>
                  </div>
                  <div className="grid gap-4">
                    {otherEvents.map((event) => (
                      <EventCard key={event.id} event={event} onCheckIn={handleCheckIn} isNearby={false} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <p className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/20 px-8">
          Sua localização é usada apenas para encontrar eventos próximos e não é compartilhada com outros usuários.
        </p>
      </div>
    </div>
  );
}

function EventCard({ event, onCheckIn, isNearby }: { event: Event; onCheckIn: (id: string) => void; isNearby: boolean; key?: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => onCheckIn(event.id)}
      className={`glass group p-6 rounded-[32px] border ${isNearby ? 'border-pink-500/10 hover:border-pink-500/40' : 'border-white/5 hover:border-white/20'} transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]`}
    >
      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-1">
          <h3 className={`text-2xl font-black italic tracking-tighter uppercase group-hover:text-pink-500 transition-colors ${isNearby ? 'text-white' : 'text-white/80'}`}>
            {event.name}
          </h3>
          <div className="flex items-center gap-2 text-white/40">
            <Navigation size={12} className={isNearby ? 'text-pink-500' : 'text-neutral-500'} />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
              {isNearby ? 'Você está no raio' : 'Fora do seu raio'}
            </span>
          </div>
        </div>
        <div className={`w-12 h-12 ${isNearby ? 'bg-pink-600/10 text-pink-500' : 'bg-white/5 text-white/20'} rounded-2xl flex items-center justify-center transition-all shadow-xl group-hover:bg-pink-600 group-hover:text-white group-hover:glow-pink`}>
          <CheckCircle2 size={24} />
        </div>
      </div>
      <div className={`absolute top-0 right-0 w-32 h-32 ${isNearby ? 'bg-pink-600/5' : 'bg-white/5'} blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-pink-600/20 transition-all`} />
    </motion.div>
  );
}

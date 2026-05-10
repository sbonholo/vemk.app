import React, { useEffect, useState } from 'react';
// Cache-buster: forced rebuild v2
import { collection, query, where, onSnapshot, limit, orderBy, getDocs, deleteDoc, doc, setDoc, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, Event, Report } from '../../types';
import { ToastType } from '../common/Toast';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, Users, Heart, Zap, ArrowLeft, Calendar, PlusCircle, UserPlus, LogIn, ShieldCheck, Trash2, ShieldAlert, AlertCircle, MessageSquare, MousePointer2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

export function AdminDashboard({ onBack, showToast }: { onBack: () => void, showToast: (msg: string, type?: ToastType) => void }) {
  const { user, loginWithGoogle } = useAuth();
  const [stats, setStats] = useState({
    activeUsers: 0,
    active24h: 0,
    active7d: 0,
    active30d: 0,
    totalLikes: 0,
    totalMatches: 0,
    conversionRate: 0,
    hotLikes: 0,
    activeEvents: 0
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isGeneratingBots, setIsGeneratingBots] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [sortOrder, setSortOrder] = useState<'interactionsCount' | 'lastActive'>('interactionsCount');

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      setPermissionError(false);
      window.location.reload(); 
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const [newEventName, setNewEventName] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const [newEventRadius, setNewEventRadius] = useState(2000);

  const createManualEvent = async () => {
    if (!newEventName.trim()) return;
    setIsCreatingEvent(true);
    setActionStatus('Criando evento...');
    
    // Generate a simple ID from name
    const eventId = newEventName.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '') + '_' + Date.now().toString().slice(-4);
    
    try {
      await setDoc(doc(db, 'events', eventId), {
        id: eventId,
        name: newEventName.trim(),
        location: { lat: -23.5505, lng: -46.6333 }, // Default to SP center
        radius: Number(newEventRadius) || 2000,
        active: true
      });
      setNewEventName('');
      setActionStatus('Evento criado com sucesso!');
    } catch (error: any) {
      console.error("Error creating event:", error);
      setActionStatus(`Erro: ${error.message}`);
    } finally {
      setIsCreatingEvent(false);
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  const deleteEvent = async (eventId: string) => {
    setActionStatus('Removendo evento...');
    try {
      await deleteDoc(doc(db, 'events', eventId));
      setActionStatus('Evento removido!');
    } catch (error: any) {
      console.error("Error deleting event:", error);
      setActionStatus(`Erro: ${error.message}`);
    }
    setTimeout(() => setActionStatus(null), 3000);
  };

  const deleteUser = async (userId: string) => {
    setActionStatus('Banhando usuário...');
    try {
      await deleteDoc(doc(db, 'users', userId));
      setActionStatus('Usuário removido!');
    } catch (error: any) {
      console.error("Error deleting user:", error);
      setActionStatus(`Erro: ${error.message}`);
    }
    setTimeout(() => setActionStatus(null), 3000);
  };

  const generateBots = async (eventId: string) => {
    setIsGeneratingBots(true);
    setActionStatus('Invocando bots...');
    const botPhotos = [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400'
    ];

    const botNames = ['Lucas', 'Bia', 'Juliana', 'Felipe', 'Mariana'];
    const genders = ['man', 'woman', 'woman', 'man', 'woman'] as const;

    try {
      for (let i = 0; i < botNames.length; i++) {
        const botId = `bot_${Date.now()}_${i}`;
        const botProfile = {
          nickname: `${botNames[i]} 🤖`,
          photoUrl: botPhotos[i],
          gender: genders[i],
          seeking: ['man', 'woman', 'non-binary'],
          currentEventId: eventId,
          lastActive: serverTimestamp(),
          isBot: true,
          interactionsCount: 0
        };
        await setDoc(doc(db, 'users', botId), botProfile);
      }
      setActionStatus('Bots criados!');
    } catch (error: any) {
      console.error("Error generating bots:", error);
      setActionStatus(`Erro: ${error.message}`);
    } finally {
      setIsGeneratingBots(false);
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  const seedEvents = async () => {
    setIsSeeding(true);
    const testEvents = [
      {
        id: 'lollapalooza',
        name: 'Lollapalooza 🎸',
        location: { lat: -23.6669, lng: -46.6976 },
        radius: 2000,
        active: true
      },
      {
        id: 'vila_madalena',
        name: 'Vila Madalena (Bares) 🍻',
        location: { lat: -23.5552, lng: -46.6874 },
        radius: 800,
        active: true
      },
      {
        id: 'global_test',
        name: 'Rolê Global (Debug) 🌎',
        location: { lat: 0, lng: 0 },
        radius: 50000000,
        active: true
      }
    ];

    try {
      for (const event of testEvents) {
        await setDoc(doc(db, 'events', event.id), event);
      }
      showToast("Eventos de teste criados!", "success");
    } catch (error) {
      console.error("Error seeding events:", error);
      showToast("Erro ao criar eventos de teste.", "error");
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    // Initial counts fetch
    const updateCounts = async () => {
      try {
        const now = new Date();
        const t24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const t7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const t30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
          usersCount, 
          likesCount, 
          matchesCount,
          active24hCount,
          active7dCount,
          active30dCount
        ] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'likes')),
          getCountFromServer(collection(db, 'matches')),
          getCountFromServer(query(collection(db, 'users'), where('lastActive', '>=', t24h))),
          getCountFromServer(query(collection(db, 'users'), where('lastActive', '>=', t7d))),
          getCountFromServer(query(collection(db, 'users'), where('lastActive', '>=', t30d)))
        ]);
        
        setStats(prev => ({ 
          ...prev, 
          activeUsers: usersCount.data().count,
          active24h: active24hCount.data().count,
          active7d: active7dCount.data().count,
          active30d: active30dCount.data().count,
          totalLikes: likesCount.data().count,
          totalMatches: matchesCount.data().count,
          conversionRate: likesCount.data().count > 0 ? (matchesCount.data().count * 2 / likesCount.data().count) * 100 : 0
        }));
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };
    updateCounts();

    // 1. Events listener (no longer triggers counts update)
    const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => {
      const eventList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Event));
      setEvents(eventList);
      setStats(prev => ({ ...prev, activeEvents: snap.docs.filter(d => d.data().active).length }));
    });

    // 2. Users list listener with sorting
    const unsubUsersList = onSnapshot(query(collection(db, 'users'), limit(50), orderBy(sortOrder, 'desc')), (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    });

    // 3. Global Stats fallback listener (just for basic connectivity check)
    const unsubConnectivity = onSnapshot(query(collection(db, 'users'), limit(1)), (snap) => {
      setLoading(false);
    }, (err: any) => {
      if (err.code === 'permission-denied') setPermissionError(true);
      setLoading(false);
    });

    // 4. Reports listener
    const unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('timestamp', 'desc'), limit(20)), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
    });

    return () => {
      unsubEvents();
      unsubUsersList();
      unsubConnectivity();
      unsubReports();
    };
  }, [sortOrder]);

  const deleteReport = async (reportId: string) => {
    try {
      await deleteDoc(doc(db, 'reports', reportId));
    } catch (error) {
      console.error("Error deleting report:", error);
    }
  };

  if (permissionError || (user && user.isAnonymous)) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center p-8 text-center space-y-8">
        <div className="w-24 h-24 bg-orange-500/10 rounded-[32px] flex items-center justify-center border border-orange-500/20">
          <ShieldCheck size={48} className="text-orange-500" />
        </div>
        <div className="space-y-4 max-w-sm">
          <h2 className="text-4xl font-black italic tracking-tighter uppercase">Acesso Restrito</h2>
          <p className="text-white/40 text-sm font-medium leading-relaxed">Painel gerencial disponível apenas para contas Google autorizadas.</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button onClick={handleLogin} className="bg-white text-black h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all">Entrar com Google</button>
          <button onClick={onBack} className="text-white/40 hover:text-white h-14 font-black uppercase tracking-[0.2em] text-[9px] transition-all flex items-center justify-center gap-2">
            <ArrowLeft size={14} /> Voltar para o App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#050505] text-white font-sans overflow-y-auto custom-scrollbar" style={{ height: '100dvh' }}>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-12 pb-32">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 text-orange-500 mb-4">
              <Zap size={20} className="fill-orange-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-[0.3em]">System Overdrive</span>
            </div>
            <h1 className="text-6xl font-black tracking-tighter">VEMK <span className="text-neutral-700 uppercase">Observer</span></h1>
          </div>
          <div className="flex gap-4">
            <button onClick={seedEvents} disabled={isSeeding} className="px-6 py-3 glass border border-orange-500/30 rounded-2xl hover:bg-orange-600 transition-all text-xs font-black uppercase tracking-widest">Seeds</button>
            <button onClick={onBack} className="px-6 py-3 bg-neutral-900 border border-white/5 rounded-2xl hover:bg-white hover:text-black transition-all text-xs font-black uppercase tracking-widest">Voltar</button>
          </div>
        </header>

        <AnimatePresence>
          {actionStatus && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-6 py-3 bg-orange-500 text-black font-black uppercase tracking-tighter text-xs rounded-xl shadow-2xl flex items-center gap-3 w-fit"
            >
              <Zap size={14} className="fill-black" />
              {actionStatus}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="w-12 h-12 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard label="Ativos 24h" value={stats.active24h.toString()} icon={<Users className="text-green-500" />} sub="Energia Pura" />
              <StatCard label="Ativos 7d" value={stats.active7d.toString()} icon={<Users className="text-blue-500" />} sub="Frequência Semanal" />
              <StatCard label="Ativos 30d" value={stats.active30d.toString()} icon={<Users className="text-purple-500" />} sub="Audiência Mensal" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <StatCard label="Total Users" value={stats.activeUsers.toString()} icon={<ShieldCheck className="text-neutral-500" />} sub="Total na Base" />
              <StatCard label="Eventos" value={stats.activeEvents.toString()} icon={<Calendar className="text-purple-500" />} sub="Ativos Agora" />
              <StatCard label="Match Rate" value={`${stats.conversionRate.toFixed(1)}%`} icon={<BarChart3 className="text-green-500" />} sub="Conversão" />
              <StatCard label="Matches" value={stats.totalMatches.toString()} icon={<Zap className="text-orange-500" />} sub="Conexões" />
              <StatCard label="Reports" value={reports.length.toString()} icon={<AlertCircle className="text-red-500" />} sub="Denúncias" />
            </div>

            {/* Events Section */}
            <DashboardSection 
              title="Eventos Ativos" 
              count={events.length} 
              icon={<Calendar className="text-neutral-500" />}
              extra={
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black uppercase text-white/30 ml-1 mb-1">Nome do Rolê</span>
                    <input 
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      placeholder="Nome do novo rolê..."
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-orange-500/50 w-48 transition-all"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black uppercase text-white/30 ml-1 mb-1">Raio (metros)</span>
                    <input 
                      type="number"
                      value={newEventRadius}
                      onChange={(e) => setNewEventRadius(Number(e.target.value))}
                      placeholder="Raio (m)"
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-orange-500/50 w-24 transition-all"
                    />
                  </div>
                  <button 
                    onClick={createManualEvent}
                    disabled={isCreatingEvent || !newEventName.trim()}
                    className="p-3 bg-orange-500 text-black rounded-xl hover:bg-orange-400 disabled:opacity-50 transition-all shadow-lg active:scale-95 self-end"
                    title="Criar Evento"
                  >
                    <PlusCircle size={18} />
                  </button>
                </div>
              }
            >
              <table className="w-full text-left">
                <thead className="border-b border-white/5 text-[9px] uppercase tracking-widest text-neutral-500 font-black">
                  <tr>
                    <th className="px-8 py-4">Nome</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Raio (m)</th>
                    <th className="px-8 py-4 text-right">Controle</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id} className="border-b border-white/5 group hover:bg-white/[0.02]">
                      <td className="px-8 py-6">
                        <div className="font-bold text-lg leading-none">{event.name}</div>
                        <div className="text-[10px] text-neutral-600 font-mono mt-1">{event.id}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${event.active ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500'}`}>
                          {event.active ? 'Ao Vivo' : 'Off'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                         <div className="text-xs font-mono text-neutral-500">{event.radius}m</div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => generateBots(event.id)} className="p-3 bg-white/5 rounded-xl hover:bg-orange-500/10 hover:text-orange-500 transition-all font-black text-[9px] uppercase tracking-tighter" title="Gerar Bots"><UserPlus size={18} /></button>
                          <button onClick={() => deleteEvent(event.id)} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-lg active:scale-95" title="Remover Rolê"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DashboardSection>

            {/* Reports Section */}
            <DashboardSection title="Denúncias Recebidas" count={reports.length} icon={<AlertCircle className="text-red-500" />}>
              {reports.length === 0 ? (
                <div className="py-20 text-center text-neutral-600 font-black uppercase tracking-widest text-[10px]">Nenhuma denúncia no momento</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="border-b border-white/5 text-[9px] uppercase tracking-widest text-neutral-500 font-black">
                    <tr>
                      <th className="px-8 py-4">Denunciado</th>
                      <th className="px-8 py-4">Motivo</th>
                      <th className="px-8 py-4">Data</th>
                      <th className="px-8 py-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => {
                      const reportedUser = allUsers.find(u => u.id === report.reportedId);
                      // Note: In an ideal world, we'd fetch the reported user profile individually if not in allUsers.
                      // For now, we'll keep the clean UID display as requested for "lighter" system.
                      return (
                        <tr key={report.id} className="border-b border-white/5 group hover:bg-white/[0.02]">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-[8px] font-black uppercase text-neutral-500 border border-white/5">
                                UID
                              </div>
                              <div>
                                <div className="font-bold text-sm tracking-tight">{reportedUser?.nickname || 'Usuário Removido'}</div>
                                <div className="text-[10px] text-neutral-600 font-mono italic">{report.reportedId.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-xs text-white/60 max-w-xs">{report.reason}</div>
                            <div className="text-[9px] text-neutral-700 mt-1 uppercase font-black">Por ID: {report.reporterId.slice(0, 8)}...</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-[10px] font-mono text-neutral-500">
                              {report.timestamp?.toDate ? format(report.timestamp.toDate(), 'HH:mm dd/MM') : 'Agora'}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => deleteUser(report.reportedId)} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-black text-[9px] uppercase tracking-tighter">Banir User</button>
                              <button onClick={() => deleteReport(report.id)} className="p-2 bg-white/5 text-neutral-500 rounded-lg hover:bg-white/10 transition-all"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </DashboardSection>

            {/* Users Section - Restored with sorting and without photos/icons */}
            <DashboardSection 
              title="Usuários Ativos" 
              count={allUsers.length} 
              icon={<ShieldAlert className="text-orange-500" />}
              extra={
                <button 
                  onClick={() => setSortOrder(prev => prev === 'interactionsCount' ? 'lastActive' : 'interactionsCount')}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2 transition-all border border-white/5 active:scale-95"
                >
                  {sortOrder === 'interactionsCount' ? (
                    <>Ver por Atividade <MousePointer2 size={12} className="text-orange-500" /></>
                  ) : (
                    <>Ver por Engajamento <Zap size={12} className="text-orange-500" /></>
                  )}
                </button>
              }
            >
              <table className="w-full text-left">
                <thead className="border-b border-white/5 text-[9px] uppercase tracking-widest text-neutral-500 font-black">
                  <tr>
                    <th className="px-8 py-4">Usuário</th>
                    <th className="px-8 py-4">Engajamento</th>
                    <th className="px-8 py-4">Evento</th>
                    <th className="px-8 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map(u => (
                    <tr key={u.id} className="border-b border-white/5 group hover:bg-white/[0.02]">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              {u.nickname}
                              {u.isBot && <span className="bg-blue-500/10 text-blue-400 text-[8px] px-1.5 py-0.5 rounded border border-blue-500/20 uppercase tracking-tighter italic font-black">Bot</span>}
                              {reports.some(r => r.reportedId === u.id) && (
                                <span className="bg-red-600 text-white p-1 rounded-md animate-pulse">
                                  <AlertCircle size={10} />
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-600 font-mono italic text-opacity-50 tracking-tighter">{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                             <Zap size={14} className="text-orange-500 fill-orange-500/20" />
                             <span className="text-2xl font-black italic tracking-tighter text-white leading-none">
                               {u.interactionsCount || 0}
                             </span>
                          </div>
                          <div className="text-[10px] font-black uppercase text-neutral-600 tracking-widest flex items-center gap-2">
                             <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                             {u.lastActive?.toDate ? format(u.lastActive.toDate(), 'HH:mm:ss') : 'Agora'}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-xs font-bold text-neutral-400 italic">#{u.currentEventId || 'No Fluxo'}</div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => deleteUser(u.id)} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DashboardSection>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub: string }) {
  return (
    <div className="p-8 bg-neutral-900/40 border border-white/5 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">{icon}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-6">{label}</div>
      <div className="text-5xl font-black tracking-tighter mb-2 italic uppercase">{value}</div>
      <div className="text-[9px] font-black text-neutral-600 uppercase tracking-widest leading-none">{sub}</div>
    </div>
  );
}

function DashboardSection({ title, count, icon, extra, children }: { title: string; count: number; icon: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900/20 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
      <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-4">{icon} {title}</h2>
          {extra}
        </div>
        <span className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.4em] bg-white/5 px-4 py-2 rounded-full">{count} Registros</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getSocket } from '../lib/socket';
import { useAuth } from './AuthContext';

interface UnreadCtx {
  unreadCount: number;
  bumpUnread: () => void;
  clearUnread: () => void;
}

const Ctx = createContext<UnreadCtx | null>(null);

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const bumpUnread = useCallback(() => setUnreadCount((c) => c + 1), []);
  const clearUnread = useCallback(() => setUnreadCount(0), []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const sock = getSocket();

    const onMessage = (payload: { fromUserId: string }) => {
      if (payload.fromUserId === user.id) return;
      bumpUnread();
    };
    const onMatch = () => bumpUnread();

    sock.on('message:new', onMessage);
    sock.on('match:new', onMatch);

    return () => {
      sock.off('message:new', onMessage);
      sock.off('match:new', onMatch);
    };
  }, [user, bumpUnread]);

  return (
    <Ctx.Provider value={{ unreadCount, bumpUnread, clearUnread }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUnread() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUnread must be used inside UnreadProvider');
  return v;
}

import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUnread } from '../state/UnreadContext';

const tabs = [
  { to: '/events', icon: '🎶', label: 'Eventos' },
  { to: '/matches', icon: '💋', label: 'Matches' },
  { to: '/me', icon: '👤', label: 'Perfil' },
];

export function BottomNav() {
  const { unreadCount, clearUnread } = useUnread();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/matches' || location.pathname.startsWith('/chat/')) {
      clearUnread();
    }
  }, [location.pathname, clearUnread]);

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {tabs.map((t) => {
        const isMatches = t.to === '/matches';
        const showBadge = isMatches && unreadCount > 0;
        return (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span className="icon" aria-hidden>{t.icon}</span>
              <span>{t.label}</span>
              {showBadge && (
                <span
                  aria-label={`${unreadCount} novas`}
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -10,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--pink)',
                    display: 'block',
                    boxShadow: '0 0 8px rgba(225, 29, 116, 0.7)',
                  }}
                />
              )}
            </div>
          </NavLink>
        );
      })}
    </nav>
  );
}

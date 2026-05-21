import { useEffect, useRef, useState, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../state/AuthContext';
import type { ChatMessage, MatchSummary } from '../types';
import { getSocket } from '../lib/socket';

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return 'Hoje';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function Chat() {
  const { matchId } = useParams<{ matchId: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    (async () => {
      const [{ messages }, { matches }] = await Promise.all([
        api.listMessages(matchId),
        api.listMatches(),
      ]);
      if (cancelled) return;
      setMessages(messages);
      setMatch(matches.find((m: MatchSummary) => m.id === matchId) || null);
    })();

    const sock = getSocket();
    const onMsg = (m: ChatMessage & { matchId?: string }) => {
      if (m.matchId && m.matchId !== matchId) return;
      setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
    };
    sock.on('message:new', onMsg);
    return () => {
      cancelled = true;
      sock.off('message:new', onMsg);
    };
  }, [matchId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!matchId || !text.trim() || sending) return;
    setSending(true);
    const draft = text.trim();
    setText('');
    try {
      await api.sendMessage(matchId, draft);
    } catch {
      setText(draft);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="screen" style={{ paddingBottom: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="header">
        <button className="chip" onClick={() => nav(-1)}>←</button>
        <div className="row center" style={{ gap: 10 }}>
          <div
            className="avatar matched"
            style={{ width: 36, height: 36, backgroundImage: match?.otherUser?.photoUrl ? `url("${match.otherUser.photoUrl}")` : undefined }}
          />
          <div>
            <div style={{ fontWeight: 700 }}>{match?.otherUser?.nickname || 'Match'}</div>
            <div className="muted" style={{ fontSize: 11 }}>{match?.eventName || 'rolê'}</div>
          </div>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div ref={listRef} className="chat-list">
        {messages.length === 0 && (
          <p className="muted" style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
            É match! Manda a primeira 💋
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.fromUserId === user?.id;
          const showDateSep = i === 0 || !isSameDay(messages[i - 1].createdAt, m.createdAt);
          return (
            <Fragment key={m.id}>
              {showDateSep && (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--muted)',
                    fontSize: 11,
                    margin: '14px 0 6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {fmtDateLabel(m.createdAt)}
                </div>
              )}
              <div className={`chat-message ${mine ? 'mine' : 'theirs'}`}>{m.text}</div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--muted)',
                  textAlign: mine ? 'right' : 'left',
                  marginTop: 2,
                  marginBottom: 6,
                }}
              >
                {fmtTime(m.createdAt)}
              </div>
            </Fragment>
          );
        })}
      </div>

      <form onSubmit={send} className="chat-input">
        <input
          placeholder="Mensagem"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
        />
        <button className="btn" disabled={!text.trim() || sending}>Enviar</button>
      </form>
    </div>
  );
}

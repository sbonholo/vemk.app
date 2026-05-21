import type { PersonAtEvent, ReactionType } from '../types';

const ICON: Record<ReactionType, string> = { kiss: '💋', heart: '❤️', fire: '🔥' };

function calcAge(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const d = new Date(birthdate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function PersonCard({
  person,
  selected,
  onSelect,
}: {
  person: PersonAtEvent;
  selected: boolean;
  onSelect: () => void;
}) {
  const age = calcAge(person.birthdate);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`person ${person.matched ? 'matched' : ''}`}
      style={{ outline: selected && !person.matched ? '2px solid var(--pink)' : undefined, padding: 0 }}
      aria-label={`Selecionar ${person.nickname || 'pessoa'}`}
    >
      <div
        className={`photo ${person.photoUrl ? 'has-img' : ''}`}
        style={person.photoUrl ? { backgroundImage: `url("${person.photoUrl}")` } : undefined}
      />
      <div className="badges">
        {person.matched && <span className="badge matched" title="Match!" aria-label="match">✨</span>}
        {!person.matched && person.receivedReaction && (
          <span className="badge incoming" title="Reagiu em você">{ICON[person.receivedReaction]}</span>
        )}
        {person.sentReaction && !person.matched && (
          <span className="badge" title="Você reagiu">{ICON[person.sentReaction]}</span>
        )}
      </div>
      <div className="overlay">
        <div className="nick">
          {person.nickname || 'Anônimo'}{age ? `, ${age}` : ''}
        </div>
      </div>
    </button>
  );
}

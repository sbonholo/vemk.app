import { useState } from "react";
import { CharSpec, ROSTER } from "../game/fighters";

interface Props {
  mode: "cpu" | "vs";
  onConfirm: (p1: CharSpec, p2: CharSpec) => void;
  onBack: () => void;
}

export function CharacterSelect({ mode, onConfirm, onBack }: Props) {
  const [p1, setP1] = useState<CharSpec | null>(null);
  const [p2, setP2] = useState<CharSpec | null>(null);
  const ready = p1 && p2;
  const p2Label = mode === "cpu" ? "CPU" : "Jogador 2";

  return (
    <div className="screen select">
      <button className="back" onClick={onBack}>← Voltar</button>
      <h2>Escolha os Lutadores</h2>

      <div className="select-row">
        <div className="side-label">Jogador 1</div>
        <div className="grid">
          {ROSTER.map((c) => (
            <CharCard
              key={"p1-" + c.key}
              spec={c}
              selected={p1?.key === c.key}
              onClick={() => setP1(c)}
            />
          ))}
        </div>
      </div>

      <div className="select-row">
        <div className="side-label">{p2Label}</div>
        <div className="grid">
          {ROSTER.map((c) => (
            <CharCard
              key={"p2-" + c.key}
              spec={c}
              selected={p2?.key === c.key}
              onClick={() => setP2(c)}
            />
          ))}
        </div>
      </div>

      <div className="select-actions">
        <button
          className="big primary"
          disabled={!ready}
          onClick={() => ready && onConfirm(p1!, p2!)}
        >
          {ready ? "LUTAR!" : "Selecione os dois lados"}
        </button>
      </div>
    </div>
  );
}

function CharCard({
  spec,
  selected,
  onClick,
}: {
  spec: CharSpec;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`card ${selected ? "selected" : ""} wing-${spec.wing}`}
      onClick={onClick}
    >
      <CartoonAvatar spec={spec} />
      <div className="card-name">{spec.name}</div>
      <div className="card-tag">{spec.tagline}</div>
      <div className="card-wing">
        {spec.wing === "left" ? "Esquerda" : "Direita"}
      </div>
    </button>
  );
}

// Static SVG cartoon avatar for the select screen.
function CartoonAvatar({ spec }: { spec: CharSpec }) {
  return (
    <svg viewBox="0 0 100 110" className="avatar">
      <ellipse cx="50" cy="100" rx="32" ry="6" fill="rgba(0,0,0,0.35)" />
      <rect x="32" y="62" width="36" height="36" fill={spec.shirt} />
      <rect x="32" y="62" width="36" height="4" fill={spec.accent} />
      <rect x="32" y="92" width="14" height="14" fill={spec.pants} />
      <rect x="54" y="92" width="14" height="14" fill={spec.pants} />
      <circle cx="50" cy="44" r="18" fill={spec.skin} />
      {spec.bald ? (
        <path
          d="M 32 44 A 18 18 0 0 0 68 44 L 64 44 A 14 14 0 0 1 36 44 Z"
          fill={spec.hair}
        />
      ) : (
        <path d="M 32 44 A 18 18 0 0 1 68 44 L 32 44 Z" fill={spec.hair} />
      )}
      {spec.beard && (
        <path d="M 38 50 A 12 12 0 0 0 62 50 A 12 8 0 0 1 38 50 Z" fill={spec.beard} />
      )}
      {spec.glasses && (
        <g stroke="#111" strokeWidth="1.5" fill="none">
          <circle cx="44" cy="46" r="4" />
          <circle cx="56" cy="46" r="4" />
          <line x1="48" y1="46" x2="52" y2="46" />
        </g>
      )}
      {!spec.glasses && (
        <>
          <rect x="42" y="44" width="3" height="3" fill="#111" />
          <rect x="55" y="44" width="3" height="3" fill="#111" />
        </>
      )}
    </svg>
  );
}

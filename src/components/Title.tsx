interface Props {
  onStart: (mode: "cpu" | "vs") => void;
}

export function Title({ onStart }: Props) {
  return (
    <div className="screen title">
      <div className="title-card">
        <div className="title-flag" aria-hidden>
          <span className="flag-green" />
          <span className="flag-yellow" />
          <span className="flag-blue" />
        </div>
        <h1>BRASIL BRAWL</h1>
        <p className="subtitle">Paródia política em formato de luta</p>
        <div className="title-buttons">
          <button className="big" onClick={() => onStart("cpu")}>
            1 Jogador (vs CPU)
          </button>
          <button className="big" onClick={() => onStart("vs")}>
            2 Jogadores (mesmo aparelho)
          </button>
        </div>
        <p className="disclaimer">
          Este jogo é uma paródia de entretenimento. Não é endossado por nenhum
          candidato, partido ou autoridade eleitoral. Qualquer semelhança é
          satírica.
        </p>
      </div>
    </div>
  );
}

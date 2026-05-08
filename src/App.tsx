import { useState } from "react";
import { Title } from "./components/Title";
import { CharacterSelect } from "./components/CharacterSelect";
import { Match } from "./components/Match";
import type { CharSpec } from "./game/fighters";

type Screen =
  | { kind: "title" }
  | { kind: "select"; mode: "cpu" | "vs" }
  | { kind: "match"; mode: "cpu" | "vs"; p1: CharSpec; p2: CharSpec };

export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "title" });

  if (screen.kind === "title") {
    return <Title onStart={(mode) => setScreen({ kind: "select", mode })} />;
  }
  if (screen.kind === "select") {
    return (
      <CharacterSelect
        mode={screen.mode}
        onConfirm={(p1, p2) =>
          setScreen({ kind: "match", mode: screen.mode, p1, p2 })
        }
        onBack={() => setScreen({ kind: "title" })}
      />
    );
  }
  return (
    <Match
      mode={screen.mode}
      p1={screen.p1}
      p2={screen.p2}
      onExit={() => setScreen({ kind: "title" })}
    />
  );
}

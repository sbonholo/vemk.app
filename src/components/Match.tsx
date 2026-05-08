import { useEffect, useRef, useState } from "react";
import { CharSpec } from "../game/fighters";
import {
  W,
  H,
  TICK_DT,
  MatchState,
  makeMatch,
  step,
  draw,
  aiInputs,
  NO_INPUTS,
} from "../game/engine";
import { InputState } from "../game/input";
import { TouchControls } from "./TouchControls";

interface Props {
  p1: CharSpec;
  p2: CharSpec;
  mode: "cpu" | "vs";
  onExit: () => void;
}

export function Match({ p1, p2, mode, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<InputState>(new InputState());
  const matchRef = useRef<MatchState>(makeMatch(p1, p2, mode === "cpu" ? "p2" : null));
  const rafRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const [, force] = useState(0);
  const [touchOn, setTouchOn] = useState<boolean>(() => isTouchDevice());

  useEffect(() => {
    const input = inputRef.current;
    input.attach();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const tick = (now: number) => {
      if (!lastRef.current) lastRef.current = now;
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      accRef.current += dt;

      const m = matchRef.current;
      while (accRef.current >= TICK_DT) {
        let in1 = input.composedP1();
        let in2 = input.p2;
        if (m.cpu === "p1") in1 = aiInputs(m.p1, m.p2);
        if (m.cpu === "p2") in2 = aiInputs(m.p2, m.p1);
        if (m.phase === "matchEnd") {
          in1 = NO_INPUTS;
          in2 = NO_INPUTS;
        }
        step(m, in1, in2);
        accRef.current -= TICK_DT;
      }

      draw(ctx, m);

      if (m.phase === "matchEnd" && m.phaseFrames > 60) {
        // accept any input to exit
        const anyKey =
          input.p1.attack ||
          input.p1.s1 ||
          input.p1.s2 ||
          input.p2.attack ||
          input.p2.s1 ||
          input.p2.s2 ||
          !!input.touch.attack;
        if (anyKey) {
          onExit();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
      force((n) => (n + 1) % 1000000);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      input.detach();
    };
  }, [onExit]);

  return (
    <div className="screen match">
      <div className="match-top">
        <button className="back small" onClick={onExit}>← Sair</button>
        <div className="round-label">Round {matchRef.current.round}</div>
        <button className="back small" onClick={() => setTouchOn((v) => !v)}>
          {touchOn ? "Esconder controles" : "Mostrar controles"}
        </button>
      </div>
      <div className="stage-wrap">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="stage"
        />
      </div>
      {touchOn && mode === "cpu" && <TouchControls input={inputRef.current} />}
      {mode === "vs" && (
        <div className="keymap">
          <div>
            <strong>P1:</strong> A/D mover · W pular · S defender · J soco · K
            especial · L super
          </div>
          <div>
            <strong>P2:</strong> ←/→ mover · ↑ pular · ↓ defender · 1 soco · 2
            especial · 3 super
          </div>
        </div>
      )}
    </div>
  );
}

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0;
}

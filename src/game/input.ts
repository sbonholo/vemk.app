import { Inputs, NO_INPUTS } from "./engine";

export type InputKey = keyof Inputs;

const P1_KEYS: Record<string, InputKey> = {
  KeyA: "left",
  KeyD: "right",
  KeyW: "up",
  KeyS: "down",
  KeyJ: "attack",
  KeyK: "s1",
  KeyL: "s2",
};

const P2_KEYS: Record<string, InputKey> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  Digit1: "attack",
  Digit2: "s1",
  Digit3: "s2",
  Numpad1: "attack",
  Numpad2: "s1",
  Numpad3: "s2",
};

export class InputState {
  p1: Inputs = { ...NO_INPUTS };
  p2: Inputs = { ...NO_INPUTS };
  // Touch overrides for P1 (used in vs-CPU on mobile)
  touch: Partial<Inputs> = {};
  private onKeyDown = (e: KeyboardEvent) => this.setKey(e.code, true, e);
  private onKeyUp = (e: KeyboardEvent) => this.setKey(e.code, false, e);

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }
  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
  reset() {
    this.p1 = { ...NO_INPUTS };
    this.p2 = { ...NO_INPUTS };
    this.touch = {};
  }
  setTouch(k: InputKey, v: boolean) {
    this.touch[k] = v;
  }
  composedP1(): Inputs {
    const c: Inputs = { ...this.p1 };
    for (const k of Object.keys(this.touch) as InputKey[]) {
      if (this.touch[k]) c[k] = true;
    }
    return c;
  }
  private setKey(code: string, down: boolean, e: KeyboardEvent) {
    const k1 = P1_KEYS[code];
    const k2 = P2_KEYS[code];
    if (k1) {
      this.p1[k1] = down;
      e.preventDefault();
    }
    if (k2) {
      this.p2[k2] = down;
      e.preventDefault();
    }
  }
}

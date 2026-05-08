import { InputState } from "../game/input";
import type { InputKey } from "../game/input";

interface Props {
  input: InputState;
}

export function TouchControls({ input }: Props) {
  return (
    <div className="touch">
      <div className="dpad">
        <PadBtn input={input} k="up" label="▲" cls="dp-up" />
        <PadBtn input={input} k="left" label="◀" cls="dp-left" />
        <PadBtn input={input} k="down" label="▼" cls="dp-down" />
        <PadBtn input={input} k="right" label="▶" cls="dp-right" />
      </div>
      <div className="actions">
        <PadBtn input={input} k="attack" label="A" cls="ab-atk" />
        <PadBtn input={input} k="s1" label="S1" cls="ab-s1" />
        <PadBtn input={input} k="s2" label="S2" cls="ab-s2" />
      </div>
    </div>
  );
}

function PadBtn({
  input,
  k,
  label,
  cls,
}: {
  input: InputState;
  k: InputKey;
  label: string;
  cls: string;
}) {
  const press = (v: boolean) => (e: React.SyntheticEvent) => {
    e.preventDefault();
    input.setTouch(k, v);
  };
  return (
    <button
      className={`tbtn ${cls}`}
      onTouchStart={press(true)}
      onTouchEnd={press(false)}
      onTouchCancel={press(false)}
      onMouseDown={press(true)}
      onMouseUp={press(false)}
      onMouseLeave={press(false)}
    >
      {label}
    </button>
  );
}

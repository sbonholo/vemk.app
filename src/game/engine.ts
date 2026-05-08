import { CharSpec } from "./fighters";

export const W = 960;
export const H = 540;
export const GROUND_Y = 470;
export const WALL_L = 50;
export const WALL_R = W - 50;
export const FIGHTER_W = 60;
export const FIGHTER_H = 110;
export const TICK_HZ = 60;
export const TICK_DT = 1 / TICK_HZ;

export type Stance =
  | "idle"
  | "walk"
  | "jump"
  | "block"
  | "attack"
  | "special1"
  | "special2"
  | "hurt"
  | "ko";

export interface Inputs {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  attack: boolean;
  s1: boolean;
  s2: boolean;
}

export const NO_INPUTS: Inputs = {
  left: false,
  right: false,
  up: false,
  down: false,
  attack: false,
  s1: false,
  s2: false,
};

export interface Fighter {
  spec: CharSpec;
  side: "p1" | "p2";
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  stance: Stance;
  stanceFrames: number; // frames elapsed in current stance
  stanceDur: number; // total frames the stance is locked
  hitConnected: boolean; // single-hit-per-attack flag
  attackKind: "atk" | "s1" | "s2" | null;
  cooldownAtk: number;
  cooldownS1: number;
  cooldownS2: number;
  onGround: boolean;
  blocking: boolean;
}

export type Phase = "ready" | "fight" | "roundEnd" | "matchEnd";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface MatchState {
  p1: Fighter;
  p2: Fighter;
  round: number;
  wins: { p1: number; p2: number };
  timer: number; // seconds remaining
  phase: Phase;
  phaseFrames: number;
  cpu: "p1" | "p2" | null;
  particles: Particle[];
  flash: number; // hit flash frames
  lastWinner: "p1" | "p2" | "draw" | null;
}

const ROUND_TIME = 60;
const MAX_HP = 100;
const READY_FRAMES = 90;
const ROUND_END_FRAMES = 150;

export function makeFighter(spec: CharSpec, side: "p1" | "p2"): Fighter {
  const x = side === "p1" ? 250 : W - 250;
  return {
    spec,
    side,
    x,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    hp: MAX_HP,
    maxHp: MAX_HP,
    facing: side === "p1" ? 1 : -1,
    stance: "idle",
    stanceFrames: 0,
    stanceDur: 0,
    hitConnected: false,
    attackKind: null,
    cooldownAtk: 0,
    cooldownS1: 0,
    cooldownS2: 0,
    onGround: true,
    blocking: false,
  };
}

export function makeMatch(p1Spec: CharSpec, p2Spec: CharSpec, cpu: "p1" | "p2" | null): MatchState {
  return {
    p1: makeFighter(p1Spec, "p1"),
    p2: makeFighter(p2Spec, "p2"),
    round: 1,
    wins: { p1: 0, p2: 0 },
    timer: ROUND_TIME,
    phase: "ready",
    phaseFrames: 0,
    cpu,
    particles: [],
    flash: 0,
    lastWinner: null,
  };
}

function resetForRound(m: MatchState) {
  m.p1 = makeFighter(m.p1.spec, "p1");
  m.p2 = makeFighter(m.p2.spec, "p2");
  m.timer = ROUND_TIME;
  m.phase = "ready";
  m.phaseFrames = 0;
  m.particles = [];
  m.flash = 0;
}

interface MoveDef {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  range: number;
  reach: number; // hitbox width
  knockX: number;
  knockY: number;
  cooldown: number;
}

const MOVES: Record<"atk" | "s1" | "s2", MoveDef> = {
  atk: { startup: 6, active: 4, recovery: 10, damage: 8, range: 70, reach: 50, knockX: 220, knockY: -150, cooldown: 0 },
  s1: { startup: 10, active: 6, recovery: 16, damage: 16, range: 100, reach: 70, knockX: 320, knockY: -260, cooldown: 50 },
  s2: { startup: 14, active: 5, recovery: 22, damage: 24, range: 90, reach: 60, knockX: 480, knockY: -340, cooldown: 110 },
};

function moveOf(kind: "atk" | "s1" | "s2"): MoveDef {
  return MOVES[kind];
}

function startStance(f: Fighter, stance: Stance, dur: number, kind: "atk" | "s1" | "s2" | null = null) {
  f.stance = stance;
  f.stanceFrames = 0;
  f.stanceDur = dur;
  f.hitConnected = false;
  f.attackKind = kind;
}

function isAttackingStance(s: Stance): s is "attack" | "special1" | "special2" {
  return s === "attack" || s === "special1" || s === "special2";
}

function isLockedStance(s: Stance): boolean {
  return isAttackingStance(s) || s === "hurt";
}

export function attackHitbox(f: Fighter): { x: number; y: number; w: number; h: number } | null {
  if (!isAttackingStance(f.stance) || !f.attackKind) return null;
  const move = moveOf(f.attackKind);
  if (f.stanceFrames < move.startup) return null;
  if (f.stanceFrames >= move.startup + move.active) return null;
  const fx = f.facing === 1 ? f.x + FIGHTER_W / 2 : f.x - FIGHTER_W / 2 - move.range;
  const reach = move.range;
  return {
    x: fx,
    y: f.y - FIGHTER_H + 10,
    w: reach,
    h: move.reach,
  };
}

export function bodyBox(f: Fighter): { x: number; y: number; w: number; h: number } {
  return {
    x: f.x - FIGHTER_W / 2,
    y: f.y - FIGHTER_H,
    w: FIGHTER_W,
    h: FIGHTER_H,
  };
}

function rectOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function applyInput(f: Fighter, inp: Inputs) {
  // Cooldown ticks
  if (f.cooldownAtk > 0) f.cooldownAtk--;
  if (f.cooldownS1 > 0) f.cooldownS1--;
  if (f.cooldownS2 > 0) f.cooldownS2--;

  // KO is terminal
  if (f.stance === "ko") {
    f.vx *= 0.8;
    return;
  }

  // Stances that lock all input
  if (isLockedStance(f.stance)) {
    f.vx *= 0.85;
    return;
  }

  // Attack triggers (priority s2 > s1 > atk)
  if (f.onGround) {
    if (inp.s2 && f.cooldownS2 === 0) {
      const m = MOVES.s2;
      startStance(f, "special2", m.startup + m.active + m.recovery, "s2");
      f.cooldownS2 = m.cooldown;
      f.vx = 0;
      return;
    }
    if (inp.s1 && f.cooldownS1 === 0) {
      const m = MOVES.s1;
      startStance(f, "special1", m.startup + m.active + m.recovery, "s1");
      f.cooldownS1 = m.cooldown;
      f.vx = 0;
      return;
    }
    if (inp.attack && f.cooldownAtk === 0) {
      const m = MOVES.atk;
      startStance(f, "attack", m.startup + m.active + m.recovery, "atk");
      f.cooldownAtk = 8;
      f.vx = 0;
      return;
    }
  }

  // Blocking only on ground, only with down held and no horizontal input
  f.blocking = !!inp.down && f.onGround;

  // Movement
  let target = 0;
  if (!f.blocking) {
    if (inp.left) target -= f.spec.speed;
    if (inp.right) target += f.spec.speed;
  }
  if (f.onGround) {
    f.vx = target;
  } else {
    // Air control: drift toward target
    f.vx += (target - f.vx) * 0.08;
  }

  // Jump
  if (inp.up && f.onGround && !f.blocking) {
    f.vy = f.spec.jump;
    f.onGround = false;
  }

  // Stance label
  if (!f.onGround) {
    f.stance = "jump";
  } else if (f.blocking) {
    f.stance = "block";
  } else if (Math.abs(f.vx) > 5) {
    f.stance = "walk";
  } else {
    f.stance = "idle";
  }
}

function integrate(f: Fighter) {
  // Gravity
  if (!f.onGround) f.vy += 1800 * TICK_DT;
  // Position
  f.x += f.vx * TICK_DT;
  f.y += f.vy * TICK_DT;
  // Walls
  if (f.x < WALL_L + FIGHTER_W / 2) f.x = WALL_L + FIGHTER_W / 2;
  if (f.x > WALL_R - FIGHTER_W / 2) f.x = WALL_R - FIGHTER_W / 2;
  // Ground
  if (f.y >= GROUND_Y) {
    f.y = GROUND_Y;
    f.vy = 0;
    if (!f.onGround) f.onGround = true;
  } else {
    f.onGround = false;
  }
  // Stance frame advance for locked stances
  if (isLockedStance(f.stance)) {
    f.stanceFrames++;
    if (f.stanceFrames >= f.stanceDur) {
      // recover to idle
      f.stance = "idle";
      f.stanceFrames = 0;
      f.stanceDur = 0;
      f.attackKind = null;
    }
  }
}

function spawnHit(m: MatchState, x: number, y: number, color: string) {
  for (let i = 0; i < 10; i++) {
    m.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 320,
      vy: -Math.random() * 280 - 40,
      life: 28 + Math.random() * 14,
      color,
    });
  }
}

function stepParticles(m: MatchState) {
  for (const p of m.particles) {
    p.vy += 1500 * TICK_DT;
    p.x += p.vx * TICK_DT;
    p.y += p.vy * TICK_DT;
    p.life--;
  }
  m.particles = m.particles.filter((p) => p.life > 0);
}

function resolveHits(m: MatchState) {
  const pair: Array<[Fighter, Fighter]> = [
    [m.p1, m.p2],
    [m.p2, m.p1],
  ];
  for (const [att, def] of pair) {
    const hb = attackHitbox(att);
    if (!hb || att.hitConnected || !att.attackKind) continue;
    const body = bodyBox(def);
    if (!rectOverlap(hb, body)) continue;
    if (def.stance === "ko") continue;
    att.hitConnected = true;
    const move = moveOf(att.attackKind);
    // Block check: defender blocking AND facing attacker
    const attFromFront = (att.x - def.x) * def.facing > 0;
    const blocked = def.blocking && attFromFront && def.onGround;
    const dmg = blocked ? Math.round(move.damage * 0.25) : move.damage;
    def.hp = Math.max(0, def.hp - dmg);
    // Knockback
    const dir = att.facing;
    if (blocked) {
      def.vx = dir * 80;
    } else {
      def.vx = dir * move.knockX;
      def.vy = move.knockY;
      def.onGround = false;
      startStance(def, "hurt", 16);
    }
    spawnHit(m, hb.x + hb.w / 2, hb.y + hb.h / 2, blocked ? "#9cc6ff" : "#ffd84a");
    m.flash = 4;
    if (def.hp <= 0) {
      startStance(def, "ko", 9999);
      def.vy = -360;
      def.vx = dir * 200;
      def.onGround = false;
    }
  }
}

function updateFacing(m: MatchState) {
  // Face opponent when not in locked stance
  for (const [a, b] of [
    [m.p1, m.p2],
    [m.p2, m.p1],
  ] as const) {
    if (isLockedStance(a.stance)) continue;
    a.facing = b.x > a.x ? 1 : -1;
  }
}

function endRoundCheck(m: MatchState) {
  if (m.phase !== "fight") return;
  let winner: "p1" | "p2" | "draw" | null = null;
  if (m.p1.hp <= 0 && m.p2.hp <= 0) winner = "draw";
  else if (m.p1.hp <= 0) winner = "p2";
  else if (m.p2.hp <= 0) winner = "p1";
  else if (m.timer <= 0) {
    if (m.p1.hp > m.p2.hp) winner = "p1";
    else if (m.p2.hp > m.p1.hp) winner = "p2";
    else winner = "draw";
  }
  if (winner !== null) {
    m.lastWinner = winner;
    if (winner === "p1") m.wins.p1++;
    else if (winner === "p2") m.wins.p2++;
    m.phase = "roundEnd";
    m.phaseFrames = 0;
  }
}

export function step(m: MatchState, inP1: Inputs, inP2: Inputs) {
  // Phase logic
  if (m.phase === "ready") {
    m.phaseFrames++;
    if (m.phaseFrames >= READY_FRAMES) {
      m.phase = "fight";
      m.phaseFrames = 0;
    }
    // freeze fighters during ready
    applyInput(m.p1, NO_INPUTS);
    applyInput(m.p2, NO_INPUTS);
    integrate(m.p1);
    integrate(m.p2);
    updateFacing(m);
    return;
  }

  if (m.phase === "roundEnd") {
    m.phaseFrames++;
    applyInput(m.p1, NO_INPUTS);
    applyInput(m.p2, NO_INPUTS);
    integrate(m.p1);
    integrate(m.p2);
    stepParticles(m);
    if (m.phaseFrames >= ROUND_END_FRAMES) {
      if (m.wins.p1 >= 2 || m.wins.p2 >= 2) {
        m.phase = "matchEnd";
        m.phaseFrames = 0;
      } else {
        m.round++;
        resetForRound(m);
      }
    }
    return;
  }

  if (m.phase === "matchEnd") {
    m.phaseFrames++;
    stepParticles(m);
    return;
  }

  // fight phase
  applyInput(m.p1, inP1);
  applyInput(m.p2, inP2);
  integrate(m.p1);
  integrate(m.p2);
  updateFacing(m);
  resolveHits(m);
  stepParticles(m);
  if (m.flash > 0) m.flash--;

  m.timer -= TICK_DT;
  if (m.timer < 0) m.timer = 0;
  endRoundCheck(m);
}

// ---------- AI ----------
let aiCooldown = 0;

export function aiInputs(self: Fighter, foe: Fighter): Inputs {
  const inp: Inputs = { ...NO_INPUTS };
  if (self.stance === "ko" || isLockedStance(self.stance)) return inp;
  const dx = foe.x - self.x;
  const adx = Math.abs(dx);
  const towardLeft = dx < 0;
  // Move toward when far
  if (adx > 140) {
    if (towardLeft) inp.left = true;
    else inp.right = true;
  } else if (adx > 90) {
    // approach slowly
    if (Math.random() < 0.6) {
      if (towardLeft) inp.left = true;
      else inp.right = true;
    }
  }
  // Block sometimes when foe is attacking and close
  if (adx < 130 && isAttackingStance(foe.stance) && Math.random() < 0.35) {
    inp.down = true;
    inp.left = false;
    inp.right = false;
    return inp;
  }
  // Attack when close
  if (aiCooldown > 0) aiCooldown--;
  if (adx < 110 && aiCooldown === 0) {
    const r = Math.random();
    if (r < 0.15 && self.cooldownS2 === 0) {
      inp.s2 = true;
      aiCooldown = 30;
    } else if (r < 0.45 && self.cooldownS1 === 0) {
      inp.s1 = true;
      aiCooldown = 22;
    } else {
      inp.attack = true;
      aiCooldown = 14;
    }
  } else if (adx < 220 && Math.random() < 0.01) {
    inp.up = true;
  }
  return inp;
}

// ---------- Rendering ----------

export function draw(ctx: CanvasRenderingContext2D, m: MatchState) {
  // Background gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0a2a3a");
  g.addColorStop(0.6, "#143a55");
  g.addColorStop(1, "#0a1a25");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Brazilian flag motif strip in background
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#009c3b";
  ctx.fillRect(0, GROUND_Y - 220, W, 220);
  ctx.fillStyle = "#ffdf00";
  ctx.beginPath();
  ctx.moveTo(W / 2, GROUND_Y - 200);
  ctx.lineTo(W / 2 + 220, GROUND_Y - 90);
  ctx.lineTo(W / 2, GROUND_Y - 20);
  ctx.lineTo(W / 2 - 220, GROUND_Y - 90);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#002776";
  ctx.beginPath();
  ctx.arc(W / 2, GROUND_Y - 100, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ground
  ctx.fillStyle = "#1a1f2c";
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = "#262d3d";
  ctx.fillRect(0, GROUND_Y, W, 6);

  // Hit flash
  if (m.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.06 * m.flash})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawFighter(ctx, m.p1);
  drawFighter(ctx, m.p2);

  // Particles
  for (const p of m.particles) {
    ctx.globalAlpha = Math.min(1, p.life / 28);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  drawHud(ctx, m);
  drawPhaseOverlay(ctx, m);
}

function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter) {
  const s = f.spec;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.facing, 1);

  const body = -FIGHTER_H;
  const stancePunching = isAttackingStance(f.stance);
  const armForward = stancePunching && f.attackKind && f.stanceFrames >= moveOf(f.attackKind).startup;
  const crouched = f.stance === "block";
  const yOffset = crouched ? 10 : 0;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 32, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = s.pants;
  ctx.fillRect(-22, body + 70 + yOffset, 18, 40 - yOffset);
  ctx.fillRect(4, body + 70 + yOffset, 18, 40 - yOffset);

  // Torso
  ctx.fillStyle = s.shirt;
  const torsoH = 50 - yOffset;
  ctx.fillRect(-26, body + 28 + yOffset, 52, torsoH);

  // Accent stripe
  ctx.fillStyle = s.accent;
  ctx.fillRect(-26, body + 28 + yOffset, 52, 4);

  // Arms
  ctx.fillStyle = s.shirt;
  if (armForward) {
    // Punching arm extended forward
    ctx.fillRect(20, body + 36 + yOffset, 44, 14);
    // back arm
    ctx.fillRect(-30, body + 36 + yOffset, 14, 30);
    // Fist
    ctx.fillStyle = s.skin;
    ctx.fillRect(60, body + 32 + yOffset, 14, 18);
  } else {
    ctx.fillRect(-32, body + 32 + yOffset, 14, 36);
    ctx.fillRect(18, body + 32 + yOffset, 14, 36);
  }

  // Head
  const headY = body + 16 + yOffset;
  ctx.fillStyle = s.skin;
  ctx.beginPath();
  ctx.arc(0, headY, 22, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = s.hair;
  if (s.bald) {
    // ring of hair around the back
    ctx.beginPath();
    ctx.arc(0, headY + 4, 22, Math.PI * 0.95, Math.PI * 0.05, false);
    ctx.lineTo(18, headY + 4);
    ctx.arc(0, headY + 4, 18, Math.PI * 0.05, Math.PI * 0.95, true);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, headY - 4, 22, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
  }

  // Beard
  if (s.beard) {
    ctx.fillStyle = s.beard;
    ctx.beginPath();
    ctx.arc(0, headY + 8, 14, 0, Math.PI);
    ctx.fill();
  }

  // Glasses
  if (s.glasses) {
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-8, headY + 2, 6, 0, Math.PI * 2);
    ctx.arc(8, headY + 2, 6, 0, Math.PI * 2);
    ctx.moveTo(-2, headY + 2);
    ctx.lineTo(2, headY + 2);
    ctx.stroke();
  }

  // Eyes
  ctx.fillStyle = "#111";
  if (!s.glasses) {
    ctx.fillRect(-9, headY, 4, 4);
    ctx.fillRect(5, headY, 4, 4);
  }

  // KO mark
  if (f.stance === "ko") {
    ctx.fillStyle = "#ff5252";
    ctx.font = "bold 28px system-ui";
    ctx.scale(f.facing, 1);
    ctx.fillText("X_X", -22, headY + 2);
  }

  // Block shield
  if (f.stance === "block") {
    ctx.strokeStyle = "rgba(140,200,255,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, headY + 30, 38, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  // Optional: debug hitbox
  // const hb = attackHitbox(f);
  // if (hb) {
  //   ctx.strokeStyle = "red";
  //   ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
  // }
}

function drawHud(ctx: CanvasRenderingContext2D, m: MatchState) {
  // P1 health bar (left, fills left -> right shrinking from right)
  drawHealthBar(ctx, m.p1, 30, 30, false);
  drawHealthBar(ctx, m.p2, W - 30 - 380, 30, true);
  // Names
  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(m.p1.spec.name.toUpperCase(), 30, 80);
  ctx.textAlign = "right";
  ctx.fillText(m.p2.spec.name.toUpperCase(), W - 30, 80);
  // Round wins
  drawRoundDots(ctx, m.wins.p1, 30, 92, false);
  drawRoundDots(ctx, m.wins.p2, W - 30, 92, true);
  // Timer
  ctx.fillStyle = "#fff";
  ctx.font = "bold 38px system-ui";
  ctx.textAlign = "center";
  const t = Math.ceil(m.timer);
  ctx.fillText(String(t).padStart(2, "0"), W / 2, 56);
}

function drawHealthBar(ctx: CanvasRenderingContext2D, f: Fighter, x: number, y: number, mirror: boolean) {
  const w = 380;
  const h = 22;
  ctx.fillStyle = "#000";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = "#3a1015";
  ctx.fillRect(x, y, w, h);
  const ratio = Math.max(0, f.hp / f.maxHp);
  const fillW = Math.round(w * ratio);
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, "#ffe066");
  grad.addColorStop(0.6, "#ff7a3a");
  grad.addColorStop(1, "#ff3344");
  ctx.fillStyle = grad;
  if (mirror) {
    ctx.fillRect(x + (w - fillW), y, fillW, h);
  } else {
    ctx.fillRect(x, y, fillW, h);
  }
}

function drawRoundDots(ctx: CanvasRenderingContext2D, n: number, x: number, y: number, rightAlign: boolean) {
  for (let i = 0; i < 2; i++) {
    const cx = rightAlign ? x - i * 18 : x + i * 18;
    ctx.beginPath();
    ctx.arc(cx, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = i < n ? "#ffd84a" : "#444";
    ctx.fill();
  }
}

function drawPhaseOverlay(ctx: CanvasRenderingContext2D, m: MatchState) {
  ctx.textAlign = "center";
  if (m.phase === "ready") {
    const t = m.phaseFrames;
    const label = t < 30 ? "ROUND " + m.round : t < 60 ? "PRONTO?" : "LUTAR!";
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, H / 2 - 60, W, 120);
    ctx.fillStyle = "#ffdf00";
    ctx.font = "bold 84px system-ui";
    ctx.fillText(label, W / 2, H / 2 + 20);
  } else if (m.phase === "roundEnd") {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, H / 2 - 60, W, 120);
    ctx.fillStyle = "#ffdf00";
    ctx.font = "bold 64px system-ui";
    let label = "EMPATE";
    if (m.lastWinner === "p1") label = `${m.p1.spec.name.toUpperCase()} VENCE O ROUND`;
    else if (m.lastWinner === "p2") label = `${m.p2.spec.name.toUpperCase()} VENCE O ROUND`;
    ctx.fillText(label, W / 2, H / 2 + 20);
  } else if (m.phase === "matchEnd") {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffdf00";
    ctx.font = "bold 72px system-ui";
    const winner =
      m.wins.p1 > m.wins.p2 ? m.p1.spec.name : m.wins.p2 > m.wins.p1 ? m.p2.spec.name : "DRAW";
    ctx.fillText(`${winner.toUpperCase()} VENCE!`, W / 2, H / 2 - 10);
    ctx.fillStyle = "#fff";
    ctx.font = "20px system-ui";
    ctx.fillText("Toque / pressione qualquer botão para voltar", W / 2, H / 2 + 40);
  }
}

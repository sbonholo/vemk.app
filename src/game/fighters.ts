export type Wing = "left" | "right";

export interface CharSpec {
  key: string;
  name: string;
  wing: Wing;
  tagline: string;
  // Visual palette for the cartoon avatar (see render.ts)
  skin: string;
  hair: string;
  beard?: string;
  shirt: string;
  pants: string;
  accent: string;
  glasses?: boolean;
  bald?: boolean;
  // Stats
  speed: number; // px/s
  jump: number; // initial vy (negative)
  // Special move labels — purely cosmetic, mechanics are uniform
  s1Name: string;
  s2Name: string;
}

export const CHARS: Record<string, CharSpec> = {
  lula: {
    key: "lula",
    name: "Lula",
    wing: "left",
    tagline: "O Operário",
    skin: "#d9a679",
    hair: "#dddddd",
    beard: "#bbbbbb",
    shirt: "#c8102e",
    pants: "#222",
    accent: "#ffdf00",
    bald: true,
    speed: 220,
    jump: -640,
    s1Name: "Bolsa Soco",
    s2Name: "Lula Livre",
  },
  haddad: {
    key: "haddad",
    name: "Haddad",
    wing: "left",
    tagline: "O Professor",
    skin: "#caa07a",
    hair: "#1c1c1c",
    shirt: "#c8102e",
    pants: "#1f2a44",
    accent: "#ffffff",
    glasses: true,
    speed: 210,
    jump: -660,
    s1Name: "Aula Magna",
    s2Name: "Doutorado",
  },
  bolsonaro: {
    key: "bolsonaro",
    name: "Bolsonaro",
    wing: "right",
    tagline: "O Capitão",
    skin: "#d9a679",
    hair: "#5a3a1c",
    shirt: "#1d3b2a",
    pants: "#3a4a2a",
    accent: "#ffdf00",
    speed: 200,
    jump: -650,
    s1Name: "O Mito",
    s2Name: "Cavalaria",
  },
  zema: {
    key: "zema",
    name: "Zema",
    wing: "right",
    tagline: "O Empresário",
    skin: "#e6c2a0",
    hair: "#caa55a",
    shirt: "#ffffff",
    pants: "#1a1a1a",
    accent: "#0a52a3",
    speed: 230,
    jump: -670,
    s1Name: "Mineradora",
    s2Name: "Helicóptero",
  },
};

export const ROSTER: CharSpec[] = [
  CHARS.lula,
  CHARS.haddad,
  CHARS.bolsonaro,
  CHARS.zema,
];

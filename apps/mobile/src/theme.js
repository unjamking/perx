// Single source of design tokens — mirrors the web --vars.
export const C = {
  bg: "#C1D9DE",
  card: "#FFFFFF",
  surface: "#5C9396",
  accent: "#215E68",
  dark: "#013137",
  hover: "#297376",
  text: "#013137",
  textSecondary: "#297376",
  textOnDark: "#C1D9DE",
  border: "rgba(33,94,104,0.12)",
};

export const R = { card: 20, btn: 12, tag: 99 };

export const shadow = {
  shadowColor: "#013137",
  shadowOpacity: 0.08,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};

export const fmt = (n) => Number(n || 0).toLocaleString() + " ALL";

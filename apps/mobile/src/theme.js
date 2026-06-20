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

// Category → stock photo fallback when a provider hasn't uploaded an image.
// Provider-uploaded offer.image_url always wins. Keyed by the emoji-prefixed
// category string the catalog uses.
const CAT_IMG = {
  "💪 Fitness": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=70",
  "🍽️ Food": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=70",
  "🧘 Wellness": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=70",
  "✈️ Travel": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=70",
  "📱 Telecom": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=70",
  "📚 Education": "https://images.unsplash.com/photo-1513258496099-48168024aec0?w=600&q=70",
};
const FALLBACK_IMG = "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&q=70";

// Returns a usable image URI for an offer — uploaded image, else category photo.
export const offerImage = (offer) =>
  offer?.image_url || CAT_IMG[offer?.category] || FALLBACK_IMG;

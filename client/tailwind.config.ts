import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0F",
        surface: "#12121A",
        elevated: "#1A1A2E",
        border: "#2A2A3E",
        primary: "#8B5CF6",
        "primary-hover": "#7C3AED",
        "primary-glow": "#A78BFA",
        secondary: "#C084FC",
        "accent-pink": "#E879F9",
        "text-primary": "#F8F8FF",
        "text-secondary": "#A0A0B8",
        "text-tertiary": "#6B6B80",
        success: "#34D399",
        warning: "#FBBF24",
        danger: "#F87171",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        "purple-glow": "0 4px 20px rgba(139, 92, 246, 0.15)",
        "purple-glow-lg": "0 8px 32px rgba(139, 92, 246, 0.25)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "scale-in": "scale-in 0.15s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

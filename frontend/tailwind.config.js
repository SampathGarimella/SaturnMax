/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "#E2E8F0",
        input: "#E2E8F0",
        ring: "#2563EB",
        background: "#FFFFFF",
        foreground: "#0F172A",
        brand: {
          DEFAULT: "#0A192F",
          accent: "#2563EB",
          accentDark: "#1D4ED8",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F8FAFC",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
      },
      fontFamily: {
        heading: ['"Cabinet Grotesk"', '"Outfit"', "sans-serif"],
        body: ['"IBM Plex Sans"', '"Inter"', "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

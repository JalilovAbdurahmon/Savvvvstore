export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F7F1E8",
        paper: "#FFFDF9",
        ink: "#2B2420",
        terracotta: "#C2603D",
        terracottaDark: "#A14B2D",
        sand: "#E7DCC9",
        olive: "#6E7251",
        muted: "#8A7F6F",
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        tag: "4px",
      },
    },
  },
  plugins: [],
};

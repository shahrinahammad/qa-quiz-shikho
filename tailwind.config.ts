import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["var(--font-poppins)", "sans-serif"],
        bengali: ["var(--font-hind-siliguri)", "sans-serif"],
      },
      colors: {
        shikho: {
          indigo: {
            50: "#F1F2FB",
            100: "#DDE0F4",
            500: "#3F4FA2",
            600: "#304090",
            900: "#121838",
          },
          magenta: {
            500: "#C02080",
          },
          sunrise: {
            500: "#EBA010",
          },
          coral: {
            500: "#E03050",
          },
          canvas: "#F4F5FA",
        },
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "8px",
      },
      boxShadow: {
        'ambient': '0 4px 20px -2px rgba(48, 64, 144, 0.08)',
        'lift': '0 12px 32px -4px rgba(48, 64, 144, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  // darkMode removed - Engezna uses Light Mode only per brand guidelines
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-noto-sans)'],
        arabic: ['var(--font-noto-sans-arabic)'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        // Brand accent colors - Engezna identity
        deal: 'hsl(var(--deal))',           // #00C27A Green-Cyan for deals/discounts
        premium: 'hsl(var(--premium))',     // #FFD166 Soft Gold for premium items
        info: 'hsl(var(--info))',           // #009DE0 Same as Primary (Engezna Blue)
        'in-progress': 'hsl(var(--in-progress))', // #3B82F6 Blue for active states

        // Semantic colors - Dashboard standards
        error: 'hsl(var(--error))',         // #EF4444 Red for errors
        success: 'hsl(var(--success))',     // #22C55E Green for success
        warning: 'hsl(var(--warning))',     // #FACC15 Yellow for warnings

        // Text hierarchy
        'text-primary': 'hsl(var(--text-primary))',     // #0F172A
        'text-secondary': 'hsl(var(--text-secondary))', // #475569
        'text-muted': 'hsl(var(--text-muted))',         // #94A3B8

        // Card backgrounds (10% tints)
        'card-bg': {
          primary: 'hsl(var(--card-bg-primary))',   // Blue 10%
          success: 'hsl(var(--card-bg-success))',   // Green 10%
          info: 'hsl(var(--card-bg-info))',         // Cyan 10%
          warning: 'hsl(var(--card-bg-warning))',   // Yellow 10%
          error: 'hsl(var(--card-bg-error))',       // Red 10%
        },

        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

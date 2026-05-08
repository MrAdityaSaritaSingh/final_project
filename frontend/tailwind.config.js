/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        table: ['var(--font-table)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['16px', { lineHeight: '24px' }],      // Reduced from 20px
        '2xl': ['18px', { lineHeight: '28px' }],     // Reduced from 24px
        '3xl': ['20px', { lineHeight: '28px' }],     // Reduced from 30px
        '4xl': ['22px', { lineHeight: '32px' }],     // Reduced from 36px
        '5xl': ['24px', { lineHeight: '36px' }],     // Reduced from 48px
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      }
    }
  }
}

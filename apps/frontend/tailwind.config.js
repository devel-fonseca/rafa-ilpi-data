/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'data-[state=inactive]:hidden',
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			// ========== Design System RAFA ILPI - Cores Semânticas ==========
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			danger: {
  				DEFAULT: 'hsl(var(--danger))',
  				foreground: 'hsl(var(--danger-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
  			},
  			// Bed Status (tokens específicos por contexto)
  			bed: {
  				available: 'hsl(var(--bed-available))',
  				occupied: 'hsl(var(--bed-occupied))',
  				maintenance: 'hsl(var(--bed-maintenance))',
  				reserved: 'hsl(var(--bed-reserved))'
  			},
  			// Record Types (10 tipos de registros diários)
  			record: {
  				higiene: 'hsl(var(--record-higiene))',
  				alimentacao: 'hsl(var(--record-alimentacao))',
  				hidratacao: 'hsl(var(--record-hidratacao))',
  				monitoramento: 'hsl(var(--record-monitoramento))',
  				eliminacao: 'hsl(var(--record-eliminacao))',
  				comportamento: 'hsl(var(--record-comportamento))',
  				intercorrencia: 'hsl(var(--record-intercorrencia))',
  				atividades: 'hsl(var(--record-atividades))',
  				visita: 'hsl(var(--record-visita))',
  				outros: 'hsl(var(--record-outros))'
  			},
  			// Severity Levels
  			severity: {
  				critical: 'hsl(var(--severity-critical))',
  				warning: 'hsl(var(--severity-warning))',
  				info: 'hsl(var(--severity-info))'
  			},
  			// Medication Categories
  			medication: {
  				controlled: 'hsl(var(--medication-controlled))',
  				sos: 'hsl(var(--medication-sos))',
  				highRisk: 'hsl(var(--medication-high-risk))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: '1rem' // Padrão RAFA ILPI - soft rounded
  		},
  		fontFamily: {
  			sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

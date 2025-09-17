import { createSystem, defaultConfig } from '@chakra-ui/react'

// Create a custom system with modern colors and styling
const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#E6F3FF' },
          100: { value: '#BAE3FF' },
          200: { value: '#7CC4FA' },
          300: { value: '#47A3F3' },
          400: { value: '#2186EB' },
          500: { value: '#0967D2' },
          600: { value: '#0552B5' },
          700: { value: '#03449E' },
          800: { value: '#01337D' },
          900: { value: '#002159' },
        },
        accent: {
          50: { value: '#FFF5F5' },
          100: { value: '#FED7D7' },
          200: { value: '#FEB2B2' },
          300: { value: '#FC8181' },
          400: { value: '#F56565' },
          500: { value: '#E53E3E' },
          600: { value: '#C53030' },
          700: { value: '#9B2C2C' },
          800: { value: '#822727' },
          900: { value: '#63171B' },
        },
        success: {
          50: { value: '#F0FFF4' },
          100: { value: '#C6F6D5' },
          200: { value: '#9AE6B4' },
          300: { value: '#68D391' },
          400: { value: '#48BB78' },
          500: { value: '#38A169' },
          600: { value: '#2F855A' },
          700: { value: '#276749' },
          800: { value: '#22543D' },
          900: { value: '#1C4532' },
        },
      },
      fonts: {
        heading: { value: 'Inter, system-ui, sans-serif' },
        body: { value: 'Inter, system-ui, sans-serif' },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          canvas: { value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        },
      },
    },
  },
})

export default system

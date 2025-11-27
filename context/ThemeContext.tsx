import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  brandColor: string;
  setBrandColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Função segura para ajustar brilho da cor (Lighten/Darken)
const adjustColor = (color: string, amount: number) => {
  // Validação básica de Hex
  if (!color || !/^#[0-9A-F]{6}$/i.test(color)) return color;

  const num = parseInt(color.slice(1), 16);
  
  let r = (num >> 16) + amount;
  if (r > 255) r = 255;
  else if (r < 0) r = 0;
  
  let g = ((num >> 8) & 0x00FF) + amount;
  if (g > 255) g = 255;
  else if (g < 0) g = 0;
  
  let b = (num & 0x0000FF) + amount;
  if (b > 255) b = 255;
  else if (b < 0) b = 0;
  
  return '#' + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
};

// Gera uma paleta monocromática baseada na cor principal
const generatePalette = (hex: string) => {
  // Garante que temos uma cor válida, senão usa o Teal padrão
  const base = /^#[0-9A-F]{6}$/i.test(hex) ? hex : '#14b8a6';

  return {
    50: adjustColor(base, 180),
    100: adjustColor(base, 160),
    200: adjustColor(base, 120),
    300: adjustColor(base, 80),
    400: adjustColor(base, 40),
    500: base,
    600: adjustColor(base, -20),
    700: adjustColor(base, -40),
    800: adjustColor(base, -60),
    900: adjustColor(base, -80),
    950: adjustColor(base, -90),
  };
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('pilates_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [brandColor, setBrandColorState] = useState<string>(() => {
    return localStorage.getItem('pilates_brand_color') || '#14b8a6';
  });

  // Atualiza classe dark/light
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('pilates_theme', theme);
  }, [theme]);

  // Atualiza variáveis CSS da cor da marca
  useEffect(() => {
    const palette = generatePalette(brandColor);
    const root = window.document.documentElement;
    
    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(`--brand-${key}`, value);
    });

    localStorage.setItem('pilates_brand_color', brandColor);
  }, [brandColor]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setBrandColor = (color: string) => {
    setBrandColorState(color);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, brandColor, setBrandColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
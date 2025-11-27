import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  brandColor: string;
  setBrandColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Função auxiliar para clarear/escurecer cores (gerar paleta)
const adjustColor = (color: string, amount: number) => {
  return '#' + color.replace(/^#/, '').replace(/../g, (color) => 
    ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)
  );
};

// Gera uma paleta aproximada baseada na cor principal
const generatePalette = (hex: string) => {
  // Conversão simples para gerar tons
  // Nota: Em uma app real, usaríamos bibliotecas como chroma-js ou tinycolor
  return {
    50: adjustColor(hex, 180),
    100: adjustColor(hex, 160),
    200: adjustColor(hex, 120),
    300: adjustColor(hex, 80),
    400: adjustColor(hex, 40),
    500: hex,
    600: adjustColor(hex, -20),
    700: adjustColor(hex, -40),
    800: adjustColor(hex, -60),
    900: adjustColor(hex, -80),
    950: adjustColor(hex, -90),
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
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente, incluindo aquelas sem prefixo VITE_ se especificado
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Injeta a API_KEY no código cliente de forma segura durante o build
      // Isso permite que 'process.env.API_KEY' funcione no código do frontend
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});
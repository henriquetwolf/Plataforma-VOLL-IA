import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do diretório atual
  // O terceiro argumento '' permite carregar todas as variáveis, não apenas as que começam com VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Injeta a variável API_KEY no código do cliente de forma segura
      // Isso é necessário porque a chave no Vercel está como API_KEY e não VITE_API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});

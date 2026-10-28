import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const port = parseInt(env.PORT || env.VITE_PORT || '5173', 10);

  return {
    plugins: [react()],
    server: {
      port,
      strictPort: false,
    },
  };
});

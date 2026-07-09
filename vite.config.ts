import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: "/",
    plugins: [
      react(),
      visualizer({
        open: false,
        gzipSize: true,
        filename: "dist/stats.html"
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

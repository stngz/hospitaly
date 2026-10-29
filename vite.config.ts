import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import adminUsersHandler from './api/admin/users.ts';

function apiMiddlewarePlugin() {
  return {
    name: 'hospitally-api-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/admin/users', (req: any, res: any) => {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });
        req.on('end', async () => {
          req.body = body;
          const wrappedRes = {
            status(code: number) {
              res.statusCode = code;
              return this;
            },
            json(payload: any) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            },
          };
          await adminUsersHandler(req, wrappedRes);
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
      apiMiddlewarePlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('lucide-react')) return 'lucide';
              if (id.includes('react') || id.includes('scheduler')) return 'vendor';
            }
          },
        },
      },
    },
    server: {
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

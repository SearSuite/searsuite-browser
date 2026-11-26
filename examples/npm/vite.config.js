import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        workbook: fileURLToPath(new URL('./index.html', import.meta.url)),
        sheet: fileURLToPath(new URL('./sheet.html', import.meta.url)),
      },
    },
  },
});

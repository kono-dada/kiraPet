import { defineConfig } from "vite";
import tsconfigPaths from 'vite-tsconfig-paths';
import vue from "@vitejs/plugin-vue";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath, URL } from 'node:url'

const host = process.env.TAURI_DEV_HOST;

 // 自定义插件：在构建时复制 public 文件，但排除 live2d 目录
function customPublicPlugin() {
  return {
    name: 'custom-public',
    apply: 'build' as const, // 仅在构建时生效，使用字面量类型防止类型被拓宽
    generateBundle() {
      const publicDir = resolve('public');
      const outDir = resolve('dist');
      
      if (!existsSync(publicDir)) return;
      
      const copyDir = (src: string, dest: string) => {
        if (!existsSync(dest)) {
          mkdirSync(dest, { recursive: true });
        }
        
        const entries = readdirSync(src);
        
        for (const entry of entries) {
          // 跳过构建时的 live2d 目录
          if (entry === 'live2d') continue;
          
          const srcPath = join(src, entry); 
          const destPath = join(dest, entry);
          
          if (statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            copyFileSync(srcPath, destPath);
          }
        }
      };
      
      copyDir(publicDir, outDir);
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  // 插件：使用 tsconfig 路径、Vue 插件以及自定义 public 复制插件
  plugins: [tsconfigPaths(), vue(), customPublicPlugin()],
  resolve: {
    alias: {
      // 和 tsconfig 里的 paths 对齐
      services: fileURLToPath(new URL('./src/services', import.meta.url)),
      stores: fileURLToPath(new URL('./src/stores', import.meta.url)),
      components: fileURLToPath(new URL('./src/components', import.meta.url)),
      utils: fileURLToPath(new URL('./src/utils', import.meta.url)),
      types: fileURLToPath(new URL('./src/types', import.meta.url)),
      pages: fileURLToPath(new URL('./src/pages', import.meta.url)),

      // 顺便配一个惯用的 @ -> src
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  
  // Use default public directory for dev, but our custom plugin will handle build
  publicDir: 'public',

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  
  build: {
    // Disable default public directory copying during build since we handle it with our plugin
    copyPublicDir: false
  }
});

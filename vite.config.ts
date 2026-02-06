
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Ensure process.env.API_KEY is available as required by Google GenAI SDK
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ""),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ""),
        
        // Supabase credentials for Snxgbxwjldbknntpxuwu instance
        'process.env.VITE_SUPABASE_URL': JSON.stringify("https://snxgbxwjldbknntpxuwu.supabase.co"),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify("sb_publishable_rff9UwhW5ng7gJXeIdcQyA_SASz9qZv"),
        'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify("https://snxgbxwjldbknntpxuwu.supabase.co"),
        'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY': JSON.stringify("sb_publishable_rff9UwhW5ng7gJXeIdcQyA_SASz9qZv")
      }
    };
});

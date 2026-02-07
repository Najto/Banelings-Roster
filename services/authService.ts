
import { supabase } from './supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  },

  async signInWithBattleNet() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'battlenet',
      options: {
        scopes: 'wow.profile',
        redirectTo: window.location.origin
      }
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  getBattleNetAccessToken(): string | null {
    const session = supabase.auth.getSession();
    return session ? (session as any).provider_token : null;
  },

  onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null, session);
    });
    return data.subscription;
  }
};

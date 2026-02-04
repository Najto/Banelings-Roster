import { supabase } from './supabaseClient';

const ADMIN_SESSION_KEY = 'admin_session';

export interface AdminUser {
  id: string;
  email: string;
  is_admin: boolean;
}

export async function loginAdmin(email: string, password: string): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  const { data: users, error } = await supabase
    .from('admin_users')
    .select('id, email, password_hash, is_admin')
    .eq('email', email)
    .maybeSingle();

  if (error || !users) {
    return { success: false, error: 'Invalid email or password' };
  }

  const passwordMatch = password === users.password_hash;

  if (!passwordMatch) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (!users.is_admin) {
    return { success: false, error: 'User is not an admin' };
  }

  const adminUser: AdminUser = {
    id: users.id,
    email: users.email,
    is_admin: users.is_admin
  };

  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminUser));

  return { success: true, user: adminUser };
}

export function logoutAdmin(): void {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function getAdminSession(): AdminUser | null {
  const session = localStorage.getItem(ADMIN_SESSION_KEY);
  if (!session) return null;

  try {
    return JSON.parse(session);
  } catch {
    return null;
  }
}

export function isAdminLoggedIn(): boolean {
  const session = getAdminSession();
  return session !== null && session.is_admin === true;
}

export async function createAdminUser(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('admin_users')
    .insert({
      email,
      password_hash: password,
      is_admin: true
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

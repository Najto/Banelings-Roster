import { useState, useEffect } from 'react';
import { getAdminSession, isAdminLoggedIn, AdminUser } from '../services/adminService';

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const checkAdmin = () => {
      const admin = isAdminLoggedIn();
      const user = getAdminSession();
      setIsAdmin(admin);
      setAdminUser(user);
      setLoading(false);
    };

    checkAdmin();

    const interval = setInterval(checkAdmin, 5000);

    return () => clearInterval(interval);
  }, []);

  return { isAdmin, loading, adminUser };
}

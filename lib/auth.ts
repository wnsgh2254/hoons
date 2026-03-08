// Authentication utility functions

export type UserRole = 'director' | 'manager' | 'stylist';

export interface User {
  username: string;
  role: UserRole;
}

// Comment: Hardcoded user credentials (in production, these should be in a database)
const USERS: Record<string, { password: string; role: UserRole }> = {
  haeyoom_director: {
    password: 'director123',
    role: 'director',
  },
  haeyoom_manager: {
    password: 'manager123',
    role: 'manager',
  },
  haeyoom_stylist: {
    password: 'stylist123',
    role: 'stylist',
  },
};

// Comment: Validate user credentials
export function validateCredentials(username: string, password: string): User | null {
  // Comment: Trim and normalize input
  const normalizedUsername = username.trim();
  const normalizedPassword = password.trim();
  
  const user = USERS[normalizedUsername];
  if (!user) {
    console.log(`User not found: ${normalizedUsername}`);
    return null;
  }
  
  if (user.password !== normalizedPassword) {
    console.log(`Password mismatch for user: ${normalizedUsername}`);
    return null;
  }
  
  return { username: normalizedUsername, role: user.role };
}

// Comment: Check if a role has access to a specific admin route
export function hasAccess(role: UserRole, path: string): boolean {
  // Director has access to everything
  if (role === 'director') {
    return true;
  }

  // Manager: no access to sales and wages, but has access to customers
  if (role === 'manager') {
    if (path.startsWith('/admin/sales') || path.startsWith('/admin/wages')) {
      return false;
    }
    // Comment: Customers is accessible to manager
    return true;
  }

  // Stylist: only access to appointments (no access to customers)
  if (role === 'stylist') {
    if (path.startsWith('/admin/customers')) {
      return false;
    }
    return path.startsWith('/admin/appointments');
  }

  return false;
}

// Comment: Get allowed routes for a role (for navigation)
export function getAllowedRoutes(role: UserRole): string[] {
  const allRoutes = [
    '/admin/appointments',
    '/admin/staff',
    '/admin/inventory',
    '/admin/prepaid',
    '/admin/customers',
    '/admin/service-history',
    '/admin/settings',
    '/admin/settings/reservation',
    '/admin/settings/services',
    '/admin/sales',
    '/admin/wages',
  ];

  return allRoutes.filter((route) => hasAccess(role, route));
}

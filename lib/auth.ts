// Authentication utility functions

export type UserRole = 'director' | 'manager' | 'designer' | 'stylist';

export interface User {
  username: string;
  role: UserRole;
}

// Comment: Hardcoded user credentials (in production, these should be in a database)
const USERS: Record<string, { password: string; role: UserRole }> = {
  haeyoom_director: {
    password: 'gPdba12!',
    role: 'director',
  },
  haeyoom_manager: {
    password: 'manager123!',
    role: 'manager',
  },
  haeyoom_stylist: {
    password: 'stylist123!',
    role: 'designer',
  },
};

// Comment: Validate user credentials
export function validateCredentials(username: string, password: string): User | null {
  const normalizedUsername = username.trim();
  const normalizedPassword = password.trim();

  const user = USERS[normalizedUsername];
  if (!user) return null;
  if (user.password !== normalizedPassword) return null;

  return { username: normalizedUsername, role: user.role };
}

// Comment: Normalize legacy 'stylist' role to 'designer' for consistent checks
function normalizeRole(role: UserRole): 'director' | 'manager' | 'designer' {
  if (role === 'stylist') return 'designer';
  return role as 'director' | 'manager' | 'designer';
}

// Comment: Check if a role has access to a specific admin route
// director  → full access (the only role allowed into /admin/sales-analysis)
// manager   → all except /admin/wages and /admin/sales-analysis
// designer  → only /admin/appointments and /admin/sales (excl. /admin/sales-analysis)
export function hasAccess(role: UserRole, path: string): boolean {
  const r = normalizeRole(role);

  // Comment: Sales analysis is director-only, regardless of role.
  if (path.startsWith('/admin/sales-analysis')) {
    return r === 'director';
  }

  if (r === 'director') return true;

  if (r === 'manager') {
    return !path.startsWith('/admin/wages');
  }

  // designer: only appointments and sales
  if (r === 'designer') {
    return (
      path.startsWith('/admin/appointments') ||
      path.startsWith('/admin/sales')
    );
  }

  return false;
}

// Comment: Get allowed routes for a role (for navigation)
export function getAllowedRoutes(role: UserRole): string[] {
  const allRoutes = [
    '/admin/appointments',
    '/admin/sales',
    '/admin/sales-analysis',
    '/admin/customers',
    '/admin/prepaid',
    '/admin/service-history',
    '/admin/staff',
    '/admin/inventory',
    '/admin/settings',
    '/admin/settings/reservation',
    '/admin/settings/services',
    '/admin/wages',
  ];

  return allRoutes.filter((route) => hasAccess(role, route));
}

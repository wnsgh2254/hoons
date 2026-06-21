// Test user credentials (matches lib/auth.ts)
export const TEST_USERS = {
  director: {
    username: 'haeyoom_director',
    password: 'gPdba12!',
    role: 'director',
  },
  manager: {
    username: 'haeyoom_manager',
    password: 'manager123!',
    role: 'manager',
  },
  designer: {
    username: 'haeyoom_stylist',
    password: 'stylist123!',
    role: 'designer',
  },
  invalid: {
    username: 'wrong_user',
    password: 'wrongpass',
    role: null,
  },
};

// Admin routes accessible by director (full access)
export const DIRECTOR_ROUTES = [
  '/admin/appointments',
  '/admin/sales',
  '/admin/customers',
  '/admin/prepaid',
  '/admin/service-history',
  '/admin/staff',
  '/admin/inventory',
  '/admin/settings',
  '/admin/wages',
];

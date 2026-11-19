// Test user credentials (matches lib/auth.ts)
export const TEST_USERS = {
  director: {
    username: 'hoons_director',
    password: '1234',
    role: 'director',
  },
  manager: {
    username: 'hoons_manager',
    password: '1234',
    role: 'manager',
  },
  designer: {
    username: 'hoons_stylist',
    password: '1234',
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

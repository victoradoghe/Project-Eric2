// Accounts that always have administrator access and always enter/leave the
// app through the admin area.
const ADMIN_ACCOUNTS = [
  { email: 'basseyikpeme37@gmail.com', password: 'Ikpeme123' },
  { email: 'ericekpenyong3@gmail.com', password: 'Admin432!!' },
];

export const ADMIN_HOME = '/admin';
export const ADMIN_LOGIN_PATH = '/login?returnTo=%2Fadmin';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const isAdminEmail = (email) =>
  ADMIN_ACCOUNTS.some((account) => account.email === normalizeEmail(email));

export const isAdminAccount = (email, password) => {
  const normalized = normalizeEmail(email);
  return ADMIN_ACCOUNTS.some(
    (account) => account.email === normalized && account.password === password,
  );
};

export const withAdminRole = (user) =>
  user && isAdminEmail(user.email) ? { ...user, role: 'admin' } : user;

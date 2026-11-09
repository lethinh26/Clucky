export function roleHome(role: string) {
  return role === 'STAFF' ? '/admin/orders' : '/admin/dashboard';
}

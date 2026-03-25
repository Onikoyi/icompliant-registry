export const NAV_ITEMS = [
    { label: 'Dashboard', path: '/dashboard', permission: null },
  
    { label: 'Students', path: '/students', permission: 'student.view' },
  
    { label: 'Staff', path: '/staff', permission: 'staff.view' },
  
    { label: 'User Management', path: '/admin/users', permission: 'user.manage' },
  
    { label: 'Role Management', path: '/admin/roles', permission: 'role.manage' },
  
    { label: 'System Config', path: '/admin/config', permission: 'config.manage' },
  ]
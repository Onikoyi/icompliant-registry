export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', permission: null },

  { label: 'Students', path: '/students', permission: 'student.view' },

  { label: 'Staff', path: '/staff', permission: 'staff.view' },

  { label: 'User Management', path: '/admin/users', permission: 'user.manage' },

  { label: 'Role Management', path: '/admin/roles', permission: 'role.manage' },

  { label: 'Document Types', path: '/admin/document-types', permission: 'document_type.manage' },

  { label: 'System Config', path: '/admin/config', permission: 'config.manage' },

  { label: 'Campuses', path: '/admin/setup/campuses', permission: 'org.manage' },

  { label: 'Faculties', path: '/admin/setup/faculties', permission: 'org.manage' },

  { label: 'Departments', path: '/admin/setup/departments', permission: 'org.manage' },

  { label: 'Files Registry', path: '/admin/files', permission: 'file.view' },
]
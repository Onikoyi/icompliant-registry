insert into permissions (code, description) values
('student.view', 'View students'),
('student.create', 'Create students'),
('student.update', 'Update students'),
('student.delete', 'Delete students'),

('staff.view', 'View staff'),
('staff.create', 'Create staff'),
('staff.update', 'Update staff'),
('staff.delete', 'Delete staff'),

('document.view', 'View documents'),
('document.upload', 'Upload documents'),
('document.approve', 'Approve documents'),
('document.reject', 'Reject documents'),

('user.manage', 'Manage users'),
('role.manage', 'Manage roles'),
('role.assign', 'Assign roles'),
('config.manage', 'Manage system configuration'),
('document_type.manage', 'Manage document types'),
('org.manage', 'Manage campuses, faculties and departments'),
('file.view', 'View registry files'),
('file.manage', 'Manage registry files'),
('import.manage', 'Manage bulk imports (CSV/API)'),

on conflict (code) do nothing;
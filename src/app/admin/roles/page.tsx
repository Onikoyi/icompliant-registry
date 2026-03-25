'use client'

import { useEffect, useState } from 'react'

interface Role {
  id: string
  name: string
  description: string
}

interface Permission {
  id: string
  code: string
}

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<any[]>([])
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])

  async function fetchData() {
  const res = await fetch('/api/admin/roles')

  if (!res.ok) {
    console.error('Failed to fetch roles')
    return
  }

  const data = await res.json()

  setRoles(data.roles || [])
  setPermissions(data.permissions || [])
  setRolePermissions(data.rolePermissions || [])
}

  useEffect(() => {
    fetchData()
  }, [])

  function isChecked(permissionId: string) {
    return rolePermissions.some(
      (rp) =>
        rp.role_id === selectedRole &&
        rp.permission_id === permissionId
    )
  }

  async function togglePermission(permissionId: string) {
    if (!selectedRole) return

    const current = rolePermissions
      .filter((rp) => rp.role_id === selectedRole)
      .map((rp) => rp.permission_id)

    const updated = current.includes(permissionId)
      ? current.filter((id) => id !== permissionId)
      : [...current, permissionId]

    await fetch(`/api/admin/roles/${selectedRole}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds: updated }),
    })

    fetchData()
  }

  async function createRole(e: React.FormEvent) {
    e.preventDefault()

    await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newRoleName,
        description: newRoleDesc,
      }),
    })

    setNewRoleName('')
    setNewRoleDesc('')
    fetchData()
  }

  async function handleTogglePermission(permissionId: string) {
    if (!selectedRole) return
  
    let updated: string[]
  
    if (selectedPermissionIds.includes(permissionId)) {
      updated = selectedPermissionIds.filter(id => id !== permissionId)
    } else {
      updated = [...selectedPermissionIds, permissionId]
    }
  
    // Update UI immediately
    setSelectedPermissionIds(updated)
  
    // Persist to backend
    await fetch(`/api/admin/roles/${selectedRole}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds: updated }),
    })
  }

  const selectedRoleObj = roles.find(r => r.id === selectedRole)

const isSuperAdmin =
  selectedRoleObj?.name?.trim().toLowerCase() === 'super_admin'

  return (
    <div className="p-10 grid grid-cols-3 gap-10">

      {/* LEFT PANEL */}
      <div>
        <h2 className="font-bold mb-4">Roles</h2>

        {roles.map((role) => (
          <div
            key={role.id}
            onClick={() => {
                setSelectedRole(role.id)
              
                const perms = rolePermissions
                  .filter(rp => rp.role_id === role.id)
                  .map(rp => rp.permission_id)
              
                setSelectedPermissionIds(perms)
              }}
            className={`p-2 cursor-pointer border mb-2 ${
              selectedRole === role.id ? 'bg-sky-100' : ''
            }`}
          >
            {role.name}
          </div>
        ))}

        <form onSubmit={createRole} className="mt-6 space-y-2">
          <input
            placeholder="Role name"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            className="border p-2 w-full"
          />
          <input
            placeholder="Description"
            value={newRoleDesc}
            onChange={(e) => setNewRoleDesc(e.target.value)}
            className="border p-2 w-full"
          />
          <button className="bg-sky-700 text-white px-3 py-2 w-full">
            Create Role
          </button>
        </form>
      </div>

      {/* RIGHT PANEL */}
      <div className="col-span-2">
      {isSuperAdmin && (
  <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
    Super Admin has full system access and cannot be modified.
  </div>
)}
        <h2 className="font-bold mb-4">Permissions</h2>

        {permissions.map((perm) => (
          <label key={perm.id} className="block mb-2">
          <input
            type="checkbox"
            checked={selectedPermissionIds.includes(perm.id)}
            disabled={isSuperAdmin}
            onChange={() => handleTogglePermission(perm.id)}
            />{' '}
            {perm.code}
          </label>
        ))}
      </div>
    </div>
  )
}
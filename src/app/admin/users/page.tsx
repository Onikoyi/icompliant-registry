'use client'

import { useEffect, useMemo, useState } from 'react'

type Role = {
  id: string
  name: string
  description?: string
}

type UserRow = {
  id: string
  email: string
  role_id: string
  created_at: string
  roles?:
    | {
        id: string
        name: string
        description?: string
      }
    | {
        id: string
        name: string
        description?: string
      }[]
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [newEmail, setNewEmail] = useState('')
const [newPassword, setNewPassword] = useState('')
const [showNewPassword, setShowNewPassword] = useState(false)
const [newRoleId, setNewRoleId] = useState('')
const [creatingUser, setCreatingUser] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([])

  const canManageUsers = useMemo(
    () =>
      currentPermissions.includes('user.manage') ||
      currentPermissions.includes('role.assign'),
    [currentPermissions]
  )

  const canAssignRoles = useMemo(
    () => currentPermissions.includes('role.assign'),
    [currentPermissions]
  )

  async function fetchData() {
    setLoading(true)
    setError('')

    try {
      const [meRes, usersRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/admin/users', { cache: 'no-store' }),
      ])

      const meData = await meRes.json()
      const usersData = await usersRes.json()

      if (!meRes.ok) {
        throw new Error(meData.error || 'Failed to load current user')
      }

      setCurrentPermissions(meData.permissions || [])

      if (!usersRes.ok) {
        throw new Error(usersData.error || 'Failed to load users')
      }

      setUsers(usersData.users || [])
      setRoles(usersData.roles || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function handleRoleChange(userId: string, roleId: string) {
    setSavingUserId(userId)
    setError('')

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, roleId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update role')
      }

      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to update role')
    } finally {
      setSavingUserId(null)
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
  
    if (!newEmail || !newPassword || !newRoleId) {
      setError('All fields are required')
      return
    }
  
    setCreatingUser(true)
    setError('')
  
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          role_id: newRoleId,
        }),
      })
  
      const data = await res.json()
  
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user')
      }
  
      setNewEmail('')
      setNewPassword('')
      setNewRoleId('')
  
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to create user')
    } finally {
      setCreatingUser(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
            <h1 className="text-2xl font-bold text-sky-700 mb-4">
              User Management
            </h1>
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-200">
            <h1 className="text-2xl font-bold text-red-700 mb-3">
              Access Denied
            </h1>
            <p className="text-gray-700">
              You do not have permission to manage users.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-sky-200">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-sky-700">
              User Management
            </h1>
            <button
              onClick={fetchData}
              className="bg-sky-700 hover:bg-sky-800 text-white px-4 py-2 rounded-lg"
            >
              Refresh
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mb-6 p-4 border rounded bg-sky-50">
  <h2 className="font-semibold mb-2">Create User</h2>

  <form
    onSubmit={handleCreateUser}
    className="grid grid-cols-4 gap-3"
  >
    <input
      placeholder="Email"
      value={newEmail}
      onChange={(e) => setNewEmail(e.target.value)}
      className="border px-3 py-2 rounded"
    />

        <div className="relative">
      <input
        type={showNewPassword ? 'text' : 'password'}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full border border-gray-300 p-2 rounded pr-12"
        required
      />

      <button
        type="button"
        onClick={() => setShowNewPassword(!showNewPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-sky-700 hover:underline"
      >
        {showNewPassword ? 'Hide' : 'Show'}
      </button>
    </div>

    <select
      value={newRoleId}
      onChange={(e) => setNewRoleId(e.target.value)}
      className="border px-3 py-2 rounded"
    >
      <option value="">Select Role</option>
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>

    <button
  type="submit"
  disabled={creatingUser}
  className="bg-sky-700 text-white rounded px-4 disabled:opacity-50"
>
  {creatingUser ? 'Creating...' : 'Create'}
</button>

  </form>
</div>

          <table className="w-full border border-gray-200">
            <thead>
              <tr className="bg-sky-50 text-left">
                <th className="p-3 border">Email</th>
                <th className="p-3 border">Current Role</th>
                <th className="p-3 border">Created</th>
                <th className="p-3 border">Assign Role</th>
              </tr>
            </thead>

            <tbody>
              {users.map((item) => {
                const roleObj = Array.isArray(item.roles)
                  ? item.roles[0]
                  : item.roles

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-3 border">{item.email}</td>
                    <td className="p-3 border">
                      <span className="inline-flex rounded-full bg-sky-100 text-sky-800 px-3 py-1 text-sm font-medium">
                        {roleObj?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="p-3 border">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 border">
                      <select
                        className="border rounded px-3 py-2 min-w-[220px]"
                        value={item.role_id || ''}
                        disabled={!canAssignRoles || savingUserId === item.id}
                        onChange={(e) =>
                          handleRoleChange(item.id, e.target.value)
                        }
                      >
                        <option value="" disabled>
                          Select role
                        </option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}

              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {!canAssignRoles ? (
            <p className="mt-4 text-sm text-amber-700">
              You can view users, but you do not have permission to assign roles.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
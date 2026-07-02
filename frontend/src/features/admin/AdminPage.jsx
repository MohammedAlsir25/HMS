import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAdminUsers, useAdminRoles, useCreateUser, useUpdateUser, useDepartments, adminKeys } from '../../hooks/queries/useAdmin';
import { useClinics } from '../../hooks/queries/useClinics';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { PERMISSIONS_LIST } from './permissions';

const userColumns = [
  { key: 'fullName', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role', render: (v) => <Badge>{v?.name || 'N/A'}</Badge> },
  { key: 'isActive', header: 'Status', render: (v) => <Badge variant={v ? 'success' : 'danger'}>{v ? 'Active' : 'Inactive'}</Badge> },
  { key: 'lastLogin', header: 'Last Login', render: (v) => v ? new Date(v).toLocaleDateString() : 'Never' },
];

const roleColumns = [
  { key: 'name', header: 'Role' },
  { key: 'userCount', header: 'Users' },
  { key: 'permissions', header: 'Permissions', render: (v) => (
    <div className="flex flex-wrap gap-1">
      {(v || []).slice(0, 3).map((p) => <Badge key={p} variant="info" size="sm">{p.split(':')[1] || p}</Badge>)}
      {v?.length > 3 && <span className="text-caption text-slate">+{v.length - 3} more</span>}
    </div>
  )},
];

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('users');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [userForm, setUserForm] = useState({ email: '', password: '', fullName: '', phone: '', roleId: '', clinicId: '' });
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: [] });
  const [deptForm, setDeptForm] = useState({ name: '', nameAr: '', slug: '', type: 'OTHER' });
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const { data: users = [], isLoading: loadingUsers } = useAdminUsers();
  const { data: roles = [] } = useAdminRoles();
  const { data: departments = [], isLoading: loadingDepts } = useDepartments();
  const { data: rolesList = [] } = useClinics();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const loading = loadingUsers || loadingDepts;

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMutationError('');
    setMutationLoading(true);
    try {
      await createUser.mutateAsync(userForm);
      setShowUserModal(false);
      setUserForm({ email: '', password: '', fullName: '', phone: '', roleId: '', clinicId: '' });
    } catch (err) {
      setMutationError(err.message || 'Failed to create user');
    } finally {
      setMutationLoading(false);
    }
  };

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: adminKeys.roles });

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setMutationError('');
    setMutationLoading(true);
    try {
      if (editingRole) {
        await api.patch(`/admin/roles/${editingRole.id}`, roleForm);
      } else {
        await api.post('/admin/roles', roleForm);
      }
      setShowRoleModal(false);
      setEditingRole(null);
      setRoleForm({ name: '', description: '', permissions: [] });
      invalidateAll();
    } catch (err) {
      setMutationError(err.message || 'Failed to save role');
    } finally {
      setMutationLoading(false);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description || '', permissions: role.permissions || [] });
    setShowRoleModal(true);
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Delete this role?')) return;
    setMutationError('');
    setMutationLoading(true);
    try {
      await api.delete(`/admin/roles/${roleId}`);
      invalidateAll();
    } catch (err) {
      setMutationError(err.message || 'Failed to delete role');
    } finally {
      setMutationLoading(false);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setMutationError('');
    setMutationLoading(true);
    try {
      if (editingDept) {
        await api.patch(`/departments/${editingDept.id}`, deptForm);
      } else {
        await api.post('/departments', deptForm);
      }
      setShowDeptModal(false);
      setEditingDept(null);
      setDeptForm({ name: '', nameAr: '', slug: '', type: 'OTHER' });
      queryClient.invalidateQueries({ queryKey: adminKeys.departments });
    } catch (err) {
      setMutationError(err.message || 'Failed to save department');
    } finally {
      setMutationLoading(false);
    }
  };

  const togglePermission = (perm) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  return (
    <div className="space-y-6">
      {mutationError && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3 flex items-start gap-2 mb-4">
          <span className="text-sm text-red-700 dark:text-red-300 flex-1">{mutationError}</span>
          <button onClick={() => setMutationError('')} className="text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}
      {mutationLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/30">
          <div className="loader" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Admin</h1>
          <p className="text-body text-slate mt-1">User management, role-based access control & permissions</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2">
        <Button variant={tab === 'users' ? 'primary' : 'secondary'} onClick={() => setTab('users')}>Users</Button>
        <Button variant={tab === 'roles' ? 'primary' : 'secondary'} onClick={() => setTab('roles')}>Roles</Button>
        <Button variant={tab === 'departments' ? 'primary' : 'secondary'} onClick={() => setTab('departments')}>Departments</Button>
      </div>

      {tab === 'users' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Users ({users.length})</CardTitle>
              <Button onClick={() => setShowUserModal(true)}>Add User</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-body text-slate">Loading users...</p>
            ) : (
              <Table columns={userColumns} data={users} />
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'roles' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Roles ({roles.length})</CardTitle>
              <Button onClick={() => { setEditingRole(null); setRoleForm({ name: '', description: '', permissions: [] }); setShowRoleModal(true); }}>Add Role</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-body text-slate">Loading roles...</p>
            ) : (
              <div className="space-y-4">
                {roles.map((role) => (
                  <div key={role.id} className="p-4 border border-silver rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-obsidian">{role.name}</span>
                        <span className="text-caption text-slate ml-2">({role.userCount || 0} users)</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteRole(role.id)}>Delete</Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(role.permissions || []).map((p) => (
                        <Badge key={p} variant="info" size="sm">{p}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'departments' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Departments ({departments.length})</CardTitle>
              <Button onClick={() => { setEditingDept(null); setDeptForm({ name: '', nameAr: '', slug: '', type: 'OTHER' }); setShowDeptModal(true); }}>Add Department</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-body text-slate">Loading departments...</p>
            ) : (
              <div className="space-y-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="p-4 border border-silver rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-obsidian">{dept.name}</span>
                        <Badge variant="info" size="sm" className="ml-2">{dept.type}</Badge>
                        {dept.clinic && <span className="text-caption text-slate ml-2">→ {dept.clinic.name}</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingDept(dept); setDeptForm({ name: dept.name, nameAr: dept.nameAr || '', slug: dept.slug, type: dept.type }); setShowDeptModal(true); }}>Edit</Button>
                      </div>
                    </div>
                    <div className="text-caption text-slate">
                      slug: {dept.slug}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title="Add User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input label="Full Name" required value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} />
          <Input label="Email" type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
          <Input label="Password" type="password" required value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
          <Input label="Phone" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-graphite">Role</label>
            <select required value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">Select role</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-graphite">Clinic (optional)</label>
            <select value={userForm.clinicId} onChange={(e) => setUserForm({ ...userForm, clinicId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">No clinic</option>
              {rolesList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowUserModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Create User</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showRoleModal} onClose={() => setShowRoleModal(false)} title={editingRole ? 'Edit Role' : 'Add Role'}>
        <form onSubmit={handleCreateRole} className="space-y-4">
          <Input label="Role Name" required value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} />
          <Input label="Description" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-graphite mb-2 block">Permissions</label>
            <div className="max-h-64 overflow-y-auto space-y-1 border border-silver rounded-lg p-3">
              {PERMISSIONS_LIST.map((perm) => (
                <label key={perm.key} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-bone rounded px-1">
                  <input type="checkbox" checked={roleForm.permissions.includes(perm.key)} onChange={() => togglePermission(perm.key)} className="rounded border-silver" />
                  <span className="text-body text-graphite">{perm.label}</span>
                  <span className="text-caption text-slate ml-auto">{perm.key}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowRoleModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">{editingRole ? 'Update' : 'Create'} Role</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showDeptModal} onClose={() => setShowDeptModal(false)} title={editingDept ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <Input label="Name (English)" required value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
          <Input label="Name (Arabic)" value={deptForm.nameAr} onChange={(e) => setDeptForm({ ...deptForm, nameAr: e.target.value })} />
          <Input label="Slug" required value={deptForm.slug} onChange={(e) => setDeptForm({ ...deptForm, slug: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-graphite">Department Type</label>
            <select required value={deptForm.type} onChange={(e) => setDeptForm({ ...deptForm, type: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="CLINIC">Clinic</option>
              <option value="PHARMACY">Pharmacy</option>
              <option value="LAB">Lab</option>
              <option value="SURGERY">Surgery</option>
              <option value="ADMIN">Administration</option>
              <option value="HR">Human Resources</option>
              <option value="FINANCE">Finance</option>
              <option value="IT">IT</option>
              <option value="NURSING">Nursing</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowDeptModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">{editingDept ? 'Update' : 'Create'} Department</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAdminUsers, useAdminRoles, useCreateUser, useUpdateUser, useDepartments, useDepartmentStats, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, adminKeys, useOperationTypePrices, useUpdateOperationTypePrice, useClinicPrices, useUpdateClinicPrice, useWardPrices, useUpdateWardPrice, useImagingProcedureTypes, useUpdateImagingProcedureTypePrice } from '../../hooks/queries/useAdmin';
import { useClinics } from '../../hooks/queries/useClinics';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { PERMISSIONS_LIST } from './permissions';
import { CURRENCY } from '../../utils/currency';
import SystemHealth from './SystemHealth';
import toast from 'react-hot-toast';

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
  const [deptFilter, setDeptFilter] = useState('');
  const [pricingSubTab, setPricingSubTab] = useState('procedures');
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const { data: users = [], isLoading: loadingUsers, isError: usersError, refetch: refetchUsers } = useAdminUsers();
  const { data: roles = [] } = useAdminRoles();
  const { data: departments = [], isLoading: loadingDepts, isError: deptsError, refetch: refetchDepts } = useDepartments();
  const { data: rolesList = [] } = useClinics();
  const { data: pricingOpTypes = [], isLoading: loadingOpPrices } = useOperationTypePrices();
  const { data: pricingClinics = [], isLoading: loadingClinicPrices } = useClinicPrices();
  const { data: pricingWards = [], isLoading: loadingWardPrices } = useWardPrices();
  const { data: imagingProcedureTypes = [], isLoading: loadingImagingPrices } = useImagingProcedureTypes();
  const updateOpPrice = useUpdateOperationTypePrice();
  const updateClinicPrice = useUpdateClinicPrice();
  const updateWardPrice = useUpdateWardPrice();
  const updateImagingPrice = useUpdateImagingProcedureTypePrice();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();
  const { data: deptStats } = useDepartmentStats();

  const loading = loadingUsers || loadingDepts;
  const adminError = usersError || deptsError;

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
    try {
      if (editingDept) {
        await updateDept.mutateAsync({ id: editingDept.id, ...deptForm });
      } else {
        await createDept.mutateAsync(deptForm);
      }
      setShowDeptModal(false);
      setEditingDept(null);
      setDeptForm({ name: '', nameAr: '', slug: '', type: 'OTHER' });
    } catch (err) {
      setMutationError(err.message || 'Failed to save department');
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!confirm('Delete this department? This action cannot be undone.')) return;
    setMutationError('');
    try {
      await deleteDept.mutateAsync(deptId);
      toast.success('Department deleted');
    } catch (err) {
      setMutationError(err.message || 'Failed to delete department');
    }
  };

  const filteredDepartments = departments.filter((d) =>
    !deptFilter || d.type === deptFilter || d.name.toLowerCase().includes(deptFilter.toLowerCase())
  );

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
        <Button variant={tab === 'pricing' ? 'primary' : 'secondary'} onClick={() => setTab('pricing')}>Pricing</Button>
        <Button variant={tab === 'system' ? 'primary' : 'secondary'} onClick={() => setTab('system')}>System</Button>
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
            ) : adminError ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-body text-red-500">Failed to load data</p>
                <button
                  onClick={() => { refetchUsers(); refetchDepts(); }}
                  className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
                >
                  Retry
                </button>
              </div>
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
            ) : adminError ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-body text-red-500">Failed to load data</p>
                <button
                  onClick={() => { refetchUsers(); refetchDepts(); }}
                  className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
                >
                  Retry
                </button>
              </div>
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

      {tab === 'pricing' && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 border-b border-silver pb-2 mb-4">
              <Button variant={pricingSubTab === 'procedures' ? 'primary' : 'secondary'} size="sm" onClick={() => setPricingSubTab('procedures')}>Procedure Fees</Button>
              <Button variant={pricingSubTab === 'clinics' ? 'primary' : 'secondary'} size="sm" onClick={() => setPricingSubTab('clinics')}>Clinic Fees</Button>
              <Button variant={pricingSubTab === 'wards' ? 'primary' : 'secondary'} size="sm" onClick={() => setPricingSubTab('wards')}>Ward Rates</Button>
              <Button variant={pricingSubTab === 'imaging' ? 'primary' : 'secondary'} size="sm" onClick={() => setPricingSubTab('imaging')}>Imaging Fees</Button>
            </div>

            {pricingSubTab === 'procedures' && (
              <>
                {loadingOpPrices ? (
                  <p className="text-body text-slate">Loading...</p>
                ) : (
                  <Table
                    columns={[
                      { key: 'name', header: 'Procedure' },
                      { key: 'department', header: 'Department', render: (v) => v?.name || '-' },
                      { key: 'price', header: `Price (${CURRENCY})`, render: (v, row) => (
                        <input
                          type="number" step="0.01" min="0"
                          defaultValue={v != null ? Number(v).toFixed(2) : ''}
                          onBlur={(e) => {
                            const val = e.target.value;
                            updateOpPrice.mutate({ id: row.id, price: val ? parseFloat(val) : null });
                          }}
                          className="w-28 px-2 py-1 border border-silver rounded text-body text-obsidian focus:outline-none focus:ring-1 focus:ring-lilac-bloom"
                          placeholder="0.00"
                        />
                      )},
                    ]}
                    data={pricingOpTypes}
                  />
                )}
              </>
            )}

            {pricingSubTab === 'clinics' && (
              <>
                {loadingClinicPrices ? (
                  <p className="text-body text-slate">Loading...</p>
                ) : (
                  <Table
                    columns={[
                      { key: 'name', header: 'Clinic' },
                      { key: 'nameAr', header: 'Arabic Name' },
                      { key: 'consultationFee', header: `Consultation Fee (${CURRENCY})`, render: (v, row) => (
                        <input
                          type="number" step="0.01" min="0"
                          defaultValue={v != null ? Number(v).toFixed(2) : ''}
                          onBlur={(e) => {
                            const val = e.target.value;
                            updateClinicPrice.mutate({ id: row.id, consultationFee: val ? parseFloat(val) : null, followUpFee: row.followUpFee });
                          }}
                          className="w-28 px-2 py-1 border border-silver rounded text-body text-obsidian focus:outline-none focus:ring-1 focus:ring-lilac-bloom"
                          placeholder="0.00"
                        />
                      )},
                      { key: 'followUpFee', header: `Follow-up Fee (${CURRENCY})`, render: (v, row) => (
                        <input
                          type="number" step="0.01" min="0"
                          defaultValue={v != null ? Number(v).toFixed(2) : ''}
                          onBlur={(e) => {
                            const val = e.target.value;
                            updateClinicPrice.mutate({ id: row.id, consultationFee: row.consultationFee, followUpFee: val ? parseFloat(val) : null });
                          }}
                          className="w-28 px-2 py-1 border border-silver rounded text-body text-obsidian focus:outline-none focus:ring-1 focus:ring-lilac-bloom"
                          placeholder="0.00"
                        />
                      )},
                    ]}
                    data={pricingClinics}
                  />
                )}
              </>
            )}

            {pricingSubTab === 'wards' && (
              <>
                {loadingWardPrices ? (
                  <p className="text-body text-slate">Loading...</p>
                ) : (
                  <Table
                    columns={[
                      { key: 'name', header: 'Ward' },
                      { key: 'nameAr', header: 'Arabic Name' },
                      { key: 'type', header: 'Type' },
                      { key: 'dailyRate', header: `Daily Rate (${CURRENCY})`, render: (v, row) => (
                        <input
                          type="number" step="0.01" min="0"
                          defaultValue={v != null ? Number(v).toFixed(2) : ''}
                          onBlur={(e) => {
                            const val = e.target.value;
                            updateWardPrice.mutate({ id: row.id, dailyRate: val ? parseFloat(val) : null });
                          }}
                          className="w-28 px-2 py-1 border border-silver rounded text-body text-obsidian focus:outline-none focus:ring-1 focus:ring-lilac-bloom"
                          placeholder="0.00"
                        />
                      )},
                    ]}
                    data={pricingWards}
                  />
                )}
              </>
            )}

            {pricingSubTab === 'imaging' && (
              <>
                {loadingImagingPrices ? (
                  <p className="text-body text-slate">Loading...</p>
                ) : (
                  <Table
                    columns={[
                      { key: 'name', header: 'Procedure' },
                      { key: 'nameAr', header: 'Arabic Name' },
                      { key: 'scanType', header: 'Scan Type' },
                      { key: 'price', header: `Price (${CURRENCY})`, render: (v, row) => (
                        <input
                          type="number" step="0.01" min="0"
                          defaultValue={v != null ? Number(v).toFixed(2) : ''}
                          onBlur={(e) => {
                            const val = e.target.value;
                            updateImagingPrice.mutate({ id: row.id, price: val ? parseFloat(val) : null });
                          }}
                          className="w-28 px-2 py-1 border border-silver rounded text-body text-obsidian focus:outline-none focus:ring-1 focus:ring-lilac-bloom"
                          placeholder="0.00"
                        />
                      )},
                    ]}
                    data={imagingProcedureTypes}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'system' && <SystemHealth />}

      {tab === 'departments' && (
        <div className="space-y-6">
          {deptStats && (
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 border border-silver rounded-lg bg-white">
                <p className="text-caption text-slate">Total</p>
                <p className="text-heading-sm font-semibold text-obsidian">{deptStats.total}</p>
              </div>
              <div className="p-4 border border-silver rounded-lg bg-white">
                <p className="text-caption text-slate">Active</p>
                <p className="text-heading-sm font-semibold text-green-600">{deptStats.activeCount}</p>
              </div>
              <div className="p-4 border border-silver rounded-lg bg-white">
                <p className="text-caption text-slate">Inactive</p>
                <p className="text-heading-sm font-semibold text-red-500">{deptStats.inactiveCount}</p>
              </div>
              <div className="p-4 border border-silver rounded-lg bg-white">
                <p className="text-caption text-slate">Types</p>
                <p className="text-heading-sm font-semibold text-obsidian">{deptStats.byType?.length || 0}</p>
              </div>
            </div>
          )}
          {deptStats?.byType && deptStats.byType.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {deptStats.byType.map((b) => (
                <Badge key={b.type} variant="info" size="sm">{b.type}: {b.count}</Badge>
              ))}
            </div>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Departments ({departments.length})</CardTitle>
                <div className="flex gap-2">
                  <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
                    className="px-3 py-2 border border-silver rounded text-body text-obsidian focus:outline-none focus:ring-1 focus:ring-lilac-bloom">
                    <option value="">All Types</option>
                    {['CLINIC', 'PHARMACY', 'LAB', 'SURGERY', 'ADMIN', 'HR', 'FINANCE', 'IT', 'NURSING', 'OTHER', 'IMAGING', 'EMERGENCY'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <Button onClick={() => { setEditingDept(null); setDeptForm({ name: '', nameAr: '', slug: '', type: 'OTHER' }); setShowDeptModal(true); }}>Add Department</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-body text-slate">Loading departments...</p>
              ) : adminError ? (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <p className="text-body text-red-500">Failed to load departments</p>
                  <button
                    onClick={() => { refetchUsers(); refetchDepts(); }}
                    className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredDepartments.length === 0 ? (
                <p className="text-body text-slate">No departments found.</p>
              ) : (
                <div className="space-y-4">
                  {filteredDepartments.map((dept) => (
                    <div key={dept.id} className="p-4 border border-silver rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-obsidian">{dept.name}</span>
                          <Badge variant="info" size="sm" className="ml-2">{dept.type}</Badge>
                          {dept.clinic && <span className="text-caption text-slate ml-2">→ {dept.clinic.name}</span>}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingDept(dept); setDeptForm({ name: dept.name, nameAr: dept.nameAr || '', slug: dept.slug, type: dept.type }); setShowDeptModal(true); }}>Edit</Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteDepartment(dept.id)}>Delete</Button>
                        </div>
                      </div>
                      <div className="flex gap-4 text-caption text-slate">
                        <span>slug: {dept.slug}</span>
                        {dept._count && <span>Employees: {dept._count.employees || 0}</span>}
                        {dept._count && <span>Surgeries: {dept._count.surgeries || 0}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
            <Button type="submit" className="flex-1" loading={mutationLoading}>Create User</Button>
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
            <Button type="submit" className="flex-1" loading={mutationLoading}>{editingRole ? 'Update' : 'Create'} Role</Button>
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
              <option value="IMAGING">Imaging</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowDeptModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" loading={mutationLoading}>{editingDept ? 'Update' : 'Create'} Department</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

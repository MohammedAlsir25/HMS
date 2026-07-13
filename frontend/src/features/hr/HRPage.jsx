import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notifySuccess, notifyError } from '../../utils/notify';
import { api } from '../../lib/api';
import { useHREmployees, useHRPayroll, useHRLeaves, useUpdatePayrollStatus, useUpdateLeaveStatus, useHRAttendance, useUpsertAttendance, hrKeys } from '../../hooks/queries/useHR';
import { useDepartments, useAdminRoles } from '../../hooks/queries/useAdmin';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { CURRENCY } from '../../utils/currency';

const POSITIONS = ['Doctor', 'Nurse', 'Technician', 'Administrator', 'Accountant', 'Receptionist', 'Pharmacist', 'Security', 'Housekeeping', 'Other'];

export default function HRPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('employees');
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showEditEmpModal, setShowEditEmpModal] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [empForm, setEmpForm] = useState({ employeeCode: '', fullName: '', phone: '', email: '', gender: '', position: '', department: '', departmentId: '', baseSalary: 0, hireDate: '' });
  const [createUser, setCreateUser] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRoleId, setUserRoleId] = useState('');
  const [payForm, setPayForm] = useState({ employeeId: '', period: '', grossPay: 0, deductions: 0, notes: '' });
  const [leaveForm, setLeaveForm] = useState({ employeeId: '', type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const { data: employees = [], isLoading: loadingEmp } = useHREmployees();
  const { data: payroll = [], isLoading: loadingPay } = useHRPayroll();
  const { data: leaves = [], isLoading: loadingLeave } = useHRLeaves();
  const { data: attendanceRecords = [] } = useHRAttendance({ date: attendanceDate });
  const { data: departments = [] } = useDepartments();
  const { data: roles = [] } = useAdminRoles();
  const updatePayrollStatus = useUpdatePayrollStatus();
  const updateLeaveStatus = useUpdateLeaveStatus();
  const upsertAttendance = useUpsertAttendance();

  const employeeColumns = [
    { key: 'employeeCode', label: 'Code' },
    { key: 'fullName', label: 'Name' },
    { key: 'gender', label: 'Gender', render: (r) => r.gender === 'MALE' ? 'Male' : r.gender === 'FEMALE' ? 'Female' : '-' },
    { key: 'position', label: 'Position' },
    { key: 'dept', label: 'Dept', render: (r) => r.dept?.name || '-' },
    { key: 'baseSalary', label: `Salary (${CURRENCY})`, render: (r) => `${CURRENCY} ${Number(r.baseSalary).toFixed(2)}` },
    { key: 'isActive', label: 'Status', render: (r) => <Badge variant={r.isActive ? 'success' : 'danger'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions', label: '',
      render: (r) => <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditEmp(r); setShowEditEmpModal(true); }}>Edit</Button>,
    },
  ];

  const loading = loadingEmp || loadingPay || loadingLeave;

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setMutationError('');
    setMutationLoading(true);
    try {
      await api.post('/hr/employees', { ...empForm, createUser, userEmail, userPassword, userRoleId });
      setShowEmpModal(false);
      setEmpForm({ employeeCode: '', fullName: '', phone: '', email: '', gender: '', position: '', department: '', departmentId: '', baseSalary: 0, hireDate: '' });
      setCreateUser(false);
      setUserEmail('');
      setUserPassword('');
      setUserRoleId('');
      queryClient.invalidateQueries({ queryKey: hrKeys.employees });
    } catch (err) {
      setMutationError(err.message || 'Failed to create employee');
    } finally {
      setMutationLoading(false);
    }
  };

  const handleCreatePayroll = async (e) => {
    e.preventDefault();
    setMutationError('');
    setMutationLoading(true);
    try {
      await api.post('/hr/payroll', payForm);
      setShowPayrollModal(false);
      setPayForm({ employeeId: '', period: '', grossPay: 0, deductions: 0, notes: '' });
      queryClient.invalidateQueries({ queryKey: hrKeys.payroll });
    } catch (err) {
      setMutationError(err.message || 'Failed to create payroll record');
    } finally {
      setMutationLoading(false);
    }
  };

  const handlePayrollStatus = async (id, status) => {
    setMutationError('');
    setMutationLoading(true);
    try {
      await updatePayrollStatus.mutateAsync({ id, status });
    } catch (err) {
      setMutationError(err.message || 'Failed to update payroll status');
    } finally {
      setMutationLoading(false);
    }
  };

  const handleCreateLeave = async (e) => {
    e.preventDefault();
    setMutationError('');
    setMutationLoading(true);
    try {
      await api.post('/hr/leaves', leaveForm);
      setShowLeaveModal(false);
      setLeaveForm({ employeeId: '', type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: hrKeys.leaves });
    } catch (err) {
      setMutationError(err.message || 'Failed to create leave request');
    } finally {
      setMutationLoading(false);
    }
  };

  const handleLeaveStatus = async (id, status) => {
    setMutationError('');
    setMutationLoading(true);
    try {
      await updateLeaveStatus.mutateAsync({ id, status });
    } catch (err) {
      setMutationError(err.message || 'Failed to update leave status');
    } finally {
      setMutationLoading(false);
    }
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
          <h1 className="text-heading-sm font-semibold text-obsidian">HR & Payroll</h1>
          <p className="text-body text-slate mt-1">Employee management, payroll processing, attendance & leave tracking</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2 overflow-x-auto">
        <Button variant={tab === 'employees' ? 'primary' : 'secondary'} onClick={() => setTab('employees')}>Employees</Button>
        <Button variant={tab === 'payroll' ? 'primary' : 'secondary'} onClick={() => setTab('payroll')}>Payroll</Button>
        <Button variant={tab === 'attendance' ? 'primary' : 'secondary'} onClick={() => setTab('attendance')}>Attendance</Button>
        <Button variant={tab === 'leaves' ? 'primary' : 'secondary'} onClick={() => setTab('leaves')}>Leaves</Button>
      </div>

      {tab === 'employees' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Employees ({employees.length})</CardTitle>
              <Button onClick={() => setShowEmpModal(true)}>Add Employee</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-body text-slate">Loading employees...</p>
            ) : employees.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No employees found</p>
            ) : (
              <Table columns={employeeColumns} data={employees} />
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'payroll' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payroll Records ({payroll.length})</CardTitle>
              <Button onClick={() => setShowPayrollModal(true)}>Add Payroll</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-body text-slate">Loading payroll...</p>
            ) : payroll.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No payroll records found</p>
            ) : (
              <div className="space-y-3">
                {payroll.map((rec) => (
                  <div key={rec.id} className="p-4 border border-silver rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-obsidian">{rec.employee?.fullName || 'Unknown'} <span className="text-caption text-slate">({rec.employee?.department})</span></p>
                      <p className="text-caption text-slate">{rec.period} — Gross: {CURRENCY} {Number(rec.grossPay).toFixed(2)} / Net: {CURRENCY} {Number(rec.netPay).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rec.status === 'PAID' ? 'success' : rec.status === 'DRAFT' ? 'warning' : 'danger'}>{rec.status}</Badge>
                      {rec.status === 'DRAFT' && (
                        <Button size="sm" onClick={() => handlePayrollStatus(rec.id, 'PAID')}>Mark Paid</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'attendance' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Attendance</CardTitle>
              <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="w-40" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-silver">
                    <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Employee</th>
                    <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Code</th>
                    <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Check-In</th>
                    <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Check-Out</th>
                    <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Status</th>
                    <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Notes</th>
                    <th className="px-3 py-2.5 text-right text-caption font-medium text-slate uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const att = attendanceRecords.find((r) => r.employeeId === emp.id);
                    return (
                      <tr key={emp.id} className="border-b border-silver/50 hover:bg-bone/30 transition-colors">
                        <td className="px-3 py-3 text-body text-obsidian">{emp.fullName}</td>
                        <td className="px-3 py-3 text-caption text-slate font-mono">{emp.employeeCode}</td>
                        <td className="px-3 py-3">
                          {att?.checkIn ? new Date(att.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-3 py-3">
                          {att?.checkOut ? new Date(att.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={att?.status || 'PRESENT'}
                            onChange={(e) => upsertAttendance.mutate(
                              { employeeId: emp.id, date: attendanceDate, status: e.target.value },
                              { onSuccess: () => notifySuccess('Attendance updated'), onError: (err) => notifyError(err) }
                            )}
                            className="w-full rounded-lg border border-silver bg-paper px-2 py-1.5 text-caption focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                          >
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="LATE">Late</option>
                            <option value="HALF_DAY">Half Day</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            defaultValue={att?.notes || ''}
                            onBlur={(e) => upsertAttendance.mutate(
                              { employeeId: emp.id, date: attendanceDate, notes: e.target.value || undefined },
                              { onError: (err) => notifyError(err) }
                            )}
                            placeholder="Notes"
                            className="w-full bg-transparent border-b border-transparent focus:border-lilac-bloom px-1 py-0.5 text-caption text-obsidian outline-none transition-colors"
                          />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            {!att?.checkIn && (
                              <Button size="sm" onClick={() => upsertAttendance.mutate(
                                { employeeId: emp.id, date: attendanceDate, checkIn: new Date().toISOString() },
                                { onSuccess: () => notifySuccess(`${emp.fullName} checked in`), onError: (err) => notifyError(err) }
                              )}>
                                Check In
                              </Button>
                            )}
                            {att?.checkIn && !att?.checkOut && (
                              <Button size="sm" variant="secondary" onClick={() => upsertAttendance.mutate(
                                { employeeId: emp.id, date: attendanceDate, checkOut: new Date().toISOString() },
                                { onSuccess: () => notifySuccess(`${emp.fullName} checked out`), onError: (err) => notifyError(err) }
                              )}>
                                Check Out
                              </Button>
                            )}
                            {att?.checkIn && att?.checkOut && (
                              <Badge variant="success" size="sm">Done</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-slate text-body">No employees found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'leaves' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Leave Requests ({leaves.length})</CardTitle>
              <Button onClick={() => setShowLeaveModal(true)}>New Leave</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-body text-slate">Loading leaves...</p>
            ) : leaves.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No leave requests found</p>
            ) : (
              <div className="space-y-3">
                {leaves.map((leave) => (
                  <div key={leave.id} className="p-4 border border-silver rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-obsidian">{leave.employee?.fullName || 'Unknown'}</p>
                      <p className="text-caption text-slate">{leave.type} — {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}</p>
                      {leave.reason && <p className="text-caption text-slate">{leave.reason}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={leave.status === 'APPROVED' ? 'success' : leave.status === 'PENDING' ? 'warning' : 'danger'}>{leave.status}</Badge>
                      {leave.status === 'PENDING' && (
                        <>
                          <Button size="sm" variant="primary" onClick={() => handleLeaveStatus(leave.id, 'APPROVED')}>Approve</Button>
                          <Button size="sm" variant="danger" onClick={() => handleLeaveStatus(leave.id, 'REJECTED')}>Reject</Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Modal open={showEmpModal} onClose={() => setShowEmpModal(false)} title="Add Employee">
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <Input label="Employee Code" required value={empForm.employeeCode} onChange={(e) => setEmpForm({ ...empForm, employeeCode: e.target.value })} />
          <Input label="Full Name" required value={empForm.fullName} onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })} />
          <Input label="Phone" value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} />
          <Input label="Email" type="email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-graphite">Gender</label>
            <select value={empForm.gender} onChange={(e) => setEmpForm({ ...empForm, gender: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">-- Select --</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-graphite">Position *</label>
            <select required value={empForm.position} onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">-- Select Position --</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-graphite">Department</label>
            <select value={empForm.departmentId} onChange={(e) => {
              const deptId = e.target.value;
              const dept = departments.find(d => d.id === deptId);
              setEmpForm({ ...empForm, departmentId: deptId, department: dept?.name || '' });
            }}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">-- Select Department --</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.type})</option>)}
            </select>
          </div>
          <Input label="Base Salary" type="number" min="0" step="0.01" value={empForm.baseSalary} onChange={(e) => setEmpForm({ ...empForm, baseSalary: parseFloat(e.target.value) || 0 })} />
          <Input label="Hire Date" type="date" required value={empForm.hireDate} onChange={(e) => setEmpForm({ ...empForm, hireDate: e.target.value })} />

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="createUser" checked={createUser}
              onChange={(e) => {
                setCreateUser(e.target.checked);
                if (e.target.checked && empForm.email) setUserEmail(empForm.email);
              }}
              className="w-4 h-4 rounded border-silver text-lilac-bloom focus:ring-lilac-bloom" />
            <label htmlFor="createUser" className="text-sm font-medium text-graphite cursor-pointer">Create Login Account</label>
          </div>

          {createUser && (
            <div className="space-y-4 pl-2 border-l-2 border-lilac-bloom/30">
              <Input label="Login Email" type="email" required value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)} />
              <Input label="Password" type="password" required value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)} />
              <div>
                <label className="text-sm font-medium text-graphite">Role *</label>
                <select required value={userRoleId} onChange={(e) => setUserRoleId(e.target.value)}
                  className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
                  <option value="">-- Select Role --</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEmpModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showPayrollModal} onClose={() => setShowPayrollModal(false)} title="Add Payroll Record">
        <form onSubmit={handleCreatePayroll} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-graphite">Employee</label>
            <select required value={payForm.employeeId} onChange={(e) => setPayForm({ ...payForm, employeeId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">Select employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</option>)}
            </select>
          </div>
          <Input label="Period (e.g. 2026-06)" required value={payForm.period} onChange={(e) => setPayForm({ ...payForm, period: e.target.value })} />
          <Input label="Gross Pay" type="number" min="0" step="0.01" required value={payForm.grossPay} onChange={(e) => setPayForm({ ...payForm, grossPay: parseFloat(e.target.value) || 0 })} />
          <Input label="Deductions" type="number" min="0" step="0.01" value={payForm.deductions} onChange={(e) => setPayForm({ ...payForm, deductions: parseFloat(e.target.value) || 0 })} />
          <Input label="Notes" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowPayrollModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" loading={mutationLoading}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="New Leave Request">
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-graphite">Employee</label>
            <select required value={leaveForm.employeeId} onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">Select employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-graphite">Leave Type</label>
            <select required value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="ANNUAL">Annual</option>
              <option value="SICK">Sick</option>
              <option value="PERSONAL">Personal</option>
              <option value="MATERNITY">Maternity</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
          <Input label="Start Date" type="date" required value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
          <Input label="End Date" type="date" required value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
          <Input label="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowLeaveModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Submit</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showEditEmpModal} onClose={() => setShowEditEmpModal(false)} title="Edit Employee">
        {editEmp && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            setMutationError('');
            setMutationLoading(true);
            try {
              await api.patch(`/hr/employees/${editEmp.id}`, {
                fullName: editEmp.fullName,
                phone: editEmp.phone,
                email: editEmp.email,
                gender: editEmp.gender,
                position: editEmp.position,
                departmentId: editEmp.departmentId,
                baseSalary: editEmp.baseSalary,
                isActive: editEmp.isActive,
              });
              setShowEditEmpModal(false);
              queryClient.invalidateQueries({ queryKey: hrKeys.employees });
              notifySuccess('Employee updated');
            } catch (err) {
              setMutationError(err.message || 'Failed to update employee');
            } finally {
              setMutationLoading(false);
            }
          }} className="space-y-4">
            <Input label="Full Name" required value={editEmp.fullName} onChange={(e) => setEditEmp({ ...editEmp, fullName: e.target.value })} />
            <Input label="Phone" value={editEmp.phone || ''} onChange={(e) => setEditEmp({ ...editEmp, phone: e.target.value })} />
            <Input label="Email" type="email" value={editEmp.email || ''} onChange={(e) => setEditEmp({ ...editEmp, email: e.target.value })} />
            <div>
              <label className="text-sm font-medium text-graphite">Gender</label>
              <select value={editEmp.gender || ''} onChange={(e) => setEditEmp({ ...editEmp, gender: e.target.value })}
                className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
                <option value="">--</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-graphite">Position</label>
              <select required value={editEmp.position} onChange={(e) => setEditEmp({ ...editEmp, position: e.target.value })}
                className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
                {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-graphite">Department</label>
              <select value={editEmp.departmentId || ''} onChange={(e) => setEditEmp({ ...editEmp, departmentId: e.target.value })}
                className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
                <option value="">-- Select Department --</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <Input label="Base Salary" type="number" min="0" step="0.01" value={editEmp.baseSalary} onChange={(e) => setEditEmp({ ...editEmp, baseSalary: parseFloat(e.target.value) || 0 })} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="editIsActive" checked={editEmp.isActive} onChange={(e) => setEditEmp({ ...editEmp, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-silver text-lilac-bloom focus:ring-lilac-bloom" />
              <label htmlFor="editIsActive" className="text-sm font-medium text-graphite cursor-pointer">Active</label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowEditEmpModal(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" loading={mutationLoading}>Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

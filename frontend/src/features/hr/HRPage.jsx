import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { notifySuccess, notifyError } from '../../utils/notify';
import { api } from '../../lib/api';
import { useHREmployees, useHRPayroll, useHRLeaves, useUpdatePayrollStatus, useUpdateLeaveStatus, useHRAttendance, useUpsertAttendance, useHRDashboard, useShiftTemplates, useCreateShiftTemplate, useRoster, useAssignShift, useLeaveBalances, useInitLeaveBalances, useBulkGeneratePayroll, usePayslip, hrKeys } from '../../hooks/queries/useHR';
import { useDepartments, useAdminRoles } from '../../hooks/queries/useAdmin';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { CURRENCY } from '../../utils/currency';

const POSITIONS = ['Doctor', 'Nurse', 'Technician', 'Administrator', 'Accountant', 'Receptionist', 'Pharmacist', 'Security', 'Housekeeping', 'Other'];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LEAVE_TYPES = ['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'UNPAID'];

function getWeekDates(offset = 0) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export default function HRPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('dashboard');
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showEditEmpModal, setShowEditEmpModal] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showGeneratePayrollModal, setShowGeneratePayrollModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payslipId, setPayslipId] = useState(null);
  const [showShiftTemplateModal, setShowShiftTemplateModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [leaveSubTab, setLeaveSubTab] = useState('requests');
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
  const [shiftTemplateForm, setShiftTemplateForm] = useState({ name: '', startTime: '08:00', endTime: '16:00', recurrence: 'MON_FRI' });
  const [weekOffset, setWeekOffset] = useState(0);
  const [bulkAssignForm, setBulkAssignForm] = useState({ employeeIds: [], shiftTemplateId: '', startDate: '', endDate: '' });
  const [genPayrollPeriod, setGenPayrollPeriod] = useState('');
  const [genPayrollDeptId, setGenPayrollDeptId] = useState('');
  const [leaveBalanceYear, setLeaveBalanceYear] = useState(new Date().getFullYear());
  const [leaveBalanceEmpId, setLeaveBalanceEmpId] = useState('');
  const [showInitBalanceModal, setShowInitBalanceModal] = useState(false);
  const [initBalanceForm, setInitBalanceForm] = useState({ employeeId: '', year: new Date().getFullYear(), leaveType: 'ANNUAL', entitled: 0 });

  const { data: employees = [], isLoading: loadingEmp, isError: empError, refetch: refetchEmp } = useHREmployees();
  const { data: payroll = [], isLoading: loadingPay, isError: payError, refetch: refetchPay } = useHRPayroll();
  const { data: leaves = [], isLoading: loadingLeave, isError: leaveError, refetch: refetchLeave } = useHRLeaves();
  const { data: attendanceRecords = [] } = useHRAttendance({ date: attendanceDate });
  const { data: departments = [] } = useDepartments();
  const { data: roles = [] } = useAdminRoles();
  const { data: dashboard, isLoading: loadingDashboard } = useHRDashboard();
  const { data: shiftTemplates = [], isLoading: loadingTemplates } = useShiftTemplates();
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const { data: roster = [], isLoading: loadingRoster } = useRoster({ startDate: weekDates[0], endDate: weekDates[6] });
  const { data: leaveBalances = [], isLoading: loadingBalances } = useLeaveBalances({ year: leaveBalanceYear, employeeId: leaveBalanceEmpId || undefined });
  const { data: payslipData, isLoading: loadingPayslip } = usePayslip(payslipId);
  const updatePayrollStatus = useUpdatePayrollStatus();
  const updateLeaveStatus = useUpdateLeaveStatus();
  const upsertAttendance = useUpsertAttendance();
  const createShiftTemplate = useCreateShiftTemplate();
  const assignShift = useAssignShift();
  const initLeaveBalances = useInitLeaveBalances();
  const bulkGeneratePayroll = useBulkGeneratePayroll();

  const employeeColumns = [
    { key: 'employeeCode', label: 'Code' },
    {
      key: 'fullName', label: 'Name',
      render: (r) => (
        <button className="text-lilac-bloom hover:underline font-medium" onClick={(e) => { e.stopPropagation(); navigate(`/hr/employees/${r.id}`); }}>
          {r.fullName}
        </button>
      ),
    },
    { key: 'gender', label: 'Gender', render: (r) => r.gender === 'MALE' ? 'Male' : r.gender === 'FEMALE' ? 'Female' : '-' },
    { key: 'position', label: 'Position' },
    { key: 'dept', label: 'Dept', render: (r) => r.dept?.name || '-' },
    { key: 'baseSalary', label: `Salary (${CURRENCY})`, render: (r) => `${CURRENCY} ${Number(r.baseSalary).toFixed(2)}` },
    { key: 'isActive', label: 'Status', render: (r) => <Badge variant={r.isActive ? 'success' : 'danger'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/hr/employees/${r.id}`); }}>View</Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditEmp(r); setShowEditEmpModal(true); }}>Edit</Button>
        </div>
      ),
    },
  ];

  const loading = loadingEmp || loadingPay || loadingLeave;
  const hrError = empError || payError || leaveError;

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

  const handleCreateShiftTemplate = async (e) => {
    e.preventDefault();
    setMutationError('');
    setMutationLoading(true);
    try {
      await createShiftTemplate.mutateAsync(shiftTemplateForm);
      setShowShiftTemplateModal(false);
      setShiftTemplateForm({ name: '', startTime: '08:00', endTime: '16:00', recurrence: 'MON_FRI' });
      notifySuccess('Shift template created');
    } catch (err) {
      setMutationError(err.message || 'Failed to create shift template');
    } finally {
      setMutationLoading(false);
    }
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();
    setMutationError('');
    setMutationLoading(true);
    try {
      await assignShift.mutateAsync(bulkAssignForm);
      setShowBulkAssignModal(false);
      setBulkAssignForm({ employeeIds: [], shiftTemplateId: '', startDate: '', endDate: '' });
      notifySuccess('Shifts assigned successfully');
    } catch (err) {
      setMutationError(err.message || 'Failed to assign shifts');
    } finally {
      setMutationLoading(false);
    }
  };

  const handleAssignCell = async (employeeId, date, shiftTemplateId) => {
    try {
      await assignShift.mutateAsync({ employeeIds: [employeeId], shiftTemplateId, startDate: date, endDate: date });
      notifySuccess('Shift assigned');
    } catch (err) {
      notifyError(err);
    }
  };

  const handleGeneratePayroll = async () => {
    if (!genPayrollPeriod) return;
    setMutationError('');
    setMutationLoading(true);
    try {
      await bulkGeneratePayroll.mutateAsync({ period: genPayrollPeriod, departmentId: genPayrollDeptId || undefined });
      setShowGeneratePayrollModal(false);
      setGenPayrollPeriod('');
      setGenPayrollDeptId('');
      notifySuccess('Payroll generated');
    } catch (err) {
      setMutationError(err.message || 'Failed to generate payroll');
    } finally {
      setMutationLoading(false);
    }
  };

  const handleInitBalance = async (e) => {
    e.preventDefault();
    setMutationError('');
    setMutationLoading(true);
    try {
      await initLeaveBalances.mutateAsync(initBalanceForm);
      setShowInitBalanceModal(false);
      setInitBalanceForm({ employeeId: '', year: new Date().getFullYear(), leaveType: 'ANNUAL', entitled: 0 });
      notifySuccess('Leave balance initialized');
    } catch (err) {
      setMutationError(err.message || 'Failed to initialize leave balance');
    } finally {
      setMutationLoading(false);
    }
  };

  const rosterGrouped = useMemo(() => {
    const grouped = {};
    weekDates.forEach((d) => { grouped[d] = []; });
    if (Array.isArray(roster)) {
      roster.forEach((shift) => {
        const dateKey = shift.date?.slice(0, 10);
        if (grouped[dateKey]) grouped[dateKey].push(shift);
      });
    }
    return grouped;
  }, [roster, weekDates]);

  const rosterEmployees = useMemo(() => {
    const deptMap = {};
    employees.forEach((emp) => {
      if (!emp.isActive) return;
      const deptName = emp.dept?.name || emp.department || 'Unassigned';
      if (!deptMap[deptName]) deptMap[deptName] = [];
      deptMap[deptName].push(emp);
    });
    return deptMap;
  }, [employees]);

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
        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'employees', label: 'Employees' },
          { key: 'payroll', label: 'Payroll' },
          { key: 'attendance', label: 'Attendance' },
          { key: 'leaves', label: 'Leaves' },
          { key: 'shifts', label: 'Shifts' },
        ].map((t) => (
          <Button key={t.key} variant={tab === t.key ? 'primary' : 'secondary'} onClick={() => setTab(t.key)}>{t.label}</Button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <DashboardTab dashboard={dashboard} loading={loadingDashboard} employees={employees} navigate={navigate} setTab={setTab} />
      )}

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
            ) : hrError ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-body text-red-500">Failed to load employees</p>
                <button
                  onClick={() => { refetchEmp(); refetchPay(); refetchLeave(); }}
                  className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
                >
                  Retry
                </button>
              </div>
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
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowGeneratePayrollModal(true)}>Generate Payroll</Button>
                <Button onClick={() => setShowPayrollModal(true)}>Add Payroll</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-body text-slate">Loading payroll...</p>
            ) : hrError ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-body text-red-500">Failed to load payroll</p>
                <button
                  onClick={() => { refetchEmp(); refetchPay(); refetchLeave(); }}
                  className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
                >
                  Retry
                </button>
              </div>
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
                      <Button size="sm" variant="ghost" onClick={() => { setPayslipId(rec.id); setShowPayslipModal(true); }}>Payslip</Button>
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
              <CardTitle>Leave Management</CardTitle>
              <Button onClick={() => setShowLeaveModal(true)}>New Leave</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              {['requests', 'balances'].map((sub) => (
                <Button key={sub} variant={leaveSubTab === sub ? 'primary' : 'secondary'} size="sm" onClick={() => setLeaveSubTab(sub)}>
                  {sub === 'requests' ? 'Requests' : 'Balances'}
                </Button>
              ))}
            </div>

            {leaveSubTab === 'requests' && (
              <>
                {loading ? (
                  <p className="text-body text-slate">Loading leaves...</p>
                ) : hrError ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <p className="text-body text-red-500">Failed to load leaves</p>
                    <button
                      onClick={() => { refetchEmp(); refetchPay(); refetchLeave(); }}
                      className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
                    >
                      Retry
                    </button>
                  </div>
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
              </>
            )}

            {leaveSubTab === 'balances' && (
              <LeaveBalancesSection
                leaveBalances={leaveBalances}
                loading={loadingBalances}
                employees={employees}
                leaveBalanceYear={leaveBalanceYear}
                setLeaveBalanceYear={setLeaveBalanceYear}
                leaveBalanceEmpId={leaveBalanceEmpId}
                setLeaveBalanceEmpId={setLeaveBalanceEmpId}
                onInitBalance={() => setShowInitBalanceModal(true)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'shifts' && (
        <ShiftsTab
          shiftTemplates={shiftTemplates}
          loadingTemplates={loadingTemplates}
          rosterGrouped={rosterGrouped}
          rosterEmployees={rosterEmployees}
          loadingRoster={loadingRoster}
          weekDates={weekDates}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          onAddTemplate={() => setShowShiftTemplateModal(true)}
          onBulkAssign={() => setShowBulkAssignModal(true)}
          onAssignCell={handleAssignCell}
          employees={employees}
        />
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

      <Modal open={showGeneratePayrollModal} onClose={() => setShowGeneratePayrollModal(false)} title="Generate Payroll">
        <div className="space-y-4">
          <Input label="Period (e.g. 2026-07)" required value={genPayrollPeriod} onChange={(e) => setGenPayrollPeriod(e.target.value)} placeholder="YYYY-MM" />
          <div>
            <label className="text-sm font-medium text-graphite">Department (optional)</label>
            <select value={genPayrollDeptId} onChange={(e) => setGenPayrollDeptId(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <p className="text-caption text-slate">This will generate payroll records for {genPayrollDeptId ? 'selected department' : 'all active employees'} for the specified period.</p>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowGeneratePayrollModal(false)} className="flex-1">Cancel</Button>
            <Button className="flex-1" loading={mutationLoading} onClick={handleGeneratePayroll}>Generate</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showPayslipModal} onClose={() => { setShowPayslipModal(false); setPayslipId(null); }} title="Payslip" className="max-w-2xl">
        {loadingPayslip ? (
          <p className="text-body text-slate">Loading payslip...</p>
        ) : payslipData ? (
          <div>
            <div dangerouslySetInnerHTML={{ __html: typeof payslipData === 'string' ? payslipData : payslipData.html || '' }} />
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => { setShowPayslipModal(false); setPayslipId(null); }} className="flex-1">Close</Button>
              <Button className="flex-1" onClick={() => {
                const html = typeof payslipData === 'string' ? payslipData : payslipData.html || '';
                const w = window.open('', '_blank');
                if (w) { w.document.write(html); w.document.close(); w.print(); }
              }}>Print</Button>
            </div>
          </div>
        ) : (
          <p className="text-body text-slate">No payslip data</p>
        )}
      </Modal>

      <Modal open={showShiftTemplateModal} onClose={() => setShowShiftTemplateModal(false)} title="Add Shift Template">
        <form onSubmit={handleCreateShiftTemplate} className="space-y-4">
          <Input label="Template Name" required value={shiftTemplateForm.name} onChange={(e) => setShiftTemplateForm({ ...shiftTemplateForm, name: e.target.value })} placeholder="e.g. Morning Shift" />
          <Input label="Start Time" type="time" required value={shiftTemplateForm.startTime} onChange={(e) => setShiftTemplateForm({ ...shiftTemplateForm, startTime: e.target.value })} />
          <Input label="End Time" type="time" required value={shiftTemplateForm.endTime} onChange={(e) => setShiftTemplateForm({ ...shiftTemplateForm, endTime: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-graphite">Recurrence</label>
            <select value={shiftTemplateForm.recurrence} onChange={(e) => setShiftTemplateForm({ ...shiftTemplateForm, recurrence: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="MON_FRI">Mon-Fri</option>
              <option value="MON_SAT">Mon-Sat</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowShiftTemplateModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" loading={mutationLoading}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showBulkAssignModal} onClose={() => setShowBulkAssignModal(false)} title="Bulk Assign Shifts">
        <form onSubmit={handleBulkAssign} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-graphite">Shift Template</label>
            <select required value={bulkAssignForm.shiftTemplateId} onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, shiftTemplateId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">Select template</option>
              {shiftTemplates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.startTime} - {t.endTime})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-graphite">Employees</label>
            <select multiple required value={bulkAssignForm.employeeIds} onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions, (o) => o.value);
              setBulkAssignForm({ ...bulkAssignForm, employeeIds: opts });
            }}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1" size={5}>
              {employees.filter((e) => e.isActive).map((e) => <option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</option>)}
            </select>
            <p className="text-caption text-slate mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>
          <Input label="Start Date" type="date" required value={bulkAssignForm.startDate} onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, startDate: e.target.value })} />
          <Input label="End Date" type="date" required value={bulkAssignForm.endDate} onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, endDate: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowBulkAssignModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" loading={mutationLoading}>Assign</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showInitBalanceModal} onClose={() => setShowInitBalanceModal(false)} title="Initialize Leave Balance">
        <form onSubmit={handleInitBalance} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-graphite">Employee</label>
            <select required value={initBalanceForm.employeeId} onChange={(e) => setInitBalanceForm({ ...initBalanceForm, employeeId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">Select employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
          </div>
          <Input label="Year" type="number" required value={initBalanceForm.year} onChange={(e) => setInitBalanceForm({ ...initBalanceForm, year: parseInt(e.target.value) || new Date().getFullYear() })} />
          <div>
            <label className="text-sm font-medium text-graphite">Leave Type</label>
            <select required value={initBalanceForm.leaveType} onChange={(e) => setInitBalanceForm({ ...initBalanceForm, leaveType: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              {LEAVE_TYPES.map((lt) => <option key={lt} value={lt}>{lt}</option>)}
            </select>
          </div>
          <Input label="Entitled Days" type="number" min="0" required value={initBalanceForm.entitled} onChange={(e) => setInitBalanceForm({ ...initBalanceForm, entitled: parseInt(e.target.value) || 0 })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowInitBalanceModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" loading={mutationLoading}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function DashboardTab({ dashboard, loading, employees, navigate, setTab }) {
  if (loading) {
    return <p className="text-body text-slate">Loading dashboard...</p>;
  }
  if (!dashboard) {
    return <p className="text-body text-slate text-center py-4">No dashboard data available</p>;
  }
  const stats = [
    { label: 'Total Employees', value: dashboard.totalEmployees ?? 0 },
    { label: 'Attendance Today', value: `${(dashboard.attendanceRate ?? 0).toFixed(1)}%` },
    { label: 'Pending Leaves', value: dashboard.pendingLeaves ?? 0 },
    { label: 'Recent Joinees', value: (dashboard.recentJoinees ?? []).length },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent>
              <p className="text-caption text-slate">{s.label}</p>
              <p className="text-heading-sm font-semibold text-obsidian mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(dashboard.departmentBreakdown ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Department Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-silver">
                    <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Department</th>
                    <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.departmentBreakdown ?? []).map((d, i) => (
                    <tr key={i} className="border-b border-silver/50">
                      <td className="px-3 py-3 text-body text-obsidian">{d.dept || d.department || 'Unknown'}</td>
                      <td className="px-3 py-3 text-body text-obsidian">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {(dashboard.upcomingBirthdays ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Birthdays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(dashboard.upcomingBirthdays ?? []).map((emp) => (
                <div key={emp.id} className="flex items-center justify-between p-3 border border-silver rounded-lg">
                  <span className="text-body text-obsidian">{emp.fullName}</span>
                  <span className="text-caption text-slate">{emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => { navigate('/hr'); setTab('employees'); }}>Add Employee</Button>
            <Button variant="secondary" onClick={() => { navigate('/hr'); setTab('payroll'); }}>Generate Payroll</Button>
            <Button variant="secondary" onClick={() => { navigate('/hr'); setTab('shifts'); }}>View Roster</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ShiftsTab({ shiftTemplates, loadingTemplates, rosterGrouped, rosterEmployees, loadingRoster, weekDates, weekOffset, setWeekOffset, onAddTemplate, onBulkAssign, onAssignCell, employees }) {
  const [assignCellModal, setAssignCellModal] = useState(null);
  const weekLabel = `${new Date(weekDates[0]).toLocaleDateString()} — ${new Date(weekDates[6]).toLocaleDateString()}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shift Templates</CardTitle>
            <Button size="sm" onClick={onAddTemplate}>Add Template</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTemplates ? (
            <p className="text-body text-slate">Loading templates...</p>
          ) : shiftTemplates.length === 0 ? (
            <p className="text-body text-slate text-center py-4">No shift templates found. Create one to get started.</p>
          ) : (
            <div className="space-y-2">
              {shiftTemplates.map((tmpl) => (
                <div key={tmpl.id} className="flex items-center gap-3 p-3 border border-silver rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-lilac-bloom" />
                  <div className="flex-1">
                    <p className="font-medium text-obsidian">{tmpl.name}</p>
                    <p className="text-caption text-slate">{tmpl.startTime} — {tmpl.endTime} ({tmpl.recurrence})</p>
                  </div>
                  <Badge variant={tmpl.isActive ? 'success' : 'danger'} size="sm">{tmpl.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button size="sm" variant="ghost" onClick={() => setWeekOffset(weekOffset - 1)}>&lt; Prev</Button>
              <CardTitle>{weekLabel}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setWeekOffset(weekOffset + 1)}>Next &gt;</Button>
            </div>
            <Button size="sm" onClick={onBulkAssign}>Bulk Assign</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRoster ? (
            <p className="text-body text-slate">Loading roster...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-silver">
                    <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide sticky left-0 bg-paper z-10 min-w-[180px]">Employee</th>
                    {weekDates.map((d, i) => (
                      <th key={d} className="px-3 py-2.5 text-center text-caption font-medium text-slate uppercase tracking-wide min-w-[120px]">
                        <div>{DAYS_OF_WEEK[i]}</div>
                        <div className="text-slate/70">{new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(rosterEmployees).map(([deptName, emps]) => (
                    <React.Fragment key={deptName}>
                      <tr className="bg-bone/50">
                        <td colSpan={8} className="px-3 py-2 text-caption font-semibold text-graphite uppercase">{deptName}</td>
                      </tr>
                      {emps.map((emp) => (
                        <tr key={emp.id} className="border-b border-silver/50">
                          <td className="px-3 py-2 text-body text-obsidian sticky left-0 bg-paper z-10">
                            <div className="font-medium">{emp.fullName}</div>
                            <div className="text-caption text-slate">{emp.employeeCode}</div>
                          </td>
                          {weekDates.map((d) => {
                            const shift = rosterGrouped[d]?.find((s) => s.employeeId === emp.id);
                            return (
                              <td key={d} className="px-2 py-2 text-center">
                                {shift ? (
                                  <div className="px-2 py-1 rounded bg-lilac-bloom/20 text-caption text-obsidian">
                                    {shift.shiftTemplate?.name || 'Shift'}
                                  </div>
                                ) : (
                                  <button
                                    className="px-2 py-1 rounded border border-dashed border-silver text-caption text-slate hover:border-lilac-bloom hover:text-lilac-bloom transition-colors"
                                    onClick={() => setAssignCellModal({ employeeId: emp.id, date: d })}
                                  >
                                    + Assign
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {Object.keys(rosterEmployees).length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-slate text-body">No active employees found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {assignCellModal && (
        <Modal open={!!assignCellModal} onClose={() => setAssignCellModal(null)} title="Assign Shift">
          <div className="space-y-4">
            <p className="text-body text-obsidian">
              Assign a shift for {employees.find((e) => e.id === assignCellModal.employeeId)?.fullName} on {new Date(assignCellModal.date).toLocaleDateString()}
            </p>
            <div className="space-y-2">
              {shiftTemplates.filter((t) => t.isActive).map((tmpl) => (
                <button
                  key={tmpl.id}
                  className="w-full text-left p-3 border border-silver rounded-lg hover:border-lilac-bloom transition-colors"
                  onClick={() => {
                    onAssignCell(assignCellModal.employeeId, assignCellModal.date, tmpl.id);
                    setAssignCellModal(null);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-lilac-bloom" />
                    <span className="font-medium text-obsidian">{tmpl.name}</span>
                  </div>
                  <p className="text-caption text-slate ml-5">{tmpl.startTime} — {tmpl.endTime}</p>
                </button>
              ))}
              {shiftTemplates.filter((t) => t.isActive).length === 0 && (
                <p className="text-body text-slate text-center py-4">No active shift templates. Create one first.</p>
              )}
            </div>
            <Button variant="secondary" onClick={() => setAssignCellModal(null)} className="w-full">Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LeaveBalancesSection({ leaveBalances, loading, employees, leaveBalanceYear, setLeaveBalanceYear, leaveBalanceEmpId, setLeaveBalanceEmpId, onInitBalance }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={leaveBalanceYear} onChange={(e) => setLeaveBalanceYear(Number(e.target.value))}
          className="px-3 py-1.5 bg-paper border border-silver rounded-lg text-caption text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={leaveBalanceEmpId} onChange={(e) => setLeaveBalanceEmpId(e.target.value)}
          className="px-3 py-1.5 bg-paper border border-silver rounded-lg text-caption text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
          <option value="">All Employees</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
        </select>
        <Button size="sm" onClick={onInitBalance}>Initialize Balances</Button>
      </div>

      {loading ? (
        <p className="text-body text-slate">Loading balances...</p>
      ) : leaveBalances.length === 0 ? (
        <p className="text-body text-slate text-center py-4">No leave balances found for this period</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-silver">
                <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Employee</th>
                <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Leave Type</th>
                <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Entitled</th>
                <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Used</th>
                <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {leaveBalances.map((bal) => {
                const emp = employees.find((e) => e.id === bal.employeeId);
                const remaining = (bal.entitled || 0) + (bal.carried || 0) - (bal.used || 0);
                return (
                  <tr key={bal.id} className="border-b border-silver/50">
                    <td className="px-3 py-3 text-body text-obsidian">{emp?.fullName || bal.employeeId}</td>
                    <td className="px-3 py-3 text-body text-obsidian">{bal.leaveType}</td>
                    <td className="px-3 py-3 text-body text-obsidian">{bal.entitled}</td>
                    <td className="px-3 py-3 text-body text-obsidian">{bal.used}</td>
                    <td className="px-3 py-3">
                      <Badge variant={remaining > 0 ? 'success' : remaining === 0 ? 'warning' : 'danger'}>{remaining}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useHREmployees, useHRPayroll, useHRLeaves, useUpdatePayrollStatus, useUpdateLeaveStatus, hrKeys } from '../../hooks/queries/useHR';
import { useDepartments } from '../../hooks/queries/useAdmin';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';

const POSITIONS = ['Doctor', 'Nurse', 'Technician', 'Administrator', 'Accountant', 'Receptionist', 'Pharmacist', 'Security', 'Housekeeping', 'Other'];

const employeeColumns = [
  { key: 'employeeCode', header: 'Code' },
  { key: 'fullName', header: 'Name' },
  { key: 'gender', header: 'Gender', render: (v) => v === 'MALE' ? 'Male' : v === 'FEMALE' ? 'Female' : '-' },
  { key: 'position', header: 'Position' },
  { key: 'dept', header: 'Dept', render: (v) => v?.name || '-' },
  { key: 'baseSalary', header: 'Salary', render: (v) => `$${Number(v).toFixed(2)}` },
  { key: 'isActive', header: 'Status', render: (v) => <Badge variant={v ? 'success' : 'danger'}>{v ? 'Active' : 'Inactive'}</Badge> },
];

export default function HRPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('employees');
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [empForm, setEmpForm] = useState({ employeeCode: '', fullName: '', phone: '', email: '', gender: '', position: '', department: '', departmentId: '', baseSalary: 0, hireDate: '' });
  const [payForm, setPayForm] = useState({ employeeId: '', period: '', grossPay: 0, deductions: 0, notes: '' });
  const [leaveForm, setLeaveForm] = useState({ employeeId: '', type: 'ANNUAL', startDate: '', endDate: '', reason: '' });

  const { data: employees = [], isLoading: loadingEmp } = useHREmployees();
  const { data: payroll = [], isLoading: loadingPay } = useHRPayroll();
  const { data: leaves = [], isLoading: loadingLeave } = useHRLeaves();
  const { data: departments = [] } = useDepartments();
  const updatePayrollStatus = useUpdatePayrollStatus();
  const updateLeaveStatus = useUpdateLeaveStatus();

  const loading = loadingEmp || loadingPay || loadingLeave;

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hr/employees', empForm);
      setShowEmpModal(false);
      setEmpForm({ employeeCode: '', fullName: '', phone: '', email: '', gender: '', position: '', department: '', departmentId: '', baseSalary: 0, hireDate: '' });
      queryClient.invalidateQueries({ queryKey: hrKeys.employees });
    } catch (err) {
      alert(err.message || 'Failed to create employee');
    }
  };

  const handleCreatePayroll = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hr/payroll', payForm);
      setShowPayrollModal(false);
      setPayForm({ employeeId: '', period: '', grossPay: 0, deductions: 0, notes: '' });
      queryClient.invalidateQueries({ queryKey: hrKeys.payroll });
    } catch (err) {
      alert(err.message || 'Failed to create payroll record');
    }
  };

  const handlePayrollStatus = async (id, status) => {
    try {
      await updatePayrollStatus.mutateAsync({ id, status });
    } catch (err) {
      alert(err.message || 'Failed to update payroll status');
    }
  };

  const handleCreateLeave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hr/leaves', leaveForm);
      setShowLeaveModal(false);
      setLeaveForm({ employeeId: '', type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: hrKeys.leaves });
    } catch (err) {
      alert(err.message || 'Failed to create leave request');
    }
  };

  const handleLeaveStatus = async (id, status) => {
    try {
      await updateLeaveStatus.mutateAsync({ id, status });
    } catch (err) {
      alert(err.message || 'Failed to update leave status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">HR & Payroll</h1>
          <p className="text-body text-slate mt-1">Employee management, payroll processing, attendance & leave tracking</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2">
        <Button variant={tab === 'employees' ? 'primary' : 'secondary'} onClick={() => setTab('employees')}>Employees</Button>
        <Button variant={tab === 'payroll' ? 'primary' : 'secondary'} onClick={() => setTab('payroll')}>Payroll</Button>
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
                      <p className="text-caption text-slate">{rec.period} — Gross: ${Number(rec.grossPay).toFixed(2)} / Net: ${Number(rec.netPay).toFixed(2)}</p>
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
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">-- Select --</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-graphite">Position *</label>
            <select required value={empForm.position} onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
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
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">-- Select Department --</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.type})</option>)}
            </select>
          </div>
          <Input label="Base Salary" type="number" min="0" step="0.01" value={empForm.baseSalary} onChange={(e) => setEmpForm({ ...empForm, baseSalary: parseFloat(e.target.value) || 0 })} />
          <Input label="Hire Date" type="date" required value={empForm.hireDate} onChange={(e) => setEmpForm({ ...empForm, hireDate: e.target.value })} />
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
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
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
            <Button type="submit" className="flex-1">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="New Leave Request">
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-graphite">Employee</label>
            <select required value={leaveForm.employeeId} onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">Select employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-graphite">Leave Type</label>
            <select required value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
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
    </div>
  );
}

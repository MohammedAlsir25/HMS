import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { notifySuccess, notifyError } from '../../utils/notify';
import { api } from '../../lib/api';
import { useHREmployeeDetail, useHRAttendance, useHRLeaves, useHRPayroll, hrKeys } from '../../hooks/queries/useHR';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [detailTab, setDetailTab] = useState('profile');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const { data: employee, isLoading: loadingEmp, error: errorEmp } = useHREmployeeDetail(id);
  const { data: attendanceRecords = [], isLoading: loadingAtt } = useHRAttendance({ employeeId: id });
  const { data: leaves = [], isLoading: loadingLeaves } = useHRLeaves();
  const { data: payroll = [], isLoading: loadingPayroll } = useHRPayroll();

  const empLeaves = leaves.filter((l) => l.employeeId === id);
  const empPayroll = payroll.filter((p) => p.employeeId === id);

  if (loadingEmp) {
    return (
      <div className="space-y-6">
        <p className="text-body text-slate">Loading employee...</p>
      </div>
    );
  }

  if (errorEmp || !employee) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3">
          <span className="text-sm text-red-700 dark:text-red-300">{errorEmp?.message || 'Employee not found'}</span>
        </div>
        <Button variant="secondary" onClick={() => navigate('/hr')}>Back to HR</Button>
      </div>
    );
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setMutationError('');
    setMutationLoading(true);
    try {
      await api.patch(`/hr/employees/${editData.id}`, {
        fullName: editData.fullName,
        phone: editData.phone || '',
        email: editData.email || '',
        gender: editData.gender || '',
        position: editData.position,
        departmentId: editData.departmentId || '',
        baseSalary: editData.baseSalary,
        isActive: editData.isActive,
      });
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: hrKeys.employeeDetail(id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.employees });
      notifySuccess('Employee updated');
    } catch (err) {
      setMutationError(err.message || 'Failed to update employee');
    } finally {
      setMutationLoading(false);
    }
  };

  const detailTabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'leaves', label: 'Leaves' },
    { key: 'payslips', label: 'Payslips' },
    { key: 'documents', label: 'Documents' },
  ];

  return (
    <div className="space-y-6">
      {mutationError && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3 flex items-start gap-2 mb-4">
          <span className="text-sm text-red-700 dark:text-red-300 flex-1">{mutationError}</span>
          <button onClick={() => setMutationError('')} className="text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/hr')}>Back</Button>
            <h1 className="text-heading-sm font-semibold text-obsidian">{employee.fullName}</h1>
            <Badge variant={employee.isActive ? 'success' : 'danger'}>{employee.isActive ? 'Active' : 'Inactive'}</Badge>
          </div>
          <p className="text-body text-slate mt-1">{employee.employeeCode} — {employee.position} — {employee.dept?.name || employee.department || '-'}</p>
        </div>
        <Button onClick={() => { setEditData({ ...employee }); setShowEditModal(true); }}>Edit</Button>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2 overflow-x-auto">
        {detailTabs.map((t) => (
          <Button key={t.key} variant={detailTab === t.key ? 'primary' : 'secondary'} onClick={() => setDetailTab(t.key)}>{t.label}</Button>
        ))}
      </div>

      {detailTab === 'profile' && (
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-subheading font-medium text-obsidian">Personal Information</h4>
                <div className="space-y-2">
                  <InfoRow label="Full Name" value={employee.fullName} />
                  <InfoRow label="Employee Code" value={employee.employeeCode} />
                  <InfoRow label="Gender" value={employee.gender === 'MALE' ? 'Male' : employee.gender === 'FEMALE' ? 'Female' : '-'} />
                  <InfoRow label="Phone" value={employee.phone || '-'} />
                  <InfoRow label="Email" value={employee.email || '-'} />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-subheading font-medium text-obsidian">Position Details</h4>
                <div className="space-y-2">
                  <InfoRow label="Position" value={employee.position} />
                  <InfoRow label="Department" value={employee.dept?.name || employee.department || '-'} />
                  <InfoRow label="Base Salary" value={`${Number(employee.baseSalary).toFixed(2)} SDG`} />
                  <InfoRow label="Hire Date" value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'} />
                  <InfoRow label="Status" value={employee.isActive ? 'Active' : 'Inactive'} />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-subheading font-medium text-obsidian">Emergency Contact</h4>
                <div className="space-y-2">
                  {employee.emergencyContact ? (
                    <>
                      <InfoRow label="Name" value={employee.emergencyContact.name || '-'} />
                      <InfoRow label="Phone" value={employee.emergencyContact.phone || '-'} />
                      <InfoRow label="Relationship" value={employee.emergencyContact.relationship || '-'} />
                    </>
                  ) : (
                    <p className="text-caption text-slate">No emergency contact on file</p>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-subheading font-medium text-obsidian">User Account</h4>
                <div className="space-y-2">
                  {employee.user ? (
                    <>
                      <InfoRow label="Email" value={employee.user.email || '-'} />
                      <InfoRow label="Role" value={employee.user.role?.name || '-'} />
                    </>
                  ) : (
                    <p className="text-caption text-slate">No linked user account</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {detailTab === 'attendance' && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAtt ? (
              <p className="text-body text-slate">Loading attendance...</p>
            ) : attendanceRecords.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No attendance records found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-silver">
                      <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Date</th>
                      <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Check-In</th>
                      <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Check-Out</th>
                      <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Status</th>
                      <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((rec) => (
                      <tr key={rec.id} className="border-b border-silver/50">
                        <td className="px-3 py-3 text-body text-obsidian">{new Date(rec.date).toLocaleDateString()}</td>
                        <td className="px-3 py-3 text-body text-obsidian">
                          {rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-3 py-3 text-body text-obsidian">
                          {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={rec.status === 'PRESENT' ? 'success' : rec.status === 'ABSENT' ? 'danger' : rec.status === 'LATE' ? 'warning' : 'default'}>
                            {rec.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-caption text-slate">{rec.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {detailTab === 'leaves' && (
        <Card>
          <CardHeader>
            <CardTitle>Leave History</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLeaves ? (
              <p className="text-body text-slate">Loading leaves...</p>
            ) : empLeaves.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No leave requests found</p>
            ) : (
              <div className="space-y-3">
                {empLeaves.map((leave) => (
                  <div key={leave.id} className="p-4 border border-silver rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-obsidian">{leave.type}</p>
                      <p className="text-caption text-slate">{new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}</p>
                      {leave.reason && <p className="text-caption text-slate">{leave.reason}</p>}
                    </div>
                    <Badge variant={leave.status === 'APPROVED' ? 'success' : leave.status === 'PENDING' ? 'warning' : 'danger'}>{leave.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {detailTab === 'payslips' && (
        <Card>
          <CardHeader>
            <CardTitle>Payroll History</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPayroll ? (
              <p className="text-body text-slate">Loading payroll...</p>
            ) : empPayroll.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No payroll records found</p>
            ) : (
              <div className="space-y-3">
                {empPayroll.map((rec) => (
                  <div key={rec.id} className="p-4 border border-silver rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-obsidian">{rec.period}</p>
                      <p className="text-caption text-slate">Gross: {Number(rec.grossPay).toFixed(2)} SDG — Net: {Number(rec.netPay).toFixed(2)} SDG</p>
                    </div>
                    <Badge variant={rec.status === 'PAID' ? 'success' : rec.status === 'DRAFT' ? 'warning' : 'danger'}>{rec.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {detailTab === 'documents' && (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {employee.documents && Array.isArray(employee.documents) && employee.documents.length > 0 ? (
              <div className="space-y-3">
                {employee.documents.map((doc, idx) => (
                  <div key={idx} className="p-4 border border-silver rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-obsidian">{doc.name}</p>
                      <p className="text-caption text-slate">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}</p>
                    </div>
                    {doc.url && (
                      <Button size="sm" variant="ghost" onClick={() => window.open(doc.url, '_blank')}>View</Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body text-slate text-center py-4">No documents uploaded</p>
            )}
          </CardContent>
        </Card>
      )}

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Employee">
        {editData && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input label="Full Name" required value={editData.fullName} onChange={(e) => setEditData({ ...editData, fullName: e.target.value })} />
            <Input label="Phone" value={editData.phone || ''} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
            <Input label="Email" type="email" value={editData.email || ''} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
            <div>
              <label className="text-sm font-medium text-graphite">Gender</label>
              <select value={editData.gender || ''} onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
                <option value="">--</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <Input label="Position" required value={editData.position} onChange={(e) => setEditData({ ...editData, position: e.target.value })} />
            <Input label="Base Salary" type="number" min="0" step="0.01" value={editData.baseSalary} onChange={(e) => setEditData({ ...editData, baseSalary: parseFloat(e.target.value) || 0 })} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="editIsActiveDetail" checked={editData.isActive} onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-silver text-lilac-bloom focus:ring-lilac-bloom" />
              <label htmlFor="editIsActiveDetail" className="text-sm font-medium text-graphite cursor-pointer">Active</label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" loading={mutationLoading}>Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-caption text-slate min-w-[120px]">{label}</span>
      <span className="text-body text-obsidian">{value}</span>
    </div>
  );
}

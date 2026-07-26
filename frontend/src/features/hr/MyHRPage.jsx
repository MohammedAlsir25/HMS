import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notifySuccess, notifyError } from '../../utils/notify';
import { useMyProfile, useMyAttendance, useMyLeaves, useSubmitMyLeave, useMyPayroll } from '../../hooks/queries/useHR';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Printer } from 'lucide-react';

export default function MyHRPage() {
  const queryClient = useQueryClient();
  const [selfTab, setSelfTab] = useState('profile');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });

  const { data: profile, isLoading: loadingProfile, error: errorProfile } = useMyProfile();
  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1);
  const [attYear, setAttYear] = useState(new Date().getFullYear());
  const { data: attendance = [], isLoading: loadingAtt } = useMyAttendance({ month: attMonth, year: attYear });
  const { data: leaves = [], isLoading: loadingLeaves } = useMyLeaves();
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const { data: payroll = [], isLoading: loadingPayroll } = useMyPayroll({ year: payYear });
  const submitLeave = useSubmitMyLeave();

  const selfTabs = [
    { key: 'profile', label: 'My Profile' },
    { key: 'attendance', label: 'My Attendance' },
    { key: 'leaves', label: 'My Leaves' },
    { key: 'payslips', label: 'My Payslips' },
  ];

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    try {
      await submitLeave.mutateAsync(leaveForm);
      setShowLeaveModal(false);
      setLeaveForm({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      notifySuccess('Leave request submitted');
    } catch (err) {
      notifyError(err);
    }
  };

  if (loadingProfile) {
    return (
      <div className="space-y-6">
        <p className="text-body text-slate">Loading your profile...</p>
      </div>
    );
  }

  if (errorProfile || !profile) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3">
          <span className="text-sm text-red-700 dark:text-red-300">{errorProfile?.message || 'No employee profile linked to your account'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-sm font-semibold text-obsidian">My HR Portal</h1>
        <p className="text-body text-slate mt-1">View your information, attendance, leaves, and payslips</p>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2 overflow-x-auto">
        {selfTabs.map((t) => (
          <Button key={t.key} variant={selfTab === t.key ? 'primary' : 'secondary'} onClick={() => setSelfTab(t.key)}>{t.label}</Button>
        ))}
      </div>

      {selfTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-subheading font-medium text-obsidian">Personal Information</h4>
                <div className="space-y-2">
                  <InfoRow label="Full Name" value={profile.fullName} />
                  <InfoRow label="Employee Code" value={profile.employeeCode} />
                  <InfoRow label="Gender" value={profile.gender === 'MALE' ? 'Male' : profile.gender === 'FEMALE' ? 'Female' : '-'} />
                  <InfoRow label="Phone" value={profile.phone || '-'} />
                  <InfoRow label="Email" value={profile.email || '-'} />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-subheading font-medium text-obsidian">Position Details</h4>
                <div className="space-y-2">
                  <InfoRow label="Position" value={profile.position} />
                  <InfoRow label="Department" value={profile.dept?.name || profile.department || '-'} />
                  <InfoRow label="Base Salary" value={`${Number(profile.baseSalary).toFixed(2)} SDG`} />
                  <InfoRow label="Hire Date" value={profile.hireDate ? new Date(profile.hireDate).toLocaleDateString() : '-'} />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-subheading font-medium text-obsidian">Emergency Contact</h4>
                {profile.emergencyContact ? (
                  <div className="space-y-2">
                    <InfoRow label="Name" value={profile.emergencyContact.name || '-'} />
                    <InfoRow label="Phone" value={profile.emergencyContact.phone || '-'} />
                    <InfoRow label="Relationship" value={profile.emergencyContact.relationship || '-'} />
                  </div>
                ) : (
                  <p className="text-caption text-slate">No emergency contact on file</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selfTab === 'attendance' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>My Attendance</CardTitle>
              <div className="flex gap-2">
                <select value={attMonth} onChange={(e) => setAttMonth(Number(e.target.value))}
                  className="px-3 py-1.5 bg-paper border border-silver rounded-lg text-caption text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                    <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('en', { month: 'long' })}</option>
                  ))}
                </select>
                <select value={attYear} onChange={(e) => setAttYear(Number(e.target.value))}
                  className="px-3 py-1.5 bg-paper border border-silver rounded-lg text-caption text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAtt ? (
              <p className="text-body text-slate">Loading attendance...</p>
            ) : attendance.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No attendance records for this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-silver">
                      <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Date</th>
                      <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Check-In</th>
                      <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Check-Out</th>
                      <th className="px-3 py-2.5 text-left text-caption font-medium text-slate uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((rec) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selfTab === 'leaves' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Leaves</CardTitle>
              <Button onClick={() => setShowLeaveModal(true)}>Submit Leave</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLeaves ? (
              <p className="text-body text-slate">Loading leaves...</p>
            ) : leaves.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No leave requests found</p>
            ) : (
              <div className="space-y-3">
                {leaves.map((leave) => (
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

      {selfTab === 'payslips' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>My Payslips</CardTitle>
              <select value={payYear} onChange={(e) => setPayYear(Number(e.target.value))}
                className="px-3 py-1.5 bg-paper border border-silver rounded-lg text-caption text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPayroll ? (
              <p className="text-body text-slate">Loading payslips...</p>
            ) : payroll.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No payslips found for this period</p>
            ) : (
              <div className="space-y-3">
                {payroll.map((rec) => (
                  <div key={rec.id} className="p-4 border border-silver rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-obsidian">{rec.period}</p>
                      <p className="text-caption text-slate">Gross: {Number(rec.grossPay).toFixed(2)} SDG — Net: {Number(rec.netPay).toFixed(2)} SDG</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button size="sm" variant="secondary" onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (!printWindow) return;
                        const allowances = rec.allowances ? Object.entries(rec.allowances).filter(([, v]) => v > 0).map(([k, v]) => `<tr><td style="border:1px solid #333;padding:4px 8px;text-transform:capitalize;">${k.replace(/([A-Z])/g, ' $1')}</td><td style="border:1px solid #333;padding:4px 8px;text-align:right;">${Number(v).toFixed(2)} SDG</td></tr>`).join('') : '';
                        const deductions = rec.deductions ? Object.entries(rec.deductions).filter(([, v]) => v > 0).map(([k, v]) => `<tr><td style="border:1px solid #333;padding:4px 8px;text-transform:capitalize;">${k.replace(/([A-Z])/g, ' $1')}</td><td style="border:1px solid #333;padding:4px 8px;text-align:right;">${Number(v).toFixed(2)} SDG</td></tr>`).join('') : '';
                        printWindow.document.write(`
                          <html><head><title>Payslip - ${rec.period}</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 2cm; font-size: 12pt; }
                            h1 { font-size: 18pt; margin-bottom: 0.5cm; }
                            h2 { font-size: 14pt; margin-top: 1cm; border-bottom: 1px solid #999; padding-bottom: 0.2cm; }
                            .header { text-align: center; margin-bottom: 1cm; border-bottom: 2px solid #333; padding-bottom: 0.5cm; }
                            .field { margin: 0.3cm 0; }
                            .field label { font-weight: bold; display: inline-block; min-width: 5cm; }
                            table { width: 100%; border-collapse: collapse; margin: 0.3cm 0; }
                            th, td { border: 1px solid #333; padding: 4px 8px; text-align: left; font-size: 11pt; }
                            th { background: #f0f0f0; }
                            .total { font-weight: bold; background: #f0f0f0; }
                            .footer { margin-top: 2cm; font-size: 10pt; color: #666; text-align: center; border-top: 1px solid #999; padding-top: 0.5cm; }
                          </style></head><body>
                            <div class="header"><h1>Payslip</h1><p>${rec.period}</p></div>
                            <div class="field"><label>Employee:</label> ${profile?.fullName || '-'}</div>
                            <div class="field"><label>Position:</label> ${profile?.position || '-'}</div>
                            <div class="field"><label>Department:</label> ${profile?.dept?.name || profile?.department || '-'}</div>
                            <div class="field"><label>Status:</label> ${rec.status}</div>
                            <h2>Earnings</h2>
                            <div class="field"><label>Base Salary:</label> ${Number(profile?.baseSalary || 0).toFixed(2)} SDG</div>
                            ${allowances ? `<table><thead><tr><th>Allowance</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${allowances}</tbody></table>` : ''}
                            <h2>Deductions</h2>
                            ${deductions ? `<table><thead><tr><th>Deduction</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${deductions}</tbody></table>` : '<p>No deductions.</p>'}
                            <table style="margin-top:1cm;">
                              <tr class="total"><td style="padding:6px 8px;">Gross Pay</td><td style="text-align:right;padding:6px 8px;">${Number(rec.grossPay).toFixed(2)} SDG</td></tr>
                              <tr class="total"><td style="padding:6px 8px;">Net Pay</td><td style="text-align:right;padding:6px 8px;">${Number(rec.netPay).toFixed(2)} SDG</td></tr>
                            </table>
                            <div class="footer">HMS — Employee Payslip</div>
                          </body></html>
                        `);
                        printWindow.document.close();
                        printWindow.focus();
                        printWindow.print();
                      }}>Print</Button>
                      <Badge variant={rec.status === 'PAID' ? 'success' : rec.status === 'DRAFT' ? 'warning' : 'danger'}>{rec.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Modal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Submit Leave Request">
        <form onSubmit={handleSubmitLeave} className="space-y-4">
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
            <Button type="submit" className="flex-1" loading={submitLeave.isPending}>Submit</Button>
          </div>
        </form>
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

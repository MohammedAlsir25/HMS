import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarPlus } from 'lucide-react';
import { useClinics } from '../../hooks/queries/useClinics';
import { useAppointmentsCalendar } from '../../hooks/queries/useAppointments';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import AppointmentModal from './AppointmentModal';

const statusColors = {
  WAITING: 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200',
  CALLED: 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-200',
  IN_PROGRESS: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200',
  COMPLETED: 'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-800/30 dark:border-gray-700 dark:text-gray-400',
  CANCELLED: 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200',
  RESERVED: 'bg-lilac-bloom/20 border-lilac-bloom text-obsidian',
  SCHEDULED: 'bg-lilac-bloom/20 border-lilac-bloom text-obsidian',
  NO_SHOW: 'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-800/30 dark:border-gray-700 dark:text-gray-400',
};

const statusVariant = {
  WAITING: 'warning',
  CALLED: 'info',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  RESERVED: 'info',
  SCHEDULED: 'info',
  NO_SHOW: 'danger',
};

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDateShort(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDaysInMonthGrid(date) {
  const first = startOfMonth(date);
  const last = endOfMonth(date);
  const gridStart = startOfWeek(first);
  const days = [];
  const current = new Date(gridStart);
  while (current <= last || days.length % 7 !== 0) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
    if (days.length > 42) break;
  }
  return days;
}

export default function AppointmentCalendar() {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClinic, setSelectedClinic] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: clinics = [] } = useClinics();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridDays = getDaysInMonthGrid(currentDate);

  const { data: appointments = [], isLoading, isError, refetch } = useAppointmentsCalendar({
    startDate: monthStart.toISOString(),
    endDate: monthEnd.toISOString(),
    clinicId: selectedClinic || undefined,
  });

  const appointmentsByDay = useMemo(() => {
    const map = {};
    for (const appt of appointments) {
      const date = appt.scheduledAt ? new Date(appt.scheduledAt) : null;
      if (!date) continue;
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(appt);
    }
    return map;
  }, [appointments]);

  const dayAppointments = useMemo(() => {
    if (!selectedDay) return [];
    const key = `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`;
    return appointmentsByDay[key] || [];
  }, [selectedDay, appointmentsByDay]);

  const goToPrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const goToNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };

  const isCurrentMonth = (date) => date.getMonth() === currentDate.getMonth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('appointments.title', 'Appointments')}</h1>
          <p className="text-body text-slate mt-1">{t('appointments.description', 'View and manage scheduled appointments')}</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="self-start">
          <CalendarPlus size={16} />
          {t('appointments.newAppointment', 'New Appointment')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-paper border border-silver rounded-xl p-4">
        <div className="flex items-center gap-3">
          <button onClick={goToPrevMonth} className="touch-target flex items-center justify-center rounded-lg text-slate hover:text-obsidian hover:bg-bone transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-subheading font-medium text-obsidian min-w-[180px] text-center">{formatMonthYear(currentDate)}</h2>
          <button onClick={goToNextMonth} className="touch-target flex items-center justify-center rounded-lg text-slate hover:text-obsidian hover:bg-bone transition-colors">
            <ChevronRight size={20} />
          </button>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            <CalendarDays size={14} />
            Today
          </Button>
        </div>
        <select
          value={selectedClinic}
          onChange={(e) => setSelectedClinic(e.target.value)}
          className="px-3 py-2.5 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:border-transparent"
        >
          <option value="">All Clinics</option>
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-body text-red-500">Failed to load appointments</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="grid grid-cols-7 gap-px bg-silver rounded-xl overflow-hidden border border-silver">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="bg-bone px-2 py-2 text-caption font-medium text-graphite text-center">{day}</div>
              ))}
              {gridDays.map((day, i) => {
                const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                const dayAppts = appointmentsByDay[key] || [];
                const count = dayAppts.length;
                const inMonth = isCurrentMonth(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDay && isSameDay(day, selectedDay);

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(day)}
                    className={`relative bg-paper min-h-[80px] p-2 text-left transition-colors
                      ${!inMonth ? 'opacity-40' : ''}
                      ${isSelected ? 'ring-2 ring-lilac-bloom ring-inset z-10' : ''}
                      ${isToday && !isSelected ? 'bg-lilac-bloom/5' : ''}
                      hover:bg-bone/50`}
                  >
                    <div className="flex items-start justify-between">
                      <span className={`text-caption font-medium ${isToday ? 'text-lilac-bloom font-bold' : 'text-graphite'}`}>
                        {day.getDate()}
                      </span>
                      {count > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-lilac-bloom text-obsidian text-[10px] font-bold">
                          {count}
                        </span>
                      )}
                    </div>
                    {inMonth && count > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dayAppts.slice(0, 2).map((appt) => (
                          <div
                            key={appt.id}
                            className={`text-[10px] leading-tight truncate px-1 py-0.5 rounded border ${statusColors[appt.status] || statusColors.WAITING}`}
                          >
                            {String(appt.token).padStart(3, '0')} · {appt.patient?.fullName}
                          </div>
                        ))}
                        {count > 2 && (
                          <span className="text-[10px] text-slate">+{count - 2} more</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-paper border border-silver rounded-xl p-4">
              <h3 className="text-subheading font-medium text-obsidian mb-3">
                {selectedDay ? formatDateShort(selectedDay) : 'Select a day'}
              </h3>
              {selectedDay && dayAppointments.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-caption text-slate">No appointments this day</p>
                  <Button variant="ghost" size="sm" onClick={() => setShowModal(true)} className="mt-2">
                    <CalendarPlus size={14} />
                    Create
                  </Button>
                </div>
              )}
              {selectedDay && dayAppointments.length > 0 && (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {dayAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className={`rounded-xl border p-3 ${statusColors[appt.status] || statusColors.WAITING}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-body font-bold text-obsidian">
                          #{String(appt.token).padStart(3, '0')}
                        </span>
                        <Badge variant={statusVariant[appt.status] || 'default'} size="sm">
                          {appt.status}
                        </Badge>
                      </div>
                      <p className="text-caption font-medium text-obsidian truncate">{appt.patient?.fullName}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate mt-1">
                        <span>{appt.clinic?.name}</span>
                        {appt.scheduledAt && (
                          <span>{new Date(appt.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                      {appt.doctor && (
                        <p className="text-[11px] text-slate">Dr. {appt.doctor.fullName}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!selectedDay && (
                <p className="text-caption text-slate text-center py-8">Click a day to view appointments</p>
              )}
            </div>
          </div>
        </div>
      )}

      <AppointmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        defaultClinicId={selectedClinic}
      />
    </div>
  );
}

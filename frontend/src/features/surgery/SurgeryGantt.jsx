import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useSurgeries,
  useUpdateSurgeryStatus,
  useCreateFollowUp,
  useSurgeryNotes,
  useCreateSurgeryNote,
  useSurgeryTeam,
  useAddTeamMember,
  useRemoveTeamMember,
  useOrRoles,
  useSurgeryEvents,
  useAddSurgeryEvent,
  useEventTypes,
  useSurgeryFollowUpDetails,
  useUpdateFollowUpStatus,
} from '../../hooks/queries/useSurgery';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import SurgeryPrintReport from './SurgeryPrintReport';

const OR_ROOMS = [1, 2, 3, 4, 5];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

const statusColors = {
  SCHEDULED: { bg: 'bg-lilac-bloom/30', border: 'border-lilac-bloom', label: 'bg-lilac-bloom text-obsidian' },
  PREP: { bg: 'bg-amber-100 dark:bg-amber-900', border: 'border-amber-300 dark:border-amber-700', label: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  IN_SURGERY: { bg: 'bg-green-100 dark:bg-green-900', border: 'border-green-300 dark:border-green-700', label: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  RECOVERY: { bg: 'bg-purple-100 dark:bg-purple-900', border: 'border-purple-300 dark:border-purple-700', label: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  CANCELLED: { bg: 'bg-red-100 dark:bg-red-900', border: 'border-red-300 dark:border-red-700', label: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const statusFlow = {
  SCHEDULED: 'PREP',
  PREP: 'IN_SURGERY',
  IN_SURGERY: 'RECOVERY',
  RECOVERY: 'COMPLETED',
};

function toMins(d) {
  return d.getHours() * 60 + d.getMinutes();
}

export default function SurgeryGantt() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [selectedSurgery, setSelectedSurgery] = useState(null);

  const navigate = useNavigate();
  const { data: surgeries = [], isLoading, isError } = useSurgeries(date);
  const [followUpModal, setFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [notesModal, setNotesModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [printData, setPrintData] = useState(null);
  const [detailTab, setDetailTab] = useState('status');

  const [teamName, setTeamName] = useState('');
  const [teamRoleId, setTeamRoleId] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');

  const { data: notes = [] } = useSurgeryNotes(selectedSurgery?.id);
  const createNote = useCreateSurgeryNote();
  const updateStatus = useUpdateSurgeryStatus();
  const createFollowUp = useCreateFollowUp();

  const { data: team = [], isLoading: loadingTeam } = useSurgeryTeam(selectedSurgery?.id);
  const addTeamMember = useAddTeamMember();
  const removeTeamMember = useRemoveTeamMember();
  const { data: orRoles = [] } = useOrRoles();

  const { data: events = [], isLoading: loadingEvents } = useSurgeryEvents(selectedSurgery?.id);
  const addEvent = useAddSurgeryEvent();
  const { data: eventTypes = [] } = useEventTypes();

  const { data: followUps = [], isLoading: loadingFollowUps } = useSurgeryFollowUpDetails(
    selectedSurgery?.id ? { surgeryId: selectedSurgery.id } : {}
  );
  const updateFollowUp = useUpdateFollowUpStatus();

  const handleStatusChange = (id, status) => {
    updateStatus.mutate({ id, status });
  };

  const handleScheduleFollowUp = () => {
    if (!selectedSurgery || !followUpDate) return;
    createFollowUp.mutate({
      surgeryId: selectedSurgery.id,
      scheduledAt: followUpDate,
      notes: followUpNotes,
    }, {
      onSuccess: () => {
        setFollowUpModal(false);
        setFollowUpDate('');
        setFollowUpNotes('');
      },
    });
  };

  const handleAddTeamMember = () => {
    if (!selectedSurgery || !teamName.trim() || !teamRoleId) return;
    addTeamMember.mutate(
      { surgeryId: selectedSurgery.id, name: teamName.trim(), roleId: teamRoleId },
      { onSuccess: () => { setTeamName(''); setTeamRoleId(''); } }
    );
  };

  const handleRemoveTeamMember = (memberId) => {
    if (!selectedSurgery) return;
    removeTeamMember.mutate({ surgeryId: selectedSurgery.id, memberId });
  };

  const handleAddEvent = () => {
    if (!selectedSurgery || !eventName) return;
    addEvent.mutate(
      { surgeryId: selectedSurgery.id, eventTypeId: eventName, description: eventDesc || undefined },
      { onSuccess: () => { setEventName(''); setEventDesc(''); } }
    );
  };

  const handleFollowUpStatus = (followUpId, status) => {
    updateFollowUp.mutate({ id: followUpId, status });
  };

  const ganttStart = 7 * 60;
  const ganttEnd = 21 * 60;
  const totalMins = ganttEnd - ganttStart;

  const byRoom = {};
  OR_ROOMS.forEach((r) => { byRoom[r] = []; });
  surgeries.forEach((s) => {
    if (byRoom[s.orRoom]) byRoom[s.orRoom].push(s);
  });

  if (isLoading) {
    return (
      <div className="space-y-6" data-tour="surgery-gantt">
        <div className="flex items-center justify-between">
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('surgery.title')}</h1>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((r) => (
            <div key={r} className="flex mb-2">
              <div className="w-[120px] shrink-0 px-3">
                <div className="h-5 w-16 bg-bone rounded animate-pulse" />
              </div>
              <div className="flex-1 h-20 bg-bone/50 rounded-lg border border-silver/30 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6" data-tour="surgery-gantt">
        <div className="flex items-center justify-between">
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('surgery.title')}</h1>
        </div>
        <Card>
          <CardContent>
            <p className="text-body text-red-600 text-center py-8" role="alert">{t('surgery.gantt.loadError')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-tour="surgery-gantt">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('surgery.title')}</h1>
          <p className="text-body text-slate mt-1">{t('surgery.gantt.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="surgery-date" className="text-sm font-medium text-graphite">{t('surgery.gantt.date')}</label>
          <input
            id="surgery-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian
              focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          />
        </div>
      </div>

      {surgeries.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-body text-slate text-center py-8">{t('surgery.gantt.noSurgeries', { date })}</p>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="flex" style={{ paddingLeft: '120px' }}>
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-caption text-slate text-center border-l border-silver py-1">
                {h > 12 ? `${h - 12}pm` : `${h}am`}
              </div>
            ))}
          </div>

          {OR_ROOMS.map((room) => {
            const roomSurgeries = byRoom[room] || [];
            return (
              <div key={room} className="flex mb-2">
                <div className="w-[120px] shrink-0 flex items-center px-3">
                  <span className="text-body font-medium text-obsidian">{t('surgery.or')} {room}</span>
                  <span className="text-caption text-slate ml-2">({roomSurgeries.length})</span>
                </div>
                <div className="flex-1 relative h-20 bg-bone/50 rounded-lg border border-silver/30">
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-silver/20"
                      style={{ left: `${((h - 7) / 14) * 100}%`, width: `${(1 / 14) * 100}%` }}
                    />
                  ))}
                  {roomSurgeries.map((s) => {
                    const start = toMins(new Date(s.startTime));
                    const end = toMins(new Date(s.endTime));
                    const left = Math.max(((start - ganttStart) / totalMins) * 100, 0);
                    const width = Math.min(((end - start) / totalMins) * 100, 100 - left);
                    const colors = statusColors[s.status] || statusColors.SCHEDULED;
                    const nextStatus = statusFlow[s.status];
                    return (
                      <button
                        key={s.id}
                        aria-label={`${t('surgery.or')} ${s.orRoom} - ${s.patient?.fullName}`}
                        className={`absolute top-1 bottom-1 rounded-md border px-2 overflow-hidden
                          transition-all hover:shadow-md cursor-pointer touch-target
                          ${colors.bg} ${colors.border}
                          ${selectedSurgery?.id === s.id ? 'ring-2 ring-lilac-bloom z-10' : 'z-0'}`}
                        style={{ left: `${left}%`, width: `${Math.max(width, 3)}%` }}
                        onClick={() => {
                          setSelectedSurgery(selectedSurgery?.id === s.id ? null : s);
                          setDetailTab('status');
                        }}
                      >
                        <div className="flex items-center gap-1 h-full">
                          <span className="text-xs font-semibold text-obsidian truncate">
                            #{String(s.patient?.mrn || '').slice(-4)}
                          </span>
                          {width > 8 && (
                            <span className="text-xs text-graphite truncate">{s.patient?.fullName}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedSurgery && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('surgery.gantt.details')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-caption text-slate">{t('surgery.gantt.patient')}</p>
                  <p className="text-body font-medium text-obsidian">{selectedSurgery.patient?.fullName}</p>
                  <p className="text-caption text-slate">{selectedSurgery.patient?.mrn}</p>
                </div>
                <div>
                  <p className="text-caption text-slate">{t('surgery.gantt.orRoom')}</p>
                  <p className="text-body font-medium text-obsidian">{t('surgery.or')} {selectedSurgery.orRoom}</p>
                </div>
                <div>
                  <p className="text-caption text-slate">{t('surgery.gantt.start')}</p>
                  <p className="text-body text-obsidian">{new Date(selectedSurgery.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-caption text-slate">{t('surgery.gantt.end')}</p>
                  <p className="text-body text-obsidian">{new Date(selectedSurgery.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-caption text-slate">{t('surgery.gantt.disposition')}</p>
                  <p className="text-body font-medium text-obsidian">
                    {selectedSurgery.disposition === 'DISCHARGE_HOME' ? t('surgery.gantt.dischargeHome') :
                     selectedSurgery.disposition === 'ADMIT_WARD' ? t('surgery.gantt.admitToWard') :
                     t('surgery.gantt.toDecide')}
                  </p>
                </div>
                {selectedSurgery.notes && (
                  <div className="col-span-2">
                    <p className="text-caption text-slate">{t('surgery.gantt.notes')}</p>
                    <p className="text-body text-obsidian">{selectedSurgery.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('surgery.gantt.status')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedSurgery.status !== 'CANCELLED' && (
                  <p className="text-body text-obsidian">
                    {t('surgery.gantt.current')}: <Badge variant={
                      selectedSurgery.status === 'SCHEDULED' ? 'primary' :
                      selectedSurgery.status === 'PREP' ? 'warning' :
                      selectedSurgery.status === 'IN_SURGERY' ? 'info' :
                      selectedSurgery.status === 'RECOVERY' ? 'info' : 'default'
                    }>{selectedSurgery.status}</Badge>
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {statusFlow[selectedSurgery.status] && (
                    <Button onClick={() => handleStatusChange(selectedSurgery.id, statusFlow[selectedSurgery.status])}>
                      {t('surgery.gantt.advanceTo', { status: statusFlow[selectedSurgery.status].replace('_', ' ') })}
                    </Button>
                  )}
                  {selectedSurgery.status !== 'CANCELLED' && (
                    <Button variant="secondary" onClick={() => setNotesModal(true)}>
                      {t('surgery.gantt.postOpNotes')}
                    </Button>
                  )}
                  <Button variant="secondary" onClick={async () => {
                    if (!selectedSurgery) return;
                    try {
                      const res = await fetch(`/api/surgeries/${selectedSurgery.id}/print`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                      });
                      setPrintData(await res.json());
                    } catch { }
                  }}>
                    {t('surgery.gantt.printReport')}
                  </Button>
                  {selectedSurgery.status === 'COMPLETED' && (
                    <>
                      <Button variant="primary" onClick={() => setFollowUpModal(true)}>
                        {t('surgery.gantt.scheduleFollowup')}
                      </Button>
                      <Button onClick={() => navigate(`/surgery/${selectedSurgery.id}/discharge`)}>
                        {t('surgery.gantt.dischargeSummary')}
                      </Button>
                    </>
                  )}
                  {selectedSurgery.status !== 'COMPLETED' && selectedSurgery.status !== 'CANCELLED' && (
                    <Button variant="danger" onClick={() => handleStatusChange(selectedSurgery.id, 'CANCELLED')}>
                      {t('surgery.gantt.cancelSurgery')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('surgery.gantt.detailsTab')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 mb-3" role="tablist">
                  {['team', 'events', 'follow-ups'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={detailTab === tab}
                      className={`px-3 py-1.5 rounded-lg text-caption font-medium transition-colors ${
                        detailTab === tab
                          ? 'bg-lilac-bloom text-obsidian'
                          : 'bg-bone text-graphite hover:text-obsidian'
                      }`}
                      onClick={() => setDetailTab(tab)}
                    >
                      {tab === 'team' ? t('surgery.gantt.teamCount', { count: team.length }) :
                       tab === 'events' ? t('surgery.gantt.eventsCount', { count: events.length }) :
                       t('surgery.gantt.followupsCount', { count: followUps.length })}
                    </button>
                  ))}
                </div>

                {detailTab === 'team' && (
                  <div className="space-y-3" role="tabpanel">
                    {loadingTeam ? (
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-10 bg-bone rounded animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <>
                        {team.length === 0 && (
                          <p className="text-caption text-slate text-center py-3">{t('surgery.gantt.noTeam')}</p>
                        )}
                        {team.map((m) => (
                          <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-silver">
                            <div>
                              <p className="text-body text-obsidian">{m.name}</p>
                              <p className="text-caption text-slate">{m.role?.name}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveTeamMember(m.id)}
                              className="text-caption text-red-500 hover:text-red-700 px-2 py-1"
                              aria-label={t('surgery.gantt.removeMember')}
                            >
                              {t('surgery.gantt.remove')}
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            className="flex-1 px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom text-sm"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder={t('surgery.gantt.namePlaceholder')}
                          />
                          <select
                            value={teamRoleId}
                            onChange={(e) => setTeamRoleId(e.target.value)}
                            className="w-32 px-2 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom text-sm"
                          >
                            <option value="">{t('surgery.gantt.rolePlaceholder')}</option>
                            {orRoles.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            onClick={handleAddTeamMember}
                            loading={addTeamMember.isPending}
                            disabled={!teamName.trim() || !teamRoleId}
                          >
                            {t('surgery.gantt.add')}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {detailTab === 'events' && (
                  <div className="space-y-3" role="tabpanel">
                    {loadingEvents ? (
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-10 bg-bone rounded animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <>
                        {events.length === 0 && (
                          <p className="text-caption text-slate text-center py-3">{t('surgery.gantt.noEvents')}</p>
                        )}
                        {events.map((ev) => (
                          <div key={ev.id} className="px-3 py-2 rounded-lg border border-silver">
                            <div className="flex items-center gap-2">
                              <Badge variant="info" size="sm">{ev.eventType?.name}</Badge>
                              <span className="text-caption text-slate">
                                {new Date(ev.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {ev.description && (
                              <p className="text-caption text-graphite mt-1">{ev.description}</p>
                            )}
                          </div>
                        ))}
                        <div className="space-y-2">
                          <select
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom text-sm"
                          >
                            <option value="">{t('surgery.gantt.selectEventType')}</option>
                            {eventTypes.map((et) => (
                              <option key={et.id} value={et.id}>{et.name}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <input
                              className="flex-1 px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom text-sm"
                              value={eventDesc}
                              onChange={(e) => setEventDesc(e.target.value)}
                              placeholder={t('surgery.gantt.descriptionOptional')}
                            />
                            <Button
                              size="sm"
                              onClick={handleAddEvent}
                              loading={addEvent.isPending}
                              disabled={!eventName}
                            >
                              {t('surgery.gantt.log')}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {detailTab === 'follow-ups' && (
                  <div className="space-y-3" role="tabpanel">
                    {loadingFollowUps ? (
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-10 bg-bone rounded animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <>
                        {followUps.length === 0 && (
                          <p className="text-caption text-slate text-center py-3">{t('surgery.gantt.noFollowups')}</p>
                        )}
                        {followUps.map((fu) => (
                          <div key={fu.id} className="px-3 py-2 rounded-lg border border-silver">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-body text-obsidian">
                                  {new Date(fu.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                {fu.notes && <p className="text-caption text-slate mt-1">{fu.notes}</p>}
                              </div>
                              <Badge
                                variant={
                                  fu.status === 'COMPLETED' ? 'success' :
                                  fu.status === 'MISSED' ? 'danger' : 'warning'
                                }
                                size="sm"
                              >
                                {fu.status}
                              </Badge>
                            </div>
                            {fu.status === 'SCHEDULED' && (
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleFollowUpStatus(fu.id, 'COMPLETED')}
                                  loading={updateFollowUp.isPending}
                                >
                                  {t('surgery.gantt.complete')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleFollowUpStatus(fu.id, 'MISSED')}
                                  loading={updateFollowUp.isPending}
                                >
                                  {t('surgery.gantt.missed')}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Modal open={notesModal} onClose={() => { setNotesModal(false); setNewNote(''); }} title={t('surgery.gantt.postOpNotes')}>
        <div className="space-y-4">
          <div className="max-h-48 overflow-y-auto space-y-2">
            {notes.length === 0 && <p className="text-caption text-slate text-center py-4">{t('surgery.gantt.noNotes')}</p>}
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-silver p-3">
                <p className="text-body text-obsidian whitespace-pre-wrap">{n.content}</p>
                <p className="text-caption text-slate mt-1">
                  {n.createdBy?.fullName} &middot; {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.gantt.addNote')}</label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={3}
              placeholder={t('surgery.gantt.notePlaceholder')}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setNotesModal(false); setNewNote(''); }} className="flex-1">{t('common.cancel')}</Button>
            <Button
              onClick={() => {
                if (!newNote.trim() || !selectedSurgery) return;
                createNote.mutate({ surgeryId: selectedSurgery.id, content: newNote.trim() }, {
                  onSuccess: () => setNewNote(''),
                });
              }}
              className="flex-1"
              loading={createNote.isPending}
              disabled={!newNote.trim()}
            >
              {t('surgery.gantt.addNote')}
            </Button>
          </div>
        </div>
      </Modal>

      {printData && <SurgeryPrintReport data={printData} onClose={() => setPrintData(null)} />}

      <Modal open={followUpModal} onClose={() => setFollowUpModal(false)} title={t('surgery.gantt.scheduleFollowup')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.gantt.followupDateTime')}</label>
            <input
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">{t('surgery.gantt.notesOptional')}</label>
            <textarea
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={3}
              placeholder={t('surgery.gantt.followupPlaceholder')}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setFollowUpModal(false)} className="flex-1">{t('common.cancel')}</Button>
            <Button onClick={handleScheduleFollowUp} className="flex-1" loading={createFollowUp.isPending} disabled={!followUpDate}>{t('followUp.submit')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

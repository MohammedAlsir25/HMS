import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

export default function WaitingRoomTV() {
  const { t } = useTranslation();
  const [queues, setQueues] = useState({});
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchParams] = useSearchParams();
  const fullScreen = searchParams.get('fullscreen') === 'true';

  useEffect(() => {
    const fetchQueue = () => {
      api.get('/reception/waiting-room')
        .then((data) => {
          setQueues(data);
          setLastUpdated(new Date());
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    fetchQueue();
    const qInterval = setInterval(fetchQueue, 10000);
    const tInterval = setInterval(() => setTime(new Date()), 30000);
    return () => { clearInterval(qInterval); clearInterval(tInterval); };
  }, []);

  const clinicSlugs = Object.keys(queues);
  const totalWaiting = clinicSlugs.reduce((s, slug) => s + queues[slug].queue.filter(a => a.status === 'WAITING').length, 0);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-gray-950 via-obsidian to-gray-900 text-paper p-6 flex flex-col" data-tour="waiting-room-tv">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('app.title')}</h1>
          <p className="text-base text-slate mt-0.5">{t('waitingRoom.description')}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-light text-slate">
            {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-sm text-slate">{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center" role="status">
          <p className="text-2xl text-slate animate-pulse">{t('common.loading')}</p>
        </div>
      )}

      {!loading && clinicSlugs.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4 text-slate/30">~</p>
            <p className="text-3xl text-slate">{t('waitingRoom.noQueues')}</p>
            <p className="text-lg text-slate mt-2">{t('waitingRoom.allIdle')}</p>
          </div>
        </div>
      )}

      {!loading && clinicSlugs.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
              <span>{t('waitingRoom.patientsWaiting', { count: totalWaiting, clinics: clinicSlugs.length })}</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
            {clinicSlugs.map((slug) => {
              const clinic = queues[slug];
              const inProgress = clinic.queue.find((a) => a.status === 'IN_PROGRESS');
              const called = clinic.queue.find((a) => a.status === 'CALLED');
              const waiting = clinic.queue.filter((a) => a.status === 'WAITING');
              const waitTime = waiting.length * 10;

              return (
                <div key={slug} className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 flex flex-col border border-white/10">
                  <div className="mb-3">
                    <h2 className="text-xl font-semibold">{clinic.clinic}</h2>
                    <p className="text-sm text-slate capitalize">{slug}</p>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 bg-white/5 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate uppercase tracking-wide">{t('waitingRoom.cardWaiting')}</p>
                      <p className="text-2xl font-bold">{waiting.length}</p>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate uppercase tracking-wide">{t('waitingRoom.estWait')}</p>
                      <p className="text-2xl font-bold">{waitTime < 60 ? `${waitTime}m` : `${Math.floor(waitTime / 60)}h ${waitTime % 60}m`}</p>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate uppercase tracking-wide">{t('waitingRoom.cardActive')}</p>
                      <p className="text-2xl font-bold">{inProgress || called ? 1 : 0}</p>
                    </div>
                  </div>

                  {inProgress && (
                    <div className="mb-2">
                      <p className="text-xs text-green-400 dark:text-green-300 uppercase tracking-wider mb-1">{t('waitingRoom.nowServing')}</p>
                      <div className="bg-green-500/20 dark:bg-green-500/30 border border-green-500/40 dark:border-green-500/60 rounded-xl p-3 text-center">
                        <p className="text-5xl font-bold text-green-400 dark:text-green-300">#{String(inProgress.token).padStart(3, '0')}</p>
                        {inProgress.patient?.fullName && (
                          <p className="text-2xl text-paper mt-1">{inProgress.patient.fullName}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {called && !inProgress && (
                    <div className="mb-2">
                      <p className="text-xs text-sky-400 dark:text-sky-300 uppercase tracking-wider mb-1">{t('waitingRoom.called')}</p>
                      <div className="bg-sky-500/20 dark:bg-sky-500/30 border border-sky-500/40 dark:border-sky-500/60 rounded-xl p-3 text-center">
                        <p className="text-5xl font-bold text-sky-400 dark:text-sky-300">#{String(called.token).padStart(3, '0')}</p>
                        {called.patient?.fullName && (
                          <p className="text-2xl text-paper mt-1">{called.patient.fullName}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {waiting.length === 0 && (
                        <p className="text-sm text-slate/50 italic">{t('waitingRoom.noPatientsWaiting')}</p>
                      )}
                      {waiting.slice(0, 15).map((a) => (
                        <span key={a.token}
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-base font-bold
                            ${a.priority > 0 ? 'bg-amber-500/20 dark:bg-amber-500/30 text-amber-400 dark:text-amber-300 border border-amber-500/40 dark:border-amber-500/60' : 'bg-white/5 text-slate border border-white/10'}`}
                          title={`Token ${a.token}${a.priority > 0 ? ` (Priority ${a.priority})` : ''}`}>
                          {String(a.token).padStart(2, '0')}
                        </span>
                      ))}
                      {waiting.length > 15 && (
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-base font-bold bg-white/5 text-slate">
                          +{waiting.length - 15}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-6 text-center text-sm text-slate">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mr-2 animate-pulse" />
        {t('waitingRoom.live')}
        {lastUpdated && (
          <span className="ml-3">{t('waitingRoom.lastUpdated')}: {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        )}
      </div>
    </div>
  );
}

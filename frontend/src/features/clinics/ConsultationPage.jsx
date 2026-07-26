import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { notifyError } from '../../utils/notify';

const clinicRouteMap = {
  medicine: '/clinic/medicine',
  ent: '/clinic/ent',
  dental: '/clinic/dental',
  retina: '/clinic/retina',
  glaucoma: '/clinic/glaucoma',
  orbit: '/clinic/orbit',
  'pediatrics-ophth': '/clinic/pediatrics-ophth',
  'general-ophth': '/clinic/general-ophth',
  optometry: '/clinic/optometry',
  imaging: '/clinic/imaging',
};

export default function ConsultationPage() {
  const { slug, appointmentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug || !appointmentId) {
      navigate(`/clinic/${slug || 'medicine'}`, { replace: true });
      return;
    }

    const targetRoute = clinicRouteMap[slug] || `/clinic/${slug}`;

    api.get(`/clinics/${slug}/queue`)
      .then((queue) => {
        const appointment = queue.find((a) => a.id === appointmentId);
        if (appointment) {
          navigate(targetRoute, {
            state: { selectedAppointmentId: appointmentId, selectedPatientId: appointment.patientId },
            replace: true,
          });
        } else {
          navigate(targetRoute, { replace: true });
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load consultation');
        navigate(targetRoute, { replace: true });
      });
  }, [slug, appointmentId, navigate]);

  if (error) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <p className="text-body text-red-500">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

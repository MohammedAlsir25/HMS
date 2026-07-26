import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { portalApi } from './hooks/usePortalApi';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (step === 1 && clinics.length === 0) {
      setLoading(true);
      portalApi.getClinics()
        .then((data) => setClinics(data?.clinics || []))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [step, clinics.length]);

  useEffect(() => {
    if (step === 2 && selectedClinic && doctors.length === 0) {
      setLoading(true);
      portalApi.getDoctors(selectedClinic.id)
        .then((data) => setDoctors(data?.doctors || []))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [step, selectedClinic, doctors.length]);

  useEffect(() => {
    if (step === 3 && selectedClinic && selectedDate) {
      setLoading(true);
      portalApi.getAvailability(selectedClinic.id, selectedDate)
        .then((data) => setAvailability(data?.doctors || []))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [step, selectedClinic, selectedDate]);

  const handleBook = async () => {
    if (!selectedClinic || !selectedDoctor || !selectedDate || !selectedSlot) return;
    setError('');
    setLoading(true);
    try {
      const result = await portalApi.bookAppointment({
        clinicId: selectedClinic.id,
        doctorId: selectedDoctor.doctorId || selectedDoctor.id,
        date: selectedDate,
        time: selectedSlot,
        visitType: 'NEW_VISIT',
        notes,
      });
      setSuccess(result?.appointment || result);
      setStep(5);
    } catch (err) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError('');
    if (step > 1 && step < 5) setStep(step - 1);
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-heading-sm font-semibold text-obsidian">Appointment Booked!</h1>
        <Card>
          <CardContent className="space-y-2 text-body">
            <p><span className="text-slate">Date:</span> <span className="font-medium text-obsidian">{formatDate(success.date)}</span></p>
            <p><span className="text-slate">Time:</span> <span className="font-medium text-obsidian">{success.time}</span></p>
            <p><span className="text-slate">Doctor:</span> <span className="font-medium text-obsidian">{success.doctor}</span></p>
            <p><span className="text-slate">Clinic:</span> <span className="font-medium text-obsidian">{success.clinic}</span></p>
            <p><span className="text-slate">Token:</span> <span className="font-medium text-obsidian">#{success.token}</span></p>
          </CardContent>
        </Card>
        <div className="flex gap-3 justify-center">
          <Button variant="ghost" onClick={() => navigate('/portal/dashboard')}>Dashboard</Button>
          <Button onClick={() => navigate('/portal/appointments')}>My Appointments</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {step > 1 && step < 5 && (
          <button onClick={goBack} className="touch-target flex items-center justify-center w-10 h-10 rounded-lg text-graphite hover:text-obsidian hover:bg-bone transition-colors" type="button">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Book Appointment</h1>
          <p className="text-body text-slate mt-1">Step {step} of 4</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`flex-1 h-1 rounded-full ${step >= s ? 'bg-lilac-bloom' : 'bg-silver'}`} />
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-body text-red-700">{error}</div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-body text-slate mt-3">Loading...</p>
        </div>
      )}

      {step === 1 && !loading && (
        <div className="space-y-3">
          <h2 className="text-subheading font-medium text-obsidian">Select Clinic</h2>
          {clinics.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No clinics available</p>
          ) : (
            clinics.map((clinic) => (
              <Card
                key={clinic.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${selectedClinic?.id === clinic.id ? 'ring-2 ring-lilac-bloom' : ''}`}
                onClick={() => { setSelectedClinic(clinic); setStep(2); }}
              >
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-body font-medium text-obsidian">{clinic.name}</h3>
                      <p className="text-caption text-slate">{clinic.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-body font-medium text-obsidian">{clinic.consultationFee} SAR</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {step === 2 && !loading && (
        <div className="space-y-3">
          <h2 className="text-subheading font-medium text-obsidian">Select Doctor</h2>
          <p className="text-caption text-slate">Clinic: {selectedClinic?.name}</p>
          {doctors.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No doctors available in this clinic</p>
          ) : (
            doctors.map((doctor) => (
              <Card
                key={doctor.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedDoctor(doctor); setStep(3); }}
              >
                <CardContent>
                  <h3 className="text-body font-medium text-obsidian">{doctor.fullName}</h3>
                  <p className="text-caption text-slate">{doctor.specialty}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {step === 3 && !loading && (
        <div className="space-y-4">
          <h2 className="text-subheading font-medium text-obsidian">Select Date & Slot</h2>
          <p className="text-caption text-slate">Doctor: {selectedDoctor?.fullName || selectedDoctor?.doctorName}</p>
          <div>
            <label htmlFor="appt-date" className="text-body font-medium text-obsidian block mb-1.5">Date</label>
            <input
              id="appt-date"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
            />
          </div>

          {selectedDate && availability.length > 0 && (
            <div className="space-y-4">
              {availability.map((doc) => (
                <div key={doc.doctorId || doc.doctorName}>
                  <h3 className="text-body font-medium text-obsidian mb-2">{doc.doctorName}</h3>
                  <div className="flex flex-wrap gap-2">
                    {(doc.slots || []).map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.time)}
                        className={`px-3 py-2 rounded-lg text-caption font-medium transition-colors ${
                          !slot.available
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : selectedSlot === slot.time
                            ? 'bg-lilac-bloom text-obsidian'
                            : 'bg-white border border-silver text-obsidian hover:bg-bone'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedDate && availability.length === 0 && !loading && (
            <p className="text-body text-slate text-center py-4">No availability data for this date</p>
          )}

          {selectedSlot && (
            <div>
              <label htmlFor="appt-notes" className="text-body font-medium text-obsidian block mb-1.5">Notes (optional)</label>
              <textarea
                id="appt-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                placeholder="Any additional notes..."
              />
              <Button className="mt-3" onClick={() => setStep(4)}>Continue</Button>
            </div>
          )}
        </div>
      )}

      {step === 4 && !loading && (
        <div className="space-y-4">
          <h2 className="text-subheading font-medium text-obsidian">Confirm Booking</h2>
          <Card>
            <CardContent className="space-y-3 text-body">
              <div className="flex justify-between">
                <span className="text-slate">Clinic</span>
                <span className="font-medium text-obsidian">{selectedClinic?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Doctor</span>
                <span className="font-medium text-obsidian">{selectedDoctor?.fullName || selectedDoctor?.doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Date</span>
                <span className="font-medium text-obsidian">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Time</span>
                <span className="font-medium text-obsidian">{selectedSlot}</span>
              </div>
              {notes && (
                <div className="flex justify-between">
                  <span className="text-slate">Notes</span>
                  <span className="font-medium text-obsidian">{notes}</span>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setStep(3)}>Back</Button>
            <Button className="flex-1" onClick={handleBook} loading={loading}>Confirm Booking</Button>
          </div>
        </div>
      )}
    </div>
  );
}

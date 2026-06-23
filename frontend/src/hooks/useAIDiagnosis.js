import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export function useAIDiagnosis() {
  const [diagnoses, setDiagnoses] = useState([]);
  const [tests, setTests] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [aiNotes, setAiNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getDiagnosis = useCallback(async ({ patientId, symptoms, vitals, specialty }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/ai/diagnose', { patientId, symptoms, vitals, specialty });
      if (data) {
        setDiagnoses(data.diagnoses || []);
        setTests(data.tests || []);
        setTreatments(data.treatments || []);
        setAiNotes(data.notes || '');
      }
    } catch (err) {
      setError(err?.message || 'AI diagnosis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setDiagnoses([]);
    setTests([]);
    setTreatments([]);
    setAiNotes('');
    setError(null);
  }, []);

  return { diagnoses, tests, treatments, aiNotes, loading, error, getDiagnosis, reset };
}

import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../lib/api';
import { notifySuccess, notifyError } from '../../utils/notify';

export default function TemplateLoader({ clinicSlug, onLoadTemplate, currentSections = {} }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicSlug) return;
    setLoading(true);
    api.get(`/clinics/${clinicSlug}/templates`)
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [clinicSlug]);

  const handleLoad = (template) => {
    const soapData = { subjective: '', objective: '', assessment: '', plan: '' };
    if (Array.isArray(template.sections)) {
      for (const section of template.sections) {
        if (section.fieldName in soapData) {
          soapData[section.fieldName] = section.defaultValue || '';
        }
      }
    }
    onLoadTemplate?.(soapData);
  };

  const handleSave = async () => {
    if (!templateName.trim()) return;
    setSaving(true);
    try {
      const sections = [
        { title: 'Subjective', fieldType: 'textarea', fieldName: 'subjective', defaultValue: currentSections.subjective || '' },
        { title: 'Objective', fieldType: 'textarea', fieldName: 'objective', defaultValue: currentSections.objective || '' },
        { title: 'Assessment', fieldType: 'textarea', fieldName: 'assessment', defaultValue: currentSections.assessment || '' },
        { title: 'Plan', fieldType: 'textarea', fieldName: 'plan', defaultValue: currentSections.plan || '' },
      ];
      await api.post(`/clinics/${clinicSlug}/templates`, { name: templateName, sections });
      notifySuccess('Template saved');
      setTemplateName('');
      setShowSaveInput(false);
      const updated = await api.get(`/clinics/${clinicSlug}/templates`);
      setTemplates(updated);
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          className="flex-1 px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          onChange={(e) => {
            if (!e.target.value) return;
            const template = templates.find((t) => t.id === e.target.value);
            if (template) handleLoad(template);
            e.target.value = '';
          }}
          disabled={loading}
        >
          <option value="">{loading ? 'Loading templates...' : 'Load a template...'}</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={() => setShowSaveInput(!showSaveInput)}>
          Save as Template
        </Button>
      </div>
      {showSaveInput && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="flex-1"
          />
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!templateName.trim()}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

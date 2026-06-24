import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import SettingsContent from './SettingsContent';

export default function SettingsModal({ open, onClose }) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onClose} title={t('settings.title')} className="max-w-xl">
      <SettingsContent />
    </Modal>
  );
}

import { useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { getTour } from '../../lib/tours';

function isNativePlatform() {
  return typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.Capacitor?.isNative);
}

export default function TourManager() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const hasSeenOnboarding = useUIStore((s) => s.hasSeenOnboarding);
  const setHasSeenOnboarding = useUIStore((s) => s.setHasSeenOnboarding);
  const tourRef = useRef(null);

  const startTour = useCallback(async () => {
    const Shepherd = (await import('shepherd.js')).default;
    const tourDef = getTour(user?.role);

    if (!tourDef) return;
    if (location.pathname !== tourDef.path) return;

    if (tourRef.current) {
      tourRef.current.cancel();
    }

    const tour = new Shepherd.Tour({
      defaultStepOptions: {
        classes: 'shadow-md bg-paper dark:bg-obsidian text-obsidian dark:text-paper',
        scrollTo: true,
        cancelIcon: {
          enabled: true,
          label: 'Skip',
        },
        arrow: true,
        popperOptions: {
          modifiers: [{ name: 'offset', options: { offset: [0, 12] } }],
        },
      },
      useModalOverlay: true,
    });

    tourDef.steps.forEach((step) => {
      tour.addStep({
        id: step.id,
        title: step.title,
        text: step.text,
        attachTo: step.attachTo,
        buttons: step.buttons || [
          {
            text: 'Skip',
            action() {
              tour.cancel();
            },
            secondary: true,
          },
          {
            text: 'Next',
            action() {
              tour.next();
            },
          },
        ],
      });
    });

    tour.on('complete', () => {
      setHasSeenOnboarding(true);
    });

    tour.on('cancel', () => {
      setHasSeenOnboarding(true);
    });

    tourRef.current = tour;
    tour.start();
  }, [user?.role, location.pathname, setHasSeenOnboarding]);

  if (!isNativePlatform()) return null;

  const tourDef = getTour(user?.role);
  if (!tourDef) return null;

  if (location.pathname !== tourDef.path) return null;

  return (
    <button
      onClick={startTour}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium text-graphite hover:text-obsidian hover:bg-bone transition-colors touch-target"
      type="button"
      title="Take a tour"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      <span className="hidden md:inline">Tour</span>
    </button>
  );
}

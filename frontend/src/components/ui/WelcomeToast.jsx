import { useState, useEffect } from 'react';
import TextPressure from './TextPressure';

export default function WelcomeToast() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), 500);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-obsidian/30 transition-opacity duration-500 flex items-center justify-center ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="w-full px-4 sm:px-8 h-[60vh]">
        <TextPressure
          text="Welcome!"
          flex={false}
          alpha={false}
          stroke={false}
          width={true}
          weight={true}
          italic={true}
          textColor="#FFFFFF"
          minFontSize={48}
        />
      </div>
    </div>
  );
}

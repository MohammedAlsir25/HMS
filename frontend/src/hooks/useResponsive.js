import { useState, useEffect } from 'react';

const breakpoints = {
  tablet: 1024,
  mobile: 768,
};

export function useResponsive() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    let frame;
    const handleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return {
    width,
    isDesktop: width >= breakpoints.tablet,
    isTablet: width >= breakpoints.mobile && width < breakpoints.tablet,
    isMobile: width < breakpoints.mobile,
  };
}

import { useCallback, useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../ui/Avatar';
import './StaggeredMenu.css';

const navItems = [
  { label: 'Dashboard', link: '/dashboard' },
  { label: 'Reception', link: '/reception' },
  { label: 'Waiting Room', link: '/waiting-room' },
  { label: 'Medicine', link: '/clinic/medicine' },
  { label: 'ENT', link: '/clinic/ent' },
  { label: 'Dental', link: '/clinic/dental' },
  { label: 'Retina', link: '/clinic/retina' },
  { label: 'Glaucoma', link: '/clinic/glaucoma' },
  { label: 'Orbit', link: '/clinic/orbit' },
  { label: 'Peds Ophth', link: '/clinic/pediatrics-ophth' },
  { label: 'Gen Ophth', link: '/clinic/general-ophth' },
  { label: 'Optometry', link: '/clinic/optometry' },
  { label: 'Surgery', link: '/surgery' },
  { label: 'Referrals', link: '/referrals' },
  { label: 'Pharmacy', link: '/pharmacy' },
  { label: 'Pharmacy Products', link: '/pharmacy/products' },
  { label: 'Laboratory', link: '/lab' },
  { label: 'Optics', link: '/optics' },
  { label: 'Optics Products', link: '/optics/products' },
  { label: 'Inventory', link: '/inventory' },
  { label: 'Accounting', link: '/accounting' },
  { label: 'Admin', link: '/admin' },
  { label: 'HR', link: '/hr' },
];

export default function StaggeredMenu({
  position = 'right',
  colors = ['var(--color-sm-layer-1)', 'var(--color-sm-layer-2)', 'var(--color-sm-layer-3)'],
  items = navItems,
  displayItemNumbering = false,
  className,
  logoUrl = '/logo.png',
  menuButtonColor = 'var(--color-obsidian)',
  openMenuButtonColor = 'var(--color-obsidian)',
  changeMenuColorOnOpen = false,
  accentColor = '#7c3aed',
  isFixed = false,
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose,
  isOpen: externalOpen,
  onToggle,
}) {
  const isExternal = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isExternal ? externalOpen : internalOpen;
  const openRef = useRef(open);
  openRef.current = open;
  const user = useAuthStore((s) => s.user);

  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);

  const plusHRef = useRef(null);
  const plusVRef = useRef(null);
  const iconRef = useRef(null);

  const textInnerRef = useRef(null);
  const [textLines, setTextLines] = useState(['Menu', 'Close']);

  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  const spinTweenRef = useRef(null);
  const textCycleAnimRef = useRef(null);
  const colorTweenRef = useRef(null);

  const toggleBtnRef = useRef(null);
  const busyRef = useRef(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;

      const plusH = plusHRef.current;
      const plusV = plusVRef.current;
      const icon = iconRef.current;
      const textInner = textInnerRef.current;

      if (!panel) return;

      let preLayers = [];
      if (preContainer) {
        preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer'));
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
      if (preContainer) {
        gsap.set(preContainer, { xPercent: 0, opacity: 1 });
      }

      if (plusH && plusV && icon) {
        gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
        gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
        gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      }

      if (textInner) gsap.set(textInner, { yPercent: 0 });

      if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    });
    return () => ctx.revert();
  }, [menuButtonColor, position]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
    const offscreen = position === 'left' ? -100 : 100;
    const layerStates = layers.map((el) => ({ el, start: offscreen }));
    const panelStart = offscreen;

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });

    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;

    tl.fromTo(
      panel,
      { xPercent: panelStart },
      { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStartRatio = 0.15;
      const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;

      tl.to(
        itemEls,
        { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: { each: 0.1, from: 'start' } },
        itemsStart
      );
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const all = [...layers, panel];
    closeTweenRef.current?.kill();

    const offscreen = position === 'left' ? -100 : 100;

    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        busyRef.current = false;
      },
    });
  }, [position]);

  const animateIcon = useCallback((opening) => {
    const icon = iconRef.current;
    const h = plusHRef.current;
    const v = plusVRef.current;
    if (!icon || !h || !v) return;

    spinTweenRef.current?.kill();

    if (opening) {
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      spinTweenRef.current = gsap
        .timeline({ defaults: { ease: 'power4.out' } })
        .to(h, { rotate: 45, duration: 0.5 }, 0)
        .to(v, { rotate: -45, duration: 0.5 }, 0);
    } else {
      spinTweenRef.current = gsap
        .timeline({ defaults: { ease: 'power3.inOut' } })
        .to(h, { rotate: 0, duration: 0.35 }, 0)
        .to(v, { rotate: 90, duration: 0.35 }, 0)
        .to(icon, { rotate: 0, duration: 0.001 }, 0);
    }
  }, []);

  const animateColor = useCallback(
    (opening) => {
      const btn = toggleBtnRef.current;
      if (!btn) return;
      colorTweenRef.current?.kill();
      if (changeMenuColorOnOpen) {
        const targetColor = opening ? openMenuButtonColor : menuButtonColor;
        colorTweenRef.current = gsap.to(btn, { color: targetColor, delay: 0.18, duration: 0.3, ease: 'power2.out' });
      } else {
        gsap.set(btn, { color: menuButtonColor });
      }
    },
    [openMenuButtonColor, menuButtonColor, changeMenuColorOnOpen]
  );

  useEffect(() => {
    if (toggleBtnRef.current) {
      if (changeMenuColorOnOpen) {
        const targetColor = openRef.current ? openMenuButtonColor : menuButtonColor;
        gsap.set(toggleBtnRef.current, { color: targetColor });
      } else {
        gsap.set(toggleBtnRef.current, { color: menuButtonColor });
      }
    }
  }, [changeMenuColorOnOpen, menuButtonColor, openMenuButtonColor]);

  const animateText = useCallback((opening) => {
    const inner = textInnerRef.current;
    if (!inner) return;

    textCycleAnimRef.current?.kill();

    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const cycles = 3;
    const seq = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Menu' ? 'Close' : 'Menu';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);

    setTextLines(seq);
    gsap.set(inner, { yPercent: 0 });

    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;

    textCycleAnimRef.current = gsap.to(inner, {
      yPercent: -finalShift,
      duration: 0.5 + lineCount * 0.07,
      ease: 'power4.out',
    });
  }, []);

  const toggleMenu = useCallback(() => {
    if (isExternal) {
      onToggle?.();
      return;
    }
    const target = !openRef.current;
    openRef.current = target;
    setInternalOpen(target);

    if (target) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }

    animateIcon(target);
    animateColor(target);
    animateText(target);
  }, [playOpen, playClose, animateIcon, animateColor, animateText, onMenuOpen, onMenuClose, isExternal, onToggle]);

  const closeMenu = useCallback(() => {
    if (isExternal) {
      if (open) onToggle?.(false);
      return;
    }
    if (openRef.current) {
      openRef.current = false;
      setInternalOpen(false);
      onMenuClose?.();
      playClose();
      animateIcon(false);
      animateColor(false);
      animateText(false);
    }
  }, [playClose, animateIcon, animateColor, animateText, onMenuClose, isExternal, onToggle, open]);

  useEffect(() => {
    if (!isExternal) return;
    if (open) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }
  }, [open, isExternal, playOpen, playClose, onMenuOpen, onMenuClose]);

  useEffect(() => {
    if (!closeOnClickAway || !open) return;

    const handleClickOutside = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        (!toggleBtnRef.current || !toggleBtnRef.current.contains(event.target))
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeOnClickAway, open, closeMenu]);

  useEffect(() => {
    if (!open && panelRef.current) {
      const links = panelRef.current.querySelectorAll('.sm-panel-item');
      links.forEach((link) => {
        link.addEventListener('click', closeMenu);
      });
      return () => {
        links.forEach((link) => {
          link.removeEventListener('click', closeMenu);
        });
      };
    }
  }, [open, closeMenu]);

  return (
    <div
      className={`z-40 ${isFixed ? 'fixed top-0 left-0 w-screen h-screen overflow-hidden pointer-events-none' : 'w-full h-full'}`}
    >
      <div
        className={(className ? className + ' ' : '') + 'staggered-menu-wrapper pointer-events-none relative w-full h-full z-40'}
        style={accentColor ? { '--sm-accent': accentColor } : undefined}
        data-position={position}
        data-open={open || undefined}
        data-external={isExternal || undefined}
      >
        <div
          ref={preLayersRef}
          className="sm-prelayers absolute top-0 right-0 bottom-0 pointer-events-none z-[5]"
          aria-hidden="true"
        >
          {(() => {
            const raw = colors && colors.length ? colors.slice(0, 4) : ['var(--color-sm-layer-2)', 'var(--color-sm-layer-3)'];
            let arr = [...raw];
            if (arr.length >= 3) {
              const mid = Math.floor(arr.length / 2);
              arr.splice(mid, 1);
            }
            return arr.map((c, i) => (
              <div
                key={i}
                className="sm-prelayer absolute top-0 right-0 h-full w-full translate-x-0"
                style={{ background: c }}
              />
            ));
          })()}
        </div>

          <header
            className="staggered-menu-header absolute top-0 left-0 w-full grid grid-cols-3 items-center p-[2em] bg-transparent pointer-events-none z-20"
            aria-label="Main navigation header"
          >
            {isExternal ? <div /> : (
              <button
                ref={toggleBtnRef}
                className="sm-toggle relative inline-flex items-center gap-[0.3rem] bg-transparent border-0 cursor-pointer font-medium leading-none overflow-visible pointer-events-auto justify-self-start"
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                aria-controls="staggered-menu-panel"
                onClick={toggleMenu}
                type="button"
              >
                <span
                  className="sm-toggle-textWrap relative inline-block h-[1em] overflow-hidden whitespace-nowrap w-[var(--sm-toggle-width,auto)] min-w-[var(--sm-toggle-width,auto)]"
                  aria-hidden="true"
                >
                  <span ref={textInnerRef} className="sm-toggle-textInner flex flex-col leading-none">
                    {textLines.map((l, i) => (
                      <span className="sm-toggle-line block h-[1em] leading-none" key={i}>
                        {l}
                      </span>
                    ))}
                  </span>
                </span>

                <span
                  ref={iconRef}
                  className="sm-icon relative w-[14px] h-[14px] shrink-0 inline-flex items-center justify-center [will-change:transform]"
                  aria-hidden="true"
                >
                  <span
                    ref={plusHRef}
                    className="sm-icon-line absolute left-1/2 top-1/2 w-full h-[2px] bg-current rounded-[2px] -translate-x-1/2 -translate-y-1/2 [will-change:transform]"
                  />
                  <span
                    ref={plusVRef}
                    className="sm-icon-line sm-icon-line-v absolute left-1/2 top-1/2 w-full h-[2px] bg-current rounded-[2px] -translate-x-1/2 -translate-y-1/2 [will-change:transform]"
                  />
                </span>
              </button>
            )}

            <Link
              to="/dashboard"
              className="sm-logo flex items-center justify-center select-none pointer-events-auto"
              aria-label="AL Jawahir Hospital — Home"
            >
              <img
                src={logoUrl}
                alt=""
                className="sm-logo-img block h-10 w-auto object-contain"
                draggable={false}
                width={40}
                height={40}
              />
            </Link>

            <div />
          </header>

        <aside
          id="staggered-menu-panel"
          ref={panelRef}
          className="staggered-menu-panel absolute top-0 right-0 h-full bg-paper flex flex-col p-[6em_2em_2em_2em] overflow-y-auto z-10 backdrop-blur-[12px] pointer-events-auto"
          style={{ WebkitBackdropFilter: 'blur(12px)' }}
          aria-hidden={!open}
        >
            <div className="sm-panel-inner flex-1 flex flex-col gap-5">
            <ul
              className="sm-panel-list list-none m-0 p-0 flex flex-col gap-2"
              role="list"
              data-numbering={displayItemNumbering || undefined}
            >
              {items && items.length ? (
                items.map((it, idx) => (
                  <li className="sm-panel-itemWrap relative overflow-hidden leading-none" key={it.label + idx}>
                    <Link
                      className="sm-panel-item relative text-obsidian font-semibold text-[1.75rem] cursor-pointer leading-tight tracking-[-0.5px] transition-colors duration-150 ease-linear inline-block no-underline py-[0.3em]"
                      to={it.link}
                      data-index={idx + 1}
                    >
                      <span className="sm-panel-itemLabel inline-block [transform-origin:50%_100%] will-change-transform">
                        {it.label}
                      </span>
                    </Link>
                  </li>
                ))
              ) : null}
            </ul>

            {user && (
              <div className="sm-user-section">
                <Link to="/settings" className="sm-user-info" onClick={closeMenu}>
                  <Avatar src={user.avatarUrl} name={user.fullName} size="sm" />
                  <div className="sm-user-details">
                    <span className="sm-user-name">{user.fullName}</span>
                    {user.clinic && <span className="sm-user-clinic">{user.clinic.name}</span>}
                  </div>
                </Link>
                <div className="sm-user-footer">
                  <Link to="/settings" onClick={closeMenu}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                    Settings
                  </Link>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

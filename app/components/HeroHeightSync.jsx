'use client';

import { useEffect } from 'react';

/**
 * Publishes the sticky profile hero's rendered height as --profile-hero-h on
 * the surrounding .profile-page, so .profile-rail can park directly below the
 * pinned hero however the hero reflows — a long name wrapping the heading, a
 * breakpoint change, or a late webfont swap.
 *
 * Renders nothing; the hero itself stays server-rendered. Without JS the CSS
 * fallback in :root still gives a usable offset.
 */
export default function HeroHeightSync() {
  useEffect(() => {
    const hero = document.querySelector('.profile-hero');
    const page = hero?.closest('.profile-page');
    if (!hero || !page) return;

    const publish = () => {
      const height = hero.getBoundingClientRect().height;
      if (height > 0) {
        page.style.setProperty('--profile-hero-h', `${Math.round(height)}px`);
      }
    };

    publish();

    const observer = new ResizeObserver(publish);
    observer.observe(hero);

    return () => {
      observer.disconnect();
      page.style.removeProperty('--profile-hero-h');
    };
  }, []);

  return null;
}

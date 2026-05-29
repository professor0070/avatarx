// FOUC (Flash of Unstyled Content) Prevention Script
// This script runs before any stylesheets to prevent dark mode flash
(function() {
  'use strict';

  // Prevent FOUC by setting dark mode class before rendering
  const theme = localStorage.getItem('theme') || 'light';
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  if (isDark) {
    document.documentElement.classList.add('dark');
  }

  // Add noscript styles for when JS is disabled
  const style = document.createElement('style');
  style.textContent = `
    .no-js .js-only { display: none !important; }
    .no-js .no-js-fallback { display: block !important; }
  `;
  document.head.appendChild(style);
})();

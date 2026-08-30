import { trackEvent } from '../services/api';

// Generate a simple UUID-like string for session tracking
const generateSessionId = () => {
  return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
};

export const getSessionId = () => {
  let sessionId = sessionStorage.getItem('reposense_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('reposense_session_id', sessionId);
  }
  return sessionId;
};

// Log a page view event
export const logPageView = (path) => {
  const sessionId = getSessionId();
  trackEvent(path, 'view', null, null, sessionId);
};

// Log an element click event
export const logClick = (elementId, path = window.location.pathname) => {
  const sessionId = getSessionId();
  trackEvent(path, 'click', elementId, null, sessionId);
};

// Log a search query event
export const logSearchQuery = (query, searchType = 'repositories', path = window.location.pathname) => {
  const sessionId = getSessionId();
  trackEvent(path, 'search', searchType, query, sessionId);
};

// Setup global click listeners for tagged elements (data-track-id="...")
export const initGlobalClickListener = () => {
  if (typeof window === 'undefined') return;

  const handleGlobalClick = (e) => {
    // Find closest element with data-track-id
    const target = e.target.closest('[data-track-id]');
    if (target) {
      const trackId = target.getAttribute('data-track-id');
      logClick(trackId);
    }
  };

  window.addEventListener('click', handleGlobalClick);
  return () => window.removeEventListener('click', handleGlobalClick);
};

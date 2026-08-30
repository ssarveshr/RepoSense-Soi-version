const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const fetchTrending = async () => {
  const response = await fetch(`${API_BASE_URL}/trending`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const searchRepositories = async (query) => {
  const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const summarizeRepo = async (githubUrl) => {
  const response = await fetch(`${API_BASE_URL}/summarize-github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ github_url: githubUrl }),
  });
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

// --- NEW API SERVICES ---

export const searchDocumentation = async (query) => {
  const response = await fetch(`${API_BASE_URL}/api/search-knowledge?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const askChatbot = async (query, sessionId) => {
  const response = await fetch(`${API_BASE_URL}/api/chatbot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, session_id: sessionId }),
  });
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const trackEvent = async (path, eventType, elementId = null, query = null, sessionId = null) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path,
        event_type: eventType,
        element_id: elementId,
        query,
        session_id: sessionId
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Analytics tracking failed:', error);
    return false;
  }
};

export const getAnalyticsReport = async () => {
  const response = await fetch(`${API_BASE_URL}/api/analytics/report`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const fetchDocContent = async (filePath) => {
  const response = await fetch(`${API_BASE_URL}/api/docs/content?file_path=${encodeURIComponent(filePath)}`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

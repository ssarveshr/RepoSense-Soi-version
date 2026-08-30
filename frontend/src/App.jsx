import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import RepositoryDetails from './pages/RepositoryDetails';
import Profile from './pages/Profile';
import GitHubSummarizer from './pages/GitHubSummarizer';

// Import new pages
import GitComparison from './pages/GitComparison';
import AIChatbot from './pages/AIChatbot';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

import { SunIcon, MoonIcon } from './components/icons';
import { logPageView, initGlobalClickListener } from './utils/tracker';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();

  // Toggle theme logic
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Sync theme with HTML root for Tailwind variant
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Track page views on route changes
  useEffect(() => {
    logPageView(location.pathname);
  }, [location.pathname]);

  // Initialize global click tracking listeners (Step 11)
  useEffect(() => {
    const cleanup = initGlobalClickListener();
    return cleanup;
  }, []);

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-500 ease-in-out`}>
      {/* Navigation Layer */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2 cursor-pointer" data-track-id="nav_logo">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">R</div>
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">RepoSense</span>
            </Link>
            <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <Link to="/" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors" data-track-id="nav_discover">Discover</Link>
              <Link to="/git-comparison" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors" data-track-id="nav_git_comparison">Git Comparison</Link>
              <Link to="/chatbot" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors" data-track-id="nav_ai_chatbot">AI Chatbot</Link>
              <Link to="/github-summarizer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors" data-track-id="nav_summarizer">GitHub Summarizer</Link>
              <Link to="/analytics-dashboard" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-indigo-600 dark:text-indigo-400" data-track-id="nav_analytics">Analytics</Link>
              <Link to="/profile" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors" data-track-id="nav_profile">My Profile</Link>
            </div>
            <div className="flex items-center">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all duration-500 overflow-hidden relative"
                aria-label="Toggle Dark Mode"
                data-track-id="nav_theme_toggle"
              >
                <div className={`transform transition-transform duration-500 ${isDarkMode ? 'rotate-[360deg] scale-0 opacity-0 absolute' : 'rotate-0 scale-100 opacity-100'}`}>
                  <SunIcon />
                </div>
                <div className={`transform transition-transform duration-500 ${isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-[360deg] scale-0 opacity-0 absolute'}`}>
                  <MoonIcon />
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area Routing */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/repo/:id" element={<RepositoryDetails />} />
          <Route path="/git-comparison" element={<GitComparison />} />
          <Route path="/chatbot" element={<AIChatbot />} />
          <Route path="/github-summarizer" element={<GitHubSummarizer />} />
          <Route path="/analytics-dashboard" element={<AnalyticsDashboard />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

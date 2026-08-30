import { useState, useEffect } from 'react';
import { getAnalyticsReport } from '../services/api';
import { logPageView } from '../utils/tracker';

const RefreshIcon = () => (
  <svg className="w-5 h-5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const ClickIcon = () => (
  <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
  </svg>
);

const GeoIcon = () => (
  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const report = await getAnalyticsReport();
      setData(report);
    } catch (err) {
      setError("Failed to load analytics data.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    logPageView('/analytics-dashboard');
    fetchReport();
  }, []);

  if (isLoading && !data) {
    return (
      <div className="flex justify-center items-center py-20 text-blue-500 animate-pulse font-medium">
        Loading real-time user analytics report...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        <p className="text-lg font-bold">{error}</p>
        <button 
          onClick={fetchReport}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { summary, views_by_path, click_events, demographics, top_searches } = data || {};
  
  // Calculate total clicks logged
  const totalClicks = click_events ? click_events.reduce((sum, item) => sum + item.count, 0) : 0;

  return (
    <div className="space-y-12 animate-fade-in-up">
      {/* Title */}
      <section className="border-b border-gray-200 dark:border-gray-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">User Analytics & Interactions</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time tracking of page visits, clicks, search patterns, and geographics.
          </p>
        </div>
        <button 
          onClick={fetchReport}
          className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all"
          title="Refresh Report"
        >
          <RefreshIcon />
        </button>
      </section>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Page Views */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-3xl shadow-sm flex items-center space-x-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
            <EyeIcon />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total Page Views</span>
            <span className="text-3xl font-black text-gray-900 dark:text-white mt-1 block">
              {(summary?.total_views || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-3xl shadow-sm flex items-center space-x-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
            <GeoIcon />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Unique Visitors (Sessions)</span>
            <span className="text-3xl font-black text-gray-900 dark:text-white mt-1 block">
              {(summary?.total_visitors || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Click Heatmap Metrics */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-3xl shadow-sm flex items-center space-x-6">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
            <ClickIcon />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Interactive Element Clicks</span>
            <span className="text-3xl font-black text-gray-900 dark:text-white mt-1 block">
              {totalClicks.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Most Visited Pages */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold border-l-4 border-blue-500 pl-3">Most Visited Pages</h2>
          <div className="divide-y divide-gray-150 dark:divide-gray-800">
            {views_by_path && views_by_path.length > 0 ? (
              views_by_path.map((item, idx) => (
                <div key={idx} className="py-3 flex justify-between items-center text-sm font-semibold">
                  <span className="font-mono text-gray-600 dark:text-gray-400">{item.path}</span>
                  <span className="text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">
                    {item.count} views
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400 text-sm">No page views recorded yet.</div>
            )}
          </div>
        </div>

        {/* Demographic Distribution (Step 11) */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold border-l-4 border-green-500 pl-3">Visitor Demographics (by IP)</h2>
          <div className="space-y-4">
            {demographics?.countries && demographics.countries.length > 0 ? (
              demographics.countries.map((item, idx) => {
                const total = summary?.total_views || 1;
                const percentage = Math.round((item.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-gray-700 dark:text-gray-300">{item.country}</span>
                      <span className="text-gray-500">{percentage}% ({item.count})</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-green-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-gray-400 text-sm">No geolocation demographics logged.</div>
            )}
          </div>
        </div>

        {/* Click Heatmap Logs (Step 11) */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4 lg:col-span-2">
          <h2 className="text-lg font-bold border-l-4 border-indigo-500 pl-3">UI Interaction Frequency (Heatmap Logs)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 font-bold text-gray-500">
                  <th className="py-3 px-4">Component Tracker ID</th>
                  <th className="py-3 px-4">Origin Page Path</th>
                  <th className="py-3 px-4 text-right">Click Action Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {click_events && click_events.length > 0 ? (
                  click_events.map((event, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/20">
                      <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">{event.element_id}</td>
                      <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-400">{event.path}</td>
                      <td className="py-3 px-4 text-right font-black text-gray-900 dark:text-white">{event.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center py-10 text-gray-400">No clicks recorded. Tag buttons with `data-track-id="..."` to log.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Search Queries */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4 lg:col-span-2">
          <h2 className="text-lg font-bold border-l-4 border-orange-500 pl-3">Search Query Logs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 font-bold text-gray-500">
                  <th className="py-3 px-4">Search Query Term</th>
                  <th className="py-3 px-4">Search Mode Type</th>
                  <th className="py-3 px-4 text-right">Search Invocations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {top_searches && top_searches.length > 0 ? (
                  top_searches.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/20">
                      <td className="py-3 px-4 italic text-gray-800 dark:text-gray-200">"{item.query}"</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {item.search_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-white">{item.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center py-10 text-gray-400">No search terms searched yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

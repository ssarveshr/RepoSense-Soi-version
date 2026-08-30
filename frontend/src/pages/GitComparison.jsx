import { useState, useEffect, useRef } from 'react';
import { searchDocumentation, fetchDocContent } from '../services/api';
import { logPageView, logSearchQuery, logClick } from '../utils/tracker';

const ClockIcon = () => (
  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2m4-3.5a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Standard suggestions for Git comparison
const DEFAULT_SUGGESTIONS = [
  "gitlab actions migration",
  "gitlab to github manual migration",
  "github actions vs gitlab ci",
  "github security vs gitlab security",
  "gitlab community edition self hosting",
  "github sponsors"
];

export default function GitComparison() {
  const [activeTab, setActiveTab] = useState('compare');
  
  // Search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  
  // Document reader state
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docContent, setDocContent] = useState('');
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  
  // World clock state
  const [times, setTimes] = useState({
    sf: '',
    utc: '',
    local: ''
  });
  
  const suggestionRef = useRef(null);

  // Track page view and load history on mount
  useEffect(() => {
    logPageView('/git-comparison');
    
    // Load search history from localStorage
    const history = JSON.parse(localStorage.getItem('git_search_history') || '[]');
    setSearchHistory(history);
    
    // Setup click listener to close suggestions
    const handleClickOutside = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    // Setup live clock ticker
    const timer = setInterval(updateClocks, 1000);
    updateClocks(); // Initial call
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(timer);
    };
  }, []);

  // Update timezone clocks
  const updateClocks = () => {
    const now = new Date();
    
    // Time formatter options
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    
    setTimes({
      sf: new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'America/Los_Angeles' }).format(now),
      utc: new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(now),
      local: new Intl.DateTimeFormat('en-US', options).format(now)
    });
  };

  // Generate autocomplete suggestions based on query
  useEffect(() => {
    if (!query.trim()) {
      // If query is empty, show search history + default queries
      setSuggestions([...new Set([...searchHistory, ...DEFAULT_SUGGESTIONS])].slice(0, 6));
      return;
    }
    
    const filteredDefaults = DEFAULT_SUGGESTIONS.filter(item => 
      item.toLowerCase().includes(query.toLowerCase())
    );
    const filteredHistory = searchHistory.filter(item => 
      item.toLowerCase().includes(query.toLowerCase())
    );
    
    setSuggestions([...new Set([...filteredHistory, ...filteredDefaults])].slice(0, 6));
  }, [query, searchHistory]);

  const handleSearch = async (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    
    setIsLoading(true);
    setShowSuggestions(false);
    logSearchQuery(q, 'documentation', '/git-comparison');
    
    // Save to history (localStorage)
    const updatedHistory = [q, ...searchHistory.filter(item => item !== q)].slice(0, 10);
    setSearchHistory(updatedHistory);
    localStorage.setItem('git_search_history', JSON.stringify(updatedHistory));
    
    try {
      const data = await searchDocumentation(q);
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Failed to search documentation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (sug) => {
    setQuery(sug);
    handleSearch(sug);
    logClick(`suggestion_${sug.replace(/\s+/g, '_')}`);
  };

  const openDocReader = async (doc) => {
    setSelectedDoc(doc);
    setIsLoadingDoc(true);
    setDocContent('');
    logClick(`read_doc_${doc.title.replace(/\s+/g, '_')}`);
    
    try {
      const data = await fetchDocContent(doc.file_path);
      if (data.error) {
        setDocContent(`### Error loading file\n\n${data.error}`);
      } else {
        setDocContent(data.content);
      }
    } catch (error) {
      setDocContent('### Network Error\n\nCould not fetch document content.');
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const renderDocContentMarkdown = (md) => {
    if (!md) return null;
    
    // Very basic markdown parser to render headings, lists, bold text and code blocks cleanly in HTML
    const lines = md.split('\n');
    let inCodeBlock = false;
    let codeContent = [];
    
    return lines.map((line, idx) => {
      // Handle code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          const content = codeContent.join('\n');
          codeContent = [];
          return (
            <pre key={idx} className="bg-gray-900 text-gray-100 p-4 rounded-xl font-mono text-sm my-4 overflow-x-auto shadow-inner border border-gray-800">
              <code>{content}</code>
            </pre>
          );
        } else {
          inCodeBlock = true;
          return null;
        }
      }
      
      if (inCodeBlock) {
        codeContent.push(line);
        return null;
      }
      
      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-3xl font-extrabold text-gray-900 dark:text-white mt-6 mb-3">{line.substring(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-5 mb-2 border-b border-gray-100 dark:border-gray-800 pb-1">{line.substring(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-xl font-bold text-gray-800 dark:text-gray-200 mt-4 mb-2">{line.substring(4)}</h3>;
      }
      
      // Unordered lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} className="ml-6 list-disc text-gray-600 dark:text-gray-300 my-1">{line.substring(2)}</li>;
      }
      
      // Blockquotes
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 p-3 pl-4 rounded-r-lg my-3 text-gray-600 dark:text-gray-300 italic">
            {line.substring(2)}
          </blockquote>
        );
      }
      
      // Blank lines
      if (!line.trim()) {
        return <div key={idx} className="h-2"></div>;
      }
      
      // Regular paragraph
      return <p key={idx} className="text-gray-600 dark:text-gray-300 my-2 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="space-y-12 animate-fade-in-up">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-200 dark:border-gray-800 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            GitHub vs GitLab Comparison Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Analyze architectural differences, self-hosting options, and semantic RAG documentation.
          </p>
        </div>
        
        {/* World Timezones Widget (Step 3: External Integration) */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm flex items-center space-x-6">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <GlobeIcon />
          </div>
          <div className="flex gap-4 text-xs font-semibold">
            <div className="space-y-1">
              <span className="text-gray-500 block">GitHub HQ (SF)</span>
              <span className="font-mono text-gray-900 dark:text-white text-sm">{times.sf || '--:--:-- --'}</span>
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-800 self-stretch"></div>
            <div className="space-y-1">
              <span className="text-gray-500 block">GitLab Core (UTC)</span>
              <span className="font-mono text-gray-900 dark:text-white text-sm">{times.utc || '--:--:-- --'}</span>
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-800 self-stretch"></div>
            <div className="space-y-1">
              <span className="text-indigo-600 dark:text-indigo-400 block">Your Local Time</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 text-sm">{times.local || '--:--:-- --'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-800 pb-1">
        <button
          onClick={() => { setActiveTab('compare'); logClick('tab_comparison_grid'); }}
          className={`px-6 py-2.5 font-bold text-sm uppercase tracking-wider transition-colors rounded-t-xl
            ${activeTab === 'compare' 
              ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
              : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          Feature Comparison Matrix
        </button>
        <button
          onClick={() => { setActiveTab('search'); logClick('tab_document_search'); }}
          className={`px-6 py-2.5 font-bold text-sm uppercase tracking-wider transition-colors rounded-t-xl
            ${activeTab === 'search' 
              ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
              : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          Semantic RAG Doc Search
        </button>
      </div>

      {/* Compare Tab Content */}
      {activeTab === 'compare' ? (
        <div className="space-y-8 animate-fade-in-up">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 font-bold border-b border-gray-200 dark:border-gray-800">
                  <th className="p-6 text-sm uppercase tracking-wider">Feature</th>
                  <th className="p-6 text-sm uppercase tracking-wider border-l border-gray-200 dark:border-gray-800 bg-blue-50/20 dark:bg-blue-900/5">GitHub</th>
                  <th className="p-6 text-sm uppercase tracking-wider border-l border-gray-200 dark:border-gray-800 bg-orange-50/20 dark:bg-orange-900/5">GitLab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                <tr>
                  <td className="p-6 font-bold text-gray-900 dark:text-white">Core Philosophy</td>
                  <td className="p-6 border-l border-gray-200 dark:border-gray-800 leading-relaxed bg-blue-50/5 dark:bg-blue-900/2">
                    Centralized hub for developer communities, focusing heavily on social collaboration, open-source hosting (GitHub Stars), and third-party integrations (GitHub Marketplace).
                  </td>
                  <td className="p-6 border-l border-gray-200 dark:border-gray-800 leading-relaxed bg-orange-50/5 dark:bg-orange-900/2">
                    Single-application platform for the entire DevOps lifecycle. Focuses on built-in security, pipeline compliance, issue boards, and self-hosted deployments.
                  </td>
                </tr>
                <tr>
                  <td className="p-6 font-bold text-gray-900 dark:text-white">Hosting & Self-Hosting</td>
                  <td className="p-6 border-l border-gray-200 dark:border-gray-800 leading-relaxed bg-blue-50/5 dark:bg-blue-900/2">
                    Proprietary. Primarily cloud SaaS. Self-hosted deployments require a high-tier **GitHub Enterprise Server** license.
                  </td>
                  <td className="p-6 border-l border-gray-200 dark:border-gray-800 leading-relaxed bg-orange-50/5 dark:bg-orange-900/2">
                    Open-Core. Offers **GitLab Community Edition (CE)** which is free and open-source, allowing unlimited self-hosting on your own servers.
                  </td>
                </tr>
                <tr>
                  <td className="p-6 font-bold text-gray-900 dark:text-white">CI/CD Engine</td>
                  <td className="p-6 border-l border-gray-200 dark:border-gray-800 leading-relaxed bg-blue-50/5 dark:bg-blue-900/2">
                    **GitHub Actions**: Event-driven automation using YAML. Supports huge community-shared Actions from the Marketplace. Highly modular.
                  </td>
                  <td className="p-6 border-l border-gray-200 dark:border-gray-800 leading-relaxed bg-orange-50/5 dark:bg-orange-900/2">
                    **GitLab CI/CD**: Built-in, extremely mature YAML pipelines. Features advanced caching, auto-scaling runners, and multi-project pipeline triggers natively.
                  </td>
                </tr>
                <tr>
                  <td className="p-6 font-bold text-gray-900 dark:text-white">Security & Auditing</td>
                  <td className="p-6 border-l border-gray-200 dark:border-gray-800 leading-relaxed bg-blue-50/5 dark:bg-blue-900/2">
                    Dependabot vulnerability scanning, Advanced Security (code scanning via CodeQL, secret token detection) integrated into repository workflows.
                  </td>
                  <td className="p-6 border-l border-gray-200 dark:border-gray-800 leading-relaxed bg-orange-50/5 dark:bg-orange-900/2">
                    Native SAST, DAST, container scanning, license compliance checks built directly into pipeline results. Container Registry is integrated out-of-the-box.
                  </td>
                </tr>
                <tr>
                  <td className="p-6 font-bold text-gray-900 dark:text-white">Social / Developer Index</td>
                  <td className="p-6 border-l border-gray-200 dark:border-gray-800 leading-relaxed bg-blue-50/5 dark:bg-blue-900/2">
                    Industry standard for developer portfolios and open-source projects. Features GitHub Stars, Sponsors, and trending feeds.
                  </td>
                  <td className="p-6 border-l border-gray-200 dark:border-gray-800 leading-relaxed bg-orange-50/5 dark:bg-orange-900/2">
                    Primarily used within private enterprises and corporate environments. Open source hosting is available but social engagement is minor.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Search Tab Content (Steps 5 & 6) */
        <div className="space-y-6 animate-fade-in-up">
          <div className="max-w-2xl mx-auto relative" ref={suggestionRef}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-transform group-hover:scale-110">
                <SearchIcon />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="block w-full pl-12 pr-4 py-4 rounded-2xl border-0 shadow-lg text-gray-900 bg-white dark:bg-gray-800 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all duration-300"
                placeholder="Search comparison docs, migration guides, self-hosting manuals..."
              />
              <button 
                onClick={() => handleSearch()}
                disabled={isLoading}
                className="absolute inset-y-2 right-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition-colors disabled:opacity-50"
              >
                {isLoading ? "..." : "Search"}
              </button>
            </div>

            {/* Smart Autosuggestions Dropdown (Step 6) */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                {suggestions.map((sug, i) => {
                  const isHistory = searchHistory.includes(sug);
                  return (
                    <div 
                      key={i}
                      onClick={() => handleSuggestionClick(sug)}
                      className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center justify-between text-sm transition-colors text-gray-700 dark:text-gray-300"
                    >
                      <div className="flex items-center space-x-3">
                        {isHistory ? <HistoryIcon /> : <ClockIcon />}
                        <span className={isHistory ? "text-indigo-600 dark:text-indigo-400 font-medium" : ""}>{sug}</span>
                      </div>
                      {isHistory && <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">History</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search Results */}
          <div className="space-y-6 mt-8">
            <h2 className="text-xl font-bold">
              {isLoading ? "Semantic processing..." : searchResults.length > 0 ? "Documentation Results" : "Search results will appear here"}
            </h2>
            
            <div className="space-y-4">
              {searchResults.length > 0 ? (
                searchResults.map((doc, idx) => (
                  <div key={doc.id || idx} className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3 gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{doc.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs font-semibold">
                          <span className="text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1 rounded-md">
                            Source: {doc.source}
                          </span>
                          {doc.match_score && (
                            <span className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-md">
                              {Math.round(doc.match_score * 100)}% Match
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => openDocReader(doc)}
                        className="px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors border border-blue-100 dark:border-blue-800/40"
                      >
                        Read Full Document
                      </button>
                    </div>
                    
                    {/* Snippet */}
                    <div className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-3 italic">
                      "...{doc.content.substring(0, 350)}..."
                    </div>
                  </div>
                ))
              ) : !isLoading && query && (
                <div className="text-center py-10 text-gray-500">
                  No documents match your semantic query. Try search terms like "gitlab" or "actions".
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Document Reader */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden animate-fade-in-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start bg-gray-50 dark:bg-gray-800/30">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2.5 py-1 rounded-md">
                  {selectedDoc.source}
                </span>
                <h3 className="text-xl font-bold mt-1 text-gray-900 dark:text-white leading-tight">{selectedDoc.title}</h3>
                {selectedDoc.url && (
                  <a href={selectedDoc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">
                    {selectedDoc.url}
                  </a>
                )}
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors font-bold text-lg"
              >
                &times;
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-gray-900/90 max-h-[calc(85vh-150px)]">
              {isLoadingDoc ? (
                <div className="flex justify-center items-center py-20 text-blue-500 animate-pulse font-medium">
                  Loading full document content...
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none text-left">
                  {renderDocContentMarkdown(docContent)}
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 flex justify-end">
              <button 
                onClick={() => setSelectedDoc(null)}
                className="px-6 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl hover:scale-105 transition-transform"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

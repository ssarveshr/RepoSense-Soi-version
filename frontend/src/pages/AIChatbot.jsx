import { useState, useEffect, useRef } from 'react';
import { askChatbot, fetchDocContent } from '../services/api';
import { logPageView, logClick } from '../utils/tracker';

const SendIcon = () => (
  <svg className="w-5 h-5 text-white transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const RobotIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ReferenceIcon = () => (
  <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export default function AIChatbot() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hello! I am your Git Comparison Assistant. Ask me anything about migrating between GitHub and GitLab, CI/CD pipelines, self-hosting setups, or specific security features. I'll search our local knowledge base and give you a detailed RAG response!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Document reader modal state
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docContent, setDocContent] = useState('');
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    logPageView('/chatbot');
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isTyping) return;
    
    const userMsgText = inputText;
    setInputText('');
    
    // Add user message
    const userMessage = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: userMsgText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    try {
      const data = await askChatbot(userMsgText);
      
      const botMessage = {
        id: 'bot_' + Date.now(),
        sender: 'bot',
        text: data.answer,
        references: data.references || [],
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const botMessage = {
        id: 'bot_err_' + Date.now(),
        sender: 'bot',
        text: "⚠️ Sorry, I encountered an error communicating with the RAG search engine. Make sure the backend and local Ollama server are running.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const openDocReader = async (ref) => {
    setSelectedDoc(ref);
    setIsLoadingDoc(true);
    setDocContent('');
    logClick(`chatbot_citation_${ref.title.replace(/\s+/g, '_')}`);
    
    try {
      const data = await fetchDocContent(ref.file_path);
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

  const renderMessageText = (text) => {
    // Basic Markdown parser for chatbot responses
    const paragraphs = text.split('\n');
    let inCodeBlock = false;
    let codeContent = [];
    
    return paragraphs.map((line, i) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          const code = codeContent.join('\n');
          codeContent = [];
          return (
            <pre key={i} className="bg-gray-950 text-gray-200 p-4 rounded-xl font-mono text-xs my-2 overflow-x-auto shadow-inner border border-gray-800">
              <code>{code}</code>
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
      
      if (line.startsWith('### ')) {
        return <h4 key={i} className="font-bold text-base mt-3 mb-1 text-gray-800 dark:text-gray-100">{line.substring(4)}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="font-bold text-lg mt-4 mb-2 text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-1">{line.substring(3)}</h3>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="ml-5 list-disc text-sm my-1">{line.substring(2)}</li>;
      }
      
      if (!line.trim()) {
        return <div key={i} className="h-1"></div>;
      }
      
      // Basic inline bolding (**bold**)
      const parts = line.split('**');
      if (parts.length > 1) {
        return (
          <p key={i} className="text-sm my-1 leading-relaxed">
            {parts.map((part, index) => 
              index % 2 === 1 ? <strong key={index} className="font-semibold text-indigo-600 dark:text-indigo-400">{part}</strong> : part
            )}
          </p>
        );
      }
      
      return <p key={i} className="text-sm my-1 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Title */}
      <section className="border-b border-gray-200 dark:border-gray-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">AI RAG Comparison Assistant</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Retrieve facts directly from our comparative documents and manuals with local Ollama Llama3.
          </p>
        </div>
      </section>

      {/* Chat Window */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm h-[60vh] flex flex-col">
        
        {/* Messages list */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-50/50 dark:bg-gray-950/20">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              
              {/* Avatar */}
              <div className={`p-2.5 rounded-2xl shrink-0 shadow-sm
                ${msg.sender === 'user' 
                  ? 'bg-gray-200 dark:bg-gray-800' 
                  : 'bg-gradient-to-tr from-blue-500 to-indigo-600'}`}
              >
                {msg.sender === 'user' ? <UserIcon /> : <RobotIcon />}
              </div>
              
              {/* Message Bubble */}
              <div className="max-w-[75%] space-y-3">
                <div className={`p-5 rounded-3xl shadow-sm text-left
                  ${msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700/60 rounded-tl-none'}`}
                >
                  <div className="space-y-1">
                    {renderMessageText(msg.text)}
                  </div>
                  <span className={`text-[10px] block mt-2 text-right
                    ${msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400'}`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {/* RAG Source References Citations */}
                {msg.sender === 'bot' && msg.references && msg.references.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1 w-full mt-1 mb-0.5">
                      <ReferenceIcon /> SOURCES USED FOR RESPONSE:
                    </span>
                    {msg.references.map((ref, idx) => (
                      <button
                        key={idx}
                        onClick={() => openDocReader(ref)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 transition-colors"
                      >
                        {ref.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-sm">
                <RobotIcon />
              </div>
              <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-700/60 flex items-center space-x-2">
                <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce"></div>
                <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>
        
        {/* Chat input box */}
        <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isTyping}
            className="flex-1 px-5 py-3.5 rounded-2xl border-0 shadow-inner text-sm bg-gray-50 dark:bg-gray-800 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:outline-none disabled:opacity-50"
            placeholder="Ask me: 'How do I automate migrations from GitLab CI to GitHub Actions?'"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all active:scale-95 shadow-md flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            <SendIcon />
          </button>
        </form>

      </div>

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
                  {/* Reuse basic renderer */}
                  {selectedDoc && (
                    docContent.split('\n').map((line, idx) => {
                      if (line.startsWith('```')) return null;
                      if (line.startsWith('# ')) return <h1 key={idx} className="text-3xl font-extrabold text-gray-900 dark:text-white mt-6 mb-3">{line.substring(2)}</h1>;
                      if (line.startsWith('## ')) return <h2 key={idx} className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-5 mb-2 border-b border-gray-100 dark:border-gray-800 pb-1">{line.substring(3)}</h2>;
                      if (line.startsWith('### ')) return <h3 key={idx} className="text-xl font-bold text-gray-850 dark:text-gray-200 mt-4 mb-2">{line.substring(4)}</h3>;
                      if (line.startsWith('- ')) return <li key={idx} className="ml-6 list-disc text-gray-600 dark:text-gray-300 my-1">{line.substring(2)}</li>;
                      if (line.startsWith('> ')) return <blockquote key={idx} className="border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 p-3 pl-4 rounded-r-lg my-3 text-gray-600 dark:text-gray-300 italic">{line.substring(2)}</blockquote>;
                      if (!line.trim()) return <div key={idx} className="h-2"></div>;
                      return <p key={idx} className="text-gray-600 dark:text-gray-300 my-2 leading-relaxed">{line}</p>;
                    })
                  )}
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

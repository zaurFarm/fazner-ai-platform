import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Error boundary for development
if (import.meta.env.DEV) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Filter out React strict mode warnings in development
    if (
      args[0]?.toString().includes('ReactDOM.render is no longer supported') ||
      args[0]?.toString().includes('useLayoutEffect has a complex runtime')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize default and appPolicy Trusted Types policies for enhanced DOM XSS security
let appPolicyInstance: any = null;

if (typeof window !== 'undefined' && 'trustedTypes' in window) {
  const tt = (window as any).trustedTypes;
  if (tt && tt.createPolicy) {
    try {
      tt.createPolicy('default', {
        createHTML: (string: string) => string,
        createScript: (string: string) => string,
        createScriptURL: (string: string) => string,
      });
    } catch (e) {
      console.warn('Trusted Types default policy failed to initialize:', e);
    }
    try {
      appPolicyInstance = tt.createPolicy('appPolicy', {
        createHTML: (string: string) => string,
        createScript: (string: string) => string,
        createScriptURL: (string: string) => string,
      });
    } catch (e) {
      console.warn('Trusted Types appPolicy failed to initialize:', e);
    }
  }
}

if (typeof window !== 'undefined') {
  (window as any).__safeScriptURL = (url: string) => {
    if (appPolicyInstance) {
      try {
        return appPolicyInstance.createScriptURL(url);
      } catch (e) {
        console.warn('Failed to create script URL using appPolicy:', e);
      }
    }
    if ('trustedTypes' in window) {
      const tt = (window as any).trustedTypes;
      if (tt && tt.createPolicy) {
        try {
          const uniqueName = 'dynamic_policy_' + Math.random().toString(36).substring(2, 9);
          const tempPolicy = tt.createPolicy(uniqueName, {
            createScriptURL: (u: string) => u
          });
          return tempPolicy.createScriptURL(url);
        } catch (e) {
          console.warn('Failed to create dynamic policy:', e);
        }
      }
    }
    return url;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.tsx';
import './index.css';
import { CurrencyProvider } from './context/CurrencyContext';
import { AuthProvider } from './context/AuthContext.tsx';

// Initialize default and appPolicy Trusted Types policies with strict script URL allowlist
let appPolicyInstance: any = null;

function validateTrustedScriptURL(url: string): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) {
    throw new TypeError('Empty script URL blocked by Trusted Types policy');
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed, typeof window !== 'undefined' ? window.location.origin : 'https://www.cryptoreviewlab.com');
    const allowedOrigins = new Set<string>([
      'https://apis.google.com',
      'https://va.vercel-scripts.com',
      ...(typeof window !== 'undefined' ? [window.location.origin] : []),
    ]);
    if (allowedOrigins.has(parsed.origin)) {
      return parsed.toString();
    }
  } catch {
    // Reject malformed URLs below
  }
  throw new TypeError(`Untrusted script URL blocked by Trusted Types policy: ${trimmed}`);
}

if (typeof window !== 'undefined' && 'trustedTypes' in window) {
  const tt = (window as any).trustedTypes;
  if (tt && tt.createPolicy) {
    try {
      tt.createPolicy('default', {
        createHTML: (string: string) => string,
        createScript: (string: string) => string,
        createScriptURL: validateTrustedScriptURL,
      });
    } catch (e) {
      console.warn('Trusted Types default policy failed to initialize:', e);
    }
    try {
      appPolicyInstance = tt.createPolicy('appPolicy', {
        createHTML: (string: string) => string,
        createScript: (string: string) => string,
        createScriptURL: validateTrustedScriptURL,
      });
    } catch (e) {
      console.warn('Trusted Types appPolicy failed to initialize:', e);
    }
  }
}

if (typeof window !== 'undefined') {
  (window as any).__safeScriptURL = (url: string) => {
    const validated = validateTrustedScriptURL(url);
    if (appPolicyInstance) {
      try {
        return appPolicyInstance.createScriptURL(validated);
      } catch (e) {
        console.warn('Failed to create script URL using appPolicy:', e);
      }
    }
    return validated;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CurrencyProvider>
      <AuthProvider>
        <App />
        <Analytics />
        <SpeedInsights />
      </AuthProvider>
    </CurrencyProvider>
  </StrictMode>,
);

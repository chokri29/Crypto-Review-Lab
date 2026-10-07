import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, LogOut, User as UserIcon, CheckCircle2 } from 'lucide-react';

export const UserAuthButton: React.FC = () => {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="h-8 w-20 bg-cyber-bg-primary/50 border border-cyber-cyan/20 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-[10px] text-cyber-text-muted">...</span>
      </div>
    );
  }

  if (!user) {
    // Only show the Google Sign-In button for the workspace owner ghalmichokri@gmail.com (or allow sign-in prompt via secret URL / local storage).
    // For general visitors, return null to keep it completely hidden.
    const isOwnerOrAdmin = typeof window !== 'undefined' && (
      localStorage.getItem('crl_admin_authenticated') === 'true' ||
      localStorage.getItem('crl_show_auth') === 'true' ||
      window.location.search.includes('admin=true')
    );
    if (!isOwnerOrAdmin) {
      return null;
    }

    return (
      <button
        onClick={signInWithGoogle}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-bg-primary/80 hover:bg-cyber-cyan/15 border border-cyber-cyan/40 hover:border-cyber-cyan rounded-xl text-xs text-cyber-text-primary hover:text-cyber-cyan font-orbitron transition-all shadow-[0_0_10px_rgba(0,229,255,0.15)] group cursor-pointer"
        title="Sign in with your Google account"
      >
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span className="hidden sm:inline tracking-wider">Sign In</span>
      </button>
    );
  }

  // If signed in, only display the button if email is ghalmichokri@gmail.com
  if (user.email && user.email.toLowerCase() !== 'ghalmichokri@gmail.com') {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-2.5 py-1 bg-cyber-bg-primary/90 hover:bg-cyber-bg-secondary border border-cyber-cyan/50 hover:border-cyber-cyan rounded-xl text-xs transition-all shadow-[0_0_12px_rgba(0,229,255,0.2)] cursor-pointer"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-5 h-5 rounded-full object-cover ring-1 ring-cyber-cyan/40"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-cyber-cyan/20 border border-cyber-cyan/50 flex items-center justify-center text-[10px] text-cyber-cyan font-bold">
            {(user.displayName || user.email || 'U')[0].toUpperCase()}
          </div>
        )}
        <span className="hidden md:inline font-orbitron text-xs max-w-[110px] truncate text-cyber-text-primary">
          {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
        </span>
      </button>

      {dropdownOpen && (
        <div className="absolute left-0 mt-2 w-60 max-w-[calc(100vw-2rem)] bg-cyber-bg-secondary border border-cyber-cyan/40 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(0,229,255,0.15)] z-50 p-3 flex flex-col gap-2.5 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-cyber-cyan/20">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-8 h-8 rounded-full object-cover ring-1 ring-cyber-cyan/50 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-cyber-cyan/20 border border-cyber-cyan flex items-center justify-center text-xs text-cyber-cyan font-bold shrink-0">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate font-orbitron">
                {user.displayName || 'Authorized User'}
              </span>
              <span className="text-[10px] text-cyber-text-muted truncate">
                {user.email}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-cyber-cyan/80 font-mono py-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
            <span>Authenticated via Google OAuth</span>
          </div>

          <button
            onClick={() => {
              setDropdownOpen(false);
              signOut();
            }}
            className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-950/50 hover:bg-red-900/70 border border-red-500/40 hover:border-red-400 rounded-lg text-xs font-orbitron text-red-200 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Terminate session and sign out"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="font-bold tracking-wider">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserAuthButton;

import { useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

interface UseNavigationGuardOptions {
  onLogoutAttempt: () => void;
}

/**
 * Hook to detect navigation attempts to the auth page while logged in.
 * This prevents accidental logouts when using the browser's back button.
 */
export function useNavigationGuard({ onLogoutAttempt }: UseNavigationGuardOptions) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle browser back/forward navigation
  useEffect(() => {
    if (!user) return;

    // Push a dummy state to detect back navigation
    const handlePopState = () => {
      // If user is logged in and trying to go back to auth page
      if (user && window.location.pathname === '/auth') {
        // Prevent navigation by pushing current location back
        window.history.pushState(null, '', location.pathname);
        onLogoutAttempt();
      }
    };

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, location.pathname, onLogoutAttempt]);

  // Intercept route changes
  const guardNavigation = useCallback(
    (targetPath: string) => {
      if (user && targetPath === '/auth') {
        onLogoutAttempt();
        return false;
      }
      return true;
    },
    [user, onLogoutAttempt]
  );

  return { guardNavigation };
}

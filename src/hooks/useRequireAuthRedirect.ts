import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface UseRequireAuthRedirectParams {
  isAuthenticated: boolean;
  isLoading: boolean;
  redirectPath?: string;
}

export const useRequireAuthRedirect = ({
  isAuthenticated,
  isLoading,
  redirectPath,
}: UseRequireAuthRedirectParams): void => {
  const location = useLocation();
  const navigate = useNavigate();

  const targetPath = useMemo(() => {
    if (redirectPath) {
      return redirectPath;
    }
    return `${location.pathname}${location.search}${location.hash}`;
  }, [redirectPath, location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (isLoading || isAuthenticated) {
      return;
    }

    if (location.pathname === '/') {
      return;
    }

    const params = new URLSearchParams();
    if (targetPath) {
      params.set('redirect', targetPath);
    }

    const search = params.toString();
    const destination = search ? `/signin?${search}` : '/signin';
    navigate(destination, { replace: true });
  }, [isAuthenticated, isLoading, navigate, targetPath, location.pathname]);
};

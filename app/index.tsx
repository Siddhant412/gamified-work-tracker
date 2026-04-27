import { Redirect } from 'expo-router';

import { LoadingState } from '@/src/components/ui';
import { useAuth } from '@/src/providers/AuthProvider';

export default function IndexRoute() {
  const auth = useAuth();

  if (!auth.isReady) {
    return <LoadingState />;
  }

  if (!auth.isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/(tabs)" />;
}

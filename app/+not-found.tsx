import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppText, Screen } from '@/src/components/ui';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Screen scroll={false} style={styles.container}>
        <AppText style={styles.title}>This screen does not exist.</AppText>

        <Link href="/" style={styles.link}>
          <AppText style={styles.linkText}>Go home</AppText>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#136f3a',
  },
});

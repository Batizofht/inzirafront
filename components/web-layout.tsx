import { Stack } from 'expo-router';
import { View, StyleSheet, ScrollView } from 'react-native';
import { WebHeader } from '@/components/web-header';
import { WebFooter } from '@/components/web-footer';
import { isWeb } from '@/lib/platform';

export default function WebLayout({ children }: { children: React.ReactNode }) {
  if (!isWeb) {
    // Native mobile uses tabs layout
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <WebHeader />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {children}
        <WebFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});

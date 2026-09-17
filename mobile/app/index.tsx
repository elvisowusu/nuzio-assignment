import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

/** Screen 01 - splash / session restore, then route to login or the brief. */
export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.violetLight} />
      </View>
    );
  }

  return <Redirect href={user ? '/brief' : '/login'} />;
}

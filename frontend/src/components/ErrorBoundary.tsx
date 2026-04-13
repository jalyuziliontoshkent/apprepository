import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { captureException } from '../services/monitoring';
import { darkColors } from '../theme/theme';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    captureException(error, { source: 'ErrorBoundary' });
  }

  handleRetry = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    const c = darkColors;
    return (
      <View style={[s.root, { backgroundColor: c.bg }]}>
        <View style={[s.iconWrap, { backgroundColor: c.dangerSoft }]}>
          <AlertTriangle size={32} color={c.danger} />
        </View>
        <Text style={[s.title, { color: c.text }]}>Ilovada xatolik yuz berdi</Text>
        <Text style={[s.subtitle, { color: c.textSec }]}>
          Qayta urinib ko'ring. Muammo davom etsa, ilovani qayta ishga tushiring.
        </Text>
        <TouchableOpacity
          style={[s.btn, { backgroundColor: c.primary }]}
          onPress={this.handleRetry}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Qayta ochish"
        >
          <RefreshCw size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.btnText}>Qayta ochish</Text>
        </TouchableOpacity>
        {__DEV__ && this.state.error && (
          <Text style={[s.debug, { color: c.danger }]} selectable>
            {this.state.error.message}
          </Text>
        )}
      </View>
    );
  }
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  debug: { fontSize: 11, marginTop: 20, textAlign: 'center', fontFamily: 'monospace' },
});

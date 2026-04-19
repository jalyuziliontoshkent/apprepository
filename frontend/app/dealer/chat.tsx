import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { api } from '../../src/services/apiClient';
import { useTheme } from '../../src/utils/theme';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function DealerChat() {
  const c = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const userId = useAuthStore((s) => s.user?.id) ?? '';
  const [adminId, setAdminId] = useState('');
  const [adminName, setAdminName] = useState('Admin');
  const [appState, setAppState] = useState(AppState.currentState);
  const scrollRef = useRef<ScrollView>(null);
  const intervalRef = useRef<any>(null);

  const init = useCallback(async () => {
    try {
      const partners = await api('/chat/partners', { cacheKey: 'dealer-chat-partners', cacheTtlMs: 10000 });
      if (partners.length > 0) {
        setAdminId(partners[0].id);
        setAdminName(partners[0].name || 'Admin');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!adminId) return;
    try {
      const data = await api(`/messages/${adminId}`, { cacheKey: `dealer-messages-${adminId}`, cacheTtlMs: 5000 });
      setMessages(data);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
    } catch (e) { console.error(e); }
  }, [adminId]);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppState(state));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (adminId) {
      fetchMessages();
      const pollInterval = appState === 'active' ? 4000 : 15000;
      intervalRef.current = setInterval(fetchMessages, pollInterval);
      return () => clearInterval(intervalRef.current);
    }
  }, [adminId, appState, fetchMessages]);

  const sendMessage = async () => {
    if (!text.trim() || !adminId) return;
    try {
      await api('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: adminId, text: text.trim() }),
      });
      setText('');
      fetchMessages();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#fff" style={{ flex: 1 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.chatHeader}>
        <View style={styles.chatAvatar}>
          <Text style={styles.chatAvatarText}>{adminName.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.chatHeaderName}>{adminName}</Text>
          <Text style={styles.chatHeaderSub}>Administrator</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Admin bilan suhbatni boshlang</Text>
            </View>
          ) : messages.map(msg => (
            <View
              key={msg.id}
              style={[styles.bubble, msg.sender_id === userId ? styles.bubbleSent : styles.bubbleReceived]}
            >
              <Text style={[styles.bubbleText, msg.sender_id === userId ? styles.bubbleTextSent : styles.bubbleTextReceived]}>
                {msg.text}
              </Text>
              <Text style={[styles.bubbleTime, msg.sender_id === userId ? styles.bubbleTimeSent : styles.bubbleTimeReceived]}>
                {new Date(msg.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputArea}>
          <TextInput
            testID="dealer-chat-input"
            style={styles.chatInput}
            placeholder="Xabar yozing..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity testID="dealer-chat-send-btn" style={styles.sendBtn} onPress={sendMessage}>
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: c.cardBorder, gap: 14,
    backgroundColor: '#0C0E14',
  },
  chatAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(108,99,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  chatAvatarText: { fontSize: 18, fontWeight: '700', color: c.accent },
  chatHeaderName: { fontSize: 16, fontWeight: '700', color: c.text },
  chatHeaderSub: { fontSize: 12, color: c.textTer },
  messagesArea: { flex: 1 },
  messagesContent: { padding: 16, gap: 10, paddingBottom: 24 },
  emptyChat: { alignItems: 'center', paddingTop: 80 },
  emptyChatText: { fontSize: 16, color: c.textTer },
  bubble: { maxWidth: '80%', borderRadius: 20, padding: 12, paddingBottom: 6 },
  bubbleSent: { alignSelf: 'flex-end', backgroundColor: c.accent, borderBottomRightRadius: 4 },
  bubbleReceived: {
    alignSelf: 'flex-start', backgroundColor: '#11141C',
    borderWidth: 1, borderColor: c.cardBorder, borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextSent: { color: '#FFFFFF' },
  bubbleTextReceived: { color: c.text },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeSent: { color: 'rgba(255,255,255,0.72)' },
  bubbleTimeReceived: { color: c.textTer },
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: c.cardBorder, gap: 10,
    backgroundColor: '#0C0E14',
  },
  chatInput: {
    flex: 1, minHeight: 46, maxHeight: 100, backgroundColor: '#11141C',
    borderRadius: 22, borderWidth: 1, borderColor: c.cardBorder,
    paddingHorizontal: 18, paddingVertical: 10, fontSize: 15, color: c.text,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: c.accent,
    alignItems: 'center', justifyContent: 'center',
  },
});

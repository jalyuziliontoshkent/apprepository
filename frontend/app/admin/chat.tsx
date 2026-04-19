import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { api } from '../../src/services/apiClient';
import { useTheme } from '../../src/utils/theme';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function AdminChat() {
  const c = useTheme();
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const userId = useAuthStore((state) => state.user?.id) ?? '';
  const [appState, setAppState] = useState(AppState.currentState);
  const scrollRef = useRef<ScrollView>(null);
  const intervalRef = useRef<any>(null);

  const fetchPartners = useCallback(async () => {
    try {
      const data = await api('/chat/partners', { cacheKey: 'admin-chat-partners', cacheTtlMs: 10000 });
      setPartners(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async (partnerId: string) => {
    try {
      const data = await api(`/messages/${partnerId}`, { cacheKey: `admin-messages-${partnerId}`, cacheTtlMs: 5000 });
      setMessages(data);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppState(state));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (selectedPartner) {
      fetchMessages(selectedPartner.id);
      const pollInterval = appState === 'active' ? 4000 : 15000;
      intervalRef.current = setInterval(() => fetchMessages(selectedPartner.id), pollInterval);
      return () => clearInterval(intervalRef.current);
    }
  }, [selectedPartner, appState, fetchMessages]);

  const sendMessage = async () => {
    if (!text.trim() || !selectedPartner) return;
    try {
      await api('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: selectedPartner.id, text: text.trim() }),
      });
      setText('');
      fetchMessages(selectedPartner.id);
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (selectedPartner) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.chatHeader}>
          <TouchableOpacity testID="chat-back-btn" onPress={() => { setSelectedPartner(null); clearInterval(intervalRef.current); fetchPartners(); }} style={styles.backBtn}>
            <ArrowLeft size={22} color={c.text} />
          </TouchableOpacity>
          <View style={styles.chatAvatar}>
            <Text style={styles.chatAvatarText}>{selectedPartner.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName}>{selectedPartner.name}</Text>
            <Text style={styles.chatHeaderSub}>Diler</Text>
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <ScrollView
            ref={scrollRef}
            style={styles.messagesArea}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>Hali xabarlar yo'q</Text>
                <Text style={styles.emptyChatSub}>Birinchi xabarni yozing!</Text>
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
              testID="chat-message-input"
              style={styles.chatInput}
              placeholder="Xabar yozing..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity testID="chat-send-btn" style={styles.sendBtn} onPress={sendMessage}>
              <Send size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Chat</Text>
      <ScrollView contentContainerStyle={styles.partnerList}>
        {partners.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Dilerlar topilmadi</Text>
          </View>
        ) : partners.map(p => (
          <TouchableOpacity
            key={p.id} testID={`chat-partner-${p.id}`}
            style={styles.partnerCard}
            onPress={() => setSelectedPartner(p)}
            activeOpacity={0.7}
          >
            <View style={styles.partnerAvatar}>
              <Text style={styles.partnerAvatarText}>{p.name?.charAt(0)?.toUpperCase()}</Text>
            </View>
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{p.name}</Text>
              <Text style={styles.partnerLastMsg} numberOfLines={1}>
                {p.last_message || 'Xabar yo\'q'}
              </Text>
            </View>
            <View style={styles.partnerMeta}>
              {p.last_message_time ? (
                <Text style={styles.partnerTime}>
                  {new Date(p.last_message_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              ) : null}
              {p.unread_count > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{p.unread_count}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050608' },
  title: { fontSize: 28, fontWeight: '800', color: '#F6F7FF', paddingHorizontal: 20, paddingTop: 16, letterSpacing: -0.5 },
  partnerList: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: '#5E6583' },
  partnerCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#0E1015', borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', marginBottom: 8, gap: 14,
  },
  partnerAvatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(108,99,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  partnerAvatarText: { fontSize: 20, fontWeight: '700', color: '#6C63FF' },
  partnerInfo: { flex: 1 },
  partnerName: { fontSize: 16, fontWeight: '700', color: '#F6F7FF' },
  partnerLastMsg: { fontSize: 13, color: '#949AB7', marginTop: 2 },
  partnerMeta: { alignItems: 'flex-end', gap: 6 },
  partnerTime: { fontSize: 11, color: '#5E6583' },
  unreadBadge: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#6C63FF',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', gap: 12,
    backgroundColor: '#0C0E14',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  chatAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(108,99,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  chatAvatarText: { fontSize: 16, fontWeight: '700', color: '#6C63FF' },
  chatHeaderInfo: {},
  chatHeaderName: { fontSize: 16, fontWeight: '700', color: '#F6F7FF' },
  chatHeaderSub: { fontSize: 12, color: '#949AB7' },
  messagesArea: { flex: 1 },
  messagesContent: { padding: 16, gap: 8 },
  emptyChat: { alignItems: 'center', paddingTop: 80 },
  emptyChatText: { fontSize: 16, color: '#5E6583' },
  emptyChatSub: { fontSize: 13, color: '#5E6583', marginTop: 4 },
  bubble: { maxWidth: '80%', borderRadius: 20, padding: 12, paddingBottom: 6 },
  bubbleSent: {
    alignSelf: 'flex-end', backgroundColor: '#6C63FF', borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    alignSelf: 'flex-start', backgroundColor: '#11141C',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextSent: { color: '#fff' },
  bubbleTextReceived: { color: '#F6F7FF' },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeSent: { color: 'rgba(255,255,255,0.72)' },
  bubbleTimeReceived: { color: '#5E6583' },
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', gap: 10,
    backgroundColor: '#0C0E14',
  },
  chatInput: {
    flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: '#11141C',
    borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18, paddingVertical: 10, fontSize: 15, color: '#F6F7FF',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#6C63FF',
    alignItems: 'center', justifyContent: 'center',
  },
});

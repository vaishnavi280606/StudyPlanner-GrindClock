import { useRef, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Safe dynamic imports to prevent module-level crashes
let supabaseQueries: any = null;

interface ChatWindowProps {
  friend: any;
  onClose: () => void;
  onStartVideoCall: (name: string, avatar?: string, friendId?: string) => void;
  [key: string]: any;
}

export function ChatWindow({ friend, onClose, isDarkMode, isMinimized, setIsMinimized }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Dynamically import supabase queries to prevent module crash
  useEffect(() => {
    import('../utils/supabase-queries')
      .then((mod) => {
        supabaseQueries = mod;
        setReady(true);
      })
      .catch((err) => {
        console.error('Failed to load supabase queries:', err);
        setInitError('Failed to initialize chat module');
        setLoading(false);
      });
  }, []);

  // Load messages once ready
  useEffect(() => {
    if (!ready || !user?.id || !friend?.id) return;

    let cancelled = false;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const data = friend.isGroup
          ? await supabaseQueries.fetchGroupMessages(friend.id)
          : await supabaseQueries.fetchMessages(user.id, friend.id);
        if (!cancelled) setMessages(data || []);
      } catch (err) {
        console.error('Load messages error:', err);
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMessages();

    // Mark as read
    try {
      if (friend.isGroup) {
        supabaseQueries.markNotificationsAsRead?.(user.id, '', 'message', friend.id);
      } else {
        supabaseQueries.markNotificationsAsRead?.(user.id, friend.id);
      }
    } catch (_) {}

    // Realtime subscription
    let sub: any = null;
    try {
      sub = supabaseQueries.subscribeToMessages(user.id, (msg: any) => {
        const isRelevant = friend.isGroup
          ? msg.group_id === friend.id
          : msg.sender_id === friend.id;
        if (isRelevant) {
          setMessages((prev) => [...prev, msg]);
        }
      });
    } catch (_) {}

    return () => {
      cancelled = true;
      try { sub?.unsubscribe?.(); } catch (_) {}
    };
  }, [ready, user?.id, friend?.id]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !friend?.id || !newMessage.trim() || sending || !supabaseQueries) return;

    const content = newMessage.trim();
    setSending(true);
    setNewMessage('');

    // Optimistic add
    const tempId = 'temp-' + Date.now();
    setMessages((prev) => [...prev, {
      id: tempId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
    }]);

    try {
      const result = friend.isGroup
        ? await supabaseQueries.sendGroupMessage(friend.id, user.id, content)
        : await supabaseQueries.sendMessage(user.id, friend.id, content);

      if (result?.error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setNewMessage(content);
      }
    } catch (err) {
      console.error('Send error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const friendName = friend?.name || 'Chat';
  const friendAvatar = friend?.avatarUrl || '';
  const friendUsername = friend?.username || '';
  const dark = isDarkMode === true;

  // ===== MINIMIZED BAR =====
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized?.(false)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 280,
          zIndex: 99999,
          borderRadius: 16,
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          background: 'linear-gradient(to right, #f59e0b, #ea580c)',
          color: 'white',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {friendAvatar && <img src={friendAvatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' as const }} />}
          <span style={{ fontWeight: 700, fontSize: 13 }}>{friendName}</span>
        </div>
        <button
          onClick={(ev) => { ev.stopPropagation(); onClose(); }}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}
        >
          x
        </button>
      </div>
    );
  }

  // ===== FULL CHAT =====
  return (
    <div
      id="chat-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'row' as const,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          flexGrow: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
        }}
      />

      {/* Chat Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          maxWidth: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column' as const,
          backgroundColor: dark ? '#0f172a' : '#ffffff',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'linear-gradient(to right, #f59e0b, #ea580c)',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}
              title="Back"
            >
              &#8592;
            </button>
            {friendAvatar && (
              <img
                src={friendAvatar}
                alt=""
                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' as const, border: '2px solid rgba(255,255,255,0.3)' }}
              />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{friendName}</div>
              {friendUsername && <div style={{ fontSize: 10, opacity: 0.8 }}>@{friendUsername}</div>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 22, padding: '4px 8px' }}
            title="Close"
          >
            x
          </button>
        </div>

        {/* MESSAGES */}
        <div
          style={{
            flexGrow: 1,
            overflowY: 'auto' as const,
            padding: 16,
            backgroundColor: dark ? '#020617' : '#f8fafc',
          }}
        >
          {initError ? (
            <div style={{ textAlign: 'center', padding: 40, color: dark ? '#f87171' : '#dc2626' }}>
              <p>{initError}</p>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: dark ? '#94a3b8' : '#64748b' }}>
              <div style={{ fontSize: 24, marginBottom: 8, animation: 'spin 1s linear infinite' }}>&#8987;</div>
              <p style={{ fontSize: 13 }}>Loading messages...</p>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: dark ? '#94a3b8' : '#64748b' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>&#128172;</div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>No messages yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Say hi to {friendName}!</p>
            </div>
          ) : (
            <div>
              {messages.map((msg: any, idx: number) => {
                const isMe = msg.sender_id === user?.id;
                let time = '';
                try { time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (_) {}

                return (
                  <div
                    key={msg.id || idx}
                    style={{
                      display: 'flex',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '75%',
                        padding: '8px 14px',
                        borderRadius: 16,
                        fontSize: 14,
                        lineHeight: '1.4',
                        ...(isMe
                          ? {
                              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                              color: 'white',
                              borderBottomRightRadius: 4,
                            }
                          : {
                              backgroundColor: dark ? '#1e293b' : '#ffffff',
                              color: dark ? '#f1f5f9' : '#1e293b',
                              border: dark ? '1px solid #334155' : '1px solid #e2e8f0',
                              borderBottomLeftRadius: 4,
                            }),
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content || ''}</div>
                      {time && (
                        <div style={{ fontSize: 9, marginTop: 4, opacity: 0.6, textAlign: isMe ? 'right' : 'left' }}>
                          {time}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* INPUT */}
        <form
          onSubmit={handleSend}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 12,
            borderTop: dark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            backgroundColor: dark ? '#0f172a' : '#ffffff',
          }}
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            style={{
              flexGrow: 1,
              padding: '10px 16px',
              borderRadius: 12,
              border: 'none',
              outline: 'none',
              fontSize: 14,
              backgroundColor: dark ? '#1e293b' : '#f1f5f9',
              color: dark ? '#f1f5f9' : '#0f172a',
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(to right, #f59e0b, #ea580c)',
              color: 'white',
              cursor: !newMessage.trim() || sending ? 'default' : 'pointer',
              opacity: !newMessage.trim() || sending ? 0.4 : 1,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {sending ? '...' : '\u27A4'}
          </button>
        </form>
      </div>
    </div>
  );
}

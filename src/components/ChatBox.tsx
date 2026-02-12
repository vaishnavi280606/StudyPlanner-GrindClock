import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, Smile, Image, Mic, Square, Loader2, Video, History, PanelLeftClose, PanelLeft, Palette, Search, Play, Pause, CheckCheck, Download, Crown, UserPlus, UserMinus, Users, Trash2, Flame, Clock, BookOpen, Calendar, MessageCircle, GraduationCap, Brain, MapPin, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { fetchGroupMembers, addGroupMember, removeGroupMember, searchUsers } from '../utils/supabase-queries';

/* ─────── Sound helpers (reads settings from localStorage) ─────── */
// Audio file URLs for notification sounds
const SOUND_URLS = {
  send: 'https://cdn.pixabay.com/audio/2022/03/24/audio_4193bac9f8.mp3',     // short pop
  receive: 'https://cdn.pixabay.com/audio/2022/11/17/audio_fe6bde tried.mp3', // message ding – fallback below
  ringtone: 'https://cdn.pixabay.com/audio/2022/10/30/audio_f3f8e5a830.mp3',  // ringtone
};

function playSendSound() {
  try {
    const masterOff = localStorage.getItem('grind_clock_sound_enabled') === 'false';
    const sendOff = localStorage.getItem('grind_clock_send_msg_sound') === 'false';
    if (masterOff || sendOff) return;
    const vol = parseFloat(localStorage.getItem('grind_clock_sound_volume') || '0.7');
    const a = new Audio(SOUND_URLS.send);
    a.volume = vol;
    a.play().catch(() => {
      // Fallback to Web Audio API beep
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
        g.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
      } catch (_) {}
    });
  } catch (_) {}
}

function playReceiveSound() {
  try {
    const masterOff = localStorage.getItem('grind_clock_sound_enabled') === 'false';
    const recvOff = localStorage.getItem('grind_clock_receive_msg_sound') === 'false';
    if (masterOff || recvOff) return;
    const vol = parseFloat(localStorage.getItem('grind_clock_sound_volume') || '0.7');
    const a = new Audio('https://cdn.pixabay.com/audio/2024/11/04/audio_4956b4edd2.mp3');
    a.volume = vol;
    a.play().catch(() => {
      // Fallback to Web Audio API ding
      try {
        const ctx = new AudioContext();
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();
        o1.connect(g); o2.connect(g); g.connect(ctx.destination);
        o1.frequency.setValueAtTime(587, ctx.currentTime);
        o2.frequency.setValueAtTime(784, ctx.currentTime + 0.08);
        g.gain.setValueAtTime(vol * 0.25, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        o1.start(); o1.stop(ctx.currentTime + 0.12);
        o2.start(ctx.currentTime + 0.08); o2.stop(ctx.currentTime + 0.25);
      } catch (_) {}
    });
  } catch (_) {}
}

/* ─────── WhatsApp-style Voice Player ─────── */
function VoiceMessagePlayer({ src, isMe, dark }: { src: string; isMe: boolean; dark: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const barsRef = useRef(Array.from({ length: 40 }, () => 0.12 + Math.random() * 0.88));

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => { setCurrentTime(a.currentTime); setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0); };
    const onMeta = () => { setDuration(a.duration || 0); setLoaded(true); };
    const onEnd = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onMeta); a.removeEventListener('ended', onEnd); };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? a.pause() : a.play();
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const fmt = (t: number) => {
    if (!t || !isFinite(t)) return '0:00';
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 min-w-[220px] max-w-[300px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle} className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all shadow-md active:scale-95 ${isMe ? 'bg-white/25 hover:bg-white/35' : 'bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20'}`}>
        {playing ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-end gap-[2px] h-7 cursor-pointer" onClick={seek}>
          {barsRef.current.map((h, i) => {
            const pos = (i / barsRef.current.length) * 100;
            const active = pos <= progress;
            const nearHead = playing && Math.abs(pos - progress) < 4;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-all ${nearHead ? 'duration-0' : 'duration-100'} ${active ? (isMe ? 'bg-white' : 'bg-amber-500') : (isMe ? 'bg-white/20' : dark ? 'bg-slate-500' : 'bg-slate-300')} ${nearHead ? 'scale-y-110' : ''}`}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-0.5">
          <span className={`text-[9px] ${isMe ? 'text-white/50' : dark ? 'text-slate-500' : 'text-slate-400'}`}>
            {fmt(playing ? currentTime : 0)}
          </span>
          <span className={`text-[9px] ${isMe ? 'text-white/50' : dark ? 'text-slate-500' : 'text-slate-400'}`}>
            {loaded ? fmt(duration) : '...'}
          </span>
        </div>
      </div>
      {!loaded && <Loader2 size={14} className="animate-spin text-amber-500 shrink-0" />}
    </div>
  );
}

/* ─────── types ─────── */
interface FriendLike {
  id: string;
  name: string;
  avatarUrl?: string;
  status?: string;
  isGroup?: boolean;
  username?: string;
  [key: string]: any;
}

interface ChatBoxProps {
  friend: FriendLike;
  friends: FriendLike[];
  groups: FriendLike[];
  onClose: () => void;
  onSelectFriend: (f: FriendLike) => void;
  onStartVideoCall: (name: string, avatar?: string, friendId?: string) => void;
  isDarkMode: boolean;
  unreadCounts?: Record<string, number>;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  content_type?: 'text' | 'image' | 'voice' | 'video';
  created_at: string;
  senderUsername?: string;
  senderName?: string;
}

const BG_THEMES = [
  { name: 'Default', value: '' },
  { name: 'Night Sky', value: 'bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900' },
  { name: 'Forest', value: 'bg-gradient-to-b from-emerald-950 via-green-900 to-slate-900' },
  { name: 'Sunset', value: 'bg-gradient-to-b from-orange-950 via-rose-900 to-slate-900' },
  { name: 'Ocean', value: 'bg-gradient-to-b from-cyan-950 via-blue-900 to-slate-900' },
  { name: 'Berry', value: 'bg-gradient-to-b from-purple-950 via-fuchsia-900 to-slate-900' },
  { name: 'Profile Pic', value: '__profile__' },
];

/* ─────── component ─────── */
export function ChatBox({ friend, friends, groups, onClose, onSelectFriend, onStartVideoCall, isDarkMode, unreadCounts = {} }: ChatBoxProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatBg, setChatBg] = useState('');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Group member sidebar state
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);

  // Profile card popup state
  const [profileCard, setProfileCard] = useState<any>(null);
  const [profileCardLoading, setProfileCardLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingCancelledRef = useRef(false);
  const uploadCancelledRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const dark = isDarkMode;

  const EMOJIS = [
    '\u{1F60A}', '\u{1F602}', '\u{2764}\u{FE0F}', '\u{1F44D}', '\u{1F389}',
    '\u{1F525}', '\u{2728}', '\u{1F4AF}', '\u{1F680}', '\u{1F44F}',
    '\u{1F60D}', '\u{1F914}', '\u{1F60E}', '\u{1F64C}', '\u{1F4AA}',
    '\u{1F3AF}', '\u{1F4DA}', '\u{2705}', '\u{26A1}', '\u{1F31F}',
  ];

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  /* ─── load messages ─── */
  useEffect(() => {
    if (!user?.id || !friend?.id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        let data: any[] = [];
        if (friend.isGroup) {
          const res = await supabase
            .from('group_messages')
            .select('*')
            .eq('group_id', friend.id)
            .order('created_at', { ascending: true });
          data = res.data || [];
        } else {
          const res = await supabase
            .from('messages')
            .select(`*, sender:user_profiles!messages_sender_id_fkey(full_name, username, avatar_url)`)
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });

          if (res.error) {
            const res2 = await supabase
              .from('messages')
              .select('*')
              .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`)
              .order('created_at', { ascending: true });
            data = res2.data || [];
          } else {
            data = (res.data || []).map((m: any) => ({
              ...m,
              senderUsername: m.sender?.username || null,
              senderName: m.sender?.full_name || null,
            }));
          }
        }
        if (!cancelled) {
          setMessages(data);
          scrollToBottom();
        }
      } catch (err) {
        console.error('Load messages error:', err);
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('sender_id', friend.id)
      .eq('type', 'message')
      .then(() => {
        window.dispatchEvent(new CustomEvent('notifications-read', { detail: { friendId: friend.id } }));
      });

    // For DMs: listen on BOTH directions (incoming AND outgoing) so messages sync across devices/tabs
    // For Groups: listen on group_id
    const channelName = `chat-${friend.id}-${user.id}-${Date.now()}`;
    let channel: any;

    if (friend.isGroup) {
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${friend.id}`,
        }, (payload: any) => {
          const msg = payload.new;
          // Skip messages we optimistically inserted (temp- prefix)
          if (msg.sender_id === user.id) return;
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          playReceiveSound();
          scrollToBottom();
        })
        .subscribe();
    } else {
      // Subscribe to messages where current user is receiver (incoming)
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        }, (payload: any) => {
          const msg = payload.new;
          if (msg.sender_id === friend.id) {
            setMessages(prev => {
              if (prev.find(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            playReceiveSound();
            scrollToBottom();
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        }, (payload: any) => {
          // Replace optimistic temp message with real DB message for sent messages
          const msg = payload.new;
          if (msg.receiver_id === friend.id) {
            setMessages(prev => {
              // Remove any temp message with same content to avoid duplicates
              const withoutTemp = prev.filter(m => !(m.id.startsWith('temp-') && m.content === msg.content && m.sender_id === msg.sender_id));
              if (withoutTemp.find(m => m.id === msg.id)) return withoutTemp;
              return [...withoutTemp, msg];
            });
          }
        })
        .subscribe();
    }

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id, friend?.id]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  /* ─── load group members when viewing a group ─── */
  useEffect(() => {
    if (!friend?.isGroup || !friend?.id || !user?.id) {
      setGroupMembers([]);
      setCurrentUserIsAdmin(false);
      return;
    }

    const loadMembers = async () => {
      setLoadingMembers(true);
      try {
        const members = await fetchGroupMembers(friend.id);
        setGroupMembers(members);
        const me = members.find((m: any) => m.userId === user.id);
        setCurrentUserIsAdmin(me?.role === 'admin');
      } catch (err) {
        console.error('Error loading group members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadMembers();

    // Subscribe to group_members changes for real-time updates
    const memberChannel = supabase
      .channel(`group-members-${friend.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_members',
        filter: `group_id=eq.${friend.id}`,
      }, () => {
        // Reload members on any change
        loadMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(memberChannel);
    };
  }, [friend?.id, friend?.isGroup, user?.id]);

  /* ─── group member management ─── */
  const handleMemberSearch = async () => {
    if (!memberSearchQuery.trim() || !user) return;
    setSearchingMembers(true);
    try {
      const results = await searchUsers(memberSearchQuery, user.id);
      // Filter out users already in the group
      const memberIds = groupMembers.map((m: any) => m.userId);
      setMemberSearchResults(results.filter((r: any) => !memberIds.includes(r.userId)));
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchingMembers(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!friend?.id) return;
    setAddingMember(userId);
    try {
      const { error } = await addGroupMember(friend.id, userId);
      if (!error) {
        // Reload members
        const members = await fetchGroupMembers(friend.id);
        setGroupMembers(members);
        setMemberSearchResults(prev => prev.filter(r => r.userId !== userId));

        // Send notification to the added user
        await supabase.from('notifications').insert({
          user_id: userId,
          sender_id: user!.id,
          type: 'group_invite',
          content: `You were added to group "${friend.name}"`,
        }).then(() => {});

        // Notify all other group members about the new member
        const addedUser = members.find((m: any) => m.userId === userId);
        const addedName = addedUser?.profile?.full_name || 'Someone';
        const otherMembers = members.filter((m: any) => m.userId !== userId && m.userId !== user!.id);
        if (otherMembers.length > 0) {
          const notifications = otherMembers.map((m: any) => ({
            user_id: m.userId,
            sender_id: user!.id,
            type: 'group_invite',
            content: `${addedName} was added to "${friend.name}"`,
          }));
          await supabase.from('notifications').insert(notifications).then(() => {});
        }
      }
    } catch (err) {
      console.error('Error adding member:', err);
    } finally {
      setAddingMember(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!friend?.id || userId === user?.id) return;
    setRemovingMember(userId);
    try {
      // Get the removed member's name before removing
      const removedMember = groupMembers.find(m => m.userId === userId);
      const removedName = removedMember?.profile?.full_name || 'Someone';

      const { error } = await removeGroupMember(friend.id, userId);
      if (!error) {
        const updatedMembers = groupMembers.filter(m => m.userId !== userId);
        setGroupMembers(updatedMembers);

        // Send notification to the removed user
        await supabase.from('notifications').insert({
          user_id: userId,
          sender_id: user!.id,
          type: 'group_remove',
          content: `You were removed from group "${friend.name}"`,
        }).then(() => {});

        // Notify all remaining group members about the removal
        const otherMembers = updatedMembers.filter((m: any) => m.userId !== user!.id);
        if (otherMembers.length > 0) {
          const notifications = otherMembers.map((m: any) => ({
            user_id: m.userId,
            sender_id: user!.id,
            type: 'group_invite',
            content: `${removedName} was removed from "${friend.name}"`,
          }));
          await supabase.from('notifications').insert(notifications).then(() => {});
        }
      }
    } catch (err) {
      console.error('Error removing member:', err);
    } finally {
      setRemovingMember(null);
    }
  };

  /* ─── send text ─── */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !friend?.id || !newMessage.trim() || sending) return;
    const content = newMessage.trim();
    setSending(true);
    setNewMessage('');
    setShowEmoji(false);

    const tempId = 'temp-' + Date.now();
    setMessages(prev => [...prev, { id: tempId, sender_id: user.id, content, content_type: 'text', created_at: new Date().toISOString() }]);
    scrollToBottom();
    playSendSound();

    try {
      if (friend.isGroup) {
        await supabase.from('group_messages').insert({ group_id: friend.id, sender_id: user.id, content, content_type: 'text' });
        // Notify all group members except the sender
        if (groupMembers.length > 0) {
          const otherMembers = groupMembers.filter(m => m.userId !== user.id);
          const notifications = otherMembers.map(m => ({
            user_id: m.userId,
            sender_id: user.id,
            type: 'group_message',
            content: `[${friend.name}] ${content.length > 60 ? content.substring(0, 60) + '...' : content}`,
          }));
          if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications).then(() => {});
          }
        }
      } else {
        await supabase.from('messages').insert({ sender_id: user.id, receiver_id: friend.id, content, content_type: 'text' });
        await supabase.from('notifications').insert({
          user_id: friend.id, sender_id: user.id, type: 'message',
          content: content.length > 80 ? content.substring(0, 80) + '...' : content,
        }).then(() => {});
      }
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  /* ─── media upload (image + video) — shows instant preview ─── */
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !friend?.id) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) { alert('Please select an image or video file'); return; }
    if (isImage && file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
    if (isVideo && file.size > 25 * 1024 * 1024) { alert('Video must be under 25MB'); return; }

    const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';
    // Instant preview with local blob URL
    const localUrl = URL.createObjectURL(file);
    const tempId = 'temp-' + Date.now();
    setMessages(prev => [...prev, { id: tempId, sender_id: user.id, content: localUrl, content_type: mediaType, created_at: new Date().toISOString() }]);
    scrollToBottom();
    playSendSound();
    uploadCancelledRef.current = false;
    setUploading(true);
    try {
      const folder = isVideo ? 'video' : 'chat';
      const fileName = `${folder}/${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('chat-files').upload(fileName, file);
      if (uploadCancelledRef.current) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        uploadCancelledRef.current = false;
        return;
      }
      let finalUrl = localUrl;
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(fileName);
        finalUrl = urlData.publicUrl;
      }
      // Replace preview with real URL and send to DB
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: finalUrl } : m));
      if (friend.isGroup) {
        await supabase.from('group_messages').insert({ group_id: friend.id, sender_id: user.id, content: finalUrl, content_type: mediaType });
      } else {
        await supabase.from('messages').insert({ sender_id: user.id, receiver_id: friend.id, content: finalUrl, content_type: mediaType });
        // Notify recipient
        await supabase.from('notifications').insert({
          user_id: friend.id, sender_id: user.id, type: 'message',
          content: mediaType === 'image' ? '📷 Sent a photo' : '🎬 Sent a video',
        }).then(() => {});
      }
    } catch (err) {
      console.error('Media upload error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ─── voice ─── */
  const startRecording = async () => {
    try {
      recordingCancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio level analyser for waveform visualization
      try {
        const actx = new AudioContext();
        const src = actx.createMediaStreamSource(stream);
        const analyser = actx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;
        const dataArr = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(dataArr);
          const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length;
          setAudioLevel(avg / 255);
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (_) {}

      // Recording duration timer
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        // If recording was cancelled, don't send
        if (recordingCancelledRef.current) {
          recordingCancelledRef.current = false;
          return;
        }
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) return;
        // Instant preview with local blob
        const localUrl = URL.createObjectURL(blob);
        const tempId = 'temp-' + Date.now();
        setMessages(prev => [...prev, { id: tempId, sender_id: user!.id, content: localUrl, content_type: 'voice', created_at: new Date().toISOString() }]);
        scrollToBottom();
        playSendSound();
        setUploading(true);
        try {
          const fileName = `voice/${user!.id}/${Date.now()}.webm`;
          const { error: uploadErr } = await supabase.storage.from('chat-files').upload(fileName, blob);
          let finalUrl = localUrl;
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(fileName);
            finalUrl = urlData.publicUrl;
          }
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: finalUrl } : m));
          if (friend.isGroup) {
            await supabase.from('group_messages').insert({ group_id: friend.id, sender_id: user!.id, content: finalUrl, content_type: 'voice' });
          } else {
            await supabase.from('messages').insert({ sender_id: user!.id, receiver_id: friend.id, content: finalUrl, content_type: 'voice' });
            // Notify recipient
            await supabase.from('notifications').insert({
              user_id: friend.id, sender_id: user!.id, type: 'message',
              content: '🎤 Sent a voice message',
            }).then(() => {});
          }
        } catch (err) {
          setMessages(prev => prev.filter(m => m.id !== tempId));
        }
        finally { setUploading(false); }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (err) {
      console.error('Mic error:', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setRecording(false);
    setRecordingDuration(0);
    setAudioLevel(0);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    analyserRef.current = null;
  };

  const cancelRecording = () => {
    recordingCancelledRef.current = true;
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setRecording(false);
    setRecordingDuration(0);
    setAudioLevel(0);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    analyserRef.current = null;
  };

  const cancelUpload = () => {
    uploadCancelledRef.current = true;
    setUploading(false);
  };

  /* ─── sidebar contacts ─── */
  const allContacts: FriendLike[] = [
    ...friends.map(f => ({ ...f })),
    ...groups.map(g => ({ ...g, isGroup: true })),
  ];
  const filteredContacts = sidebarSearch.trim()
    ? allContacts.filter(c => c.name.toLowerCase().includes(sidebarSearch.toLowerCase()) || (c.username || '').toLowerCase().includes(sidebarSearch.toLowerCase()))
    : allContacts;

  /* ─── history grouping ─── */
  const messagesByDate = messages.reduce<Record<string, ChatMessage[]>>((acc, msg) => {
    const day = new Date(msg.created_at).toLocaleDateString();
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  /* ─── date label helper ─── */
  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((today.getTime() - msgDay.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  /* ─── infer content type from URL when column is missing ─── */
  const inferContentType = (content: string, explicit?: string): string => {
    if (explicit && explicit !== 'text' && explicit !== 'null') return explicit;
    if (!content) return 'text';
    const lower = content.toLowerCase().trim();

    // Not a URL — must be text
    if (!lower.startsWith('http') && !lower.startsWith('blob:')) return 'text';

    // Supabase storage bucket folder-based detection (most reliable for our uploads)
    if (lower.includes('chat-files')) {
      if (lower.includes('/voice/')) return 'voice';
      if (lower.includes('/video/')) return 'video';
      if (lower.includes('/chat/')) return 'image';
    }

    // Voice messages stored under voice/ folder or named voice
    if (lower.includes('/voice/')) return 'voice';
    // Audio files (.ogg, .webm in voice context)
    if (lower.match(/\.(ogg)($|\?)/)) return 'voice';
    if (lower.match(/\.(webm)($|\?)/) && (lower.includes('voice') || lower.includes('audio'))) return 'voice';

    // Video files
    if (lower.includes('/video/') || lower.match(/\.(mp4|mov|avi)($|\?)/)) return 'video';
    if (lower.match(/\.(webm)($|\?)/) && lower.includes('/video/')) return 'video';

    // Images
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)($|\?)/)) return 'image';

    // Generic Supabase storage URL without recognizable extension — check folder hints
    if (lower.includes('supabase') && lower.includes('storage')) {
      if (lower.match(/\.(mp4|webm|mov)($|\?)/)) return 'video';
      if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)($|\?)/)) return 'image';
      if (lower.match(/\.(ogg|mp3|wav|m4a)($|\?)/)) return 'voice';
    }

    return 'text';
  };

  /* ─── render bubble ─── */
  const renderMessage = (msg: ChatMessage, idx: number) => {
    const isMe = msg.sender_id === user?.id;
    const prev = idx > 0 ? messages[idx - 1] : null;
    const showName = !isMe && (!prev || prev.sender_id !== msg.sender_id);
    const contentType = inferContentType(msg.content || '', msg.content_type);
    const content = msg.content || '';
    let time = '';
    try { time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (_) {}

    // In groups, resolve sender name from group members list
    let senderLabel = 'You';
    if (!isMe) {
      if (friend.isGroup && groupMembers.length > 0) {
        const member = groupMembers.find(m => m.userId === msg.sender_id);
        senderLabel = member?.profile?.full_name || msg.senderName || 'Unknown';
      } else {
        senderLabel = msg.senderName || friend.name;
      }
    }

    const isMediaMsg = (contentType === 'image' || contentType === 'video') && (content.startsWith('http') || content.startsWith('blob:'));
    const bubbleCls = `max-w-[75%] text-sm relative overflow-hidden ${isMe
      ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-2xl rounded-br-sm'
      : dark ? 'bg-slate-700 text-white rounded-2xl rounded-bl-sm border border-slate-600' : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm border border-slate-200 shadow-sm'
    }`;

    const renderContent = () => {
      /* Image with URL */
      if (contentType === 'image' && (content.startsWith('http') || content.startsWith('blob:'))) {
        return (
          <div className="p-1 cursor-pointer group" onClick={() => setImagePreview(content)}>
            <img src={content} alt="Shared" className="rounded-xl max-h-72 max-w-full object-cover transition-all duration-200 group-hover:brightness-90" loading="lazy" style={{ minWidth: 140, minHeight: 90 }} />
          </div>
        );
      }
      /* Video with URL */
      if (contentType === 'video' && (content.startsWith('http') || content.startsWith('blob:'))) {
        return (
          <div className="p-1">
            <video src={content} controls className="rounded-xl max-h-72 max-w-full" style={{ minWidth: 200 }} preload="metadata" playsInline />
          </div>
        );
      }
      /* Voice with URL — WhatsApp style */
      if (contentType === 'voice' && (content.startsWith('http') || content.startsWith('blob:'))) {
        return <VoiceMessagePlayer src={content} isMe={isMe} dark={dark} />;
      }
      /* Fallback labels for non-URL media */
      if (contentType === 'image') {
        return <div className="px-3 py-2 flex items-center gap-2"><Image size={14} className={isMe ? 'text-white/80' : 'text-amber-500'} /><span className="text-xs">{content}</span></div>;
      }
      if (contentType === 'voice') {
        return <div className="px-3 py-2 flex items-center gap-2"><Mic size={14} className={isMe ? 'text-white/80' : 'text-amber-500'} /><span className="text-xs">{content}</span></div>;
      }
      if (contentType === 'video') {
        return <div className="px-3 py-2 flex items-center gap-2"><Video size={14} className={isMe ? 'text-white/80' : 'text-amber-500'} /><span className="text-xs">{content}</span></div>;
      }
      /* Text */
      return <div className="px-3 py-2"><p className="whitespace-pre-wrap break-words">{content}</p></div>;
    };

    return (
      <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${prev && prev.sender_id === msg.sender_id ? 'mt-0.5' : 'mt-3'}`}>
        {(showName || (isMe && (!prev || prev.sender_id !== msg.sender_id))) && (
          <span className={`text-[10px] font-semibold mb-0.5 ${isMe ? 'mr-2' : 'ml-2'} ${isMe ? 'text-slate-400' : (dark ? 'text-amber-400' : 'text-amber-600')}`}>
            {senderLabel}
          </span>
        )}
        <div className={bubbleCls}>
          {renderContent()}
          {/* Time + read receipt */}
          <div className={`flex items-center justify-end gap-1 px-3 pb-1.5 ${isMediaMsg ? 'absolute bottom-0 right-0 bg-gradient-to-t from-black/40 to-transparent rounded-b-xl pt-4 left-0' : ''}`}>
            {time && <span className={`text-[9px] ${isMediaMsg ? 'text-white/80' : isMe ? 'text-white/50' : dark ? 'text-slate-500' : 'text-slate-400'}`}>{time}</span>}
            {isMe && <CheckCheck size={12} className={isMediaMsg ? 'text-white/80' : 'text-white/50'} />}
          </div>
        </div>
      </div>
    );
  };

  /* ═══════ RENDER ═══════ */

  /* ── Profile Card loader ── */
  const openProfileCard = async (contact: FriendLike) => {
    if (contact.isGroup) return;
    setProfileCardLoading(true);
    setProfileCard({ id: contact.id, name: contact.name, avatarUrl: contact.avatarUrl, username: contact.username, role: contact.role, studyStreak: contact.studyStreak ?? 0 });
    try {
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', contact.id).single();
      const { data: sessions } = await supabase.from('study_sessions').select('duration_minutes, start_time, created_at, focus_rating, subject_id').eq('user_id', contact.id).order('start_time', { ascending: false });
      const totalMinutes = sessions?.reduce((s: number, r: any) => s + (r.duration_minutes || 0), 0) || 0;
      const totalSessions = sessions?.length || 0;
      // compute avg focus rating
      const focusRatings = sessions?.filter((s: any) => s.focus_rating > 0) || [];
      const avgFocus = focusRatings.length > 0 ? Math.round((focusRatings.reduce((a: number, s: any) => a + s.focus_rating, 0) / focusRatings.length) * 10) / 10 : 0;
      // compute unique subjects studied
      const subjectCount = new Set(sessions?.filter((s: any) => s.subject_id).map((s: any) => s.subject_id) || []).size;
      // Always compute streak from sessions (same algorithm as Dashboard's calculateStreak)
      let streak = 0;
      if (sessions && sessions.length > 0) {
        const sessionDates = new Set<number>();
        sessions.forEach((s: any) => { const d = new Date(s.start_time || s.created_at); d.setHours(0,0,0,0); sessionDates.add(d.getTime()); });
        let st = 0; const ch = new Date(); ch.setHours(0,0,0,0);
        if (sessionDates.has(ch.getTime())) { st = 1; ch.setDate(ch.getDate()-1); } else { ch.setDate(ch.getDate()-1); if (sessionDates.has(ch.getTime())) { st = 1; ch.setDate(ch.getDate()-1); } }
        while (st > 0 && sessionDates.has(ch.getTime())) { st++; ch.setDate(ch.getDate()-1); }
        streak = st;
      }
      setProfileCard((prev: any) => prev ? ({
        ...prev,
        bio: profile?.bio || '',
        role: profile?.role || contact.role || 'student',
        profession: profile?.profession || '',
        experience: profile?.experience || '',
        joined: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '',
        totalMinutes,
        totalSessions,
        studyStreak: streak,
        avgFocus,
        subjectCount,
        location: profile?.location || profile?.city || '',
        avatarUrl: profile?.avatar_url || contact.avatarUrl,
      }) : null);
    } catch (err) { console.error('Error loading profile card:', err); }
    finally { setProfileCardLoading(false); }
  };

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };
  return (
    <div className={`flex h-full rounded-2xl overflow-hidden border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-xl`}>

      {/* ═══ LEFT SIDEBAR — friends list / group members ═══ */}
      {sidebarOpen && (
        <div className={`shrink-0 flex flex-col border-r ${dark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`} style={{ width: 260 }}>
          {/* sidebar header */}
          <div className={`px-4 py-3 border-b ${dark ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <h3 className={`text-sm font-bold mb-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
              {friend.isGroup ? (
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-amber-500" />
                  Members ({groupMembers.length})
                </span>
              ) : 'Chats'}
            </h3>
            {!friend.isGroup && (
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search..."
                  className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${dark ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-white text-slate-800 placeholder:text-slate-400 border border-slate-200'}`}
                />
              </div>
            )}
            {/* Add Member button for group admins */}
            {friend.isGroup && currentUserIsAdmin && (
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className={`w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  showAddMember
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                }`}
              >
                {showAddMember ? <X size={12} /> : <UserPlus size={12} />}
                {showAddMember ? 'Cancel' : 'Add Member'}
              </button>
            )}
          </div>

          {/* Add Member Search Panel */}
          {friend.isGroup && showAddMember && currentUserIsAdmin && (
            <div className={`px-3 py-3 border-b ${dark ? 'border-slate-700/50 bg-slate-800/50' : 'border-slate-200 bg-slate-100/50'}`}>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMemberSearch()}
                  placeholder="Search users..."
                  className={`w-full pl-8 pr-16 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${dark ? 'bg-slate-700 text-white placeholder:text-slate-500' : 'bg-white text-slate-800 placeholder:text-slate-400 border border-slate-200'}`}
                />
                <button
                  onClick={handleMemberSearch}
                  disabled={searchingMembers}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold hover:bg-amber-600 disabled:opacity-50"
                >
                  {searchingMembers ? '...' : 'Search'}
                </button>
              </div>
              {memberSearchResults.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-hide">
                  {memberSearchResults.map((r: any) => (
                    <div key={r.userId} className={`flex items-center gap-2 p-1.5 rounded-lg ${dark ? 'hover:bg-slate-700' : 'hover:bg-white'}`}>
                      <img src={r.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.fullName || '')}&size=32`} alt="" className="w-7 h-7 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className={`text-[11px] font-semibold truncate ${dark ? 'text-white' : 'text-slate-800'}`}>{r.fullName}</p>
                          {r.role === 'mentor' && (
                            <span className="px-1 py-0.5 bg-purple-500/10 text-purple-500 text-[8px] font-bold rounded-full border border-purple-500/20 shrink-0">
                              Mentor
                            </span>
                          )}
                        </div>
                        <p className={`text-[9px] truncate ${dark ? 'text-slate-500' : 'text-slate-400'}`}>@{r.username}</p>
                      </div>
                      <button
                        onClick={() => handleAddMember(r.userId)}
                        disabled={addingMember === r.userId}
                        className="p-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-all disabled:opacity-50"
                        title="Add to group"
                      >
                        {addingMember === r.userId ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {memberSearchResults.length === 0 && memberSearchQuery && !searchingMembers && (
                <p className={`text-[10px] text-center py-2 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>No users found</p>
              )}
            </div>
          )}

          {/* contacts / members list */}
          <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ minHeight: 0 }}>
            {friend.isGroup ? (
              /* ═══ GROUP MEMBERS LIST ═══ */
              loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-amber-500" />
                </div>
              ) : (
                groupMembers.map((member) => {
                  const isMe = member.userId === user?.id;
                  const isAdmin = member.role === 'admin';
                  return (
                    <div
                      key={member.userId}
                      className={`flex items-center gap-3 px-4 py-3 border-l-2 border-transparent transition-all ${
                        isMe
                          ? (dark ? 'bg-amber-500/5' : 'bg-amber-50/50')
                          : (dark ? 'hover:bg-slate-800' : 'hover:bg-slate-100')
                      }`}
                    >
                      <div className="relative shrink-0">
                        {member.profile?.avatar_url ? (
                          <img src={member.profile.avatar_url} alt="" className={`w-9 h-9 rounded-full object-cover border ${dark ? 'border-slate-700' : 'border-slate-200'}`} />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-amber-500 to-orange-500`}>
                            {(member.profile?.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        {isAdmin && (
                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                            <Crown size={10} className="text-amber-500" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className={`text-xs font-semibold truncate ${dark ? 'text-white' : 'text-slate-800'}`}>
                            {member.profile?.full_name || 'Unknown'}{isMe ? ' (You)' : ''}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isAdmin && (
                            <span className={`text-[9px] px-1 py-0 rounded font-bold ${dark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                              Admin
                            </span>
                          )}
                          <p className={`text-[10px] truncate ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                            @{member.profile?.username || 'user'}
                          </p>
                        </div>
                      </div>
                      {/* Admin controls: remove member (not self, not other admins) */}
                      {currentUserIsAdmin && !isMe && !isAdmin && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={removingMember === member.userId}
                          className={`p-1 rounded-md transition-all shrink-0 ${dark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-400'} disabled:opacity-50`}
                          title="Remove from group"
                        >
                          {removingMember === member.userId ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
                        </button>
                      )}
                    </div>
                  );
                })
              )
            ) : (
              /* ═══ REGULAR CONTACTS LIST ═══ */
              <>
                {filteredContacts.map((c) => {
              const isActive = c.id === friend.id;
              const unread = unreadCounts[c.id] || 0;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectFriend(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    isActive
                      ? (dark ? 'bg-amber-500/10 border-l-2 border-amber-500' : 'bg-amber-50 border-l-2 border-amber-500')
                      : unread > 0
                        ? (dark
                          ? 'bg-gradient-to-r from-purple-500/15 via-blue-500/10 to-transparent border-l-2 border-purple-500'
                          : 'bg-gradient-to-r from-purple-50 via-blue-50 to-transparent border-l-2 border-purple-500')
                        : (dark ? 'hover:bg-slate-800 border-l-2 border-transparent' : 'hover:bg-slate-100 border-l-2 border-transparent')
                  }`}
                >
                  <div className="relative shrink-0">
                    {c.avatarUrl ? (
                      <img
                        src={c.avatarUrl} alt=""
                        className={`w-10 h-10 object-cover ${c.isGroup ? 'rounded-lg' : 'rounded-full cursor-pointer hover:ring-2 hover:ring-amber-500/60 transition-all'} border ${unread > 0 ? 'border-purple-500/60' : dark ? 'border-slate-700' : 'border-slate-200'}`}
                        onClick={(e) => { e.stopPropagation(); openProfileCard(c); }}
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 flex items-center justify-center text-sm font-bold text-white ${c.isGroup ? 'rounded-lg' : 'rounded-full cursor-pointer hover:ring-2 hover:ring-amber-500/60 transition-all'} bg-gradient-to-br from-amber-500 to-orange-500`}
                        onClick={(e) => { e.stopPropagation(); openProfileCard(c); }}
                      >
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!c.isGroup && c.status !== 'offline' && (
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${dark ? 'border-slate-900' : 'border-slate-50'} ${c.status === 'studying' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-amber-500' : dark ? 'text-white' : 'text-slate-800'}`}>
                        {c.name}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {!c.isGroup && (c.studyStreak ?? 0) > 0 && (
                          <span className={`flex items-center gap-0.5 text-[10px] font-bold ${dark ? 'text-orange-400' : 'text-orange-500'}`}>
                            <Flame size={11} className="text-orange-500" />{c.studyStreak}
                          </span>
                        )}
                        {unread > 0 && (
                          <span className="min-w-[22px] h-5 flex items-center justify-center px-1 text-[10px] font-bold text-white bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-sm shadow-purple-500/30">{unread}</span>
                        )}
                      </div>
                    </div>
                    <p className={`text-[11px] truncate ${unread > 0 ? 'text-purple-400 font-medium' : dark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {unread > 0 ? `${unread} new message${unread > 1 ? 's' : ''}` : c.isGroup ? 'Grp' : (c.isMentor || c.role === 'mentor') ? 'Mentor' : `@${c.username || 'user'}`}
                    </p>
                  </div>
                </button>
              );
            })}
            {filteredContacts.length === 0 && (
              <div className="py-8 text-center">
                <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>No contacts found</p>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ CHAT AREA ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-white/20 rounded-lg transition-all" title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>
            {friend.avatarUrl && (
              <img
                src={friend.avatarUrl} alt=""
                className={`${sidebarOpen ? 'w-8 h-8' : 'w-11 h-11'} rounded-full object-cover border-2 border-white/30 shrink-0 ${!friend.isGroup ? 'cursor-pointer hover:ring-2 hover:ring-white/50' : ''} transition-all duration-200`}
                onClick={() => openProfileCard(friend)}
              />
            )}
            <div className="min-w-0 cursor-pointer" onClick={() => openProfileCard(friend)}>
              <h3 className="font-bold text-sm truncate hover:underline">{friend.name}</h3>
              <p className="text-[10px] opacity-80 truncate">
                {friend.isGroup ? `${groupMembers.length} members` : `@${friend.username || 'user'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Change Background */}
            <div className="relative">
              <button onClick={() => { setShowBgPicker(!showBgPicker); setShowHistory(false); }} className="p-1.5 hover:bg-white/20 rounded-lg transition-all" title="Change background">
                <Palette size={16} />
              </button>
              {showBgPicker && (
                <div className={`absolute right-0 top-full mt-1 w-44 rounded-xl shadow-2xl border z-20 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  {BG_THEMES.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => { setChatBg(t.value); setShowBgPicker(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-all first:rounded-t-xl last:rounded-b-xl ${chatBg === t.value ? 'bg-amber-500/20 text-amber-500' : dark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Video Call */}
            {!friend.isGroup && (
              <button onClick={() => onStartVideoCall(friend.name, friend.avatarUrl, friend.id)} className="p-1.5 hover:bg-white/20 rounded-lg transition-all" title="Video Call">
                <Video size={16} />
              </button>
            )}

            {/* History */}
            <button onClick={() => { setShowHistory(!showHistory); setShowBgPicker(false); }} className="p-1.5 hover:bg-white/20 rounded-lg transition-all" title="Chat history">
              <History size={16} />
            </button>

            {/* Close */}
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-all" title="Close chat">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className={`border-b max-h-48 overflow-y-auto scrollbar-hide px-4 py-3 ${dark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h4 className={`text-xs font-bold mb-2 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>MESSAGE HISTORY</h4>
            {Object.keys(messagesByDate).length > 0 ? (
              Object.entries(messagesByDate).map(([date, msgs]) => (
                <div key={date} className="mb-2">
                  <p className={`text-[10px] font-bold mb-1 ${dark ? 'text-amber-400' : 'text-amber-600'}`}>{date}</p>
                  {msgs.slice(-3).map(msg => (
                    <p key={msg.id} className={`text-xs truncate mb-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className="font-medium">{msg.sender_id === user?.id ? 'You' : friend.name}:</span>{' '}
                      {(() => { const ct = inferContentType(msg.content || '', msg.content_type); return ct === 'image' ? '[Image]' : ct === 'voice' ? '[Voice]' : ct === 'video' ? '[Video]' : msg.content; })()}
                    </p>
                  ))}
                </div>
              ))
            ) : (
              <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>No history yet</p>
            )}
          </div>
        )}

        {/* Messages */}
        <div
          className={`flex-1 overflow-y-auto scrollbar-hide px-4 py-3 ${chatBg === '__profile__' ? '' : chatBg || (dark ? 'bg-slate-900' : 'bg-slate-50')}`}
          style={{
            minHeight: 0,
            ...(chatBg && chatBg !== '__profile__' ? {
              backgroundAttachment: 'fixed',
            } : {}),
            ...(chatBg === '__profile__' ? {
              backgroundImage: friend.avatarUrl
                ? `linear-gradient(${dark ? 'rgba(15,23,42,0.82)' : 'rgba(248,250,252,0.82)'}, ${dark ? 'rgba(15,23,42,0.82)' : 'rgba(248,250,252,0.82)'}), url(${friend.avatarUrl})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
              backgroundColor: !friend.avatarUrl ? (dark ? '#0f172a' : '#f8fafc') : undefined,
            } : {}),
          }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-60">
              <Loader2 className="w-7 h-7 text-amber-500 animate-spin mb-2" />
              <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-50 text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 text-2xl ${dark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                {'\u{1F4AC}'}
              </div>
              <p className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-600'}`}>No messages yet</p>
              <p className={`text-xs mt-1 ${dark ? 'text-slate-500' : 'text-slate-500'}`}>Say hello to {friend.name}!</p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const prev = idx > 0 ? messages[idx - 1] : null;
                const msgDate = new Date(msg.created_at).toDateString();
                const prevDate = prev ? new Date(prev.created_at).toDateString() : null;
                const showDateSep = !prev || msgDate !== prevDate;
                return (
                  <div key={msg.id || idx}>
                    {showDateSep && (
                      <div className="flex items-center justify-center my-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-semibold shadow-sm ${dark ? 'bg-slate-700/80 text-slate-300' : 'bg-white/90 text-slate-500 border border-slate-200'}`}>
                          {getDateLabel(msg.created_at)}
                        </span>
                      </div>
                    )}
                    {renderMessage(msg, idx)}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Emoji picker */}
        {showEmoji && (
          <div className={`px-3 py-2 border-t flex flex-wrap gap-1 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            {EMOJIS.map((emoji, i) => (
              <button key={i} type="button" onClick={() => { setNewMessage(p => p + emoji); setShowEmoji(false); }}
                className={`text-lg p-1 rounded hover:scale-110 transition-transform ${dark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                {emoji}
              </button>
            ))}
          </div>
        )}

        {uploading && (
          <div className={`px-4 py-2 border-t text-xs flex items-center gap-2 ${dark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-500'}`}>
            <Loader2 size={14} className="animate-spin text-amber-500" /> Uploading...
            <button onClick={cancelUpload} className={`ml-auto p-1 rounded-md transition-all ${dark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-400'}`} title="Cancel upload">
              <X size={14} />
            </button>
          </div>
        )}

        {recording && (
          <div className={`px-4 py-3 border-t flex items-center gap-3 ${dark ? 'bg-gradient-to-r from-red-950/60 via-slate-800 to-red-950/60 border-slate-700' : 'bg-gradient-to-r from-red-50 via-white to-red-50 border-slate-100'}`}>
            {/* Delete / Cancel recording button */}
            <button onClick={cancelRecording} className={`p-1.5 rounded-full transition-all shrink-0 ${dark ? 'bg-slate-700 hover:bg-slate-600 text-red-400' : 'bg-slate-200 hover:bg-slate-300 text-red-500'}`} title="Discard recording">
              <Trash2 size={14} />
            </button>
            {/* Pulsing record dot */}
            <div className="relative shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-40" />
            </div>
            {/* Live waveform bars */}
            <div className="flex items-center gap-[2px] h-6 flex-1 min-w-0">
              {Array.from({ length: 28 }).map((_, i) => {
                const h = Math.max(4, Math.min(24, audioLevel * 24 * (0.5 + Math.sin(Date.now() / 120 + i * 0.7) * 0.5)));
                return <div key={i} className="w-[3px] rounded-full bg-red-500 transition-all duration-75" style={{ height: `${h}px`, opacity: 0.5 + audioLevel * 0.5 }} />;
              })}
            </div>
            {/* Timer */}
            <span className={`font-mono text-sm font-bold tabular-nums shrink-0 ${dark ? 'text-red-400' : 'text-red-500'}`}>
              {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </span>
            {/* Send recording button */}
            <button onClick={stopRecording} className="p-1.5 bg-green-500 hover:bg-green-600 rounded-full text-white transition-all shrink-0" title="Send recording"><Send size={14} /></button>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className={`shrink-0 px-3 py-2.5 border-t flex items-center gap-2 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />

          <button type="button" onClick={() => setShowEmoji(!showEmoji)}
            className={`p-2 rounded-lg transition-all shrink-0 ${dark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Emoji">
            <Smile size={18} />
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className={`p-2 rounded-lg transition-all shrink-0 ${dark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} disabled:opacity-40`} title="Send image">
            <Image size={18} />
          </button>
          <button type="button" onClick={recording ? stopRecording : startRecording} disabled={uploading}
            className={`p-2 rounded-lg transition-all shrink-0 ${recording ? 'bg-red-500 text-white' : dark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} disabled:opacity-40`}
            title={recording ? 'Stop recording' : 'Voice message'}>
            {recording ? <Square size={18} /> : <Mic size={18} />}
          </button>

          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className={`flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 min-w-0 ${dark ? 'bg-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-100 text-slate-900 placeholder:text-slate-400'}`}
          />

          <button type="submit" disabled={!newMessage.trim() || sending}
            className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-40 shrink-0">
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>

      {/* Image Preview Lightbox */}
      {imagePreview && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center backdrop-blur-sm" onClick={() => setImagePreview(null)}>
          <button onClick={() => setImagePreview(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10">
            <X size={24} />
          </button>
          <img src={imagePreview} alt="Preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          <a href={imagePreview} download target="_blank" rel="noopener noreferrer" className="absolute bottom-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all" onClick={e => e.stopPropagation()} title="Download">
            <Download size={20} />
          </a>
        </div>
      )}

      {/* ═══ PROFILE CARD POPUP (portal to body to escape overflow clipping) ═══ */}
      {profileCard && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setProfileCard(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-sm mx-4 rounded-3xl overflow-hidden border shadow-2xl animate-fade-in ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
          >
            {/* Banner + Avatar */}
            <div className="relative h-36 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-10" />
              <button
                onClick={() => setProfileCard(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/30 hover:bg-black/50 rounded-full text-white transition-all"
              >
                <X size={16} />
              </button>
              <div className="absolute -bottom-[4.5rem] left-1/2 -translate-x-1/2">
                {profileCard.avatarUrl ? (
                  <img src={profileCard.avatarUrl} alt="" className="w-36 h-36 rounded-full object-cover border-4 shadow-lg cursor-pointer hover:ring-4 hover:ring-white/30 transition-all" style={{ borderColor: dark ? '#1e293b' : '#ffffff' }}
                    onClick={(e) => { e.stopPropagation(); setImagePreview(profileCard.avatarUrl); }}
                  />
                ) : (
                  <div className="w-36 h-36 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-4xl font-bold text-white border-4 shadow-lg" style={{ borderColor: dark ? '#1e293b' : '#ffffff' }}>
                    {profileCard.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="pt-20 pb-5 px-6 text-center">
              <h3 className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{profileCard.name}</h3>
              <p className={`text-sm mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>@{profileCard.username || 'user'}</p>

              {/* Role Badge */}
              <div className="flex items-center justify-center gap-2 mt-2">
                {profileCard.role === 'mentor' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-400 border border-purple-500/30">
                    <GraduationCap size={12} /> Mentor
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${dark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                    <BookOpen size={12} /> Student
                  </span>
                )}
                {profileCard.profession && (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${dark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                    {profileCard.profession}
                  </span>
                )}
              </div>

              {/* Bio */}
              {profileCard.bio && (
                <p className={`text-sm mt-3 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{profileCard.bio}</p>
              )}

              {/* Location */}
              {profileCard.location && (
                <div className={`flex items-center justify-center gap-1 mt-2 text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <MapPin size={12} /> {profileCard.location}
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className={`rounded-xl p-3 ${profileCard.studyStreak > 0 ? 'bg-gradient-to-br from-orange-500/15 to-red-500/15 border border-orange-500/25' : dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <Flame size={18} className={`mx-auto mb-1 ${profileCard.studyStreak > 0 ? 'text-orange-500' : dark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <p className={`text-lg font-bold ${profileCard.studyStreak > 0 ? 'text-orange-500' : dark ? 'text-white' : 'text-slate-900'}`}>
                    {profileCardLoading ? '...' : profileCard.studyStreak}
                  </p>
                  <p className={`text-[10px] font-medium ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Day Streak</p>
                </div>
                <div className={`rounded-xl p-3 ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <Clock size={18} className="mx-auto mb-1 text-amber-500" />
                  <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                    {profileCardLoading ? '...' : formatTime(profileCard.totalMinutes || 0)}
                  </p>
                  <p className={`text-[10px] font-medium ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Grind Time</p>
                </div>
                <div className={`rounded-xl p-3 ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <Brain size={18} className="mx-auto mb-1 text-blue-500" />
                  <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                    {profileCardLoading ? '...' : (profileCard.avgFocus || 0) > 0 ? `${profileCard.avgFocus}/5` : '—'}
                  </p>
                  <p className={`text-[10px] font-medium ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Avg Focus</p>
                </div>
                <div className={`rounded-xl p-3 ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <Target size={18} className="mx-auto mb-1 text-green-500" />
                  <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                    {profileCardLoading ? '...' : profileCard.totalSessions || 0}
                  </p>
                  <p className={`text-[10px] font-medium ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Sessions</p>
                </div>
              </div>

              {/* Joined + experience */}
              <div className="flex items-center justify-center gap-4 mt-4">
                {profileCard.joined && (
                  <span className={`flex items-center gap-1 text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Calendar size={12} /> Joined {profileCard.joined}
                  </span>
                )}
                {profileCard.experience && (
                  <span className={`flex items-center gap-1 text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {profileCard.experience} experience
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => { onSelectFriend(profileCard); setProfileCard(null); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transition-all shadow-md"
                >
                  <MessageCircle size={16} /> Chat
                </button>
                <button
                  onClick={() => { onStartVideoCall(profileCard.name, profileCard.avatarUrl, profileCard.id); setProfileCard(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${dark ? 'bg-slate-800 text-blue-400 hover:bg-slate-700 border border-slate-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}
                >
                  <Video size={16} /> Call
                </button>
              </div>
            </div>

            {profileCardLoading && (
              <div className={`px-6 pb-4 flex items-center justify-center gap-2 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs">Loading details...</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

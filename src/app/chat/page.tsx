'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useAuth } from '../../contexts/auth-context';
import { useStore } from '../../contexts/store-context';
import { ChatMessage } from '../../types';
import { 
  Send, 
  MessageSquare, 
  Smile, 
  Search, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Shield, 
  Users, 
  User, 
  Sparkles,
  ArrowDown,
  X
} from 'lucide-react';

const QUICK_PHRASES = [
  '👋 আসসালামু আলাইকুম',
  '👍 ধন্যবাদ',
  'ইনশাআল্লাহ',
  'আলহামদুলিল্লাহ',
  '💳 চাঁদা পরিশোধ করেছি',
  '📢 নতুন নোটিশ দেখেছি',
  'মিটিং কখন হবে?',
  '❤️ শুভকামনা রইল'
];

const EMOJIS = ['👍', '❤️', '👏', '🎉', '😊', '🤝', '🔥', '🙏'];

export default function ChatPage() {
  const { user } = useAuth();
  const { members } = useStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadNew, setUnreadNew] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Linked member record if member
  const myMember = useMemo(() => {
    if (!user) return null;
    if (['super_admin', 'president', 'treasurer', 'collector', 'auditor'].includes(user.role)) return null;
    return members.find(m => m.id === user.memberId || m.id === user.id || m.id === user.id.replace('u-', 'm-'));
  }, [user, members]);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // Fetch messages from MongoDB
  const fetchMessages = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/chat', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(prev => {
            if (prev.length > 0 && data.messages.length > prev.length) {
              const lastPrev = prev[prev.length - 1];
              const lastNew = data.messages[data.messages.length - 1];
              if (lastNew.id !== lastPrev.id && lastNew.senderId !== user?.id) {
                setUnreadNew(true);
              }
            }
            return data.messages;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load chat messages:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, []);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [loading]);

  // Periodic polling every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 3500);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Send message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || !user || sending) return;

    setSending(true);
    if (!customText) setInputText('');
    setShowEmojiPicker(false);

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      senderId: user.id,
      senderName: user.name || 'Member',
      senderRole: user.role,
      senderMemberId: user.memberId || myMember?.id,
      senderAvatar: user.avatar,
      message: textToSend,
      createdAt: new Date().toISOString(),
      reactions: {}
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          senderName: user.name || 'Member',
          senderRole: user.role,
          senderMemberId: user.memberId || myMember?.id,
          senderAvatar: user.avatar,
          message: textToSend
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          // Replace optimistic message with real saved message
          setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
        }
      } else {
        console.error('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
      setTimeout(() => scrollToBottom(true), 100);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Toggle Reaction on a message
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const userName = user.name || 'User';

    // Optimistic toggle
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = { ...(m.reactions || {}) };
      const currentUsers = reactions[emoji] || [];
      if (currentUsers.includes(userName)) {
        reactions[emoji] = currentUsers.filter(u => u !== userName);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...currentUsers, userName];
      }
      return { ...m, reactions };
    }));

    try {
      await fetch('/api/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji, userName })
      });
    } catch (err) {
      console.warn('Failed to toggle reaction:', err);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('আপনি কি এই বার্তাটি মুছে ফেলতে চান?')) return;

    // Optimistic delete
    setMessages(prev => prev.filter(m => m.id !== messageId));

    try {
      await fetch(`/api/chat?id=${messageId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Failed to delete message:', err);
      fetchMessages(true);
    }
  };

  // Role Badge Renderer
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Super Admin</span>;
      case 'president':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/20 text-purple-400 border border-purple-500/30">President</span>;
      case 'treasurer':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">Treasurer</span>;
      case 'collector':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">Collector</span>;
      case 'auditor':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Auditor</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Member</span>;
    }
  };

  // Format time
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  // Format Date for grouping
  const formatDateHeader = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'আজ (Today)';
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'গতকাল (Yesterday)';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Filtered messages by search
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(m => 
      m.message.toLowerCase().includes(q) ||
      m.senderName.toLowerCase().includes(q) ||
      m.senderRole.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] overflow-hidden space-y-3">
        
        {/* Chat Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-[var(--secondary)]/90 border border-[var(--border)] rounded-2xl shrink-0 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-white tracking-tight">FDC Community Chat</h1>
                <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Live</span>
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                ফাউন্ডেশনের সকল সদস্য ও কর্মকর্তাদের উন্মুক্ত আলোচনা মঞ্চ ({messages.length} বার্তা)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="চ্যাট খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-white placeholder-[var(--muted-foreground)]/60 focus:outline-none focus:border-indigo-500 w-36 sm:w-48 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-[var(--muted-foreground)] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchMessages()}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-[var(--background)] hover:bg-[var(--accent)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-white transition-all cursor-pointer"
              title="Refresh messages"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div 
          ref={chatContainerRef}
          className="flex-1 bg-[var(--card)]/50 backdrop-blur-sm border border-[var(--border)] rounded-2xl p-4 overflow-y-auto space-y-4 relative"
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-2 text-[var(--muted-foreground)]">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium">বার্তা লোড হচ্ছে...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-bold text-white mb-1">
                  {searchQuery ? 'কোনো বার্তা মেলেনি' : 'স্বাগতম FDC কমিউনিটি চ্যাটে!'}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  {searchQuery 
                    ? `"${searchQuery}" দিয়ে কোনো বার্তা খুঁজে পাওয়া যায়নি।` 
                    : 'এখানে সকল সদস্য ও পরিচালনা পর্ষদের সাথে সরাসরি আলোচনা করতে পারবেন। আপনার প্রথম বার্তাটি পাঠিয়ে আলোচনা শুরু করুন!'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {filteredMessages.map((msg, index) => {
                const isMe = msg.senderId === user?.id;
                const canDelete = isMe || user?.role === 'super_admin' || user?.role === 'president';
                
                // Show date divider if first message or date changed
                const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
                const showDate = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex items-center justify-center my-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[var(--secondary)] text-[var(--muted-foreground)] border border-[var(--border)] shadow-sm">
                          {formatDateHeader(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div className={`flex items-end space-x-2.5 group ${isMe ? 'justify-end' : 'justify-start'}`}>
                      
                      {/* Other User Avatar */}
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500/30 to-purple-500/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {msg.senderAvatar ? (
                            <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            msg.senderName.charAt(0)
                          )}
                        </div>
                      )}

                      <div className={`max-w-[85%] sm:max-w-md md:max-w-lg flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        
                        {/* Sender info (only on others' messages) */}
                        {!isMe && (
                          <div className="flex items-center space-x-1.5 mb-1 px-1">
                            <span className="text-xs font-bold text-white">{msg.senderName}</span>
                            {getRoleBadge(msg.senderRole)}
                            {msg.senderMemberId && (
                              <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                                ({msg.senderMemberId})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Bubble */}
                        <div className={`relative px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md break-words ${
                          isMe
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-xs'
                            : 'bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-xs'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.message}</p>

                          {/* Time & status */}
                          <div className={`flex items-center justify-end space-x-1 mt-1 text-[9px] ${isMe ? 'text-indigo-200' : 'text-[var(--muted-foreground)]'}`}>
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMe && <CheckCircle2 className="w-2.5 h-2.5" />}
                          </div>
                        </div>

                        {/* Reactions & Actions Row */}
                        <div className="flex items-center space-x-1.5 mt-1 px-1">
                          {/* Displayed reactions */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="flex items-center space-x-1">
                              {Object.entries(msg.reactions).map(([emoji, users]) => {
                                const userReacted = users.includes(user?.name || '');
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] border flex items-center space-x-1 transition-all cursor-pointer ${
                                      userReacted
                                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                        : 'bg-[var(--secondary)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-white'
                                    }`}
                                    title={users.join(', ')}
                                  >
                                    <span>{emoji}</span>
                                    <span className="text-[9px] font-bold">{users.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Quick Emoji Reaction Buttons (visible on hover) */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5 bg-[var(--background)]/80 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-[var(--border)]">
                            {['👍', '❤️', '👏', '🎉'].map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReaction(msg.id, emoji)}
                                className="text-xs hover:scale-125 transition-transform p-0.5 cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-0.5 text-[var(--muted-foreground)] hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Current User Avatar */}
                      {isMe && (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-md">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            user.name?.charAt(0) || 'U'
                          )}
                        </div>
                      )}

                    </div>
                  </React.Fragment>
                );
              })}

              <div ref={messagesEndRef} />
            </>
          )}

          {/* New message notification pill (floating at bottom) */}
          {unreadNew && (
            <div className="sticky bottom-2 flex justify-center z-10 animate-bounce">
              <button
                type="button"
                onClick={() => {
                  scrollToBottom(true);
                  setUnreadNew(false);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold shadow-lg flex items-center space-x-1.5 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>নতুন বার্তা এসেছে (নিচে যান)</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Responses Bar */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none px-1">
          <span className="text-[10px] text-[var(--muted-foreground)] font-semibold shrink-0 flex items-center space-x-1 mr-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>দ্রুত বার্তা:</span>
          </span>
          {QUICK_PHRASES.map(phrase => (
            <button
              key={phrase}
              type="button"
              onClick={() => handleSendMessage(phrase)}
              disabled={sending}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--secondary)] hover:bg-[var(--accent)] border border-[var(--border)] text-[var(--foreground)]/80 hover:text-white shrink-0 transition-all cursor-pointer hover:border-indigo-500/50"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Chat Input Box */}
        <div className="bg-[var(--secondary)]/90 border border-[var(--border)] rounded-2xl p-2.5 shrink-0 relative">
          
          {/* Emoji Picker Tray */}
          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2 left-2 p-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl flex items-center space-x-1.5 animate-in fade-in zoom-in-95 z-20">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setInputText(prev => prev + e);
                    setShowEmojiPicker(false);
                    if (inputRef.current) inputRef.current.focus();
                  }}
                  className="w-8 h-8 rounded-xl hover:bg-[var(--accent)] flex items-center justify-center text-lg hover:scale-125 transition-transform cursor-pointer"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end space-x-2">
            
            {/* Emoji Tray Toggle */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-[var(--muted-foreground)] hover:text-amber-400 hover:bg-[var(--accent)] rounded-xl transition-all cursor-pointer shrink-0"
              title="Add Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Message Textarea Input */}
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="আপনার বার্তা লিখুন... (Enter চাপলে পাঠানো হবে)"
              className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[var(--muted-foreground)]/60 focus:outline-none focus:border-indigo-500 resize-none max-h-24 min-h-[38px] leading-relaxed transition-all"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || sending}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer shrink-0 flex items-center justify-center"
              title="Send Message"
            >
              <Send className={`w-4 h-4 ${sending ? 'animate-pulse' : ''}`} />
            </button>

          </div>

          <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-[var(--muted-foreground)]/70">
            <span>Enter চাপলে সরাসরি পাঠানো হবে • Shift + Enter নতুন লাইনের জন্য</span>
            <span>লগইন আছেন: <strong className="text-[var(--foreground)]">{user?.name}</strong> ({user?.role})</span>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}

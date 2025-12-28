import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, RefreshCw, AlertCircle, Trophy } from 'lucide-react';
import { useWallet } from '@/providers/SolanaProvider';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

// Use the backend API directly
const API_URL = 'https://betpot-api.devsiten.workers.dev';

interface Message {
    id: string;
    walletAddress: string;
    message: string;
    createdAt: string;
}

interface ChatData {
    event: {
        id: string;
        title: string;
        status: string;
    };
    messages: Message[];
}

export function EventChatPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const { connected, publicKey } = useWallet();
    const { isAuthenticated } = useAuthStore();
    const [chatData, setChatData] = useState<ChatData | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const formatAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const fetchMessages = async () => {
        if (!eventId) return;

        try {
            const res = await fetch(`${API_URL}/api/chat/${eventId}`);
            const data = await res.json();

            if (data.success) {
                setChatData(data.data);
                setError(null);
            } else {
                setError(data.error || 'Failed to load chat');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !publicKey || !eventId || sending) return;

        setSending(true);
        try {
            const res = await fetch(`${API_URL}/api/chat/${eventId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toBase58(),
                    message: newMessage.trim(),
                }),
            });

            const data = await res.json();

            if (data.success) {
                setNewMessage('');
                // Add message locally for instant feedback
                if (chatData) {
                    setChatData({
                        ...chatData,
                        messages: [...chatData.messages, data.data],
                    });
                }
                // Scroll to bottom
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            } else {
                toast.error(data.error || 'Failed to send message');
            }
        } catch (err) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        // Poll for new messages every 10 seconds
        const interval = setInterval(fetchMessages, 10000);
        return () => clearInterval(interval);
    }, [eventId]);

    useEffect(() => {
        // Scroll to bottom when messages load
        if (chatData?.messages.length) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    }, [chatData?.messages.length]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Failed to Load Chat</h2>
                <p className="text-gray-400 mb-4">{error}</p>
                <Link to="/events" className="text-teal-400 hover:underline">
                    ← Back to Events
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] max-w-4xl mx-auto">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <Link to="/jackpot" className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-text-primary truncate">
                            {chatData?.event.title || 'Event Chat'}
                        </h1>
                        <p className="text-sm text-text-secondary">
                            {chatData?.messages.length || 0} messages • Status: {chatData?.event.status}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            to={`/events/${eventId}`}
                            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <Trophy className="w-4 h-4" />
                            Place Bet
                        </Link>
                        <button
                            onClick={fetchMessages}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                            title="Refresh"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatData?.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageCircle className="w-16 h-16 text-gray-600 mb-4" />
                        <p className="text-gray-400">No messages yet. Be the first to chat!</p>
                    </div>
                ) : (
                    chatData?.messages.map((msg) => {
                        const isMe = publicKey?.toBase58() === msg.walletAddress;
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${isMe
                                        ? 'bg-teal-500/20 border border-teal-500/30'
                                        : 'bg-white/5 border border-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-medium ${isMe ? 'text-brand-600' : 'text-text-secondary'}`}>
                                            {isMe ? 'You' : formatAddress(msg.walletAddress)}
                                        </span>
                                        <span className="text-xs text-text-muted">
                                            {formatTime(msg.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-text-primary text-sm break-words">{msg.message}</p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
                {!connected || !isAuthenticated ? (
                    <div className="text-center py-4">
                        <p className="text-text-secondary text-sm">
                            Please connect wallet and sign in to chat
                        </p>
                    </div>
                ) : chatData?.event.status === 'resolved' || chatData?.event.status === 'cancelled' ? (
                    <div className="text-center py-4">
                        <p className="text-text-secondary text-sm">
                            Chat is closed for this event
                        </p>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder="Type your message..."
                            maxLength={500}
                            className="flex-1 bg-background-card border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!newMessage.trim() || sending}
                            className="px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-5 h-5" />
                            {sending ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

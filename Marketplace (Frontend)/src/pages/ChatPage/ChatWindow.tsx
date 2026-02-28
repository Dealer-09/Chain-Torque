import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { TopSeller } from './index';
import { getBackendUrl } from '@/lib/urls';
import { Send, UserRound, Loader2 } from 'lucide-react';

interface Message {
    _id: string;
    senderWallet: string;
    receiverWallet: string;
    content: string;
    read: boolean;
    createdAt: string;
}

interface ChatWindowProps {
    socket: Socket | null;
    currentUserWallet: string;
    selectedUser: TopSeller;
}

const ChatWindow = ({ socket, currentUserWallet, selectedUser }: ChatWindowProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to bottom whenever messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!currentUserWallet || !selectedUser) return;

        // Fetch history
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const url = `${getBackendUrl()}/api/chat/history?user1=${currentUserWallet}&user2=${selectedUser.walletAddress}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    setMessages(data.messages);
                }
            } catch (error) {
                console.error('Failed to fetch chat history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [currentUserWallet, selectedUser]);

    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (message: Message) => {
            // Only append if it belongs to the current conversation
            const isRelevant =
                (message.senderWallet.toLowerCase() === currentUserWallet.toLowerCase() && message.receiverWallet.toLowerCase() === selectedUser.walletAddress.toLowerCase()) ||
                (message.senderWallet.toLowerCase() === selectedUser.walletAddress.toLowerCase() && message.receiverWallet.toLowerCase() === currentUserWallet.toLowerCase());

            if (isRelevant) {
                setMessages((prev) => [...prev, message]);
            }
        };

        socket.on('receive_message', handleReceiveMessage);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
        };
    }, [socket, currentUserWallet, selectedUser]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        socket.emit('send_message', {
            senderWallet: currentUserWallet,
            receiverWallet: selectedUser.walletAddress,
            content: newMessage.trim(),
        });

        setNewMessage('');
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
            {/* Header */}
            <div className="flex items-center p-4 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm z-10">
                <div className="relative">
                    {selectedUser.avatar ? (
                        <img src={selectedUser.avatar} alt={selectedUser.username} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-zinc-800 shadow-sm" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center border-2 border-white dark:border-zinc-800 shadow-sm">
                            <UserRound className="w-6 h-6" />
                        </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
                </div>
                <div className="ml-4 flex-1">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {selectedUser.displayName || selectedUser.username || 'Unknown Seller'}
                        {selectedUser.isVerified && (
                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500 flex items-center">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                        Online • Responds usually in 1 hr
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-zinc-950/50 relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-3">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2">
                            <Send className="w-8 h-8 opacity-50 ml-1" />
                        </div>
                        <p className="text-lg font-medium">No messages yet</p>
                        <p className="text-sm">Start the conversation with {selectedUser.username}</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.senderWallet.toLowerCase() === currentUserWallet.toLowerCase();
                        const showAvatar = index === messages.length - 1 || messages[index + 1]?.senderWallet !== msg.senderWallet;

                        return (
                            <div key={msg._id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
                                <div className={`flex max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>

                                    {/* Avatar for other user */}
                                    {!isMe && (
                                        <div className="w-8 h-8 flex-shrink-0">
                                            {showAvatar && (
                                                selectedUser.avatar ? (
                                                    <img src={selectedUser.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                                        <UserRound className="w-4 h-4" />
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}

                                    <div
                                        className={`px-4 py-2.5 rounded-2xl shadow-sm relative ${isMe
                                                ? 'bg-blue-600 text-white rounded-br-none'
                                                : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-zinc-700/50 rounded-bl-none'
                                            }`}
                                    >
                                        <p className="text-[15px] leading-relaxed break-words">{msg.content}</p>
                                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${selectedUser.username}...`}
                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-zinc-800 border-none rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatWindow;

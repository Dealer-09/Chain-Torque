import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Navigation as Navbar } from '@/components/ui/navigation';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import { getBackendUrl } from '@/lib/urls';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';

export interface TopSeller {
    walletAddress: string;
    username: string;
    displayName?: string;
    avatar?: string;
    stats: any;
    isVerified: boolean;
}

const ChatPage = () => {
    const { user } = useUser();
    const { toast } = useToast();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [selectedUser, setSelectedUser] = useState<TopSeller | null>(null);

    const currentUserWallet = user?.unsafeMetadata?.walletAddress as string;

    useEffect(() => {
        if (!currentUserWallet) return;

        // Initialize socket connection
        const newSocket = io(getBackendUrl());

        newSocket.on('connect', () => {
            console.log('Connected to chat server');
            newSocket.emit('join_room', currentUserWallet);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            toast({
                title: 'Connection Error',
                description: 'Failed to connect to the chat server.',
                variant: 'destructive'
            });
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [currentUserWallet, toast]);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-zinc-950">
            <Navbar />

            <div className="flex-1 flex overflow-hidden container mx-auto p-4 md:p-6 lg:p-8 mt-16 max-w-6xl">
                <div className="w-full flex bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-800 overflow-hidden h-[calc(100vh-8rem)]">
                    {/* Sidebar */}
                    <ChatSidebar
                        selectedUser={selectedUser}
                        onSelectUser={setSelectedUser}
                    />

                    {/* Chat Window */}
                    <div className="flex-1 flex flex-col border-l border-gray-200 dark:border-zinc-800">
                        {selectedUser ? (
                            <ChatWindow
                                socket={socket}
                                currentUserWallet={currentUserWallet}
                                selectedUser={selectedUser}
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center flex-col text-gray-500 dark:text-gray-400">
                                <svg className="w-16 h-16 mb-4 text-gray-300 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Your Messages</h3>
                                <p>Select a top seller from the sidebar to start chatting securely.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;

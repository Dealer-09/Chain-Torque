import { useState, useEffect } from 'react';
import { TopSeller } from './index';
import { getBackendUrl } from '@/lib/urls';
import { Search, UserRound, Award } from 'lucide-react';

interface ChatSidebarProps {
    selectedUser: TopSeller | null;
    onSelectUser: (user: TopSeller) => void;
}

const ChatSidebar = ({ selectedUser, onSelectUser }: ChatSidebarProps) => {
    const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchTopSellers = async () => {
            try {
                const response = await fetch(`${getBackendUrl()}/api/chat/top-sellers?limit=15`);
                const data = await response.json();
                if (data.success) {
                    setTopSellers(data.topSellers);
                }
            } catch (error) {
                console.error('Failed to fetch top sellers for chat:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTopSellers();
    }, []);

    const filteredSellers = topSellers.filter(seller =>
        seller.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-80 flex flex-col bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 transition-all">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-blue-500" />
                    Top Sellers
                </h2>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search sellers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-zinc-800 border-none rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 dark:text-gray-200"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-gray-500">Loading sellers...</div>
                ) : filteredSellers.length > 0 ? (
                    <ul className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                        {filteredSellers.map((seller, index) => (
                            <li key={seller.walletAddress}>
                                <button
                                    onClick={() => onSelectUser(seller)}
                                    className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center space-x-3 
                    ${selectedUser?.walletAddress === seller.walletAddress ? 'bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                                >
                                    <div className="relative">
                                        {seller.avatar ? (
                                            <img src={seller.avatar} alt={seller.username} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-zinc-700" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center border border-blue-200 dark:border-blue-800/50">
                                                <UserRound className="w-5 h-5" />
                                            </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white dark:border-zinc-900 shadow-sm">
                                            #{index + 1}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                            {seller.displayName || seller.username || 'Unknown Seller'}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            {seller.stats?.totalSold || 0} sales
                                        </p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-4 text-center text-gray-500">No sellers found.</div>
                )}
            </div>
        </div>
    );
};

export default ChatSidebar;

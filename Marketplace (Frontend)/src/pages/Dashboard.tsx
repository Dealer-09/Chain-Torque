import { Navigation } from '@/components/ui/navigation';
import { Footer } from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingBag,
  Upload,
  DollarSign,
  Eye,
  Download,
  TrendingUp,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/hooks/useAuth';
import { useWalletAddress } from '@/hooks/useWalletAddress';
import apiService from '@/services/apiService';

interface NFT {
  tokenId: string;
  _id?: string;
  title?: string; // Made optional as it might be missing
  price: string;
  sold: boolean;
  seller: string;
  owner: string;
  views?: number;
  downloads?: number;
  metadata?: any;
}

interface Purchase {
  _id?: string;
  transactionHash: string;
  metadata?: { title: string };
  tokenId: string;
  confirmedAt?: string;
  createdAt?: string;
  price: string;
}

interface Transaction {
  id: string;
  type: 'purchase' | 'sale';
  title: string;
  amount: string;
  date: string;
  hash: string;
}

interface DashboardState {
  stats: {
    totalModels: number;
    totalSales: number;
    totalEarnings: string;
    totalViews: number;
    balance: string;
  };
  userNFTs: NFT[];
  userPurchases: Purchase[];
  recentTransactions: Transaction[];
  marketplaceStats: any;
}

const Dashboard = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  // Use centralized hook for consistent address resolution
  const { walletAddress } = useWalletAddress();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardState>({
    stats: {
      totalModels: 0,
      totalSales: 0,
      totalEarnings: '0 ETH',
      totalViews: 0,
      balance: '0 ETH',
    },
    userNFTs: [],
    userPurchases: [],
    recentTransactions: [],
    marketplaceStats: null,
  });

  useEffect(() => {
    loadDashboardData();
  }, [user, walletAddress]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Wallet address resolution handled by hook
      // console.log('Dashboard loading for wallet:', walletAddress);




      const promises = [
        // Get marketplace stats
        apiService.getMarketplaceStats(),
        // Get user's NFTs (Owned/Created)
        walletAddress
          ? apiService.getUserNFTs(walletAddress)
          : Promise.resolve({ success: true, nfts: [], total: 0 }),
        // Get wallet balance
        walletAddress
          ? apiService.getBalance(walletAddress).catch(() => ({ success: false, balance: '0' }))
          : Promise.resolve({ success: false, balance: '0' }),
        // Get user purchases (Real Transaction History)
        walletAddress
          ? apiService.getUserPurchases(walletAddress)
          : Promise.resolve({ success: true, purchases: [] }),
      ];

      const [marketplaceResponse, userNFTsResponse, balanceResponse, purchasesResponse] =
        await Promise.all(promises);

      // Process user NFTs
      const userNFTs: NFT[] =
        (userNFTsResponse as any).success
          ? (Array.isArray((userNFTsResponse as any).nfts) ? (userNFTsResponse as any).nfts :
            Array.isArray((userNFTsResponse as any).data) ? (userNFTsResponse as any).data : [])
          : [];

      // Process Purchases
      const userPurchases: Purchase[] =
        (purchasesResponse as any).success
          ? (Array.isArray((purchasesResponse as any).purchases) ? (purchasesResponse as any).purchases :
            Array.isArray((purchasesResponse as any).data) ? (purchasesResponse as any).data : [])
          : [];

      // Process Transactions (Sales & Purchases mixed)
      // For now, we only have purchases endpoint, but we can infer sales from NFTs where seller == wallet
      // Ideal: apiService.getUserSales(walletAddress)
      const recentTransactions: Transaction[] = userPurchases.map((p) => ({
        id: p._id || p.transactionHash,
        type: 'purchase',
        title: p.metadata?.title || `Item #${p.tokenId}`,
        amount: `-${p.price} ETH`,
        date: new Date(p.confirmedAt || p.createdAt || Date.now()).toLocaleDateString(),
        hash: p.transactionHash
      }));

      // Calculate user stats
      const totalModels = userNFTs.length;
      const totalSales = userNFTs.reduce(
        (acc: number, nft: NFT) => acc + (nft.sold && nft.seller?.toLowerCase() === walletAddress?.toLowerCase() ? 1 : 0),
        0
      );
      // Rough earnings calc (real logic should come from backend sales endpoint)
      const totalEarningsVal = userNFTs.reduce(
        (acc: number, nft: NFT) => acc + (nft.sold && nft.seller?.toLowerCase() === walletAddress?.toLowerCase() ? parseFloat(nft.price) : 0),
        0
      );
      const totalEarnings = `${totalEarningsVal.toFixed(4)} ETH`;

      const totalViews = userNFTs.reduce(
        (acc: number, nft: NFT) => acc + (nft.views || 0),
        0
      );

      // Balance
      const balance =
        (balanceResponse as any).success && (balanceResponse as any).balance
          ? `${parseFloat((balanceResponse as any).balance).toFixed(4)} ETH`
          : ((balanceResponse as any).data && (balanceResponse as any).data.balance)
            ? `${parseFloat((balanceResponse as any).data.balance).toFixed(4)} ETH`
            : '0.0000 ETH';

      setDashboardData({
        stats: {
          totalModels,
          totalSales,
          totalEarnings,
          totalViews,
          balance,
        },
        userNFTs: userNFTs.slice(0, 5),
        userPurchases: userPurchases.slice(0, 5),
        recentTransactions: recentTransactions.slice(0, 5),
        marketplaceStats: (marketplaceResponse as any).success
          ? (marketplaceResponse as any).stats
          : null,
      });
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-background'>
        <Navigation />
        <div className='container mx-auto px-4 py-8 pt-24'>
          <div className='flex items-center justify-center h-64'>
            <div className='flex items-center gap-3 text-muted-foreground'>
              <Loader2 className='h-6 w-6 animate-spin' />
              <span>Loading dashboard data...</span>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-background'>
        <Navigation />
        <div className='container mx-auto px-4 py-8 pt-24'>
          <div className='flex items-center justify-center h-64'>
            <div className='flex items-center gap-3 text-destructive'>
              <AlertCircle className='h-6 w-6' />
              <div>
                <p className='font-medium'>Failed to load dashboard</p>
                <p className='text-sm text-muted-foreground'>{error}</p>
                <Button
                  onClick={loadDashboardData}
                  variant='outline'
                  size='sm'
                  className='mt-2'
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background'>
      <Navigation />

      <div className='container mx-auto px-4 py-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='mb-8'>
            <h1 className='text-3xl font-bold mb-2'>Dashboard</h1>
            <p className='text-muted-foreground'>
              Manage your models, track sales, and view your marketplace
              activity
            </p>
          </div>

          {/* Stats Overview */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
            <Card className='bg-card/40 backdrop-blur-md border-border/40 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group'>
              <div className='absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
              <CardContent className='p-6 relative z-10'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-muted-foreground'>
                      Total Models
                    </p>
                    <p className='text-3xl font-bold mt-1 tracking-tight'>
                      {dashboardData.stats.totalModels}
                    </p>
                  </div>
                  <div className='p-3 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300'>
                    <Upload className='h-6 w-6 text-blue-500' />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='bg-card/40 backdrop-blur-md border-border/40 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group'>
              <div className='absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
              <CardContent className='p-6 relative z-10'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-muted-foreground'>
                      Total Sales
                    </p>
                    <p className='text-3xl font-bold mt-1 tracking-tight'>
                      {dashboardData.stats.totalSales}
                    </p>
                  </div>
                  <div className='p-3 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300'>
                    <ShoppingBag className='h-6 w-6 text-emerald-500' />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='bg-card/40 backdrop-blur-md border-border/40 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group'>
              <div className='absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
              <CardContent className='p-6 relative z-10'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-muted-foreground'>
                      Estimated Earnings
                    </p>
                    <p className='text-3xl font-bold mt-1 tracking-tight'>
                      {dashboardData.stats.totalEarnings}
                    </p>
                  </div>
                  <div className='p-3 bg-amber-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300'>
                    <DollarSign className='h-6 w-6 text-amber-500' />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='bg-card/40 backdrop-blur-md border-border/40 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group'>
              <div className='absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
              <CardContent className='p-6 relative z-10'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-muted-foreground'>
                      Total Views
                    </p>
                    <p className='text-3xl font-bold mt-1 tracking-tight'>
                      {dashboardData.stats.totalViews.toLocaleString()}
                    </p>
                  </div>
                  <div className='p-3 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform duration-300'>
                    <Eye className='h-6 w-6 text-purple-500' />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
            {/* My Models */}
            <Card className='bg-card/40 backdrop-blur-md border border-border/40 shadow-sm'>
              <CardHeader>
                <CardTitle className='flex items-center justify-between'>
                  <span>My Models</span>
                  <Button size='sm' onClick={() => navigate('/upload')}>
                    <Upload className='h-4 w-4 mr-2' />
                    Upload New
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {dashboardData.userNFTs.length > 0 ? (
                    dashboardData.userNFTs.map((nft: any) => (
                      <div
                        key={nft.tokenId || nft._id}
                        className='flex items-center justify-between p-4 border rounded-lg'
                      >
                        <div className='flex-1'>
                          <h4 className='font-medium'>
                            {nft.title || `Model #${nft.tokenId}`}
                          </h4>
                          <div className='flex items-center gap-4 mt-2 text-sm text-muted-foreground'>
                            <span className='flex items-center gap-1'>
                              <Eye className='h-4 w-4' />
                              {nft.views || 0} views
                            </span>
                            <span className='flex items-center gap-1'>
                              <Download className='h-4 w-4' />
                              {nft.downloads || 0} downloads
                            </span>
                          </div>
                        </div>
                        <div className='text-right'>
                          <p className='font-medium'>
                            {nft.price ? `${nft.price} ETH` : 'Free'}
                          </p>
                          <Badge
                            variant={nft.sold ? 'secondary' : 'default'}
                            className='mt-2'
                          >
                            {nft.sold ? 'sold' : 'active'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      <Upload className='h-12 w-12 mx-auto mb-4 opacity-50' />
                      <p>No models uploaded yet</p>
                      <p className='text-sm'>
                        Upload your first 3D model to get started!
                      </p>
                    </div>
                  )}
                </div>
                <Button variant='outline' className='w-full mt-4'>
                  {dashboardData.userNFTs.length > 0
                    ? 'View All Models'
                    : 'Upload First Model'}
                </Button>
              </CardContent>
            </Card>

            {/* Recent Purchases */}
            <Card className='bg-card/40 backdrop-blur-md border border-border/40 shadow-sm'>
              <CardHeader>
                <CardTitle>Recent Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {dashboardData.userPurchases && dashboardData.userPurchases.length > 0 ? (
                    dashboardData.userPurchases.map((purchase: any) => (
                      <div
                        key={purchase._id || purchase.transactionHash}
                        className='flex items-center justify-between p-4 border rounded-lg'
                      >
                        <div className='flex-1'>
                          <h4 className='font-medium'>{purchase.metadata?.title || `Item #${purchase.tokenId}`}</h4>
                          <p className='text-sm text-muted-foreground'>
                            Tx: {purchase.transactionHash.substring(0, 8)}...
                          </p>
                          <p className='text-xs text-muted-foreground mt-1'>
                            {new Date(purchase.confirmedAt || purchase.createdAt || Date.now()).toLocaleDateString()}
                          </p>
                        </div>
                        <div className='text-right'>
                          <p className='font-medium'>{purchase.price} ETH</p>
                          <Button size='sm' variant='outline' className='mt-2'>
                            Download
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      <ShoppingBag className='h-12 w-12 mx-auto mb-4 opacity-50' />
                      <p>No purchases yet</p>
                      <p className='text-sm'>
                        Explore the marketplace to buy your first model!
                      </p>
                    </div>
                  )}
                </div>
                <Button variant='outline' className='w-full mt-4'>
                  View All Purchases
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className='mt-8 bg-card/40 backdrop-blur-md border border-border/40 shadow-sm'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <TrendingUp className='h-5 w-5' />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {dashboardData.recentTransactions && dashboardData.recentTransactions.length > 0 ? (
                  dashboardData.recentTransactions.map((transaction: any) => (
                    <div
                      key={transaction.id}
                      className='flex items-center justify-between p-4 border rounded-lg'
                    >
                      <div className='flex-1 flex items-center gap-3'>
                        <div
                          className={`p-2 rounded-full ${transaction.type === 'sale'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                            }`}
                        >
                          {transaction.type === 'sale' ? (
                            <TrendingUp className='h-4 w-4' />
                          ) : (
                            <ShoppingBag className='h-4 w-4' />
                          )}
                        </div>
                        <div>
                          <h4 className='font-medium'>{transaction.title}</h4>
                          <p className='text-sm text-muted-foreground flex items-center gap-1'>
                            <Clock className='h-3 w-3' />
                            {transaction.date}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`font-medium ${transaction.type === 'sale'
                          ? 'text-green-600'
                          : 'text-red-600'
                          }`}
                      >
                        {transaction.amount}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-center py-4 text-muted-foreground'>
                    No transactions found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;

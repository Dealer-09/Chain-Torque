import { useState, useEffect } from 'react';
import { Navigation } from '@/components/ui/navigation';
import { Footer } from '@/components/ui/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WalletConnectionDialog } from '@/components/ui/wallet-connection-dialog';
import { Plus, Loader2, AlertCircle, Download, Star, Edit3, Wallet, Tag, Sparkles } from 'lucide-react';
import apiService from '@/services/apiService';
import { getCadUrl } from '@/lib/urls';
import { useWalletAddress } from '@/hooks/useWalletAddress';
import { web3Service } from '@/services/web3Service';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Fallback images
import cadGear from '@/assets/cad-gear.jpg';
import cadDrone from '@/assets/cad-drone.jpg';
import cadEngine from '@/assets/cad-engine.jpg';
import cadRobot from '@/assets/cad-robot.jpg';

interface PurchasedItem {
  id: string | number;
  tokenId: number;
  title: string;
  image: string;
  price: string;
  seller: string;
  rating: number;
  downloads: number;
  fileTypes: string[];
  software: string[];
  purchaseDate?: string;
  modelUrl?: string;
  isBlockchain?: boolean;
}

const Edit = () => {
  // Use centralized wallet hook for consistent address resolution
  const { walletAddress } = useWalletAddress();
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const { toast } = useToast();

  // Relist Modal State
  const [isRelistModalOpen, setIsRelistModalOpen] = useState(false);
  const [selectedRelistItem, setSelectedRelistItem] = useState<PurchasedItem | null>(null);
  const [relistPrice, setRelistPrice] = useState('0.05');
  const [isRelisting, setIsRelisting] = useState(false);

  useEffect(() => {
    loadPurchasedItems();
  }, [walletAddress]);

  const loadPurchasedItems = async () => {
    if (!walletAddress) {
      // No wallet connected - just show empty state, don't treat as error
      setPurchasedItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getUserPurchases(walletAddress);

      // Handle response - backend now returns full MarketItem data with modelUrl
      const rawItems = response.success ? (response.data || (response as any).purchases || []) : [];

      if (rawItems.length > 0) {
        // Transform the API response to match our interface
        const items: PurchasedItem[] = rawItems.map((item: any, index: number) => ({
          id: item.tokenId || item._id || index,
          tokenId: item.tokenId || index,
          title: item.title || item.metadata?.title || `Model #${item.tokenId || index}`,
          image: item.imageUrl || item.image || item.metadata?.image || [cadGear, cadDrone, cadEngine, cadRobot][index % 4],
          price: item.price ? `${item.price} ETH` : 'Purchased',
          seller: item.seller || item.creator || 'Unknown Creator',
          rating: item.rating || 4.5,
          downloads: item.downloads || 0,
          fileTypes: item.fileTypes || ['GLB', 'STL'],
          software: item.software || ['CAD'],
          purchaseDate: item.purchasedAt || item.purchaseDate || new Date().toISOString(),
          modelUrl: item.modelUrl || item.metadata?.modelUrl, // Now properly available from backend
          isBlockchain: true
        }));

        setPurchasedItems(items);
      } else {
        // If no purchases, show empty state
        setPurchasedItems([]);
      }
    } catch (err) {
      console.error('Error loading purchased items:', err);
      // Set empty array instead of error to show empty state
      setPurchasedItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    // Navigate to the CAD editor for creating a new model
    window.open(getCadUrl(), '_blank');
  };

  const handleGenerateAI = () => {
    // Navigate to the CAD editor and automatically open the Image-to-3D modal
    window.open(`${getCadUrl()}?tool=ai`, '_blank');
  };

  const handleWalletConnected = () => {
    // Refresh the page to reload user data and purchased items
    window.location.reload();
  };

  const handleEditModel = (item: PurchasedItem) => {
    // Navigate to the CAD editor with the model loaded
    const cadUrl = `${getCadUrl()}?model=${encodeURIComponent(item.modelUrl || '')}&title=${encodeURIComponent(item.title)}`;
    window.open(cadUrl, '_blank');
  };

  const handleDownloadModel = async (item: PurchasedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.modelUrl) {
      alert('Model file not available for download.');
      return;
    }

    try {
      // Show loading state
      const button = e.currentTarget as HTMLButtonElement;
      const originalText = button.innerHTML;
      button.innerHTML = '<span class="animate-spin mr-1">⏳</span> Downloading...';
      button.disabled = true;

      // Fetch the file from IPFS
      const response = await fetch(item.modelUrl);
      if (!response.ok) throw new Error('Failed to download file');

      const blob = await response.blob();

      // Create filename from title, sanitize it
      const sanitizedTitle = item.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${sanitizedTitle}.glb`; // Models are GLB format

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reset button
      button.innerHTML = originalText;
      button.disabled = false;
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const handleDownloadImage = async (item: PurchasedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.image) {
      alert('Image not available for download.');
      return;
    }

    try {
      const response = await fetch(item.image);
      if (!response.ok) throw new Error('Failed to download image');

      const blob = await response.blob();
      const sanitizedTitle = item.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      // Determine extension from content type
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const filename = `${sanitizedTitle}_preview.${ext}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Image download failed:', error);
      alert('Image download failed. Please try again.');
    }
  };

  const handleDownloadAll = async (item: PurchasedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // Download both model and image
    await handleDownloadModel(item, e);
    if (item.image) {
      await handleDownloadImage(item, e);
    }
  };

  const handleOpenRelistModal = (item: PurchasedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRelistItem(item);
    // Suggest a default higher price or current floor
    setRelistPrice((parseFloat(item.price.replace(' ETH', '')) * 1.5).toFixed(4) || '0.05');
    setIsRelistModalOpen(true);
  };

  const handleRelistSubmit = async () => {
    if (!selectedRelistItem || !relistPrice) return;

    const priceNum = parseFloat(relistPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRelisting(true);
      toast({
        title: "Relisting Started",
        description: "Please confirm the transaction in your wallet. A small listing fee applies."
      });

      await web3Service.relistToken(selectedRelistItem.tokenId, priceNum);

      toast({
        title: "Success! 🎉",
        description: "Your model has been relisted on the marketplace.",
      });

      setIsRelistModalOpen(false);
      // Refresh items to remove the relisted item from "Owned" view since it's now in escrow
      loadPurchasedItems();
    } catch (err: any) {
      console.error("Relist failed:", err);
      toast({
        title: "Relist Failed",
        description: err.reason || err.message || "An error occurred while relisting.",
        variant: "destructive"
      });
    } finally {
      setIsRelisting(false);
    }
  };

  // Create New Card Component
  const CreateNewCard = () => (
    <Card
      className="group cursor-pointer bg-gradient-to-br from-primary/5 to-primary/10 border-dashed border-2 border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
      onClick={handleCreateNew}
    >
      <CardContent className="p-6 flex flex-col items-center justify-center h-[300px]">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
          <Plus className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Create New</h3>
        <p className="text-sm text-muted-foreground text-center">
          Start a new sketch with our CAD editor
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Open Editor
        </Button>
      </CardContent>
    </Card>
  );

  // Generate AI Card Component
  const GenerateAICard = () => (
    <Card
      className="group cursor-pointer bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-solid border-2 border-blue-500/30 hover:border-blue-500/60 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]"
      onClick={handleGenerateAI}
    >
      <CardContent className="p-6 flex flex-col items-center justify-center h-[300px]">
        <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-inner">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Image to 3D AI
        </h3>
        <p className="text-sm text-muted-foreground text-center">
          Generate a 3D model instantly from any 2D sketch or photo
        </p>
        <Button
          size="sm"
          className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md border-0"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate
        </Button>
      </CardContent>
    </Card>
  );

  // Helper to truncate address
  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length < 12) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Purchased Item Card Component
  const PurchasedItemCard = ({ item }: { item: PurchasedItem }) => (
    <Card
      className="group cursor-pointer bg-gradient-card border-border/50 hover:animate-card-hover transition-all duration-300 hover:shadow-glow hover:border-primary/20"
      onClick={() => handleEditModel(item)}
    >
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative overflow-hidden rounded-t-lg">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-green-500/90 text-white">
              Owned
            </Badge>
          </div>
          {/* File type badges */}
          <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap">
            {item.fileTypes.map((type) => (
              <Badge
                key={type}
                variant="secondary"
                className="text-xs bg-background/80 backdrop-blur-sm"
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>

          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <span title={item.seller}>by {truncateAddress(item.seller)}</span>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-warning text-warning" />
              <span>{item.rating}</span>
            </div>
          </div>

          {/* Software compatibility */}
          <div className="flex gap-1 mb-3 flex-wrap">
            {item.software.map(sw => (
              <Badge key={sw} variant="outline" className="text-xs">
                {sw}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                Purchased
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Download className="h-3 w-3" />
                {item.downloads} downloads
              </span>
            </div>

            <Button
              size="sm"
              variant="default"
              className="w-full text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={(e) => handleOpenRelistModal(item, e)}
            >
              <Tag className="h-4 w-4 mr-1" />
              Sell / Relist
            </Button>

            <div className="grid grid-cols-2 gap-2">
              {item.modelUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full hover:bg-primary/10 transition-all text-xs sm:text-sm"
                  onClick={(e) => handleDownloadAll(item, e)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              )}
              <Button
                size="sm"
                className={!item.modelUrl ? "col-span-2 w-full" : "w-full"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditModel(item);
                }}
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Editor
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My CAD Workshop</h1>
            <p className="text-muted-foreground">
              Edit your purchased models or create new designs with our professional CAD tools
            </p>
          </div>

          {/* Wallet Connection Warning */}
          {!walletAddress && (
            <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Wallet className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Connect Wallet to Access Purchased Models
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    You can use the CAD editor to create new sketches without a wallet. To view and edit models you've purchased from the marketplace, please connect your wallet.
                  </p>
                  <Button
                    onClick={() => setShowWalletDialog(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect Wallet
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
              <span className="text-muted-foreground">Loading your models...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-16">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Unable to Load Models
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadPurchasedItems} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Purchased Models</p>
                        <p className="text-2xl font-bold text-foreground">{purchasedItems.length}</p>
                      </div>
                      <Download className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Editor Ready</p>
                        <p className="text-2xl font-bold text-green-600">Active</p>
                      </div>
                      <Edit3 className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Downloads</p>
                        <p className="text-2xl font-bold text-foreground">
                          {purchasedItems.reduce((sum, item) => sum + item.downloads, 0)}
                        </p>
                      </div>
                      <Star className="h-8 w-8 text-warning" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Models Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Create New Card - Always first */}
                <CreateNewCard />

                {/* Generate AI Card */}
                <GenerateAICard />

                {/* Purchased Items */}
                {purchasedItems.map(item => (
                  <PurchasedItemCard
                    key={`${item.tokenId}-${item.id}`}
                    item={item}
                  />
                ))}
              </div>

              {/* Empty State for No Purchases - Removed as requested */}
            </>
          )}
        </div>
      </div>

      {/* Wallet Connection Dialog */}
      <WalletConnectionDialog
        isOpen={showWalletDialog}
        onClose={() => setShowWalletDialog(false)}
        onConnect={handleWalletConnected}
      />

      {/* Relist Modal */}
      <Dialog open={isRelistModalOpen} onOpenChange={setIsRelistModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sell your Model</DialogTitle>
            <DialogDescription>
              Relist your purchased item on the marketplace. You will pay a 0.00025 ETH listing fee. Your item will be held in escrow until sold or cancelled.
            </DialogDescription>
          </DialogHeader>

          {selectedRelistItem && (
            <div className="flex gap-4 items-center mb-4 p-3 bg-secondary/20 rounded-lg">
              <img
                src={selectedRelistItem.image}
                alt={selectedRelistItem.title}
                className="w-16 h-16 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{selectedRelistItem.title}</h4>
                <p className="text-xs text-muted-foreground">Original: {selectedRelistItem.price}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price (ETH)
              </Label>
              <Input
                id="price"
                type="number"
                step="0.001"
                min="0.001"
                value={relistPrice}
                onChange={(e) => setRelistPrice(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRelistModalOpen(false)} disabled={isRelisting}>
              Cancel
            </Button>
            <Button onClick={handleRelistSubmit} disabled={isRelisting}>
              {isRelisting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Relisting...
                </>
              ) : (
                'Confirm Listing'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Edit;

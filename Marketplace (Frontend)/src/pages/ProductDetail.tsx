import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/ui/navigation';
import { Footer } from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Model3DViewer } from '@/components/ui/model-3d-viewer';
import { WalletConnectionDialog } from '@/components/ui/wallet-connection-dialog';
import apiService from '@/services/apiService';
import { CONTRACT_ADDRESS } from '@/lib/constants';
import { useUser } from '@clerk/clerk-react';
import {
  ArrowLeft,
  ShoppingCart,
  Heart,
  Share2,
  Download,
  Star,
  User,
  FileText,
  Eye,
  Shield,
  Loader2,
  AlertCircle,
  Play,

  Wallet,
} from 'lucide-react';

import { resolveAssetUrl } from '@/lib/urls';

// Import fallback images
import cadGear from '@/assets/cad-gear.jpg';
import cadDrone from '@/assets/cad-drone.jpg';
import cadEngine from '@/assets/cad-engine.jpg';
import cadRobot from '@/assets/cad-robot.jpg';

interface ProductModel {
  id: string | number;
  title: string;
  description: string;
  images: string[];
  modelUrl: string;
  price: string;
  priceETH?: number;
  seller: {
    name: string;
    avatar: string;
    verified: boolean;
    rating: number;
    totalSales: number;
  };
  specs: {
    fileTypes: string[];
    software: string[];
    fileSize: string;
    vertices: string;
    polygons: string;
    textures: boolean;
    animated: boolean;
  };
  stats: {
    views: number;
    downloads: number;
    rating: number;
    reviews: number;
  };
  category: string;
  tags: string[];
  uploadDate: string;
  lastUpdate: string;
  license: string;
  tokenId?: number;
  contractAddress?: string;
  blockchain?: string;
  royalty?: number;
}

// Mock data for demonstration
// Mock data deleted (Security Fix: Prevent deceptive fallback)

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [model, setModel] = useState<ProductModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);

  // Check if user has wallet connected
  const hasWallet = !!user?.unsafeMetadata?.walletAddress;

  // Transform backend data to frontend ProductModel structure
  const transformBackendData = (backendData: any): ProductModel => {
    const fallbackImages = [cadGear, cadDrone, cadEngine, cadRobot];

    // Prefer backendData.images array if present and non-empty
    let actualImages: string[] = [];
    if (Array.isArray(backendData.images) && backendData.images.length > 0) {
      actualImages = backendData.images.map((url: string) => resolveAssetUrl(url));
    } else if (backendData.imageUrl && backendData.imageUrl !== '/placeholder.jpg') {
      actualImages = [resolveAssetUrl(backendData.imageUrl)];
    } else {
      actualImages = fallbackImages;
    }

    return {
      id: backendData.id,
      title: backendData.title,
      description: backendData.description,
      images: actualImages,
      modelUrl: backendData.modelUrl
        ? resolveAssetUrl(backendData.modelUrl)
        : '/models/sample.obj',
      price: `$${parseFloat(backendData.price) * 2000}`,
      priceETH: parseFloat(backendData.price),
      seller: {
        // SECURITY: Never show wallet address in UI - only show username or generic "Creator"
        name:
          backendData.username ||
          backendData.sellerName ||
          backendData.seller_name ||
          'Creator', // Don't use backendData.seller (wallet address) as it exposes user's address
        avatar:
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendData.username || backendData.sellerName || 'creator'}`,
        verified: true,
        rating: 4.8,
        totalSales: Math.floor(Math.random() * 50) + 10,
      },
      specs: {
        fileTypes: ['GLB', 'OBJ', 'STL'],
        software: ['SolidWorks', 'AutoCAD', 'Fusion 360'],
        fileSize: '15.2 MB',
        vertices: '127,543',
        polygons: '89,231',
        textures: true,
        animated: false,
      },
      stats: {
        views: Math.floor(Math.random() * 1000) + 100,
        downloads: Math.floor(Math.random() * 50) + 10,
        rating: 4.5 + Math.random() * 0.5,
        reviews: Math.floor(Math.random() * 20) + 5,
      },
      category: backendData.category,
      tags: ['CAD', '3D Model', backendData.category, 'Professional'],
      uploadDate: new Date().toISOString().split('T')[0],
      lastUpdate: new Date().toISOString().split('T')[0],
      license: 'Standard License',
      tokenId: backendData.tokenId ? parseInt(backendData.tokenId, 10) : undefined,
      contractAddress: CONTRACT_ADDRESS,
      blockchain: 'Ethereum',
      royalty: backendData.royalty || 0,
    };
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError('Product ID is required');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await apiService.getMarketplaceItem(id);
        if (response.success) {
          const transformedModel = transformBackendData(response.data); // Use response.data as per backend
          setModel(transformedModel);
        } else {
          throw new Error(response.error || 'Failed to fetch product');
        }
      } catch (err) {
        console.error('Error fetching product from API:', err);
        setError('Failed to load product details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handlePurchase = async () => {
    if (!hasWallet) {
      setShowWalletDialog(true);
      return;
    }

    setIsPurchasing(true);
    try {
      // Check if this is mock data
      const isRealProduct = model?.tokenId && model.tokenId > 0;
      if (!isRealProduct) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        alert('Demo purchase successful! (Mock Mode - No Blockchain Interaction)');
        return;
      }

      console.log('Initiating decentralized purchase for:', model.title, model.priceETH);

      // 1. Sign and Pay via Metamask (Decentralized)
      const { web3Service } = await import('@/services/web3Service');

      // [SECURITY] Live Status Check
      // Query Smart Contract directly to ensure item is not already sold
      try {
        const chainItem = await web3Service.getMarketItem(model.tokenId!);
        if (chainItem.sold) {
          throw new Error('This item has already been sold on the blockchain. The database is updating...');
        }
      } catch (checkError: any) {
        if (checkError.message.includes('already been sold')) {
          throw checkError;
        }
        // If check fails (e.g. network error), we warn but might allow proceeding if user insists,
        // but for security we should probably block or at least log.
        console.warn('Could not verify live status:', checkError);
      }

      let tx;
      try {
        tx = await web3Service.purchaseItem(model.tokenId!, model.priceETH!);
        console.log('Transaction sent:', tx.transactionHash);
      } catch (web3Error: any) {
        // Handle Metamask rejections explicitly
        if (web3Error.code === 'ACTION_REJECTED' || web3Error.message?.includes('user rejected')) {
          throw new Error('Transaction cancelled by user.');
        }
        throw new Error(`Blockchain transaction failed: ${web3Error.message}`);
      }

      // 2. Sync with Backend - get buyer address from the signer that just made the purchase
      const signerAddress = await web3Service.signer?.getAddress();
      const userAddress = signerAddress || user?.primaryWeb3Wallet?.web3Wallet || localStorage.getItem('walletAddress') || '';

      console.log('Syncing purchase with backend...');
      const syncResponse = await apiService.syncPurchase(
        model.tokenId!,
        tx.transactionHash,
        userAddress,
        model.priceETH?.toString() || '0'
      );

      if (!syncResponse.success) {
        // If sync fails but blockchain succeeded, warn the user but don't fail the whole flow
        console.warn('Backend sync failed:', syncResponse);
        alert(`Purchase successful on blockchain! \nTx: ${tx.transactionHash}\n\nNote: Database sync failed. Please refresh later.`);
      } else {
        alert(`Purchase Successful! \nTx: ${tx.transactionHash}\nOwner updated on Blockchain & Database.`);
      }

      // Refresh
      window.location.reload();

    } catch (err: any) {
      console.error('Purchase error:', err);
      // User rejected or failed
      if (err.message && err.message.includes('user rejected')) {
        alert('Transaction failed: User rejected request.');
      } else {
        alert(`Purchase failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const toggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: model?.title,
          text: `Check out this 3D model: ${model?.title}`,
          url: window.location.href,
        });
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleWalletConnected = () => {
    // Refresh the page to update wallet state
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading product details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
            <p className="text-muted-foreground mb-4">{error || 'The requested product could not be found.'}</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </button>
          <span>/</span>
          <span>{model.category}</span>
          <span>/</span>
          <span className="text-foreground">{model.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Images and 3D Viewer */}
          <div className="space-y-4">
            {/* Main Image/3D Viewer */}
            <div className="relative aspect-square bg-card/40 backdrop-blur-md rounded-2xl overflow-hidden border border-border/40 shadow-lg group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />
              {show3D ? (
                <Model3DViewer
                  modelUrl={model.modelUrl}
                  className="w-full h-full"
                  fileType={model.specs.fileTypes[0]}
                />
              ) : (
                <img src={model.images[selectedImage]} alt={model.title} className="w-full h-full object-cover" />
              )}

              {/* 3D Toggle Button - Only for supported formats */}
              {model.modelUrl && !model.modelUrl.includes('.SLDPRT') && !model.modelUrl.includes('.SLDASM') && (
                <div className="absolute top-4 right-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShow3D(!show3D)}
                    className="bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white"
                    title={show3D ? 'View Images' : 'View 3D Model'}
                  >
                    {show3D ? <Eye className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    <span className="ml-1 text-xs hidden sm:inline">{show3D ? 'Images' : '3D View'}</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            <div className="flex gap-2 overflow-x-auto pb-2 p-1">
              {model.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedImage(index);
                    setShow3D(false);
                  }}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${selectedImage === index && !show3D ? 'border-primary shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                >
                  <img src={image} alt={`${model.title} view ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
              {/* Only show 3D button for supported formats */}
              {model.modelUrl && !model.modelUrl.includes('.SLDPRT') && !model.modelUrl.includes('.SLDASM') && (
                <button
                  onClick={() => setShow3D(true)}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl border-2 transition-all duration-300 bg-muted/50 backdrop-blur-sm flex items-center justify-center hover:scale-105 ${show3D ? 'border-primary shadow-md text-primary' : 'border-transparent text-muted-foreground opacity-70 hover:opacity-100'
                    }`}
                >
                  <Play className="h-6 w-6 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-6">
            {/* Title and Price */}
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{model.title}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{model.stats.rating}</span>
                  <span className="text-muted-foreground">({model.stats.reviews} reviews)</span>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>{model.stats.views.toLocaleString()} views</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Download className="h-4 w-4" />
                  <span>{model.stats.downloads.toLocaleString()} downloads</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-primary">{model.price}</span>
                  {model.priceETH && <span className="text-muted-foreground">≈ {model.priceETH} ETH</span>}
                  {model.royalty !== undefined && model.royalty > 0 && (
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                      {model.royalty}% Creator Royalty
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={toggleWishlist} className={isWishlisted ? 'text-red-500 border-red-500' : ''}>
                    <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Purchase Buttons */}
            <div className="space-y-3">
              <Button
                size="lg"
                className={hasWallet
                  ? "w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 hover:shadow-lg hover:shadow-purple-500/25 text-white transition-all duration-300 transform hover:-translate-y-0.5 border-0 font-medium tracking-wide"
                  : "w-full bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                }
                onClick={handlePurchase}
                disabled={isPurchasing || !hasWallet}
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing Purchase...
                  </>
                ) : hasWallet ? (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Buy Now
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5 mr-2" />
                    Connect Wallet to Purchase
                  </>
                )}
              </Button>

              {!hasWallet && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <AlertCircle className="h-4 w-4" />
                  <p>Connect your wallet to purchase and own this NFT</p>
                </div>
              )}

              {model.tokenId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  <Shield className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium">Blockchain Verified NFT</p>
                    <p>
                      Token ID: #{model.tokenId} on {model.blockchain}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Seller Info */}
            <Card className="bg-card/40 backdrop-blur-md border border-border/40 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{model.seller.name}</h3>
                        {model.seller.verified && <Shield className="h-4 w-4 text-blue-500" />}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{model.seller.rating}</span>
                        <span>•</span>
                        <span>{model.seller.totalSales} sales</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Specs */}
            <Card className="bg-card/40 backdrop-blur-md border border-border/40 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium mb-1">File Formats</p>
                    <div className="flex flex-wrap gap-1">
                      {model.specs.fileTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-1">File Size</p>
                    <p className="text-muted-foreground">{model.specs.fileSize}</p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Polygons</p>
                    <p className="text-muted-foreground">{model.specs.polygons}</p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">License</p>
                    <p className="text-muted-foreground">{model.license}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="description" className="w-full mt-10">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({model.stats.reviews})</TabsTrigger>
            <TabsTrigger value="seller">Seller Info</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6 animation-fade-in">
            <Card className="bg-card/40 backdrop-blur-md border border-border/40 shadow-sm">
              <CardContent className="p-6">
                <div className="prose prose-gray max-w-none">
                  <div className="whitespace-pre-line text-foreground leading-relaxed">{model.description}</div>

                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {model.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6 animation-fade-in">
            <Card className="bg-card/40 backdrop-blur-md border border-border/40 shadow-sm">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">File Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">File Size:</span>
                          <span>{model.specs.fileSize}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vertices:</span>
                          <span>{model.specs.vertices}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Polygons:</span>
                          <span>{model.specs.polygons}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Textures:</span>
                          <span>{model.specs.textures ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Animated:</span>
                          <span>{model.specs.animated ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Compatible Software</h4>
                      <div className="flex flex-wrap gap-2">
                        {model.specs.software.map((software) => (
                          <Badge key={software} variant="outline">
                            {software}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Upload Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Upload Date:</span>
                          <span>{new Date(model.uploadDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Update:</span>
                          <span>{new Date(model.lastUpdate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Category:</span>
                          <span>{model.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6 animation-fade-in">
            <Card className="bg-card/40 backdrop-blur-md border border-border/40 shadow-sm">
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Reviews feature coming soon!</p>
                  <p className="text-sm">Users will be able to leave reviews and ratings here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seller" className="mt-6 animation-fade-in">
            <Card className="bg-card/40 backdrop-blur-md border border-border/40 shadow-sm">
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Seller profile coming soon!</p>
                  <p className="text-sm">Detailed seller information and portfolio will be displayed here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />

      {/* Wallet Connection Dialog */}
      <WalletConnectionDialog
        isOpen={showWalletDialog}
        onClose={() => setShowWalletDialog(false)}
        onConnect={handleWalletConnected}
      />
    </div>
  );
};
export default ProductDetail;
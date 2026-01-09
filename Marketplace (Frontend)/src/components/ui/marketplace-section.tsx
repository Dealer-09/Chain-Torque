import { CadCard } from '@/components/ui/cad-card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { useMarketplace, useWeb3Status } from '@/hooks/useWeb3';
import { useEffect, useState } from 'react';
import type { MarketplaceItem } from '@/hooks/useWeb3';
import { WalletConnectionDialog } from '@/components/ui/wallet-connection-dialog';
import { resolveAssetUrl } from '@/lib/urls';

// Import fallback images
import cadGear from '@/assets/cad-gear.jpg';
import cadDrone from '@/assets/cad-drone.jpg';
import cadEngine from '@/assets/cad-engine.jpg';
import cadRobot from '@/assets/cad-robot.jpg';

interface DisplayItem {
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
  category?: string;
  modelHash?: string;
  modelUrl?: string | null;
  isBlockchain?: boolean;
}

const featuredModels: DisplayItem[] = [
  {
    id: 1, tokenId: 1,
    title: 'Professional Gear Assembly',
    image: cadGear,
    price: '$49.99',
    seller: 'MechDesign Pro',
    rating: 4.8, downloads: 1245,
    fileTypes: ['GLB', 'STL'],
    software: ['Blender', 'Three.js'],
  },
  {
    id: 2, tokenId: 2,
    title: 'Carbon Fiber Drone Frame',
    image: cadDrone,
    price: '$29.99',
    seller: 'AeroTech',
    rating: 4.9, downloads: 856,
    fileTypes: ['GLB', 'OBJ'],
    software: ['Blender', 'WebGL'],
  },
  {
    id: 3, tokenId: 3,
    title: 'Engine Cylinder Head',
    image: cadEngine,
    price: '$89.99',
    seller: 'AutoCAD Masters',
    rating: 4.7, downloads: 2134,
    fileTypes: ['GLTF', 'GLB'],
    software: ['Three.js', 'WebGL'],
  },
  {
    id: 4, tokenId: 4,
    title: 'Robotic Arm Joint',
    image: cadRobot,
    price: '$75.00',
    seller: 'RoboDesign',
    rating: 4.9, downloads: 967,
    fileTypes: ['GLB', 'STL'],
    software: ['SolidWorks', 'Fusion360'],
  },
];

const categories = ['All', 'Mechanical', 'Automotive', 'Aerospace', 'Robotics', 'Consumer'];

export function MarketplaceSection() {
  const { items, loading, error, refreshMarketplace } = useMarketplace();
  const { initialized } = useWeb3Status();
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>(featuredModels);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (items && items.length > 0) {
      const nftItems: DisplayItem[] = items.map((item: MarketplaceItem, index: number) => ({
        id: item.tokenId || index,
        title: item.title || item.name || `NFT Model #${item.tokenId}`,
        image: item.imageUrl && item.imageUrl !== '/placeholder.jpg'
          ? resolveAssetUrl(item.imageUrl)
          : featuredModels[index % featuredModels.length].image,
        price: item.price ? `${parseFloat(item.price).toFixed(4)} ETH` : '0.001 ETH',
        seller: item.username || 'Creator', // Security: Hide wallet address
        rating: 4.5 + Math.random() * 0.5,
        downloads: parseInt(String(item.downloads)) || Math.floor(Math.random() * 1000),
        fileTypes: ['GLB', 'STL'],
        software: ['Blender', 'Three.js'],
        category: item.category || '3D Model',
        tokenId: item.tokenId,
        modelHash: item.modelHash,
        modelUrl: item.modelUrl ? resolveAssetUrl(item.modelUrl) : null,
        isBlockchain: true,
      }));
      setDisplayItems(nftItems);
    }
  }, [items]);

  const handleWalletRequired = () => setShowWalletDialog(true);
  const handleWalletConnected = () => window.location.reload();

  return (
    <section className='py-16 bg-background' id='library'>
      <div className='container mx-auto px-4'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
          <div>
            <h2 className='text-2xl font-semibold text-foreground'>
              {initialized ? 'Marketplace' : 'Featured Models'}
            </h2>
            <p className='text-sm text-muted-foreground mt-1'>
              Discover professional 3D CAD models
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            className='h-8 text-xs'
            onClick={refreshMarketplace}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Categories */}
        <div className='flex gap-2 mb-8 overflow-x-auto pb-2'>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className='flex flex-col items-center justify-center py-20'>
            <Loader2 className='h-6 w-6 animate-spin text-primary mb-2' />
            <span className='text-sm text-muted-foreground'>Loading...</span>
          </div>
        ) : error ? (
          <div className='text-center py-20'>
            <AlertCircle className='h-8 w-8 text-muted-foreground mx-auto mb-2' />
            <p className='text-sm text-muted-foreground mb-3'>{error}</p>
            <Button onClick={refreshMarketplace} variant='outline' size='sm'>
              Try Again
            </Button>
          </div>
        ) : (
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
            {displayItems.map((model, index) => (
              <CadCard
                key={`${model.tokenId ?? model.id}-${index}`}
                id={model.tokenId ?? model.id}
                title={model.title}
                image={model.image}
                price={model.price}
                seller={model.seller}
                rating={model.rating}
                downloads={model.downloads}
                fileTypes={model.fileTypes}
                software={model.software}
                onWalletRequired={handleWalletRequired}
              />
            ))}
          </div>
        )}

        {/* Load More */}
        <div className='text-center mt-10'>
          <Button variant='outline' className='px-6 text-sm'>
            Load More
          </Button>
        </div>
      </div>

      <WalletConnectionDialog
        isOpen={showWalletDialog}
        onClose={() => setShowWalletDialog(false)}
        onConnect={handleWalletConnected}
      />
    </section>
  );
}

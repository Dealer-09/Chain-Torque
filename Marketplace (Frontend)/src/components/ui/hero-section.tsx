import { Search, ChevronRight, Zap, Star, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CadCard } from '@/components/ui/cad-card';
import { Button } from '@/components/ui/button';
import { useMarketplace } from '@/hooks/useWeb3';
import { useEffect, useState } from 'react';
import { WalletConnectionDialog } from '@/components/ui/wallet-connection-dialog';
import { Gear3D } from '@/components/ui/Gear3D';
import { AutoCadGearSvg } from '@/components/ui/GearSvg';
import { EngineSvg, WrenchSvg, PistonSvg, CircuitSvg, CogSvg, BlueprintSvg } from '@/components/ui/AnimatedCadSvgs';
import { resolveAssetUrl } from '@/lib/urls';

// Import fallback images
import cadGear from '@/assets/cad-gear.jpg';
import cadDrone from '@/assets/cad-drone.jpg';
import cadEngine from '@/assets/cad-engine.jpg';
import cadRobot from '@/assets/cad-robot.jpg';

interface DisplayItem {
  id: number;
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
}

const featuredModels: DisplayItem[] = [
  { id: 1, tokenId: 1, title: 'Professional Gear Assembly', image: cadGear, price: '$49.99', seller: 'MechDesign Pro', rating: 4.8, downloads: 1245, fileTypes: ['GLB', 'STL'], software: ['Blender', 'Three.js'], category: 'Other' },
  { id: 2, tokenId: 2, title: 'Carbon Fiber Drone Frame', image: cadDrone, price: '$29.99', seller: 'AeroTech', rating: 4.9, downloads: 856, fileTypes: ['GLB', 'OBJ'], software: ['Blender', 'WebGL'], category: 'Vehicles' },
  { id: 3, tokenId: 3, title: 'Engine Cylinder Head', image: cadEngine, price: '$89.99', seller: 'AutoCAD Masters', rating: 4.7, downloads: 2134, fileTypes: ['GLTF', 'GLB'], software: ['Three.js', 'WebGL'], category: 'Vehicles' },
  { id: 4, tokenId: 4, title: 'Robotic Arm Joint', image: cadRobot, price: '$75.00', seller: 'RoboDesign', rating: 4.9, downloads: 967, fileTypes: ['GLB', 'STL'], software: ['SolidWorks', 'Fusion360'], category: 'Electronics' },
];

const categories = [
  { name: 'Architecture', icon: '🏛️', count: '410+' },
  { name: 'Vehicles', icon: '🚗', count: '320+' },
  { name: 'Characters', icon: '👾', count: '150+' },
  { name: 'Furniture', icon: '🪑', count: '210+' },
  { name: 'Electronics', icon: '💡', count: '260+' },
  { name: 'Nature', icon: '🌿', count: '180+' },
  { name: 'Other', icon: '📦', count: '500+' },
];

export function HeroSection() {
  const { items } = useMarketplace();
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>(featuredModels);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Transform backend items to display format
  const transformItem = (item: any, index: number): DisplayItem => ({
    id: item.tokenId || index,
    tokenId: item.tokenId || index,
    title: item.title || item.name || `Model #${item.tokenId}`,
    image: item.imageUrl && item.imageUrl !== '/placeholder.jpg'
      ? resolveAssetUrl(item.imageUrl)
      : featuredModels[index % featuredModels.length].image,
    price: item.price ? `${parseFloat(item.price).toFixed(4)} ETH` : '0.01 ETH',
    seller: item.username || 'Creator',
    rating: item.rating || 4.5,
    downloads: item.downloads || 0,
    fileTypes: ['GLB', 'STL'],
    software: ['Blender', 'Three.js'],
    category: item.category || 'Other',
  });

  // Filter items based on search and category
  useEffect(() => {
    if (items && items.length > 0) {
      let filtered = items.map(transformItem);

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item =>
          item.title.toLowerCase().includes(query) ||
          item.seller.toLowerCase().includes(query)
        );
      }

      // Apply category filter
      if (selectedCategory) {
        const cat = selectedCategory.toLowerCase();
        filtered = filtered.filter(item =>
          item.category && item.category.toLowerCase() === cat
        );
      }

      // When searching/filtering, show filtered results (even if empty - don't show fallback)
      setDisplayItems(filtered.slice(0, 8));
    } else if (items.length === 0) {
      // Only show fallback when there are NO items at all (empty marketplace)
      setDisplayItems(featuredModels);
    } else {
      // Show actual items when no search/filter
      setDisplayItems(items.map(transformItem).slice(0, 8));
    }
  }, [items, searchQuery, selectedCategory]);

  const handleSearch = () => {
    // Trigger re-filter (already handled by useEffect)
    console.log('Searching for:', searchQuery);
  };

  return (
    <>
      {/* Hero Banner */}
      <section className='relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 py-8'>
        <div className='container mx-auto px-4'>
          <div className='grid lg:grid-cols-3 gap-6'>
            {/* Main Hero Card */}
            <div className='lg:col-span-2 relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 p-8 min-h-[300px] flex flex-col justify-end'>
              {/* Animated CAD SVG Icons - continuous animation */}
              <div className='absolute top-4 right-4 opacity-40'>
                <EngineSvg size={70} color='white' />
              </div>
              <div className='absolute top-8 right-24 opacity-35'>
                <PistonSvg size={50} color='white' />
              </div>
              <div className='absolute top-24 right-8 opacity-40'>
                <CogSvg size={45} color='white' />
              </div>
              <div className='absolute bottom-24 right-6 opacity-35'>
                <CircuitSvg size={55} color='white' />
              </div>
              <div className='absolute bottom-32 right-28 opacity-30'>
                <WrenchSvg size={40} color='white' />
              </div>
              <div className='absolute top-16 right-[140px] opacity-25'>
                <BlueprintSvg size={55} color='white' />
              </div>
              <div className='absolute bottom-16 right-[100px] opacity-20'>
                <AutoCadGearSvg size={50} color='white' />
              </div>
              <div className='absolute inset-0 opacity-20'>
                <div className='absolute top-10 right-10 w-40 h-40 rounded-full bg-white/20 blur-2xl' />
                <div className='absolute bottom-10 left-10 w-32 h-32 rounded-full bg-white/20 blur-2xl' />
              </div>
              <div className='relative z-10'>
                <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium mb-4'>
                  <Zap className='h-3 w-3' />
                  Featured Collection
                </div>
                <h1 className='text-3xl md:text-4xl font-bold text-white mb-3'>
                  Premium CAD Models
                </h1>
                <p className='text-white/80 mb-6 max-w-md'>
                  Discover high-quality 3D models from verified creators. Trade securely on the blockchain.
                </p>
                <Link
                  to='/upload'
                  className='inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-indigo-600 font-medium hover:bg-white/90 transition-all text-sm'
                >
                  Start Selling
                  <ArrowRight className='h-4 w-4' />
                </Link>
              </div>
            </div>

            {/* 3D Gear Display */}
            <div className='rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 overflow-hidden min-h-[300px] flex items-center justify-center border border-slate-200 dark:border-white/10'>
              <Gear3D size='medium' />
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <section className='bg-background border-b border-border/50 py-4 sticky top-16 z-40'>
        <div className='container mx-auto px-4'>
          <div className='flex items-center gap-3 max-w-3xl mx-auto'>
            <div className='relative flex-1'>
              <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder='Search for 3D models, CAD files, designs...'
                className='w-full pl-11 pr-4 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all'
              />
            </div>
            <Button className='px-5' onClick={handleSearch}>Search</Button>
            {searchQuery && (
              <Button variant='ghost' size='sm' onClick={() => setSearchQuery('')}>Clear</Button>
            )}
          </div>
        </div>
      </section>

      {/* Categories Strip */}
      <section className='bg-muted/30 border-b border-border/50 py-4'>
        <div className='container mx-auto px-4'>
          <div className='flex items-center gap-6 overflow-x-auto pb-2'>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${!selectedCategory
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border/50 hover:border-primary/30 hover:bg-primary/5'
                }`}
            >
              <span className='text-lg'>🏠</span>
              <div className='text-sm font-medium'>All</div>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name === selectedCategory ? null : cat.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap group ${selectedCategory === cat.name
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border/50 hover:border-primary/30 hover:bg-primary/5'
                  }`}
              >
                <span className='text-lg'>{cat.icon}</span>
                <div className='text-left'>
                  <div className={`text-sm font-medium transition-colors ${selectedCategory === cat.name ? '' : 'text-foreground group-hover:text-primary'}`}>{cat.name}</div>
                  <div className={`text-xs ${selectedCategory === cat.name ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{cat.count} models</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Now Section */}
      <section className='py-10 bg-background' id='library'>
        <div className='container mx-auto px-4'>
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center gap-3'>
              <TrendingUp className='h-5 w-5 text-primary' />
              <h2 className='text-xl font-semibold text-foreground'>Trending Now</h2>
            </div>
            <Link to='#library' className='text-sm text-primary hover:text-primary/80 flex items-center gap-1'>
              See all <ChevronRight className='h-4 w-4' />
            </Link>
          </div>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {displayItems.map((model, index) => (
              <CadCard
                key={`trending-${model.id}-${index}`}
                id={model.tokenId}
                title={model.title}
                image={model.image}
                price={model.price}
                seller={model.seller}
                rating={model.rating}
                downloads={model.downloads}
                fileTypes={model.fileTypes}
                software={model.software}
                onWalletRequired={() => setShowWalletDialog(true)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className='py-10 bg-muted/20'>
        <div className='container mx-auto px-4'>
          <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-6'>
            {/* Best Sellers Card */}
            <div className='bg-card rounded-xl p-5 border border-border/50'>
              <div className='flex items-center gap-2 mb-4'>
                <Star className='h-4 w-4 text-amber-500' />
                <h3 className='font-semibold text-foreground'>Best Sellers</h3>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                {displayItems.slice(0, 4).map((item, i) => (
                  <Link key={`best-${i}`} to={`/product/${item.tokenId}`} className='aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity'>
                    <img src={item.image} alt={item.title} className='w-full h-full object-cover' />
                  </Link>
                ))}
              </div>
              <Link to='#library' className='text-xs text-primary mt-3 inline-block hover:underline'>See more</Link>
            </div>

            {/* New Arrivals Card */}
            <div className='bg-card rounded-xl p-5 border border-border/50'>
              <div className='flex items-center gap-2 mb-4'>
                <Clock className='h-4 w-4 text-emerald-500' />
                <h3 className='font-semibold text-foreground'>New Arrivals</h3>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                {displayItems.slice(0, 4).map((item, i) => (
                  <Link key={`new-${i}`} to={`/product/${item.tokenId}`} className='aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity'>
                    <img src={item.image} alt={item.title} className='w-full h-full object-cover' />
                  </Link>
                ))}
              </div>
              <Link to='#library' className='text-xs text-primary mt-3 inline-block hover:underline'>See more</Link>
            </div>

            {/* Top Rated Card */}
            <div className='bg-card rounded-xl p-5 border border-border/50'>
              <div className='flex items-center gap-2 mb-4'>
                <Star className='h-4 w-4 text-primary fill-primary' />
                <h3 className='font-semibold text-foreground'>Top Rated</h3>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                {displayItems.slice(0, 4).map((item, i) => (
                  <Link key={`top-${i}`} to={`/product/${item.tokenId}`} className='aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity'>
                    <img src={item.image} alt={item.title} className='w-full h-full object-cover' />
                  </Link>
                ))}
              </div>
              <Link to='#library' className='text-xs text-primary mt-3 inline-block hover:underline'>See more</Link>
            </div>

            {/* 3D Gear Showcase Card */}
            <div className='bg-gradient-to-br from-slate-100/80 to-slate-200/80 dark:from-slate-800/80 dark:to-slate-900/80 rounded-xl overflow-hidden border border-slate-200 dark:border-primary/20 flex items-center justify-center min-h-[200px]'>
              <Gear3D size='small' />
            </div>
          </div>
        </div>
      </section>

      {/* More Products */}
      <section className='py-10 bg-background'>
        <div className='container mx-auto px-4'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-semibold text-foreground'>Recommended for You</h2>
            <Button variant='outline' size='sm'>
              View All
            </Button>
          </div>
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4'>
            {(items && items.length > 0 ? items.slice(0, 5).map((item: any, index: number) => {
              const model = {
                id: item.tokenId || index,
                tokenId: item.tokenId || index,
                title: item.title || item.name || `Model #${item.tokenId}`,
                image: item.imageUrl && item.imageUrl !== '/placeholder.jpg'
                  ? resolveAssetUrl(item.imageUrl)
                  : featuredModels[index % featuredModels.length].image,
                price: item.price ? `${parseFloat(item.price).toFixed(4)} ETH` : '0.01 ETH',
                seller: item.username || 'Creator',
                rating: 4.5 + Math.random() * 0.5,
                downloads: parseInt(item.downloads) || Math.floor(Math.random() * 1000) + 100,
                fileTypes: ['GLB', 'STL'],
                software: ['Blender', 'Three.js'],
              };
              return (
                <CadCard
                  key={`recommended-${model.id}-${index}`}
                  id={model.tokenId}
                  title={model.title}
                  image={model.image}
                  price={model.price}
                  seller={model.seller}
                  rating={model.rating}
                  downloads={model.downloads}
                  fileTypes={model.fileTypes}
                  software={model.software}
                  onWalletRequired={() => setShowWalletDialog(true)}
                />
              );
            }) : displayItems.slice(0, 5).map((model, index) => (
              <CadCard
                key={`recommended-fallback-${model.id}-${index}`}
                id={model.tokenId}
                title={model.title}
                image={model.image}
                price={model.price}
                seller={model.seller}
                rating={model.rating}
                downloads={model.downloads}
                fileTypes={model.fileTypes}
                software={model.software}
                onWalletRequired={() => setShowWalletDialog(true)}
              />
            )))}
          </div>
        </div>
      </section>

      <WalletConnectionDialog
        isOpen={showWalletDialog}
        onClose={() => setShowWalletDialog(false)}
        onConnect={() => window.location.reload()}
      />
    </>
  );
}

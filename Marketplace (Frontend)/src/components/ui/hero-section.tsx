import { Search, ChevronRight, Star, TrendingUp, Clock, ArrowRight, Building2, Car, Users, Armchair, Cpu, Leaf, Package, Home, Scan } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CadCard } from '@/components/ui/cad-card';
import { Button } from '@/components/ui/button';
import { useMarketplace } from '@/hooks/useWeb3';
import { useEffect, useState } from 'react';
import { WalletConnectionDialog } from '@/components/ui/wallet-connection-dialog';
import { Gear3D } from '@/components/ui/Gear3D';
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
  { name: 'Architecture', icon: <Building2 className='w-5 h-5' />, count: '410+' },
  { name: 'Vehicles', icon: <Car className='w-5 h-5' />, count: '320+' },
  { name: 'Characters', icon: <Users className='w-5 h-5' />, count: '150+' },
  { name: 'Furniture', icon: <Armchair className='w-5 h-5' />, count: '210+' },
  { name: 'Electronics', icon: <Cpu className='w-5 h-5' />, count: '260+' },
  { name: 'Nature', icon: <Leaf className='w-5 h-5' />, count: '180+' },
  { name: 'Other', icon: <Package className='w-5 h-5' />, count: '500+' },
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
    // Handle empty or null items
    if (!items || items.length === 0) {
      setDisplayItems(featuredModels);
      return;
    }

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

    // Show filtered results (up to 8 items)
    setDisplayItems(filtered.slice(0, 8));
  }, [items, searchQuery, selectedCategory]);

  const handleSearch = () => {
    // Trigger re-filter (already handled by useEffect)
    console.log('Searching for:', searchQuery);
  };

  return (
    <>
      {/* Hero Banner */}
      <section className='relative bg-background py-10 lg:py-16 overflow-hidden'>
        <div className="absolute inset-0 bg-background [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
        {/* Soft background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80wv] max-w-[1000px] h-[400px] opacity-[0.08] dark:opacity-[0.15] bg-indigo-500 blur-[120px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

        <div className='container mx-auto px-4 relative z-10'>
          <div className='grid lg:grid-cols-12 gap-6'>
            {/* Main Hero Card */}
            <div className='lg:col-span-8 relative rounded-3xl overflow-hidden bg-card/60 dark:bg-[#0A0A0A] backdrop-blur-xl border border-slate-200/60 dark:border-white/10 p-8 lg:p-12 min-h-[420px] flex flex-col justify-center shadow-[0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] group'>
              {/* Premium Background Effects */}
              <div className='absolute -top-32 -right-32 w-[80%] h-[120%] bg-indigo-600/5 dark:bg-indigo-600/10 rounded-full blur-[100px] opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-multiply dark:mix-blend-screen' />
              <div className='absolute -bottom-32 -left-32 w-[60%] h-[80%] bg-purple-600/5 dark:bg-purple-600/10 rounded-full blur-[100px] opacity-40 pointer-events-none mix-blend-multiply dark:mix-blend-screen' />
              <div className='absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none' />

              {/* Animated CAD SVG Icons - floating subtly in background */}
              <div className='absolute top-8 right-8 opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition-opacity duration-500 text-slate-800 dark:text-white'>
                <EngineSvg size={100} />
              </div>
              <div className='absolute top-16 right-48 opacity-[0.05] dark:opacity-[0.12] text-slate-800 dark:text-white'>
                <PistonSvg size={70} />
              </div>
              <div className='absolute top-36 right-16 opacity-10 dark:opacity-15 text-slate-800 dark:text-white'>
                <CogSvg size={65} />
              </div>
              <div className='absolute bottom-12 right-12 opacity-10 dark:opacity-15 text-slate-800 dark:text-white'>
                <CircuitSvg size={80} />
              </div>
              <div className='absolute bottom-32 right-40 opacity-5 dark:opacity-10 text-slate-800 dark:text-white'>
                <WrenchSvg size={50} />
              </div>
              <div className='absolute top-28 right-[240px] opacity-[0.03] dark:opacity-[0.08] hidden md:block text-slate-800 dark:text-white'>
                <BlueprintSvg size={80} />
              </div>

              <div className='relative z-20 max-w-xl'>
                <div className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/90 text-xs font-medium mb-6 shadow-sm dark:shadow-inner'>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  Verified CAD Marketplace
                </div>
                <h1 className='text-4xl sm:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-800 dark:from-white dark:via-indigo-100 dark:to-white/70 tracking-tight leading-[1.1] mb-6 drop-shadow-sm'>
                  Premium Engineering Models
                </h1>
                <p className='text-slate-600 dark:text-white/60 mb-8 text-base leading-relaxed font-light'>
                  Discover high-fidelity 3D assets from verified creators. Trade securely on the blockchain with instant IP rights transfer.
                </p>
                <div className='flex flex-wrap items-center gap-4'>
                  <Link
                    to='/upload'
                    className='inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white dark:bg-white dark:text-black font-semibold hover:bg-indigo-700 dark:hover:bg-white/90 transition-all text-sm shadow-[0_0_20px_rgba(79,70,229,0.2)] dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transform hover:-translate-y-0.5'
                  >
                    Start Selling Now
                    <ArrowRight className='h-4 w-4' />
                  </Link>
                  <a href="#library" className="group inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-medium border border-slate-200 dark:border-white/20 text-slate-700 dark:text-white bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 backdrop-blur-xl transition-all">
                    Explore Library
                    <ChevronRight className='h-4 w-4 ml-1 opacity-50 group-hover:opacity-100 transition-opacity group-hover:translate-x-1' />
                  </a>
                </div>
              </div>
            </div>

            {/* 3D Gear Display */}
            <div className='lg:col-span-4 rounded-3xl bg-white/60 dark:bg-[#050505] backdrop-blur-xl overflow-hidden min-h-[300px] lg:min-h-[420px] flex items-center justify-center border border-slate-200/60 dark:border-white/5 relative group shadow-[0_10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]'>
              <div className='absolute inset-0 bg-gradient-to-t from-indigo-100/50 to-transparent dark:from-indigo-900/10 pointer-events-none' />
              <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none' />
              <Gear3D size='medium' />

              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/50 text-[10px] uppercase tracking-wider font-semibold flex items-center gap-2 shadow-sm dark:shadow-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] dark:shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                Interactive 3D
              </div>
              <div className="absolute bottom-4 left-4 right-4 px-4 py-3 rounded-2xl bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/5 flex items-center justify-between shadow-sm dark:shadow-none">
                <div>
                  <div className="text-slate-500 dark:text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Live View</div>
                  <div className="text-slate-900 dark:text-white text-sm font-medium">Mechanical Gear Assembly</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                  <Scan className="w-4 h-4 text-slate-600 dark:text-white/70" />
                </div>
              </div>
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 whitespace-nowrap ${!selectedCategory
                ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                : 'bg-background border-border/50 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm'
                }`}
            >
              <span className={`flex items-center justify-center transition-colors ${!selectedCategory ? 'text-primary-foreground/90' : 'text-muted-foreground group-hover:text-primary'}`}><Home className='w-5 h-5 text-current' /></span>
              <div className='text-sm font-medium'>All</div>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name === selectedCategory ? null : cat.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 whitespace-nowrap group ${selectedCategory === cat.name
                  ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                  : 'bg-background border-border/50 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm'
                  }`}
              >
                <span className={`flex items-center justify-center transition-colors ${selectedCategory === cat.name ? 'text-primary-foreground/90' : 'text-muted-foreground group-hover:text-primary'}`}>{cat.icon}</span>
                <div className='text-left'>
                  <div className={`text-sm font-medium transition-colors ${selectedCategory === cat.name ? '' : 'text-foreground group-hover:text-primary'}`}>{cat.name}</div>
                  <div className={`text-xs transition-colors ${selectedCategory === cat.name ? 'text-primary-foreground/70' : 'text-muted-foreground group-hover:text-primary/70'}`}>{cat.count} models</div>
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
            <div className='bg-card/60 backdrop-blur-md rounded-2xl p-6 border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group'>
              <div className='absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
              <div className='flex items-center gap-2 mb-5 relative z-10'>
                <Star className='h-5 w-5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' />
                <h3 className='font-semibold text-foreground tracking-tight'>Best Sellers</h3>
              </div>
              <div className='grid grid-cols-2 gap-3 relative z-10'>
                {displayItems.slice(0, 4).map((item, i) => (
                  <Link key={`best-${i}`} to={`/product/${item.tokenId}`} className='aspect-square rounded-xl overflow-hidden bg-muted group/item relative'>
                    <img src={item.image} alt={item.title} className='w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110' />
                    <div className='absolute inset-0 bg-black/20 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-center justify-center'>
                      <span className='text-white text-xs font-medium px-2 py-1 rounded bg-black/40 backdrop-blur-sm'>View</span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link to='#library' className='text-xs text-primary mt-3 inline-block hover:underline'>See more</Link>
            </div>

            {/* New Arrivals Card */}
            <div className='bg-card/60 backdrop-blur-md rounded-2xl p-6 border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group'>
              <div className='absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
              <div className='flex items-center gap-2 mb-5 relative z-10'>
                <Clock className='h-5 w-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' />
                <h3 className='font-semibold text-foreground tracking-tight'>New Arrivals</h3>
              </div>
              <div className='grid grid-cols-2 gap-3 relative z-10'>
                {displayItems.slice(0, 4).map((item, i) => (
                  <Link key={`new-${i}`} to={`/product/${item.tokenId}`} className='aspect-square rounded-xl overflow-hidden bg-muted group/item relative'>
                    <img src={item.image} alt={item.title} className='w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110' />
                    <div className='absolute inset-0 bg-black/20 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-center justify-center'>
                      <span className='text-white text-xs font-medium px-2 py-1 rounded bg-black/40 backdrop-blur-sm'>View</span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link to='#library' className='text-xs text-primary mt-3 inline-block hover:underline'>See more</Link>
            </div>

            {/* Top Rated Card */}
            <div className='bg-card/60 backdrop-blur-md rounded-2xl p-6 border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group'>
              <div className='absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
              <div className='flex items-center gap-2 mb-5 relative z-10'>
                <Star className='h-5 w-5 text-primary fill-primary drop-shadow-[0_0_8px_inherit]' />
                <h3 className='font-semibold text-foreground tracking-tight'>Top Rated</h3>
              </div>
              <div className='grid grid-cols-2 gap-3 relative z-10'>
                {displayItems.slice(0, 4).map((item, i) => (
                  <Link key={`top-${i}`} to={`/product/${item.tokenId}`} className='aspect-square rounded-xl overflow-hidden bg-muted group/item relative'>
                    <img src={item.image} alt={item.title} className='w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110' />
                    <div className='absolute inset-0 bg-black/20 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-center justify-center'>
                      <span className='text-white text-xs font-medium px-2 py-1 rounded bg-black/40 backdrop-blur-sm'>View</span>
                    </div>
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

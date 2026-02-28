import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Download, Star, ShoppingCart, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

interface CadCardProps {
  id: string | number | { tokenId: string | number };
  title: string;
  image: string;
  price: string;
  seller: string;
  rating: number;
  downloads: number;
  fileTypes: string[];
  software: string[];
  className?: string;
  onWalletRequired?: () => void;
  royalty?: number;
}

export function CadCard({
  id = 1,
  title,
  image,
  price,
  seller,
  rating,
  downloads,
  fileTypes,
  software,
  className,
  onWalletRequired,
  royalty,
}: CadCardProps) {
  const navigate = useNavigate();
  const { user } = useUser();

  const hasWallet = !!user?.unsafeMetadata?.walletAddress;

  const handleCardClick = () => {
    let detailId: string | number = '';
    if (id && typeof id === 'object' && 'tokenId' in id && id.tokenId != null) {
      detailId = id.tokenId;
    } else if (id != null && (typeof id === 'string' || typeof id === 'number')) {
      detailId = id;
    }
    navigate(`/product/${detailId}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasWallet) {
      if (onWalletRequired) {
        onWalletRequired();
      }
      return;
    }
    console.log(`Added ${title} to cart`);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Toggled wishlist for ${title}`);
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden bg-card/60 backdrop-blur-md border border-border/40 rounded-2xl',
        'hover:border-primary/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1',
        className
      )}
      onClick={handleCardClick}
    >
      <CardContent className='p-0 relative'>
        <div className='absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none' />
        {/* Image */}
        <div className='relative aspect-[4/3] overflow-hidden bg-muted'>
          <img
            src={image}
            alt={title}
            className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'
          />

          {/* Wishlist */}
          <Button
            size='sm'
            variant='ghost'
            className='absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background'
            onClick={handleToggleWishlist}
          >
            <Heart className='h-3.5 w-3.5 text-muted-foreground' />
          </Button>

          {/* File types */}
          <div className='absolute bottom-2 left-2 flex gap-1'>
            {fileTypes.slice(0, 2).map((type) => (
              <span
                key={type}
                className='px-1.5 py-0.5 text-[10px] font-medium uppercase rounded bg-background/80 backdrop-blur-sm text-foreground/70'
              >
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className='p-3'>
          <h3 className='font-medium text-sm text-foreground mb-1.5 line-clamp-1 group-hover:text-primary transition-colors'>
            {title}
          </h3>

          <div className='flex items-center justify-between text-xs text-muted-foreground mb-2'>
            <span className='truncate'>{seller}</span>
            <div className='flex flex-col items-end gap-0.5'>
              <div className='flex items-center gap-0.5'>
                <Star className='h-3 w-3 fill-amber-400 text-amber-400' />
                <span>{rating.toFixed(1)}</span>
              </div>
              {royalty !== undefined && royalty > 0 && (
                <span className='text-[10px] text-primary/80 font-medium'>
                  {royalty}% Royalty
                </span>
              )}
            </div>
          </div>

          {/* Software */}
          <div className='flex gap-1 mb-3'>
            {software.slice(0, 2).map((sw) => (
              <Badge
                key={sw}
                variant='secondary'
                className='text-[10px] px-1.5 py-0 h-4 font-normal bg-muted/50'
              >
                {sw}
              </Badge>
            ))}
          </div>

          {/* Price & CTA */}
          <div className='flex items-center justify-between pt-2 border-t border-border/50'>
            <div>
              <span className='text-base font-semibold text-primary'>{price}</span>
              <div className='flex items-center gap-1 text-[10px] text-muted-foreground'>
                <Download className='h-2.5 w-2.5' />
                {downloads.toLocaleString()}
              </div>
            </div>
            <Button
              size='sm'
              className={cn(
                'h-8 px-3 text-xs rounded-lg',
                hasWallet
                  ? 'bg-primary hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              )}
              onClick={handleAddToCart}
            >
              {hasWallet ? (
                <>
                  <ShoppingCart className='h-3 w-3 mr-1' />
                  Add
                </>
              ) : (
                <>
                  <Wallet className='h-3 w-3 mr-1' />
                  Connect
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

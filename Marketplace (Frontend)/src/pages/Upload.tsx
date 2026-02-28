import React, { useState } from 'react';
import { Navigation } from '../components/ui/navigation';
import { Footer } from '../components/ui/footer';
import { Button } from '../components/ui/button';
import { WalletConnectionDialog } from '@/components/ui/wallet-connection-dialog';
import { useAuthContext } from '@/hooks/useAuth';
import apiService from '@/services/apiService';
import { Wallet, Upload as UploadIcon, Check, ImageIcon, FileType, Tag } from 'lucide-react';

interface UploadData {
  modelName: string;
  description: string;
  category: string;
  price: string;
  royalty: string;
  files: File[];
  images: File[];
  tags: string[];
}

const Upload: React.FC = () => {
  const { user } = useAuthContext();
  const [step, setStep] = useState(1);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [uploadData, setUploadData] = useState<UploadData>({
    modelName: '',
    description: '',
    category: '',
    price: '',
    royalty: '0',
    files: [],
    images: [],
    tags: [],
  });
  const [isUploading, setIsUploading] = useState(false);

  // Check both MetaMask installed AND wallet connected in Clerk
  const hasMetaMask = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  const hasWalletConnected = !!user?.unsafeMetadata?.walletAddress;
  const canUpload = hasMetaMask && hasWalletConnected;

  const handleInputChange = (field: keyof UploadData, value: any) => {
    setUploadData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'files' | 'images'
  ) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);

      if (type === 'images') {
        if (fileArray.length > 5) {
          alert('You can select a maximum of 5 images.');
          // Limit to 5
          handleInputChange(type, fileArray.slice(0, 5));
          return;
        }
      }

      handleInputChange(type, fileArray);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !uploadData.tags.includes(tag)) {
      handleInputChange('tags', [...uploadData.tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange(
      'tags',
      uploadData.tags.filter(tag => tag !== tagToRemove)
    );
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return uploadData.modelName.trim() !== '' && uploadData.description.trim() !== '';
      case 2:
        return uploadData.category !== '' && uploadData.price !== '';
      case 3:
        return uploadData.files.length > 0;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setIsUploading(true);
    try {
      // ============================================================
      // DECENTRALIZED UPLOAD FLOW
      // 1. Check MetaMask is installed (before wasting IPFS uploads)
      // 2. Upload files to IPFS (via backend)
      // 3. User signs createToken() with MetaMask (frontend web3)
      // 4. Sync result to backend database
      // ============================================================

      // CHECK 1: MetaMask must be installed
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed! Please install MetaMask to create NFTs.\n\nDownload: https://metamask.io/download/');
      }

      // CHECK 2: Wallet must be connected
      const walletAddress = user?.unsafeMetadata?.walletAddress as string;
      if (!walletAddress) {
        throw new Error('Please connect your wallet first. Your wallet will sign the transaction.');
      }

      // CHECK 3: Verify MetaMask account matches logged-in user
      const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
      if (accounts && accounts.length > 0 && accounts[0].toLowerCase() !== walletAddress.toLowerCase()) {
        // AUTO-FIX: Offer to update profile
        const shouldUpdate = window.confirm(
          `Wallet Mismatch Details:\n\n` +
          `• Profile Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} (Original)\n` +
          `• MetaMask Wallet: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)} (Active)\n\n` +
          `Do you want to UPDATE your "Archis" profile to link this new MetaMask wallet instead?`
        );

        if (shouldUpdate && user) {
          try {
            await user.update({
              unsafeMetadata: { ...user.unsafeMetadata, walletAddress: accounts[0] }
            });
            alert('Profile updated to new wallet! Refreshing...');
            window.location.reload();
            return;
          } catch (err: any) {
            throw new Error(`Failed to update wallet: ${err.message}`);
          }
        }

        throw new Error(`Wallet Mismatch! Please switch MetaMask to ${walletAddress} or update your profile.`);
      }

      // Prepare username for display
      let username = 'Creator';
      if (user?.firstName || user?.lastName) {
        username = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
      } else if (user?.username) {
        username = String(user.username);
      }

      // CHECK 3: Validate files
      if (uploadData.files.length === 0) {
        throw new Error('Please select a model file to upload.');
      }
      if (uploadData.images.length === 0) {
        throw new Error('Please select at least one preview image.');
      }

      // STEP 1: Upload files to IPFS (backend handles IPFS upload only)
      const formData = new FormData();
      formData.append('title', uploadData.modelName);
      formData.append('description', uploadData.description);
      formData.append('category', uploadData.category);

      // Add model file
      formData.append('model', uploadData.files[0]);

      // Add image files
      uploadData.images.forEach((image) => {
        formData.append('image', image);
      });

      const ipfsResponse = await apiService.uploadFilesToIPFS(formData);
      if (!ipfsResponse.success || !ipfsResponse.data?.tokenURI) {
        throw new Error(ipfsResponse.error || 'Failed to upload files to IPFS');
      }

      // Log removed
      const { tokenURI, imageUrl, images, modelUrl } = ipfsResponse.data;

      // STEP 2: User signs createToken with their MetaMask wallet
      // Log removed
      alert('Files uploaded! Please sign the transaction in MetaMask to mint your NFT.\n\nYou will be the on-chain owner and receive payments directly when your item sells.');

      // Import web3Service dynamically to avoid circular deps
      const { web3Service } = await import('@/services/web3Service');

      // Get category ID (simple mapping)
      const categoryMap: Record<string, number> = {
        'Electronics': 1, 'Collectibles': 2, 'Art': 3, 'Music': 4, 'Gaming': 5,
        'Sports': 6, 'Photography': 7, 'Virtual Real Estate': 8, 'Domain Names': 9, 'Utility': 10,
        'Automotive': 10, 'Mechanical': 10, 'Aerospace': 10, 'Industrial': 10, 'Other': 10
      };
      const categoryId = categoryMap[uploadData.category] || 10;

      const mintResult = await web3Service.createItem(
        tokenURI,
        parseFloat(uploadData.price),
        categoryId,
        parseFloat(uploadData.royalty) // Raw %, web3Service converts to BPS internally
      );

      if (!mintResult.transactionHash) {
        throw new Error('Transaction was cancelled or failed.');
      }

      if (import.meta.env.DEV) console.log('[Upload] Mint transaction:', mintResult.transactionHash);

      // Extract tokenId from the receipt
      // The receipt should have logs with the MarketItemCreated event
      let tokenId: number | null = null;
      if (mintResult.receipt?.logs) {
        const { ethers } = await import('ethers');
        const { MARKETPLACE_ABI } = await import('@/lib/constants');
        const iface = new ethers.Interface(MARKETPLACE_ABI);

        for (const log of mintResult.receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === 'MarketItemCreated') {
              tokenId = Number(parsed.args.tokenId);
              break;
            }
          } catch {
            continue;
          }
        }
      }

      if (!tokenId) {
        throw new Error('Could not find Token ID in transaction. Please check Etherscan and try syncing manually.');
      }

      if (import.meta.env.DEV) console.log('[Upload] Token ID:', tokenId);

      // STEP 3: Sync to backend database
      if (import.meta.env.DEV) console.log('[Upload] Step 3: Syncing to database...');
      const syncResponse = await apiService.syncCreation({
        tokenId,
        transactionHash: mintResult.transactionHash,
        walletAddress,
        title: uploadData.modelName,
        description: uploadData.description,
        category: uploadData.category,
        price: uploadData.price,
        imageUrl,
        images,
        modelUrl,
        tokenURI,
        username,
        royalty: parseFloat(uploadData.royalty) || 0
      });

      if (!syncResponse.success) {
        // Blockchain succeeded but DB sync failed - warn but don't fail
        console.warn('[Upload] DB sync failed:', syncResponse);
        alert(`NFT created on blockchain! Token ID: ${tokenId}\nTx: ${mintResult.transactionHash}\n\nNote: Database sync failed. Your NFT exists but may not appear immediately.`);
      } else {
        alert(`🎉 NFT Created Successfully!\n\nToken ID: ${tokenId}\nYou are now the on-chain owner.\nWhen someone purchases this item, YOU will receive the payment directly!\n\nTx: ${mintResult.transactionHash}`);
      }

      // Reset form
      setUploadData({
        modelName: '',
        description: '',
        category: '',
        price: '',
        royalty: '0',
        files: [],
        images: [],
        tags: [],
      });
      setStep(1);

    } catch (error: any) {
      console.error('Upload error:', error);

      // Extract revert reason from ethers error (handles CALL_EXCEPTION)
      const revertReason: string =
        error?.revert?.args?.[0] ||   // ethers v6 structured revert
        error?.reason ||               // ethers v5-style
        error?.data?.message ||
        '';

      const msg = revertReason || error?.message || '';

      if (error.code === 'ACTION_REJECTED' || msg.toLowerCase().includes('user rejected')) {
        alert('Transaction cancelled. You can try again when ready.');
      } else if (msg.toLowerCase().includes('royalty too high')) {
        alert('❌ Royalty Too High\n\nThe contract only allows a maximum royalty of 10% (1000 basis points).\n\nPlease go back to Step 2 and lower your royalty percentage.');
      } else if (msg.toLowerCase().includes('price')) {
        alert(`❌ Invalid Price\n\n${msg}\n\nPlease go back to Step 2 and adjust your price.`);
      } else if (msg.toLowerCase().includes('listing price') || msg.toLowerCase().includes('insufficient')) {
        alert('❌ Insufficient Listing Fee\n\nThe transaction value did not cover the marketplace listing fee. Please try again.');
      } else if (revertReason) {
        alert(`❌ Transaction Reverted\n\nReason: "${revertReason}"\n\nPlease review your details and try again.`);
      } else {
        alert(`Upload failed: ${msg || 'Unknown error occurred'}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Details', icon: FileType },
    { num: 2, label: 'Pricing', icon: Tag },
    { num: 3, label: 'Files', icon: UploadIcon },
    { num: 4, label: 'Review', icon: Check },
  ];

  const renderStepIndicator = () => (
    <div className='flex justify-center mb-10'>
      <div className='flex items-center'>
        {steps.map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className='flex flex-col items-center'>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${step >= s.num
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
                  }`}
              >
                {step > s.num ? (
                  <Check className='h-5 w-5' />
                ) : (
                  <s.icon className='h-4 w-4' />
                )}
              </div>
              <span
                className={`text-xs mt-2 font-medium ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'
                  }`}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-2 mt-[-16px] transition-colors duration-300 ${step > s.num ? 'bg-primary' : 'bg-muted'
                  }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const inputClasses =
    'w-full px-4 py-3 rounded-xl bg-background border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all';

  const labelClasses = 'block text-sm font-medium text-foreground mb-2';

  const renderStep1 = () => (
    <div className='space-y-6'>
      <div>
        <h2 className='text-xl font-semibold mb-1'>Basic Information</h2>
        <p className='text-sm text-muted-foreground'>Tell us about your 3D model</p>
      </div>

      <div>
        <label className={labelClasses}>Model Name *</label>
        <input
          type='text'
          value={uploadData.modelName}
          onChange={e => handleInputChange('modelName', e.target.value)}
          className={inputClasses}
          placeholder='Enter model name'
        />
      </div>

      <div>
        <label className={labelClasses}>Description *</label>
        <textarea
          value={uploadData.description}
          onChange={e => handleInputChange('description', e.target.value)}
          rows={4}
          className={inputClasses + ' resize-none'}
          placeholder='Describe your 3D model in detail'
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className='space-y-6'>
      <div>
        <h2 className='text-xl font-semibold mb-1'>Category & Pricing</h2>
        <p className='text-sm text-muted-foreground'>Set your model's category and price</p>
      </div>

      <div>
        <label className={labelClasses}>Category *</label>
        <select
          value={uploadData.category}
          onChange={e => handleInputChange('category', e.target.value)}
          className={inputClasses}
        >
          <option value=''>Select a category</option>
          <option value='architecture'>Architecture</option>
          <option value='vehicles'>Vehicles</option>
          <option value='characters'>Characters</option>
          <option value='furniture'>Furniture</option>
          <option value='electronics'>Electronics</option>
          <option value='nature'>Nature</option>
          <option value='other'>Other</option>
        </select>
      </div>

      <div>
        <label className={labelClasses}>Price (ETH) *</label>
        <input
          type='number'
          value={uploadData.price}
          onChange={e => handleInputChange('price', e.target.value)}
          min='0'
          step='0.01'
          className={inputClasses}
          placeholder='0.00'
        />
      </div>

      <div>
        <label className={labelClasses}>Creator Royalty *</label>
        <p className='text-xs text-muted-foreground mb-3'>
          Set the percentage you will earn on all future secondary sales (0% - 10%).
        </p>
        <div className='flex items-center gap-4'>
          <input
            type='range'
            min='0'
            max='10'
            step='0.5'
            value={uploadData.royalty}
            onChange={e => handleInputChange('royalty', e.target.value)}
            className='w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary'
          />
          <span className='font-medium text-foreground w-12 text-right'>
            {uploadData.royalty}%
          </span>
        </div>
      </div>

      {uploadData.price && parseFloat(uploadData.price) > 0 && (
        <div className='p-4 rounded-lg bg-primary/5 border border-primary/20 mt-4'>
          <p className='text-sm font-medium text-primary mb-2'>Earnings Breakdown (Primary Sale)</p>
          <div className='space-y-1 text-sm'>
            <div className='flex justify-between text-muted-foreground'>
              <span>Listing Price</span>
              <span>{uploadData.price} ETH</span>
            </div>
            <div className='flex justify-between text-red-500/80'>
              <span>Platform Fee (2.5%)</span>
              <span>-{(parseFloat(uploadData.price) * 0.025).toFixed(4)} ETH</span>
            </div>
            <div className='flex justify-between text-primary font-medium pt-2 border-t border-primary/10 mt-2'>
              <span>You Earn</span>
              <span>{(parseFloat(uploadData.price) * 0.975).toFixed(4)} ETH</span>
            </div>
          </div>
          <p className='text-xs text-muted-foreground mt-3 pt-3 border-t border-primary/10'>
            On secondary sales, you will earn <span className='font-medium text-primary'>{uploadData.royalty}%</span> of the sale price.
          </p>
        </div>
      )}

      <div>
        <label className={labelClasses}>Tags</label>
        <div className='flex flex-wrap gap-2 mb-3'>
          {uploadData.tags.map((tag, index) => (
            <span
              key={index}
              className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm'
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className='hover:text-primary/70'
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type='text'
          placeholder='Type and press Enter to add tags'
          className={inputClasses}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              addTag((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className='space-y-6'>
      <div>
        <h2 className='text-xl font-semibold mb-1'>Upload Files</h2>
        <p className='text-sm text-muted-foreground'>Add your 3D model and preview images</p>
      </div>

      <div>
        <label className={labelClasses}>3D Model File *</label>
        <div className='border-2 border-dashed border-border/60 rounded-xl p-8 text-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer'>
          <input
            type='file'
            multiple
            accept='.glb,.gltf,.obj,.stl'
            onChange={e => handleFileChange(e, 'files')}
            className='hidden'
            id='model-files'
          />
          <label htmlFor='model-files' className='cursor-pointer'>
            <UploadIcon className='h-10 w-10 mx-auto mb-3 text-muted-foreground' />
            <p className='text-sm font-medium text-foreground mb-1'>
              Click to upload or drag and drop
            </p>
            <p className='text-xs text-muted-foreground'>
              GLB, GLTF, OBJ, STL (max 50MB)
            </p>
          </label>
        </div>
        {uploadData.files.length > 0 && (
          <div className='mt-3 p-3 rounded-lg bg-muted/50'>
            <p className='text-sm font-medium text-foreground mb-2'>Selected files:</p>
            {uploadData.files.map((file, index) => (
              <div key={index} className='flex items-center justify-between text-sm text-muted-foreground'>
                <span>{file.name}</span>
                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={labelClasses}>Preview Images</label>
        <div className='border-2 border-dashed border-border/60 rounded-xl p-8 text-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer'>
          <input
            type='file'
            multiple
            accept='image/*'
            onChange={e => handleFileChange(e, 'images')}
            className='hidden'
            id='preview-images'
          />
          <label htmlFor='preview-images' className='cursor-pointer'>
            <ImageIcon className='h-10 w-10 mx-auto mb-3 text-muted-foreground' />
            <p className='text-sm font-medium text-foreground mb-1'>
              Add preview images
            </p>
            <p className='text-xs text-muted-foreground'>
              JPG, PNG, WebP (max 10MB each)
            </p>
          </label>
        </div>
        {uploadData.images.length > 0 && (
          <div className='mt-3 grid grid-cols-4 gap-2'>
            {uploadData.images.map((image, index) => (
              <div key={index} className='aspect-square rounded-lg overflow-hidden bg-muted'>
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Preview ${index + 1}`}
                  className='w-full h-full object-cover'
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className='space-y-6'>
      <div>
        <h2 className='text-xl font-semibold mb-1'>Review & Submit</h2>
        <p className='text-sm text-muted-foreground'>Confirm your model details</p>
      </div>

      <div className='rounded-xl bg-muted/30 p-6 space-y-4'>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <p className='text-xs text-muted-foreground uppercase tracking-wide'>Model Name</p>
            <p className='font-medium text-foreground mt-1'>{uploadData.modelName}</p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground uppercase tracking-wide'>Category</p>
            <p className='font-medium text-foreground capitalize mt-1'>{uploadData.category}</p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground uppercase tracking-wide'>Price</p>
            <p className='font-medium text-foreground mt-1'>{uploadData.price} ETH</p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground uppercase tracking-wide'>Royalty</p>
            <p className='font-medium text-foreground mt-1'>{uploadData.royalty}%</p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground uppercase tracking-wide'>Files</p>
            <p className='font-medium text-foreground mt-1'>
              {uploadData.files.length} model, {uploadData.images.length} images
            </p>
          </div>
        </div>

        <div>
          <p className='text-xs text-muted-foreground uppercase tracking-wide'>Description</p>
          <p className='text-sm text-foreground mt-1 leading-relaxed'>{uploadData.description}</p>
        </div>

        {uploadData.tags.length > 0 && (
          <div>
            <p className='text-xs text-muted-foreground uppercase tracking-wide mb-2'>Tags</p>
            <div className='flex flex-wrap gap-1.5'>
              {uploadData.tags.map((tag, index) => (
                <span key={index} className='px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs'>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className='p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'>
        <p className='text-sm font-medium text-amber-800 dark:text-amber-300 mb-2'>Before you submit:</p>
        <ul className='text-xs text-amber-700 dark:text-amber-400 space-y-1'>
          <li>• Ensure your model is optimized and error-free</li>
          <li>• Verify all textures are included</li>
          <li>• Check that your pricing is competitive</li>
        </ul>
      </div>
    </div>
  );

  const handleWalletConnected = () => {
    window.location.reload();
  };

  return (
    <div className='min-h-screen bg-background text-foreground'>
      <Navigation />

      <div className='container mx-auto px-4 py-12'>
        <div className='max-w-2xl mx-auto'>
          <div className='text-center mb-10'>
            <h1 className='text-3xl font-semibold text-foreground mb-2'>Upload Your Model</h1>
            <p className='text-muted-foreground'>Share your creativity with the world</p>
          </div>

          {!canUpload ? (
            <div className='rounded-xl border border-border/60 bg-card p-10 text-center shadow-[var(--shadow-card)]'>
              <div className='w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4'>
                <Wallet className='h-7 w-7 text-primary' />
              </div>
              <h2 className='text-xl font-semibold mb-2'>
                {!hasMetaMask ? 'MetaMask Required' : 'Wallet Required'}
              </h2>
              <p className='text-muted-foreground mb-6 max-w-sm mx-auto'>
                {!hasMetaMask
                  ? 'Please install MetaMask browser extension to upload models to the blockchain marketplace.'
                  : 'Connect your wallet to upload models to the blockchain marketplace.'
                }
              </p>
              {!hasMetaMask ? (
                <Button
                  onClick={() => window.open('https://metamask.io/download/', '_blank')}
                  className='bg-primary hover:bg-primary-hover text-primary-foreground px-6'
                >
                  <Wallet className='h-4 w-4 mr-2' />
                  Install MetaMask
                </Button>
              ) : (
                <Button
                  onClick={() => setShowWalletDialog(true)}
                  className='bg-primary hover:bg-primary-hover text-primary-foreground px-6'
                >
                  <Wallet className='h-4 w-4 mr-2' />
                  Connect Wallet
                </Button>
              )}
            </div>
          ) : (
            <>
              {renderStepIndicator()}

              <div className='rounded-xl border border-border/60 bg-card p-8 shadow-[var(--shadow-card)]'>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}

                <div className='flex justify-between pt-8 mt-8 border-t border-border/40'>
                  <Button
                    variant='outline'
                    onClick={() => setStep(step - 1)}
                    disabled={step === 1}
                    className='px-6'
                  >
                    Previous
                  </Button>

                  {step < 4 ? (
                    <Button
                      onClick={() => setStep(step + 1)}
                      disabled={!validateStep(step)}
                      className='px-6 bg-primary hover:bg-primary-hover'
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={isUploading}
                      className='px-6 bg-emerald-600 hover:bg-emerald-700 text-white'
                    >
                      {isUploading ? 'Uploading...' : 'Submit Model'}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <WalletConnectionDialog
        isOpen={showWalletDialog}
        onClose={() => setShowWalletDialog(false)}
        onConnect={handleWalletConnected}
      />

      <Footer />
    </div>
  );
};

export default Upload;

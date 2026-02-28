import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, MARKETPLACE_ABI } from '../lib/constants';

class Web3Service {
    provider: ethers.BrowserProvider | null = null;
    signer: ethers.JsonRpcSigner | null = null;
    contract: ethers.Contract | null = null;

    constructor() {
        if (window.ethereum) {
            this.provider = new ethers.BrowserProvider(window.ethereum);
        }
    }

    async connect() {
        if (!this.provider) {
            // Initialize if not already done (e.g. if window.ethereum was injected late)
            if (window.ethereum) {
                this.provider = new ethers.BrowserProvider(window.ethereum);
            } else {
                throw new Error("MetaMask is not installed");
            }
        }

        // In v6, getting signer is async and handles requestAccounts if needed
        this.signer = await this.provider.getSigner();

        // Contract creation is the same, but signer is now required for write ops
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_ABI, this.signer);

        return await this.signer.getAddress();
    }

    async purchaseItem(tokenId: number, priceETH: number) {
        if (!this.contract) await this.connect();
        if (!this.contract) throw new Error("Contract not initialized");

        // v6 syntax: parseEther is top-level
        const priceWei = ethers.parseEther(priceETH.toString());

        // Call the smart contract directly
        // v6: calling contract methods is the same
        const tx = await this.contract.purchaseToken(tokenId, {
            value: priceWei
        });

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        return {
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber
        };
    }

    async createItem(tokenURI: string, priceETH: number, category: number = 10, royalty: number = 0) {
        if (!this.contract) await this.connect();
        if (!this.contract) throw new Error("Contract not initialized");

        const priceWei = ethers.parseEther(priceETH.toString());
        // Royalty is basis points (0-1000 for 0-10%)
        const royaltyBps = Math.floor(royalty * 100);

        const listingPrice = await this.contract.getListingPrice();

        const tx = await this.contract.createToken(tokenURI, priceWei, category, royaltyBps, {
            value: listingPrice
        });

        const receipt = await tx.wait();
        return {
            transactionHash: tx.hash,
            receipt
        };
    }

    async relistToken(tokenId: number, priceETH: number) {
        if (!this.contract) await this.connect();
        if (!this.contract) throw new Error("Contract not initialized");

        const priceWei = ethers.parseEther(priceETH.toString());
        const listingPrice = await this.contract.getListingPrice();

        const tx = await this.contract.relistToken(tokenId, priceWei, {
            value: listingPrice
        });

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        return {
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber
        };
    }

    async getMarketItem(tokenId: number) {
        if (!this.contract) await this.connect();
        if (!this.contract) throw new Error("Contract not initialized");

        // Verify the item status directly from the contract
        const item = await this.contract.getMarketItem(tokenId);
        return {
            tokenId: Number(item.tokenId),
            price: item.price,
            sold: item.sold,
            seller: item.seller,
            owner: item.owner
        };
    }
}

export const web3Service = new Web3Service();

import deployment from '../../../backend/contract-address.json';

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || deployment.ChainTorqueMarketplace;
export const MARKETPLACE_ABI = [
    "function purchaseToken(uint256 tokenId) external payable",
    "function createToken(string memory tokenURI, uint128 price, uint32 category, uint24 royalty) external payable returns (uint256)",
    "function getListingPrice() external view returns (uint256)",
    "function relistToken(uint256 tokenId, uint128 price) external payable",
    "function getMarketItem(uint256 tokenId) external view returns (tuple(uint256 tokenId, uint128 price, uint64 createdAt, uint32 category, uint24 royalty, bool sold, address seller, address owner, address creator))",
    "event MarketItemSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint128 price)",
    "event MarketItemCreated(uint256 indexed tokenId, address indexed seller, uint128 indexed price, uint32 category, uint256 timestamp)",
    "event MarketItemRelisted(uint256 indexed tokenId, address indexed seller, uint128 indexed price)"
];
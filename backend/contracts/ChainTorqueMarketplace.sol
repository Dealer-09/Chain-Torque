// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract ChainTorqueMarketplace is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    // Constants
    uint256 public constant LISTING_PRICE = 0.00025 ether;
    uint256 public constant MAX_BATCH_SIZE = 50;
    uint256 public constant PLATFORM_FEE_BPS = 250;
    uint256 private constant BASIS_POINTS = 10000;

    // Storage
    uint256 private _currentTokenId;
    uint256 private _totalItemsSold;

    // Market item (packed)
    struct MarketItem {
        uint256 tokenId;
        uint128 price;
        uint64 createdAt;
        uint32 category;
        uint24 royalty;
        bool sold;
        address seller;
        address owner;
        address creator; // Added to track original creator for royalties
    }

    mapping(uint256 => MarketItem) private _marketItems;
    mapping(address => uint256[]) private _userTokens;
    mapping(uint256 => uint256) private _tokenToUserIndex;
    mapping(uint32 => uint256[]) private _categoryTokens;
    mapping(address => bool) private _authorizedCreators;

    // Events
    event MarketItemCreated(uint256 indexed tokenId, address indexed seller, uint128 indexed price, uint32 category, uint256 timestamp);
    event MarketItemSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint128 price);
    event MarketItemRelisted(uint256 indexed tokenId, address indexed seller, uint128 indexed price);
    event BatchItemsCreated(uint256 indexed startTokenId, uint256 indexed count, address indexed seller);
    event CreatorAuthorized(address indexed creator, bool authorized);
    event RoyaltyUpdated(uint256 indexed tokenId, uint24 royalty);
    event MarketItemBurned(uint256 indexed tokenId, address indexed owner, uint64 timestamp);

    constructor() ERC721("ChainTorque NFT", "CTQ") {
        _currentTokenId = 0;
        _totalItemsSold = 0;
    }

    // Modifiers
    modifier onlyAuthorized() {
        require(_authorizedCreators[msg.sender] || msg.sender == owner(), "Not authorized creator");
        _;
    }

    modifier validTokenId(uint256 tokenId) {
        require(tokenId > 0 && tokenId <= _currentTokenId, "Invalid token ID");
        _;
    }

    // Burn token and clean up marketplace state
    function burn(uint256 tokenId) external nonReentrant whenNotPaused validTokenId(tokenId) {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not owner nor approved");

        address tokenOwner = ownerOf(tokenId);

        MarketItem storage mItem = _marketItems[tokenId];
        if (!mItem.sold) {
            mItem.sold = true;
            _totalItemsSold++;
        }
        mItem.owner = address(0);

        // Remove token from owner's list (swap & pop)
        uint256 index = _tokenToUserIndex[tokenId];
        uint256 userTokensLength = _userTokens[tokenOwner].length;
        if (userTokensLength > 0 && index < userTokensLength && _userTokens[tokenOwner][index] == tokenId) {
            uint256 lastToken = _userTokens[tokenOwner][userTokensLength - 1];
            _userTokens[tokenOwner][index] = lastToken;
            _tokenToUserIndex[lastToken] = index;
            _userTokens[tokenOwner].pop();
        }
        delete _tokenToUserIndex[tokenId];

        _burn(tokenId); // clears URI in ERC721URIStorage

        emit MarketItemBurned(tokenId, tokenOwner, uint64(block.timestamp));
    }

    // Batch create tokens
    function batchCreateTokens(
        string[] calldata tokenURIs,
        uint128[] calldata prices,
        uint32[] calldata categories,
        uint24[] calldata royalties
    ) external payable nonReentrant whenNotPaused onlyAuthorized {
        uint256 length = tokenURIs.length;
        require(length > 0 && length <= MAX_BATCH_SIZE, "Invalid batch size");
        require(length == prices.length && length == categories.length && length == royalties.length, "Array length mismatch");
        require(msg.value == LISTING_PRICE * length, "Incorrect listing fee");

        address seller = msg.sender;
        uint64 timestamp = uint64(block.timestamp);

        for (uint256 i = 0; i < length;) {
            uint256 newTokenId = ++_currentTokenId;
            require(prices[i] > 0, "Price must be positive");
            require(royalties[i] <= 1000, "Royalty too high");

            _safeMint(seller, newTokenId);
            _setTokenURI(newTokenId, tokenURIs[i]);

            _marketItems[newTokenId] = MarketItem({
                tokenId: newTokenId,
                price: prices[i],
                createdAt: timestamp,
                category: categories[i],
                royalty: royalties[i],
                sold: false,
                seller: seller,
                owner: address(this),
                creator: seller // Set original creator
            });

            _transfer(seller, address(this), newTokenId);

            _userTokens[seller].push(newTokenId);
            _tokenToUserIndex[newTokenId] = _userTokens[seller].length - 1;

            _categoryTokens[categories[i]].push(newTokenId);

            emit MarketItemCreated(newTokenId, seller, prices[i], categories[i], timestamp);

            unchecked { ++i; }
        }

        emit BatchItemsCreated(_currentTokenId - length + 1, length, seller);
    }

    // Create single token (open to anyone - decentralized marketplace)
    function createToken(
        string calldata tokenURI,
        uint128 price,
        uint32 category,
        uint24 royalty
    ) external payable nonReentrant whenNotPaused returns (uint256) {
        require(msg.value == LISTING_PRICE, "Incorrect listing fee");
        require(price > 0, "Price must be positive");
        require(royalty <= 1000, "Royalty too high");

        uint256 newTokenId = ++_currentTokenId;
        address seller = msg.sender;
        uint64 timestamp = uint64(block.timestamp);

        _safeMint(seller, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        _marketItems[newTokenId] = MarketItem({
            tokenId: newTokenId,
            price: price,
            createdAt: timestamp,
            category: category,
            royalty: royalty,
            sold: false,
            seller: seller,
            owner: address(this),
            creator: seller // Set original creator
        });

        _transfer(seller, address(this), newTokenId);

        _userTokens[seller].push(newTokenId);
        _tokenToUserIndex[newTokenId] = _userTokens[seller].length - 1;
        _categoryTokens[category].push(newTokenId);

        emit MarketItemCreated(newTokenId, seller, price, category, timestamp);

        return newTokenId;
    }

    // Relist token for sale (Resell)
    function relistToken(uint256 tokenId, uint128 price) external payable nonReentrant whenNotPaused validTokenId(tokenId) {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not owner nor approved");
        require(_marketItems[tokenId].sold, "Item already listed");
        require(price > 0, "Price must be positive");
        require(msg.value == LISTING_PRICE, "Incorrect listing fee");

        MarketItem storage item = _marketItems[tokenId];
        
        // Transfer NFT from owner back to marketplace contract
        _transfer(msg.sender, address(this), tokenId);

        item.sold = false;
        item.price = price;
        item.seller = msg.sender;
        item.owner = address(this);
        
        // Remove from user's "owned" list logic if we were tracking strictly ownership here, 
        // but since we transfer it to the contract, 'ownerOf' becomes contract.
        // We rely on contract ownership for marketplace display.

        _totalItemsSold--; 

        emit MarketItemRelisted(tokenId, msg.sender, price);
    }

    // Purchase single token
    function purchaseToken(uint256 tokenId) external payable nonReentrant whenNotPaused validTokenId(tokenId) {
        MarketItem storage item = _marketItems[tokenId];
        require(!item.sold, "Item already sold");
        require(msg.value == item.price, "Incorrect payment amount");

        address seller = item.seller;
        address buyer = msg.sender;
        uint128 price = item.price;
        uint24 royalty = item.royalty;
        address creator = item.creator; // Original creator

        item.owner = buyer;
        item.sold = true;
        ++_totalItemsSold;

        _transfer(address(this), buyer, tokenId);

        uint256 platformFee = (price * PLATFORM_FEE_BPS) / BASIS_POINTS;
        uint256 royaltyAmount = (price * royalty) / BASIS_POINTS;
        
        // Seller gets Price - Fee - Royalty
        uint256 sellerAmount = price - platformFee - royaltyAmount;

        // 1. Pay Seller (Current owner selling)
        if (sellerAmount > 0) {
            _safeTransferETH(seller, sellerAmount);
        }

        // 2. Pay Royalty to Creator (Original Artist)
        if (royaltyAmount > 0 && creator != address(0)) {
            _safeTransferETH(creator, royaltyAmount);
        } else if (royaltyAmount > 0) {
            // If creator address is somehow lost (unlikely with this struct), fallback to platform or seller?
            // For now, if creator invalid, give to seller to avoid stuck funds.
            _safeTransferETH(seller, royaltyAmount); 
        }

        _removeUserToken(seller, tokenId);
        _userTokens[buyer].push(tokenId);
        _tokenToUserIndex[tokenId] = _userTokens[buyer].length - 1;

        emit MarketItemSold(tokenId, seller, buyer, price);
    }

    // Batch purchase
    function batchPurchaseTokens(uint256[] calldata tokenIds) external payable nonReentrant whenNotPaused {
        uint256 length = tokenIds.length;
        require(length > 0 && length <= MAX_BATCH_SIZE, "Invalid batch size");

        uint256 totalPrice = 0;
        address buyer = msg.sender;

        for (uint256 i = 0; i < length;) {
            uint256 tid = tokenIds[i];
            require(tid > 0 && tid <= _currentTokenId, "Invalid token ID");
            MarketItem storage item = _marketItems[tid];
            require(!item.sold, "Item already sold");
            totalPrice += item.price;
            unchecked { ++i; }
        }

        require(msg.value == totalPrice, "Incorrect total payment");

        for (uint256 i = 0; i < length;) {
            uint256 tokenId = tokenIds[i];
            MarketItem storage item = _marketItems[tokenId];

            address seller = item.seller;
            uint128 price = item.price;
            uint24 royalty = item.royalty;
            address creator = item.creator;

            item.owner = buyer;
            item.sold = true;
            ++_totalItemsSold;

            _transfer(address(this), buyer, tokenId);

            uint256 platformFee = (price * PLATFORM_FEE_BPS) / BASIS_POINTS;
            uint256 royaltyAmount = (price * royalty) / BASIS_POINTS;
            uint256 sellerAmount = price - platformFee - royaltyAmount;

            // Pay the seller their share
            if (sellerAmount > 0) {
                _safeTransferETH(seller, sellerAmount);
            }

            // Pay royalty to the original creator (mirrors purchaseToken)
            if (royaltyAmount > 0 && creator != address(0)) {
                _safeTransferETH(creator, royaltyAmount);
            } else if (royaltyAmount > 0) {
                _safeTransferETH(seller, royaltyAmount);
            }

            // Move ownership tracking from the seller to the buyer
            _removeUserToken(seller, tokenId);
            _userTokens[buyer].push(tokenId);
            _tokenToUserIndex[tokenId] = _userTokens[buyer].length - 1;

            emit MarketItemSold(tokenId, seller, buyer, price);

            unchecked { ++i; }
        }
    }

    // Views
    function fetchMarketItems() external view returns (MarketItem[] memory) {
        uint256 totalItems = _currentTokenId;
        uint256 activeCount = totalItems - _totalItemsSold;
        if (activeCount == 0) return new MarketItem[](0);

        MarketItem[] memory items = new MarketItem[](activeCount);
        uint256 currentIndex = 0;
        for (uint256 i = 1; i <= totalItems;) {
            if (!_marketItems[i].sold) {
                items[currentIndex] = _marketItems[i];
                ++currentIndex;
            }
            unchecked { ++i; }
        }
        return items;
    }

    function getUserTokens(address user) external view returns (uint256[] memory) {
        return _userTokens[user];
    }

    function getTokensByCategory(uint32 category) external view returns (uint256[] memory) {
        return _categoryTokens[category];
    }

    function getMarketplaceStats() external view returns (uint256 totalItems, uint256 totalSold, uint256 totalActive, uint256 totalValue) {
        totalItems = _currentTokenId;
        totalSold = _totalItemsSold;
        totalActive = totalItems - totalSold;
        for (uint256 i = 1; i <= totalItems;) {
            if (!_marketItems[i].sold) {
                totalValue += _marketItems[i].price;
            }
            unchecked { ++i; }
        }
        return (totalItems, totalSold, totalActive, totalValue);
    }

    function getMarketItem(uint256 tokenId) external view validTokenId(tokenId) returns (MarketItem memory) {
        return _marketItems[tokenId];
    }

    // Admin
    function setCreatorAuthorization(address creator, bool authorized) external onlyOwner {
        _authorizedCreators[creator] = authorized;
        emit CreatorAuthorized(creator, authorized);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function emergencyTokenRecovery(uint256 tokenId, address to) external onlyOwner {
        require(ownerOf(tokenId) == address(this), "Token not owned by contract");
        _transfer(address(this), to, tokenId);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        _safeTransferETH(owner(), balance);
    }

    // Internal
    function _safeTransferETH(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    // Remove a token from a user's ownership-tracking array (swap & pop).
    // Keeps _userTokens accurate across sales and relists so getUserTokens()
    // does not return stale entries.
    function _removeUserToken(address user, uint256 tokenId) internal {
        uint256 index = _tokenToUserIndex[tokenId];
        uint256 len = _userTokens[user].length;
        if (len > 0 && index < len && _userTokens[user][index] == tokenId) {
            uint256 lastToken = _userTokens[user][len - 1];
            _userTokens[user][index] = lastToken;
            _tokenToUserIndex[lastToken] = index;
            _userTokens[user].pop();
        }
    }

    // Helpers
    function getListingPrice() external pure returns (uint256) { return LISTING_PRICE; }
    function getCurrentTokenId() external view returns (uint256) { return _currentTokenId; }
    function isAuthorizedCreator(address creator) external view returns (bool) { return _authorizedCreators[creator] || creator == owner(); }
}

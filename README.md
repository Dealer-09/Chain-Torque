# ChainTorque

### _Web3 Engineering Platform with Browser-Based CAD Editor_

> **ChainTorque** revolutionizes 3D model platforms by combining blockchain technology, professional CAD tools, and real-time 3D interaction to create a secure, transparent, and intelligent platform for engineering assets.

## 🚀 **What is ChainTorque?**

ChainTorque is a comprehensive Web3 platform that solves critical problems in the 3D engineering space:

- **🛡️ NFT-Based Licensing**: Blockchain-verified ownership and licensing
- **🎮 Interactive 3D Previews**: Inspect models before purchasing
- **🎨 Browser-Based CAD Editor**: Professional 2D sketching + 3D modeling with OpenCascade.js
- **🌐 Decentralized Storage**: IPFS integration via Pinata for censorship resistance
- **💰 Direct Creator Payments**: Customizable creator royalties + 2.5% platform fee via smart contracts

## 🏗️ **Project Structure**

```
ChainTorque/
├── Landing Page (Frontend)/     # Vite + React marketing site (Port 5000)
├── Marketplace (Frontend)/      # Vite + React + TypeScript NFT marketplace (Port 8080)
├── CAD (Frontend)/              # Vite + React CAD editor with OpenCascade.js (Port 3001)
├── ChainTorque_Native/          # Android app - Kotlin + Jetpack Compose
│   └── app/src/main/java/com/example/chaintorquenative/
│       ├── ChainTorqueApp.kt        # Hilt Application entry point
│       ├── MainActivity.kt          # NavHost + bottom navigation
│       ├── di/AppModule.kt          # Dependency injection (Retrofit, OkHttp)
│       ├── mobile/data/
│       │   ├── api/                 # Retrofit interface + data models
│       │   └── repository/          # Single source of truth for API calls
│       └── mobile/ui/
│           ├── viewmodels/          # MarketplaceVM, UserProfileVM, WalletVM
│           └── screens/Screens.kt   # All Compose UI screens
└── backend/                     # Express API + Hardhat Smart Contracts (Port 5001)
```

## 🛠️ **Technologies Used**

| Layer | Technologies |
|-------|--------------|
| **Runtime** | Bun (3x faster than Node.js) |
| **Frontend** | React 18, Vite, Three.js, @react-three/fiber, Tailwind CSS |
| **CAD Engine** | OpenCascade.js (WASM), Three.js, Vanilla CSS, Custom 2D Canvas |
| **Android** | Kotlin, Jetpack Compose, Hilt DI, Retrofit 2, WalletConnect v2 (Reown AppKit), ARCore, MVVM + Repository |
| **Backend** | Express, MongoDB, IPFS (Pinata SDK) |
| **Blockchain** | Solidity (ERC-721), Hardhat, Ethereum Sepolia, ethers.js |
| **Auth** | Clerk (Web3 wallet + social login) |
| **Deployment** | Render.com (4 services) |

## 🎨 **CAD Editor Features**

The browser-based CAD editor (`CAD (Frontend)/`) provides:

### 2D Sketching Tools
- **Line Tool** (L): Draw connected line segments
- **Polygon Tool** (P): Create closed polygon shapes
- **Circle Tool** (C): Draw circles with center + radius
- **Grid Snap**: Automatic alignment to grid
- **Undo/Redo**: Backspace to undo, full history support

### 3D Modeling
- **Sketch Extrusion**: Convert 2D sketches to 3D solids via OpenCascade.js
- **Real-time Preview**: Three.js powered 3D viewport with orbit controls
- **View Controls**: Front, Top, Right, Isometric camera presets
- **2D/3D Toggle**: Seamless switching between sketch and model modes

### CAD Kernel
- **OpenCascade.js**: Industry-standard BREP geometry kernel (WASM)
- **Primitives**: Box, Cylinder, Sphere creation
- **Boolean Operations**: Union, Cut, Intersection
- **Memory Managed**: Proper cleanup of WASM objects

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| L | Line tool |
| P | Polygon tool |
| C | Circle tool |
| I | Toggle 3D view |
| Enter | Save sketch |
| ESC | Cancel/Back to 2D |
| Backspace | Undo last point |
| Arrow Keys | Pan canvas |
| Scroll | Zoom |

## ⚡ **CAD Editor Performance**

The CAD editor is optimized for smooth rendering at 60fps even with complex models:

- **GPU Routing**: `powerPreference: "high-performance"` forces the dedicated GPU (Nvidia/AMD) instead of integrated graphics
- **DPR Clamping**: Device Pixel Ratio is capped at 1.5x to prevent 4K super-resolution bottlenecks on retina displays
- **Geometry Memoization**: `THREE.BufferGeometry` objects are created once via `React.useMemo` — not rebuilt on every render frame
- **WebGL Cleanup**: `geometry.dispose()` is called on unmount to prevent VRAM memory leaks from orphaned GPU buffers
- **RAF Throttling**: The 2D canvas mousemove handler is wrapped in `requestAnimationFrame` — grid redraws are capped at exactly 60fps
- **Eliminated Debug Logging**: All `console.log` calls inside render loops and `useFrame` (which execute at 60fps) have been removed

## 🚀 **Quick Start**

### Prerequisites
Install [Bun](https://bun.sh) - a fast all-in-one JavaScript runtime:
```sh
# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1|iex"

# macOS/Linux
curl -fsSL https://bun.sh/install | bash
```

### Installation & Running
```sh
# Clone and install
git clone https://github.com/Dealer-09/Chain-Torque.git
cd Chain-Torque
bun install

# Start all services (Landing, Marketplace, Backend, CAD)
bun run dev

# Or run individual services
bun run dev:landing      # Landing page (Port 5000)
bun run dev:marketplace  # Marketplace (Port 8080)
bun run dev:backend      # Backend API (Port 5001)
bun run dev:cad          # CAD editor (Port 3001)
```

## 🗺️ **Development Status**

### ✅ Completed
- [x] Bun monorepo with npm workspaces
- [x] 3D marketplace with NFT minting & purchasing
- [x] Decentralized purchase flow (MetaMask → Smart Contract → IPFS)
- [x] ETH payments: Configurable creator royalties on secondary sales & 2.5% platform fee
- [x] Relist/resale functionality for secondary market
- [x] Smart contract deployed on Sepolia testnet
- [x] IPFS storage via Pinata SDK
- [x] Search & category filtering
- [x] Purchased items with download links
- [x] Dashboard with user stats
- [x] Clerk authentication integration
- [x] **CAD Editor with OpenCascade.js**
  - [x] 2D Canvas with Line, Polygon, Circle tools
  - [x] Grid snap and pan/zoom controls
  - [x] Sketch extrusion to 3D solids
  - [x] Three.js 3D viewport with camera controls
  - [x] Feature Tree with visibility/delete
  - [x] Production build optimized
- [x] Render.com deployment (all 4 services)
- [x] **Native Android App** (ChainTorque_Native) — Full MVVM Architecture
  - [x] Proper layered architecture: API → Repository → ViewModel → UI
  - [x] Retrofit 2 + OkHttp networking with logging interceptor
  - [x] Hilt dependency injection (AppModule, @HiltAndroidApp)
  - [x] Jetpack Compose Navigation with sealed class string routes
  - [x] Jetpack Compose UI with Material 3
  - [x] NFT marketplace browsing with search & category filters
  - [x] User profiles (purchases + NFT tabs) and wallet balance
  - [x] Concurrent data loading (purchases + NFTs + balance fetched in parallel)
  - [x] MetaMask deep-link connection flow

### 🔄 In Progress
- [ ] AI Assistant "Torquy" for CAD commands
- [ ] Save/Load CAD projects
- [ ] WalletConnect v2 / Reown AppKit SDK integration in Android (currently MetaMask deep-link only)

### 📋 Planned
- [ ] Android: 3D model viewer screen (Google Scene Viewer / ARCore) — navigation stub exists
- [ ] Android: Sepolia testnet enforcement + WalletConnect session chain validation
- [ ] STL/GLB export from CAD editor
- [ ] User profile pages
- [ ] Multi-chain support (Polygon)

## 🏗️ **Architecture**

```mermaid
graph TD
    subgraph Web Frontend
        LP[Landing Page<br/>Vite + React]
        MP[Marketplace<br/>Vite + React + TS]
        CAD[CAD Editor<br/>React + Three.js + OpenCascade]
    end

    subgraph Android
        AND[ChainTorque Native<br/>Kotlin + Jetpack Compose]
        VM[ViewModels<br/>MarketplaceVM / ProfileVM / WalletVM]
        REPO[Repository<br/>ChainTorqueRepository]
        NET[Retrofit + OkHttp]
        AND --> VM --> REPO --> NET
    end
    
    subgraph Backend
        API[Express API<br/>Port 5001]
        SC[Smart Contract<br/>Sepolia]
        IPFS[Pinata<br/>IPFS Storage]
        DB[(MongoDB)]
    end
    
    LP --> API
    MP --> API
    MP --> SC
    CAD --> API
    NET --> API
    API --> DB
    API --> IPFS
```

## 🔒 **Environment Variables**

Create `.env` in the project root:
```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Ethereum
RPC_URL=https://sepolia.infura.io/v3/...
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=0x...
VITE_CONTRACT_ADDRESS=0x...   # Same value — exposed to frontend

# Clerk Auth (Web3 + social login)
CLERK_PUBLISHABLE_KEY=pk_...
VITE_CLERK_PUBLISHABLE_KEY=pk_...   # Same value — exposed to Vite frontends

# IPFS (Pinata)
PINATA_JWT=...
PINATA_API_KEY=...
PINATA_API_SECRET=...

# API URL (Vite frontends use this to switch between local and production)
VITE_API_URL=http://localhost:5001/api   # Dev
# VITE_API_URL=https://chaintorque-backend.onrender.com/api  # Prod (uncomment)

# AI Features (Torquy assistant)
GROQ_API_KEY=gsk_...
HF_TOKEN=hf_...               # HuggingFace token (optional, for image models)
```

## 🤝 **Contributing**

We welcome contributions! Areas of focus:

- **🎨 CAD Features**: Enhance 2D/3D tools, add new primitives, STL/GLB export
- **🤖 AI Integration**: Implement Torquy AI assistant for natural language CAD commands
- **🔧 Blockchain**: Smart contract optimization, multi-chain support (Polygon)
- **📱 Android**: Add 3D model viewer screen, deep-link purchase flow, push notifications
- **📝 Documentation**: API docs, tutorials, contribution guides

## 📄 **License**

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**🔗⚙️ Building the Future of Engineering, One Block at a Time**

[![Get Started](https://img.shields.io/badge/Get%20Started-0066cc?style=for-the-badge&logo=rocket)](#quick-start)
[![CAD Editor](https://img.shields.io/badge/CAD%20Editor-28a745?style=for-the-badge&logo=cube)](#cad-editor-features)
[![Contribute](https://img.shields.io/badge/Contribute-ff6b6b?style=for-the-badge&logo=github)](#contributing)

</div>

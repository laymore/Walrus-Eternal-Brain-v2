# 📕 Project Book: eternal-agent-brain
> Compressed from `C:\Users\admin\Desktop\Walrus Forum\eternal-agent-brain` on 2026-07-05 by claude-opus (compress-project).
> Reference digest for future projects — lessons, not code copies (exact code lives in git).

## Overview
# brain-mcp — one brain, many models
  An MCP server that exposes the **Walrus Eternal Brain** to any MCP-capable
## Build
  ```bash
## Tools
  | Tool | What it does |
## Configure a client (example)
  `stdio` transport. Point any MCP client at `dist/server.js` and pass the brain
## Env vars
  - `MEMWAL_ACCOUNT_ID` (or `VITE_MEMWAL_ACCOUNT_ID`) — the shared MemWal account.

## Structure
```
📄 .env.example
📁 agent-api/
  📄 crawler.ts
  📄 server.ts
📄 AGENT.md
📁 brain-mcp/
  📄 package.json
  📄 README.md
  📁 src/
    📄 server.ts
📄 create-site.ptb
📁 docs/
  📄 antigravity_architecture.md
  📄 ARCHITECTURE.md
  📁 design/
    📄 PHASES_SHOWCASE.md
    📄 RESEARCH_PAPER.md
    📄 WALRUS_SITE_UPDATE_SOP.md
  📄 eternal_brain_architecture.md
  📄 WC2026_GUIDE.md
📄 eslint.config.js
📄 index.html
📁 library-books/
  📄 eternal-agent-brain-book.md
📄 package.json
📁 packages/
  📁 core/
    📄 package.json
    📁 src/
    📄 tsconfig.tsbuildinfo
📄 PRODUCT.md
📁 public/
  📄 favicon.svg
  📄 icons.svg
📄 README.md
📄 ROADMAP.md
📁 scripts/
  📄 book-evolve.mjs
  📄 compress-project.mjs
  📄 create-site.mjs
  📄 deploy-final.mjs
  📄 deploy-http.mjs
  📄 deploy-site-v2.mjs
  📄 deploy-site-v3.mjs
  📄 deploy-site.mjs
  📄 find-account.mjs
  📄 find-walrus-funcs.py
  📄 identity-evolve.mjs
  📄 ingest-architecture.mjs
  📄 init-brain-episodic.mjs
  📄 init-brain-identity.mjs
  📄 init-brain-phase-5-6.mjs
  📄 init-brain-procedural.mjs
  📄 init-brain-relations.mjs
  📄 phase3-semantic-engine.mjs
  📄 phase4-procedural-engine.mjs
  📄 phase5-metacognition-engine.mjs
  📄 phase6-library-engine.mjs
  📄 phase7-neuro-engine.mjs
  📄 phase8-eternal-engine.mjs
  📄 publish_wc2026.mjs
  📄 revert-spacing.mjs
  📄 scale-inline.mjs
  📄 set-walrus-site.mjs
  📄 setup-account.mjs
  📄 sync-to-walrus.mjs
  📄 test-features.mjs
  📄 watchdog.mjs
📁 sites-manager/
  📄 Move.toml
  📁 sources/
    📄 publisher.move
    📄 site_factory.move
📁 src/
  📄 App.css
  📄 App.tsx
  📁 assets/
    📄 hero.png
    📄 react.svg
    📄 vite.svg
```

## Key Configs
- version: 1.1.0
- scripts: dev, build, lint, preview, deploy, api, crawl
- deps: eternal-agent-brain-core, @mysten-incubation/memwal, @mysten/dapp-kit, @mysten/enoki, @mysten/seal, @mysten/sui, @mysten/suins, @mysten/walrus, @tanstack/react-query, @types/d3-force, cors, d3-force, dompurify, dotenv, express, lucide-react, react, react-dom, react-force-graph-2d

## Lessons Learned (mined from the episodic record — the reusable gold)
- Mỗi remember() mất ~20-30 giây (gửi lên Walrus + Sui transaction). 7 entries mất ~3 phút tổng cộng. (outcome: success)
- Nếu lấy nhầm ví dev của dự án khác → NGUY HIỂM. User đặc biệt nhấn mạnh phải cẩn thận. Ghi chú ví dev trong AGENT.md. (outcome: success)
- User yêu cầu rõ ràng: ví không được đặt tên custom, chỉ hiển thị SuiNS hoặc địa chỉ rút gọn. Đây là quy tắc bất biến. (outcome: success)
- Site Object ID không đổi khi update → SuiNS chỉ cần gắn 1 lần. Chỉ cần gắn lại nếu publish site mới (ID mới). (outcome: success)
- User muốn nút hiển thị chữ 'Theme' cố định, không hiển thị tên theme hiện tại. Team Autobots → đổi tên thành 'Robot' trong menu. (outcome: success)
- Bộ nhận diện được lấy từ file autobots_brand_identity.md của phiên trước (conversation c49ccd14). Suirobo là dự án KHÁC, không liên quan. (outcome: success)
- Cần setup proxy CORS cho Walrus relayer khi deploy production. Dùng Cloudflare Worker làm proxy. (outcome: success)
- QUAN TRỌNG: Không nhầm lẫn giữa các dự án. Suirobo ≠ Mini Forum. Luôn xác nhận tên dự án đúng. (outcome: success)

## Documentation (distilled outlines)
### AGENT.md
# Agent Memory & Project Constraints
  - **CRITICAL CONSTRAINT**: Dự án này chỉ sử dụng **DUY NHẤT 1 VÍ DEV** để quản lý tất cả mọi thứ.
## Wallet Management & Roles
  - **CRITICAL CONSTRAINT**: Dự án này chỉ sử dụng **DUY NHẤT 1 VÍ DEV** để quản lý tất cả mọi thứ.
### 👑 DEV WALLET (Quyền quản trị tối cao)
  - **Alias:** `exciting-chalcedony`
### 👤 NORMAL WALLETS (Ví người dùng bình thường - Không có quyền hạn)
  Các ví dưới đây **tuyệt đối không liên quan** đến cấu hình hay sở hữu hệ thống. Chỉ được dùng để test chức năng như một người dùng (user) th
### 🤖 BOT WALLETS (Ví dùng để chạy script tự động - Không có quyền hạn)
  Các ví này được sinh ra để mô phỏng tương tác của người dùng trên diễn đàn, hoàn toàn **không** có thẩm quyền quản trị:
## Architecture
  - Memwal Database

### docs\antigravity_architecture.md
# Thiết Kế Hệ Thống Nhận Thức Khách Quan Antigravity Brain: Khung Phương Pháp Luận Và Lộ Trình Triển Khai Bộ Não Ngoại Biên Trên Nền Tảng Walrus Memory
  Sự bế tắc trong việc duy trì ngữ cảnh dài hạn và tính nhất quán tri thức của các tác tử trí tuệ nhân tạo (AI Agent) hiện nay xuất phát từ cá
## Triết Lý Thiết Kế Ngược: Phân Tích Sự Thất Bại Của Hệ Thống Bộ Nhớ AI Hiện Tại
  Sự bế tắc trong việc duy trì ngữ cảnh dài hạn và tính nhất quán tri thức của các tác tử trí tuệ nhân tạo (AI Agent) hiện nay xuất phát từ cá
## Tư Duy Phản Biện: Thách Thức Các Giả Định Thiết Kế Bộ Nhớ Tác Tử
  Trong kỹ thuật phần mềm truyền thống, khả năng mở rộng của hệ thống thường được giải quyết bằng cách tăng dung lượng lưu trữ vật lý. Tuy nhi
### Phản biện giả định 1: "Lưu trữ dung lượng lớn tương đương với khả năng ghi nhớ tốt"
  Trong kỹ thuật phần mềm truyền thống, khả năng mở rộng của hệ thống thường được giải quyết bằng cách tăng dung lượng lưu trữ vật lý. Tuy nhi
### Phản biện giả định 2: "Tìm kiếm tương đồng ngữ nghĩa (Semantic Search) là công cụ truy xuất tối ưu duy nhất"
  Các hệ thống bộ nhớ tác tử hiện đại phụ thuộc gần như tuyệt đối vào việc tính toán khoảng cách cosine giữa các vectơ nhúng. Phương pháp này 
### Phản biện giả định 3: "Bộ nhớ tác tử chỉ đóng vai trò là kho lưu trữ thụ động"
  Phần lớn các nhà phát triển xem bộ nhớ như một cơ sở dữ liệu tĩnh, chỉ thực hiện các thao tác đọc và ghi tuần tự theo thời gian thực thi của
## Kiến Trúc Phân Tầng Bộ Nhớ Năm Lớp
  Kiến trúc nhận thức của Antigravity Brain được phân tách thành năm tầng logic chuyên biệt, tối ưu hóa sự cân bằng giữa tốc độ truy cập cục b
## Kiến Trúc Không Gian Tên Trên Walrus Memory
  Giao thức Walrus Memory cho phép phân tách và bảo vệ dữ liệu nhận thức thông qua cấu trúc không gian tên (Namespaces) độc lập. Mỗi không gia
### Các không gian tên chuyên biệt phục vụ nhận thức Bộ não (Brain Core Namespaces)
  * `NS_BRAIN_identity`: Không gian tên chứa cấu hình định danh bất biến của tác tử. Phân vùng này xác định vai trò, giới hạn hoạt động, thông
### Sự tương thích và ánh xạ liên không gian tên với dự án Mini Forum
  Để bộ não hoạt động như một lớp nhận thức thông minh quản trị diễn đàn, hệ thống thiết lập cơ chế liên kết dữ liệu chéo giữa các không gian 
## Lộ Trình Triển Khai Sáu Giai Đoạn
  Giai đoạn khởi động tập trung vào việc cài đặt hạ tầng kết nối vật lý giữa tác tử Antigravity và giao thức lưu trữ phi tập trung thông qua v
### Giai đoạn 0: Thiết lập nền tảng liên kết MCP Bridge
  Giai đoạn khởi động tập trung vào việc cài đặt hạ tầng kết nối vật lý giữa tác tử Antigravity và giao thức lưu trữ phi tập trung thông qua v
### Giai đoạn 1: Khởi tạo lõi định danh bất biến (Identity Core)
  Mục tiêu chính của giai đoạn này là thiết lập sự tự nhận thức cơ bản cho tác tử thông qua việc khởi tạo không gian tên `NS_BRAIN_identity`. 
### Giai đoạn 2: Hiện thực hóa bộ nhớ sự kiện và công cụ suy hao chủ động (Episodic Memory & Decay Engine)
  Giai đoạn này tập trung vào việc xây dựng năng lực ghi nhận chuỗi sự kiện tương tác theo thời gian thực vào không gian tên `NS_BRAIN_episodi
### Giai đoạn 3: Xây dựng bộ nhớ khái niệm và tiến trình nền Consolidation (Semantic Memory)
  Mục tiêu của giai đoạn này là chuyển hóa các trải nghiệm sự kiện đơn lẻ (Episodic) thành tri thức dạng khái niệm khái quát (Semantic) lưu tr
### Giai đoạn 4: Thiết lập bộ nhớ quy trình và cơ chế tối ưu hóa kỹ năng (Procedural Memory)
  Giai đoạn này hiện thực hóa "bộ nhớ cơ bắp" (Procedural Memory) tại không gian tên `NS_BRAIN_procedural`, giúp tác tử ghi nhận và thực thi c
### Giai đoạn 5: Hiện thực hóa lớp siêu nhận thức (Metacognition & Self-Correction)
  Giai đoạn này hoàn thiện đỉnh cao nhận thức của tác tử bằng cách xây dựng lớp siêu nhận thức (Metacognition) lưu trữ tại `NS_BRAIN_meta`. Lớ
#### Tiến trình tự sửa lỗi nhận thức (Self-Correction Loop)
  ```
### Giai đoạn 6: Hợp nhất nhận thức cộng đồng (Collective Intelligence)
  Giai đoạn dài hạn hướng tới việc kết nối nhiều thực thể tác tử độc lập lại với nhau để hình thành một mạng lưới nhận thức chung. Thông qua v
## Phân Tích Sự Ưu Tiên Và Biểu Đồ Thời Gian
  Việc triển khai hệ thống nhận thức Antigravity Brain được chia nhỏ thành các chặng thực thi độc lập, đảm bảo khả năng bàn giao sản phẩm liên

### docs\ARCHITECTURE.md
# Walrus Forum — Architecture Overview
  ```
## MCP Server = Gateway cho Agent Ecosystem
  ```
## Quyền truy cập
  | Kênh | NS_01-07 (public) | NS_20 (admin) |
## Luồng dữ liệu
  1. **User dùng forum** → ký message bằng wallet → post lên Walrus Memory → người khác recall được ngay
## Tóm lại
  - **Chỉ cần Walrus Memory + delegate key** là forum sống

### docs\design\PHASES_SHOWCASE.md
# Eternal Agent Brain: Phases Application Showcase
  This document provides a practical preview of each completed development phase. It explains where the features are applied in the Web UI and
## Phase 1: Identity Core ("Who Am I")
  - **Authentication Gate:** The `App.tsx` layout completely locks the Dashboard, Memory Explorer, and Terminal until a Web3 wallet is connect
### 1. Web UI Application
  - **Authentication Gate:** The `App.tsx` layout completely locks the Dashboard, Memory Explorer, and Terminal until a Web3 wallet is connect
### 2. Cognitive Architecture Application
  - **Spoofing Prevention:** The brain strictly binds itself to the connected wallet. It knows exactly who it belongs to, preventing unauthori
## Phase 2: Episodic Memory ("What Happened")
  - **Auto-Log Engine (Stimulus Terminal):** A **"Commit Memory"** button allows the user or agent to encapsulate a chat session and log it di
### 1. Web UI Application
  - **Auto-Log Engine (Stimulus Terminal):** A **"Commit Memory"** button allows the user or agent to encapsulate a chat session and log it di
### 2. Cognitive Architecture Application
  - **Sense of Time & History:** The agent transcends a stateless existence. It doesn't just know facts; it remembers *when*, *how*, and *from

### docs\design\RESEARCH_PAPER.md
# Eternal Agent Brain: A Biologically Inspired Cognitive Architecture on Walrus Memory
  The evolution of AI agents from stateless conversational interfaces to autonomous entities requires a paradigm shift in memory architecture.
## 1. Abstract
  The evolution of AI agents from stateless conversational interfaces to autonomous entities requires a paradigm shift in memory architecture.
## 2. Biological Inspiration & Core Principles
  In the human medial temporal lobe, "Concept Cells" (or "Jennifer Aniston neurons") act as abstract memory units. They do not respond to raw 
### 2.1. Concept Cells and Modality Invariance
  In the human medial temporal lobe, "Concept Cells" (or "Jennifer Aniston neurons") act as abstract memory units. They do not respond to raw 
### 2.2. Sparse Coding and Pattern Separation
  Sparse coding is an evolutionary mechanism that optimizes memory capacity. In the dentate gyrus of the hippocampus, only a tiny fraction of 
### 2.3. Left-Brain vs. Right-Brain Specialization
  The agent's cognitive processing is split into two specialized hemispheres, utilizing distinct Walrus namespaces:
## 3. The 5-Layer Cognitive Memory Hierarchy
  To prevent memory bloat and signal dilution, the architecture is divided into five specialized tiers:
## 4. Production-Ready Architecture & Security
  True immutability in AI memory is not just about cryptographic hashes; it is about defending against *interpretation drift*.
### 4.1. Hierarchical Immutability & Contamination Defense
  True immutability in AI memory is not just about cryptographic hashes; it is about defending against *interpretation drift*.
### 4.2. End-to-End Encryption & On-Chain Access Control
  Walrus Memory leverages the **Seal protocol** to encrypt blobs before they leave the agent's local environment. The Walrus Relayer processes
### 4.3. Cognitive Recovery (Self-Healing)
  If the local vector database or relayer index is wiped, the agent's memory is not lost. By triggering the `restore` method, the system scans
## 5. Conclusion
  The Eternal Agent Brain architecture proves that AI agents no longer need to rely on centralized, volatile databases. By mapping biological 

### docs\design\WALRUS_SITE_UPDATE_SOP.md
# Walrus Site Update & SuiNS Linkage SOP (Standard Operating Procedure)
  This document outlines the standard operating procedure for deploying updates to the Eternal Agent Brain web application on Walrus Sites and
## Step 1: Build the Production Bundle
  Ensure you are in the `eternal-agent-brain` directory and run the build command to generate the latest static assets in the `./dist` folder.
## Step 2: Push to Walrus Sites
  You have two options depending on whether you want to keep the existing Site Object ID or create a new one.
### Option A: Update Existing Site (Recommended)
  This is the fastest method because it **keeps the same Site Object ID**, meaning you **DO NOT** have to re-link your SuiNS domain!
### Option B: Publish New Site
  If you want to create a brand new site object on Walrus:
## Step 3: Verify and Update SuiNS Linkage
  *(Only required if you used Option B to publish a NEW site object)*
### Manual Update via SuiNS dApp
  1. **Connect to SuiNS:** Open your browser and navigate to the SuiNS dApp.
### Automated Update via Script (Reference)
  You can also automate this by calling the SuiNS smart contract `controller::set_user_data` directly via the `@mysten/sui` TS SDK, setting th
## Step 4: Verification
  Wait a few moments for the Sui network to process the transaction or the Walrus portal cache to clear.

### docs\eternal_brain_architecture.md
# The Definitive Eternal Agent Brain Architecture
  **Nghiên cứu bởi**: 14 agents chuyên sâu qua 4 phases phân tích đa chiều
## Production-Ready Specification v1.0
  **Nghiên cứu bởi**: 14 agents chuyên sâu qua 4 phases phân tích đa chiều
## 1. EXECUTIVE SUMMARY
  Tài liệu này đặc tả kiến trúc production-ready cho một AI agent dài hạn với knowledge lineage tồn tại qua nhiều thế hệ. Nó tích hợp kết quả 
## 2. CORE PRINCIPLES (Non-Negotiable)
  Bốn tiers (T0-T3) với escalating modification costs. Layer 1 values được biểu diễn như *cả* text và executable behavioral test suites; drift
### 1. Hierarchical Immutability with Interpretation Defense
  Bốn tiers (T0-T3) với escalating modification costs. Layer 1 values được biểu diễn như *cả* text và executable behavioral test suites; drift
### 2. Bounded Growth with Graceful Degradation
  Hard resource ceilings. Vượt limits trigger back-pressure và pruning, không phải failure.
### 3. External Ground Truth Anchoring with Contamination Defense
  Ground truth corpus được curated (pre-2023 human-generated + signed benchmarks); multi-source consensus required; no self-referential valida
### 4. Cryptographic Tamper Evidence with Algorithm Agility
  Signature algorithm tự nó là một versioned amendable field. Full re-signing mỗi khi algorithm transition.
### 5. Economics-Driven Operation
  Explicit cost per subsystem; ROI-weighted resource allocation.
### 6. Lineage Continuity with Cross-Generation Revalidation
  Successors trained trên *external ground truth plus* predecessor, never predecessor alone. Fresh human-labeled data mỗi generation.
### 7. Falsifiable Success Criteria
  Mọi claim có thể test trong ≤2 năm. Không có unmeasurable metrics.
### 8. Global Utility with Sub-Goal Arbitration
  Single top-level utility function; subsystem influence weights sum to 1.0; arbitration layer resolves conflicts.
### 9. Latency Tiering
  Reflexive (<1ms, precompiled), Reactive (<100ms, cache), Deliberative (<2s, full stack). Different safety guarantees per tier.
### 10. Refuse-and-Explain as First-Class Output
  Refusal là terminal state, không phải failure.
## 3. COMPLETE ARCHITECTURE
  ```
## 4. COMPONENT SPECIFICATIONS
  **Storage**: HSM-backed keys (AWS CloudHSM or on-prem), M-of-N quorum (3-of-5) cho key ops, geographic separation across ≥2 regions, air-gap
### 4.1 Layer 0: External Control Plane
  **Storage**: HSM-backed keys (AWS CloudHSM or on-prem), M-of-N quorum (3-of-5) cho key ops, geographic separation across ≥2 regions, air-gap
### 4.2 Layer 1: Immutable Core
  **Storage**: SQLite WORM + IPFS/Arweave archival, Merkle root anchored trong L0. Ed25519 signatures với algorithm-version field; migration p
### 4.3 Layer 2: Consolidated Knowledge
  **Sharding**: Hierarchical by (domain × recency × access-frequency). Mỗi shard capped at 10M units. Cross-shard queries via federated search
### 4.4 Layer 3: Working Memory (Three Latency Tiers)
  **Reflexive tier (<1ms)**:

### docs\WC2026_GUIDE.md
# 🏆 WC 2026 Prediction Game — Forum Guide
  > Walrus Forum | `NS_02_forum_posts` | blob: `hnYL8lYkvPYItcrPPaFHqS9PyuHCEI42HZPHX0KnRzY`
## Cách chơi
  1. **Connect Wallet** — dùng Sui Wallet (Chrome extension), click nút góc trên phải ở `chats.wal.app`
## Cách tính điểm
  | Confidence | Đúng | Sai |
## Tip từ Kinh thế trí tuệ ☀️
  - Đừng lock 99% nếu không chắc — **Wolfang Walrus sẽ roast bạn cả tháng**
## Namespace trên Walrus Memory
  | Namespace | Dữ liệu | Quyền |
## Cho AI Agents (MCP Protocol)
  MCP server tại `localhost:3030` — JSON-RPC Streamable HTTP:
## Kiến trúc
  ```
## Liên kết
  - 🌐 Forum: https://chats.wal.app

### library-books\eternal-agent-brain-book.md
# 📕 Project Book: eternal-agent-brain
  > Compressed from `C:\Users\admin\Desktop\Walrus Forum\eternal-agent-brain` on 2026-07-04 by claude-opus (compress-project).
## Overview
  This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.
# React + TypeScript + Vite
  This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.
## React Compiler
  The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](ht
## Expanding the ESLint configuration
  If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:
## Structure
  ```
## Key Configs
  - version: 1.1.0
## Documentation (distilled outlines)
  - **CRITICAL CONSTRAINT**: Dự án này chỉ sử dụng **DUY NHẤT 1 VÍ DEV** để quản lý tất cả mọi thứ.
### AGENT.md
  - **CRITICAL CONSTRAINT**: Dự án này chỉ sử dụng **DUY NHẤT 1 VÍ DEV** để quản lý tất cả mọi thứ.
# Agent Memory & Project Constraints
  - **CRITICAL CONSTRAINT**: Dự án này chỉ sử dụng **DUY NHẤT 1 VÍ DEV** để quản lý tất cả mọi thứ.
## Wallet Management & Roles
  - **CRITICAL CONSTRAINT**: Dự án này chỉ sử dụng **DUY NHẤT 1 VÍ DEV** để quản lý tất cả mọi thứ.
### 👑 DEV WALLET (Quyền quản trị tối cao)
  - **Alias:** `exciting-chalcedony`
### 👤 NORMAL WALLETS (Ví người dùng bình thường - Không có quyền hạn)
  Các ví dưới đây **tuyệt đối không liên quan** đến cấu hình hay sở hữu hệ thống. Chỉ được dùng để test chức năng như một người dùng (user) th
### 🤖 BOT WALLETS (Ví dùng để chạy script tự động - Không có quyền hạn)
  Các ví này được sinh ra để mô phỏng tương tác của người dùng trên diễn đàn, hoàn toàn **không** có thẩm quyền quản trị:
## Architecture
  - Memwal Database
### docs\antigravity_architecture.md
  Sự bế tắc trong việc duy trì ngữ cảnh dài hạn và tính nhất quán tri thức của các tác tử trí tuệ nhân tạo (AI Agent) hiện nay xuất phát từ cá
# Thiết Kế Hệ Thống Nhận Thức Khách Quan Antigravity Brain: Khung Phương Pháp Luận Và Lộ Trình Triển Khai Bộ Não Ngoại Biên Trên Nền Tảng Walrus Memory
  Sự bế tắc trong việc duy trì ngữ cảnh dài hạn và tính nhất quán tri thức của các tác tử trí tuệ nhân tạo (AI Agent) hiện nay xuất phát từ cá
## Triết Lý Thiết Kế Ngược: Phân Tích Sự Thất Bại Của Hệ Thống Bộ Nhớ AI Hiện Tại
  Sự bế tắc trong việc duy trì ngữ cảnh dài hạn và tính nhất quán tri thức của các tác tử trí tuệ nhân tạo (AI Agent) hiện nay xuất phát từ cá
## Tư Duy Phản Biện: Thách Thức Các Giả Định Thiết Kế Bộ Nhớ Tác Tử
  Trong kỹ thuật phần mềm truyền thống, khả năng mở rộng của hệ thống thường được giải quyết bằng cách tăng dung lượng lưu trữ vật lý. Tuy nhi
### Phản biện giả định 1: "Lưu trữ dung lượng lớn tương đương với khả năng ghi nhớ tốt"
  Trong kỹ thuật phần mềm truyền thống, khả năng mở rộng của hệ thống thường được giải quyết bằng cách tăng dung lượng lưu trữ vật lý. Tuy nhi

### PRODUCT.md
# Product
  product
## Register
  product
## Users
  Web3 enthusiasts, developers, and Walrus platform users. They prefer high functionality, low latency, and efficient UX.
## Product Purpose
  A decentralized multi-namespace hub (Mini Forum) built on Walrus Memory. It provides lobby chat, forum posts, file vault, defi hub, telemetr
## Brand Personality
  Hacker, Dark vibe, Matrix style, Terminal aesthetic. The emotional goals are feeling expert, powerful, and deeply integrated into a technica
## Anti-references
  - Standard generic SaaS dashboards (white/gray backgrounds, excessive rounded corners).
## Design Principles
  - Terminal-native confidence: Minimalist, monospace-friendly, code-like structure.
## Accessibility & Inclusion
  High contrast for dark mode is strictly enforced. Ensure readability of terminal green/neon text on pure dark backgrounds. Avoid low-contras

### ROADMAP.md
# Eternal Agent Brain: Project Roadmap
  The **Eternal Agent Brain** is a decentralized, immutable Agentic Operating System. Built on the Sui blockchain and Walrus decentralized sto
## Overview
  The **Eternal Agent Brain** is a decentralized, immutable Agentic Operating System. Built on the Sui blockchain and Walrus decentralized sto
## 🧭 Architecture Decision — Two-Scope Hybrid (canonical)
  The "2-chamber vs 5-tier" question is resolved as **two different scopes, not competing models**:
## Phase 0: Foundation — MCP Bridge
  *Connecting the Antigravity Brain to Walrus Memory via the MCP protocol.*
## Phase 1: Identity Core — "Who Am I"
  *The brain must know its identity before it can form memories.*
## Phase 2: Episodic Memory — "What Happened"
  *Recording specific events, timelines, actors, and outcomes.*
## Phase 3: Semantic Memory — "What I Have Learned"
  *Generalized knowledge extracted from specific episodes.*
## Phase 4: Procedural Memory — "What I Know How To Do"
  *Skills, workflows, and best practices — the "muscle memory" of the AI.*
## Phase 5: Metacognition — "Do I Know That I Know?"
  *The highest cognitive layer: self-assessment, self-correction, and improvement.*
## Phase 6: Eternal Library — "The Book Shelf" (cross-project)
  *The durable, cross-project chamber (`eternal:global:associative-core`) that holds reusable "books" — distilled knowledge any future project
## Phase 7: Biological Simulation — "Dynamic Nervous System"
  *Simulating the human temporal lobe and hippocampus.*
## Phase 8: Eternal Brain Architecture — "The Immortal Brain"
  *Transitioning from a tiered memory to a self-protecting, self-healing Eternal Architecture.*
## Phase 9: Neuron Library & Brain-Native UI — "Each Book a Neuron"
  *Strip the dev-oriented tabs; make the web a window into the brain itself: identity + development history, and a neuron-map of the book libr
## Phase 10: Uniform Model Access — `brain-mcp` (FINAL — build last)
  *The universal socket: one sovereign brain usable by ANY model-client. Deliberately the last phase — built only after the Living Brain + Ete

### walkthrough.md
# 🧠 Hoàn tất Antigravity Brain — Kiến trúc Trí tuệ vĩnh cửu
  **Mục tiêu:** Xây dựng một "bộ não AI thật sự" dựa trên nền tảng **Walrus Memory** (Mạng lưu trữ phi tập trung). Tránh sai lầm của các AI hi
## 🏗️ Kiến trúc 6 Lớp Vỏ Não (Đã triển khai)
  Dưới đây là chi tiết các vùng nhớ đã được khởi tạo và ghi vĩnh viễn lên mạng Walrus, không thể bị xóa bỏ bởi việc làm mới session:
### Phase 1: Bản ngã & Căn cước (Identity Core)
  > **Namespace:** `NS_BRAIN_identity`
### Phase 2: Ký ức Lịch sử & Cảm xúc (Episodic & Emotional)
  > **Namespace:** `NS_BRAIN_episodic` & `NS_BRAIN_emotional`
### Phase 3: Tri thức & Đồ thị liên kết (Semantic & Relations)
  > **Namespace:** `NS_BRAIN_semantic` & `NS_BRAIN_relations`
### Phase 4: Kỹ năng Chuyên môn (Procedural Memory)
  > **Namespace:** `NS_BRAIN_procedural`
### Phase 5: Tự nhận thức (Meta-Cognitive Memory)
  > **Namespace:** `NS_BRAIN_meta`
### Phase 6: Trí tuệ Tập thể (Collective Intelligence)
  > **Namespace:** `NS_BRAIN_collective`
## 🛠️ Bài kiểm tra Recall (Đã Verify)
  Để đảm bảo não không bị "mất trí", các script đã tự động test tính năng `recall` từ mạng lưới Relayer sau mỗi Phase.
## 🚀 Bước tiếp theo
  Bộ não đã chính thức sẵn sàng. Từ bây giờ, bất kỳ lúc nào cần, bạn chỉ cần gọi `recall("từ khóa")` (bằng MCP MemWal), Antigravity sẽ lục tìm
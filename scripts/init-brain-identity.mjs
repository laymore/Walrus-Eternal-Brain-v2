/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Phase 1: Identity Core
 *  Ghi bản sắc cốt lõi của agent vào Walrus Memory
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Namespace: NS_BRAIN_identity
 *  Ví DEV:    0xfbf73b2f72858a4dbbcb4b942985bd46f410e7210fe01f8340f91946faec115f
 *  Chạy:      node scripts/init-brain-identity.mjs
 */

import { MemWal } from "@mysten-incubation/memwal";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Load .env ──────────────────────────────────────────────────────
function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadDotEnv();

const ACCOUNT_ID = process.env.VITE_MEMWAL_ACCOUNT_ID;
const DELEGATE_KEY = process.env.VITE_MEMWAL_DELEGATE_KEY;
const SERVER_URL = process.env.VITE_MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz";

if (!ACCOUNT_ID || !DELEGATE_KEY) {
  console.error("❌ Missing VITE_MEMWAL_ACCOUNT_ID or VITE_MEMWAL_DELEGATE_KEY in .env");
  process.exit(1);
}

// ── Create client for brain namespaces ─────────────────────────────
function brainClient(namespace) {
  return MemWal.create({
    key: DELEGATE_KEY,
    accountId: ACCOUNT_ID,
    serverUrl: SERVER_URL,
    namespace,
  });
}

// ═══════════════════════════════════════════════════════════════════
//  IDENTITY CORE — Bất biến, được ký bởi ví DEV
// ═══════════════════════════════════════════════════════════════════
const IDENTITY = {
  type: "BRAIN_IDENTITY",
  version: 1,
  timestamp: Date.now(),
  
  // WHO
  agent_name: "Antigravity",
  agent_description: "AI coding assistant powered by Google DeepMind, equipped with Walrus Memory brain",
  
  // PROJECT
  project_name: "Mini Forum",
  project_team: "Team Autobots",
  project_brand: "Cyberpunk aesthetic, Dark mode, Orbitron/Inter/Share Tech Mono fonts",
  project_sui_name: "chats.sui",
  
  // WALLETS — CRITICAL: Chỉ 1 ví dev duy nhất
  dev_wallet: "0xfbf73b2f72858a4dbbcb4b942985bd46f410e7210fe01f8340f91946faec115f",
  dev_wallet_role: "SOLE ADMIN — quản lý tất cả: deploy, moderation, on-chain interactions",
  wallet_rules: [
    "Dự án chỉ có DUY NHẤT 1 ví dev quản lý tất cả",
    "Mọi tương tác on-chain phải switch về ví dev trước: sui client switch --address 0xfbf73b...",
    "Các ví khác chỉ hiển thị tên ví hoặc SuiNS, KHÔNG được đặt tên custom",
    "Nếu lấy nhầm ví dev của dự án khác → NGUY HIỂM, phải kiểm tra kỹ",
  ],
  
  // INFRASTRUCTURE
  walrus_site_object_id: "0x19316f2a859e0d3993efce3afe2e24b820ed078fc13329671a568c6984846d53",
  memwal_account_id: "0x9c2d53a49a71f4843e6d3eb8c798b25256e02febefa73c29cc20e502db91c452",
  
  // MEMORY ARCHITECTURE
  brain_namespaces: {
    identity: "NS_BRAIN_identity",
    episodic: "NS_BRAIN_episodic",
    semantic: "NS_BRAIN_semantic",
    procedural: "NS_BRAIN_procedural",
    emotional: "NS_BRAIN_emotional",
    relations: "NS_BRAIN_relations",
    meta: "NS_BRAIN_meta",
  },
  
  // PROJECT NAMESPACES (đã hoạt động)
  project_namespaces: {
    lobby_chat: "NS_01_lobby_chat",
    forum_posts: "NS_02_forum_posts",
    file_vault: "NS_03_file_vault",
    prediction_ledger: "NS_04_prediction_ledger",
    match_results: "NS_04_match_results",
    events: "NS_04_events",
    moderation: "NS_07_moderation",
  },
  
  // CORE RULES
  core_rules: [
    "Luôn xác nhận ví dev trước khi thực hiện on-chain transaction",
    "Không bao giờ commit private key hay delegate key vào source control",
    "Mọi thay đổi quan trọng phải ghi episodic memory",
    "Kiến thức mới phải có provenance (nguồn gốc)",
    "Recall trước khi hành động — kiểm tra ký ức liên quan",
    "Ghi lesson learned sau mỗi thất bại",
    "Ký ức có importance < 0.3 sau 30 ngày → decay",
  ],
};

// ═══════════════════════════════════════════════════════════════════
//  INITIAL SEMANTIC MEMORIES — Kiến thức đã có từ dự án
// ═══════════════════════════════════════════════════════════════════
const INITIAL_SEMANTIC = [
  {
    type: "BRAIN_SEMANTIC",
    concept: "Walrus Sites Deployment",
    knowledge: "Deploy Mini Forum: npm run build → site-builder update dist <objectId> --epochs 1. Object ID không đổi nên SuiNS tự cập nhật.",
    category: "procedural",
    confidence: 0.95,
    times_confirmed: 5,
    times_contradicted: 0,
    first_learned: Date.parse("2026-06-07"),
    tags: ["deploy", "walrus", "site-builder"],
  },
  {
    type: "BRAIN_SEMANTIC",
    concept: "SuiNS Domain Linking",
    knowledge: "Gắn Walrus Site vào SuiNS bằng script set-walrus-site.mjs. Domain chats.sui đã được liên kết.",
    category: "procedural",
    confidence: 0.9,
    times_confirmed: 2,
    times_contradicted: 0,
    first_learned: Date.parse("2026-06-07"),
    tags: ["suins", "domain", "walrus"],
  },
  {
    type: "BRAIN_SEMANTIC",
    concept: "Theme System Architecture",
    knowledge: "CSS dùng data-theme attribute trên <html>. Các theme: matrix (default), autobots/robot, cyberpunk, dracula, light. Biến CSS (Custom Properties) trong index.css. ThemeSelector.tsx quản lý UI chọn theme.",
    category: "architecture",
    confidence: 0.95,
    times_confirmed: 4,
    times_contradicted: 0,
    first_learned: Date.parse("2026-06-08"),
    tags: ["css", "theme", "ui"],
  },
  {
    type: "BRAIN_SEMANTIC",
    concept: "Wallet Identity Display Rules",
    knowledge: "Component WalletIdentity hiển thị: nếu có SuiNS → hiển thị SuiNS name, nếu không → hiển thị địa chỉ ví rút gọn. KHÔNG cho phép đặt tên custom. Ví dev hiển thị badge đặc biệt.",
    category: "rule",
    confidence: 1.0,
    times_confirmed: 3,
    times_contradicted: 0,
    first_learned: Date.parse("2026-06-08"),
    tags: ["wallet", "identity", "suins", "ui"],
  },
  {
    type: "BRAIN_SEMANTIC",
    concept: "Crypto Warning Is Safe",
    knowledge: "@mysten-incubation/memwal gây warning 'Module crypto has been externalized for browser compatibility' khi build. Đây là warning bình thường, KHÔNG phải lỗi. Bỏ qua an toàn.",
    category: "gotcha",
    confidence: 1.0,
    times_confirmed: 10,
    times_contradicted: 0,
    first_learned: Date.parse("2026-06-07"),
    tags: ["build", "warning", "crypto"],
  },
];

// ═══════════════════════════════════════════════════════════════════
//  INITIAL PROCEDURAL MEMORIES — Kỹ năng đã có
// ═══════════════════════════════════════════════════════════════════
const INITIAL_PROCEDURAL = [
  {
    type: "BRAIN_PROCEDURAL",
    skill: "Deploy Mini Forum to Walrus Sites",
    steps: [
      { order: 1, action: "sui client switch --address 0xfbf73b2f72858a4dbbcb4b942985bd46f410e7210fe01f8340f91946faec115f", expected: "Active address switched", error_handling: "Kiểm tra ví có đúng không" },
      { order: 2, action: "npm run build", expected: "✓ built in Xms", error_handling: "Nếu crypto warning → bỏ qua" },
      { order: 3, action: "site-builder update dist 0x19316f2a859e0d3993efce3afe2e24b820ed078fc13329671a568c6984846d53 --epochs 1", expected: "Site object ID giữ nguyên", error_handling: "Nếu insufficient gas → nạp thêm SUI" },
    ],
    preconditions: ["Đã switch về ví DEV", "Code đã commit"],
    postconditions: ["Site ID không đổi", "SuiNS tự cập nhật", "Web mới có thể truy cập qua chats.wal.app"],
    success_rate: 1.0,
    times_executed: 5,
    last_executed: Date.now(),
  },
];

// ═══════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log("🧠 ═══ Antigravity Brain — Phase 1: Identity Core ═══\n");

  // ── Step 1: Write Identity ──────────────────────────────────────
  console.log("📌 Step 1: Writing Identity Core to NS_BRAIN_identity...");
  const identityClient = brainClient("NS_BRAIN_identity");
  
  const identityPayload = JSON.stringify(IDENTITY);
  const identityJob = await identityClient.remember(identityPayload);
  const identityResult = await identityClient.waitForRememberJob(identityJob.job_id);
  console.log(`   ✅ Identity stored → blob_id: ${identityResult.blob_id}\n`);

  // ── Step 2: Write Semantic Memories ─────────────────────────────
  console.log("📚 Step 2: Writing initial Semantic Memories to NS_BRAIN_semantic...");
  const semanticClient = brainClient("NS_BRAIN_semantic");
  
  for (const mem of INITIAL_SEMANTIC) {
    const payload = JSON.stringify(mem);
    const job = await semanticClient.remember(payload);
    const result = await semanticClient.waitForRememberJob(job.job_id);
    console.log(`   ✅ "${mem.concept}" → blob_id: ${result.blob_id}`);
  }
  console.log();

  // ── Step 3: Write Procedural Memories ───────────────────────────
  console.log("⚙️  Step 3: Writing initial Procedural Memories to NS_BRAIN_procedural...");
  const proceduralClient = brainClient("NS_BRAIN_procedural");
  
  for (const mem of INITIAL_PROCEDURAL) {
    const payload = JSON.stringify(mem);
    const job = await proceduralClient.remember(payload);
    const result = await proceduralClient.waitForRememberJob(job.job_id);
    console.log(`   ✅ "${mem.skill}" → blob_id: ${result.blob_id}`);
  }
  console.log();

  // ── Step 4: Verify by recalling ─────────────────────────────────
  console.log("🔍 Step 4: Verifying — recalling identity from Walrus Memory...");
  const recallResult = await identityClient.recall({ query: "agent identity project", limit: 1 });
  
  if (recallResult.results.length > 0) {
    const recalled = JSON.parse(recallResult.results[0].text);
    console.log(`   ✅ Agent: ${recalled.agent_name}`);
    console.log(`   ✅ Project: ${recalled.project_name} by ${recalled.project_team}`);
    console.log(`   ✅ DEV Wallet: ${recalled.dev_wallet}`);
    console.log(`   ✅ Site ID: ${recalled.walrus_site_object_id}`);
    console.log(`   ✅ SuiNS: ${recalled.project_sui_name}`);
  } else {
    console.log("   ⚠️  Recall returned empty — identity may need time to index");
  }

  console.log("\n🧠 ═══ Phase 1 Complete! Antigravity now knows who it is. ═══");
  console.log("\nBrain Namespaces initialized:");
  console.log("  • NS_BRAIN_identity   → ✅ Core identity");
  console.log("  • NS_BRAIN_semantic   → ✅ 5 initial knowledge entries");
  console.log("  • NS_BRAIN_procedural → ✅ 1 deployment skill");
  console.log("  • NS_BRAIN_episodic   → ⏳ Phase 2");
  console.log("  • NS_BRAIN_emotional  → ⏳ Phase 2");
  console.log("  • NS_BRAIN_relations  → ⏳ Phase 3");
  console.log("  • NS_BRAIN_meta       → ⏳ Phase 5");
}

main().catch((err) => {
  console.error("❌ Brain initialization failed:", err);
  process.exit(1);
});

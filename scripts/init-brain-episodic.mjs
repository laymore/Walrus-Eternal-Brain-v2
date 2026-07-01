/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Phase 2: Episodic Memory
 *  Ghi lại lịch sử sự kiện của dự án vào Walrus Memory
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Namespace: NS_BRAIN_episodic + NS_BRAIN_emotional
 *  Chạy:      node scripts/init-brain-episodic.mjs
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
const DEV_WALLET = "0xfbf73b2f72858a4dbbcb4b942985bd46f410e7210fe01f8340f91946faec115f";

if (!ACCOUNT_ID || !DELEGATE_KEY) {
  console.error("❌ Missing VITE_MEMWAL_ACCOUNT_ID or VITE_MEMWAL_DELEGATE_KEY in .env");
  process.exit(1);
}

function brainClient(namespace) {
  return MemWal.create({
    key: DELEGATE_KEY,
    accountId: ACCOUNT_ID,
    serverUrl: SERVER_URL,
    namespace,
  });
}

// ═══════════════════════════════════════════════════════════════════
//  EPISODIC MEMORIES — Lịch sử dự án Mini Forum
//  Mỗi ký ức trả lời: AI? KHI NÀO? LÀM GÌ? KẾT QUẢ? BÀI HỌC?
// ═══════════════════════════════════════════════════════════════════

const EPISODES = [
  // ── Khởi tạo dự án ────────────────────────────────────────────
  {
    id: "EP_001",
    type: "BRAIN_EPISODIC",
    event_type: "deployment",
    timestamp: Date.parse("2026-06-07T04:00:00+07:00"),
    summary: "Khởi tạo và deploy lần đầu Mini Forum lên Walrus Sites",
    details: "Tạo dự án React + Vite, tích hợp Walrus Memory với các namespace NS_01 đến NS_07. Publish thành công lên Walrus Sites mainnet. Đây là bản đầu tiên của diễn đàn.",
    actors: [DEV_WALLET],
    files_changed: ["package.json", "src/App.tsx", "src/lib/memwal.ts", "vite.config.ts"],
    trigger: "user_request",
    outcome: "success",
    lessons: "Cần setup proxy CORS cho Walrus relayer khi deploy production. Dùng Cloudflare Worker làm proxy.",
    importance: 0.9,
    confidence: 1.0,
    access_count: 0,
    last_accessed: 0,
    tags: ["init", "deploy", "walrus-sites", "milestone"],
  },

  // ── Gắn SuiNS ─────────────────────────────────────────────────
  {
    id: "EP_002",
    type: "BRAIN_EPISODIC",
    event_type: "deployment",
    timestamp: Date.parse("2026-06-07T05:00:00+07:00"),
    summary: "Liên kết Walrus Site với tên miền SuiNS chats.sui",
    details: "Chạy script set-walrus-site.mjs để gắn Site Object ID vào SuiNS name chats.sui. Từ đây có thể truy cập qua chats.wal.app.",
    actors: [DEV_WALLET],
    files_changed: ["scripts/set-walrus-site.mjs"],
    trigger: "user_request",
    outcome: "success",
    lessons: "Site Object ID không đổi khi update → SuiNS chỉ cần gắn 1 lần. Chỉ cần gắn lại nếu publish site mới (ID mới).",
    importance: 0.85,
    confidence: 1.0,
    access_count: 0,
    last_accessed: 0,
    tags: ["suins", "domain", "deploy"],
  },

  // ── Tích hợp WalletIdentity ────────────────────────────────────
  {
    id: "EP_003",
    type: "BRAIN_EPISODIC",
    event_type: "task",
    timestamp: Date.parse("2026-06-08T12:00:00+07:00"),
    summary: "Tích hợp component WalletIdentity vào toàn bộ giao diện",
    details: "Tạo component WalletIdentity để tự động hiển thị SuiNS name (nếu có) hoặc địa chỉ ví rút gọn. Áp dụng vào 7 component: LobbyChat, ForumPosts, FileVault, PredictionLedger, ReputationalProfiles, Moderation, WC2026_Game.",
    actors: [DEV_WALLET],
    files_changed: [
      "src/components/WalletIdentity.tsx",
      "src/components/NS_01_LobbyChat.tsx",
      "src/components/NS_02_ForumPosts.tsx",
      "src/components/NS_03_FileVault.tsx",
      "src/components/NS_04_PredictionLedger.tsx",
      "src/components/NS_05_ReputationalProfiles.tsx",
      "src/components/NS_07_Moderation.tsx",
      "src/components/WC2026_Game.tsx",
    ],
    trigger: "user_request",
    outcome: "success",
    lessons: "User yêu cầu rõ ràng: ví không được đặt tên custom, chỉ hiển thị SuiNS hoặc địa chỉ rút gọn. Đây là quy tắc bất biến.",
    importance: 0.85,
    confidence: 1.0,
    access_count: 0,
    last_accessed: 0,
    tags: ["wallet", "identity", "ui", "suins"],
  },

  // ── Theme System ───────────────────────────────────────────────
  {
    id: "EP_004",
    type: "BRAIN_EPISODIC",
    event_type: "task",
    timestamp: Date.parse("2026-06-08T15:00:00+07:00"),
    summary: "Xây dựng hệ thống Theme selector với 5 giao diện",
    details: "Tạo ThemeSelector.tsx + theme.ts. 5 themes: Matrix CRT (default), Robot (Team Autobots), Cyberpunk, Dracula Dark, Clean Light. Dùng CSS Custom Properties + data-theme attribute. Lưu preference vào localStorage.",
    actors: [DEV_WALLET],
    files_changed: [
      "src/lib/theme.ts",
      "src/components/ThemeSelector.tsx",
      "src/index.css",
    ],
    trigger: "user_request",
    outcome: "success",
    lessons: "User muốn nút hiển thị chữ 'Theme' cố định, không hiển thị tên theme hiện tại. Team Autobots → đổi tên thành 'Robot' trong menu.",
    importance: 0.75,
    confidence: 1.0,
    access_count: 0,
    last_accessed: 0,
    tags: ["theme", "ui", "css"],
  },

  // ── Team Autobots Branding ─────────────────────────────────────
  {
    id: "EP_005",
    type: "BRAIN_EPISODIC",
    event_type: "task",
    timestamp: Date.parse("2026-06-12T07:00:00+07:00"),
    summary: "Áp dụng bộ nhận diện Team Autobots vào diễn đàn",
    details: "Tích hợp theme Autobots (Cyberpunk Dark, Cyan Neon, Sui Blue). Cập nhật logo SVG Robot, Google Fonts (Orbitron, Inter, Share Tech Mono). Favicon mới.",
    actors: [DEV_WALLET],
    files_changed: [
      "src/index.css",
      "public/favicon.svg",
      "index.html",
    ],
    trigger: "user_request",
    outcome: "success",
    lessons: "Bộ nhận diện được lấy từ file autobots_brand_identity.md của phiên trước (conversation c49ccd14). Suirobo là dự án KHÁC, không liên quan.",
    importance: 0.7,
    confidence: 1.0,
    access_count: 0,
    last_accessed: 0,
    tags: ["branding", "autobots", "ui", "design"],
  },

  // ── Đổi tên → Mini Forum ───────────────────────────────────────
  {
    id: "EP_006",
    type: "BRAIN_EPISODIC",
    event_type: "decision",
    timestamp: Date.parse("2026-06-12T08:00:00+07:00"),
    summary: "Đổi tên dự án từ Suirobo Forum → Mini Forum",
    details: "User yêu cầu: 'Suirobo là 1 dự án khác vậy nên đổi tên dự án chúng ta là Mini Forum đi'. Cập nhật title HTML và header App.tsx.",
    actors: [DEV_WALLET],
    files_changed: ["index.html", "src/App.tsx"],
    trigger: "user_request",
    outcome: "success",
    lessons: "QUAN TRỌNG: Không nhầm lẫn giữa các dự án. Suirobo ≠ Mini Forum. Luôn xác nhận tên dự án đúng.",
    importance: 0.8,
    confidence: 1.0,
    access_count: 0,
    last_accessed: 0,
    tags: ["rename", "decision", "important"],
  },

  // ── Quy tắc ví dev ─────────────────────────────────────────────
  {
    id: "EP_007",
    type: "BRAIN_EPISODIC",
    event_type: "decision",
    timestamp: Date.parse("2026-06-08T10:00:00+07:00"),
    summary: "User xác nhận quy tắc: Chỉ 1 ví dev duy nhất quản lý tất cả",
    details: "User nói: 'dự án này chỉ duy nhất 1 ví dev quản lí tấc cả 0xfbf73b...115f, những ví khác không liên quan, ghi nhớ lại'. Đây là quy tắc tối quan trọng, bất biến.",
    actors: [DEV_WALLET],
    files_changed: ["AGENT.md"],
    trigger: "user_explicit_rule",
    outcome: "success",
    lessons: "Nếu lấy nhầm ví dev của dự án khác → NGUY HIỂM. User đặc biệt nhấn mạnh phải cẩn thận. Ghi chú ví dev trong AGENT.md.",
    importance: 1.0,
    confidence: 1.0,
    access_count: 0,
    last_accessed: 0,
    tags: ["wallet", "rule", "critical", "security"],
  },

  // ── Brain Phase 1 ──────────────────────────────────────────────
  {
    id: "EP_008",
    type: "BRAIN_EPISODIC",
    event_type: "task",
    timestamp: Date.now(),
    summary: "Khởi tạo Antigravity Brain Phase 1 — Identity Core trên Walrus Memory",
    details: "Ghi 7 entries vào Walrus Memory: 1 identity core, 5 semantic memories, 1 procedural memory. Xác minh recall thành công. MCP memwal đã được cài đặt vào mcp_config.json. Sui skills đã được cập nhật.",
    actors: [DEV_WALLET],
    files_changed: [
      "scripts/init-brain-identity.mjs",
      "C:\\Users\\admin\\.gemini\\config\\mcp_config.json",
    ],
    trigger: "user_request",
    outcome: "success",
    lessons: "Mỗi remember() mất ~20-30 giây (gửi lên Walrus + Sui transaction). 7 entries mất ~3 phút tổng cộng.",
    importance: 0.95,
    confidence: 1.0,
    access_count: 0,
    last_accessed: 0,
    tags: ["brain", "walrus-memory", "milestone", "phase1"],
  },
];

// ═══════════════════════════════════════════════════════════════════
//  EMOTIONAL MEMORIES — Phản hồi cảm xúc từ user
//  Giúp agent hiểu: User thích gì? Không thích gì?
// ═══════════════════════════════════════════════════════════════════

const EMOTIONS = [
  {
    type: "BRAIN_EMOTIONAL",
    timestamp: Date.parse("2026-06-08T16:30:00+07:00"),
    sentiment: "positive",
    intensity: 0.9,
    trigger_event: "EP_004",
    user_signal: "User nói: 'ngon lành rồi đó bạn' sau khi hoàn thành theme system",
    lesson: "User hài lòng khi thấy kết quả nhanh chóng và đúng ý. Ưu tiên demo sớm.",
    tags: ["praise", "theme", "satisfaction"],
  },
  {
    type: "BRAIN_EMOTIONAL",
    timestamp: Date.parse("2026-06-08T11:00:00+07:00"),
    sentiment: "negative",
    intensity: 0.6,
    trigger_event: "EP_007",
    user_signal: "User phàn nàn: 'tại sao bạn ko ghi chứ kĩ các thông tin ví trong dự án' — user thất vọng vì agent không ghi chú cẩn thận",
    lesson: "User coi trọng độ chính xác và ghi chú chi tiết. Luôn ghi lại thông tin quan trọng vào AGENT.md hoặc comments.",
    tags: ["complaint", "accuracy", "documentation"],
  },
  {
    type: "BRAIN_EMOTIONAL",
    timestamp: Date.parse("2026-06-12T08:30:00+07:00"),
    sentiment: "neutral",
    intensity: 0.4,
    trigger_event: "EP_006",
    user_signal: "User sửa tên dự án — cho thấy user quan tâm đến sự chính xác và phân biệt rõ ràng giữa các dự án",
    lesson: "Không giả định tên dự án. Luôn xác nhận với user. Mỗi dự án có danh tính riêng biệt.",
    tags: ["correction", "naming", "precision"],
  },
  {
    type: "BRAIN_EMOTIONAL",
    timestamp: Date.parse("2026-07-01T10:05:00+07:00"),
    sentiment: "positive",
    intensity: 1.0,
    trigger_event: "EP_008",
    user_signal: "User yêu cầu xây dựng 'bộ não thật sự' — cho thấy niềm tin lớn vào khả năng của agent và tầm nhìn dài hạn",
    lesson: "User có tầm nhìn lớn. Sẵn sàng đầu tư thời gian cho kiến trúc đúng đắn thay vì giải pháp nhanh.",
    tags: ["trust", "vision", "ambitious"],
  },
];

// ═══════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log("🧠 ═══ Antigravity Brain — Phase 2: Episodic Memory ═══\n");

  // ── Step 1: Write Episodic Memories ─────────────────────────────
  console.log(`📖 Step 1: Writing ${EPISODES.length} episodic memories to NS_BRAIN_episodic...\n`);
  const episodicClient = brainClient("NS_BRAIN_episodic");
  
  for (const ep of EPISODES) {
    const payload = JSON.stringify(ep);
    const job = await episodicClient.remember(payload);
    const result = await episodicClient.waitForRememberJob(job.job_id);
    console.log(`   ✅ [${ep.id}] "${ep.summary.substring(0, 60)}..." → ${result.blob_id}`);
  }
  console.log();

  // ── Step 2: Write Emotional Memories ────────────────────────────
  console.log(`💭 Step 2: Writing ${EMOTIONS.length} emotional memories to NS_BRAIN_emotional...\n`);
  const emotionalClient = brainClient("NS_BRAIN_emotional");
  
  for (let i = 0; i < EMOTIONS.length; i++) {
    const em = EMOTIONS[i];
    const payload = JSON.stringify(em);
    const job = await emotionalClient.remember(payload);
    const result = await emotionalClient.waitForRememberJob(job.job_id);
    const icon = em.sentiment === "positive" ? "😊" : em.sentiment === "negative" ? "😟" : "😐";
    console.log(`   ${icon} [${em.sentiment}] "${em.user_signal.substring(0, 55)}..." → ${result.blob_id}`);
  }
  console.log();

  // ── Step 3: Verify episodic recall ──────────────────────────────
  console.log("🔍 Step 3: Verifying — recalling recent episodes...\n");
  
  const recallResult = await episodicClient.recall({ 
    query: "deploy walrus site milestone", 
    limit: 3 
  });
  
  if (recallResult.results.length > 0) {
    for (const r of recallResult.results) {
      try {
        const ep = JSON.parse(r.text);
        console.log(`   📌 [${ep.id}] ${ep.summary}`);
        console.log(`      outcome: ${ep.outcome} | importance: ${ep.importance} | type: ${ep.event_type}`);
      } catch { /* skip parse errors */ }
    }
  } else {
    console.log("   ⚠️  No episodes recalled — may need indexing time");
  }

  // ── Step 4: Verify emotional recall ─────────────────────────────
  console.log("\n🔍 Step 4: Verifying — recalling emotional signals...\n");
  
  const emotionalRecall = await emotionalClient.recall({
    query: "user feedback sentiment",
    limit: 2,
  });
  
  if (emotionalRecall.results.length > 0) {
    for (const r of emotionalRecall.results) {
      try {
        const em = JSON.parse(r.text);
        const icon = em.sentiment === "positive" ? "😊" : em.sentiment === "negative" ? "😟" : "😐";
        console.log(`   ${icon} ${em.user_signal.substring(0, 70)}...`);
        console.log(`      lesson: ${em.lesson.substring(0, 70)}...`);
      } catch { /* skip */ }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n🧠 ═══ Phase 2 Complete! Antigravity now remembers what happened. ═══\n");
  console.log("Brain Namespaces status:");
  console.log("  • NS_BRAIN_identity   → ✅ Phase 1");
  console.log("  • NS_BRAIN_semantic   → ✅ Phase 1 (5 entries)");
  console.log("  • NS_BRAIN_procedural → ✅ Phase 1 (1 entry)");
  console.log(`  • NS_BRAIN_episodic   → ✅ Phase 2 (${EPISODES.length} episodes)`);
  console.log(`  • NS_BRAIN_emotional  → ✅ Phase 2 (${EMOTIONS.length} signals)`);
  console.log("  • NS_BRAIN_relations  → ⏳ Phase 3");
  console.log("  • NS_BRAIN_meta       → ⏳ Phase 5");
  
  console.log("\n📊 Episode breakdown:");
  const byType = {};
  for (const ep of EPISODES) {
    byType[ep.event_type] = (byType[ep.event_type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(byType)) {
    console.log(`   ${type}: ${count}`);
  }
  
  console.log("\n💭 Emotional breakdown:");
  const bySentiment = {};
  for (const em of EMOTIONS) {
    bySentiment[em.sentiment] = (bySentiment[em.sentiment] || 0) + 1;
  }
  for (const [sentiment, count] of Object.entries(bySentiment)) {
    const icon = sentiment === "positive" ? "😊" : sentiment === "negative" ? "😟" : "😐";
    console.log(`   ${icon} ${sentiment}: ${count}`);
  }
}

main().catch((err) => {
  console.error("❌ Episodic memory initialization failed:", err);
  process.exit(1);
});

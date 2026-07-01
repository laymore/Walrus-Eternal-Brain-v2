/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Phase 4: Procedural Memory & Project Meta
 *  Nạp kỹ năng Sui (Sui Skills) và Roadmap của Dự án Bộ Não
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Namespace: NS_BRAIN_procedural & NS_BRAIN_semantic
 *  Chạy:      node scripts/init-brain-procedural.mjs
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

function brainClient(namespace) {
  return MemWal.create({
    key: DELEGATE_KEY,
    accountId: ACCOUNT_ID,
    serverUrl: SERVER_URL,
    namespace,
  });
}

// ── Retry wrapper ──────────────────────────────────────────────────
async function rememberWithRetry(client, payload, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const job = await client.remember(payload);
      return await client.waitForRememberJob(job.job_id);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      console.log(`      ⚠️ Error: ${err.message}. Retrying in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  SUI PROCEDURAL SKILLS (Kỹ năng thao tác & Lập trình)
// ═══════════════════════════════════════════════════════════════════

const PROCEDURAL_SKILLS = [
  {
    type: "BRAIN_PROCEDURAL",
    skill_name: "Sui Move Smart Contracts",
    description: "Kỹ năng lập trình Move trên Sui",
    steps: [
      "Sử dụng object-centric model: mọi thứ là object",
      "Sử dụng abilities: key (lưu trữ), store (chuyển nhượng), copy, drop",
      "Sử dụng TxContext để lấy sender và tạo UID",
      "Init function chạy 1 lần khi publish package"
    ],
    tags: ["sui", "move", "contract"],
    confidence: 1.0,
    source: "https://docs.sui.io/skills/sui-move"
  },
  {
    type: "BRAIN_PROCEDURAL",
    skill_name: "Programmable Transaction Blocks (PTB)",
    description: "Ghép chuỗi nhiều giao dịch thành 1",
    steps: [
      "Khởi tạo TransactionBlock: const tx = new Transaction()",
      "Lấy kết quả từ lệnh trước làm input cho lệnh sau",
      "Hỗ trợ: moveCall, transferObjects, splitCoins, mergeCoins",
      "Ký và gửi: client.signAndExecuteTransactionBlock()"
    ],
    tags: ["sui", "ptb", "typescript", "sdk"],
    confidence: 1.0,
    source: "https://docs.sui.io/skills/ptbs"
  },
  {
    type: "BRAIN_PROCEDURAL",
    skill_name: "Walrus Sites Deployment",
    description: "Đưa DApp lên Walrus Storage",
    steps: [
      "Build DApp ra thư mục dist",
      "KIỂM TRA VÍ BẮT BUỘC: Chạy `sui client active-address`. Đảm bảo ví đang dùng là `0xfbf73b2f72858a4dbbcb4b942985bd46f410e7210fe01f8340f91946faec115f` (DEV Wallet của Walrus Forum). NẾU LÀ VÍ KHÁC (VD: 0xafbc...), PHẢI DÙNG `sui client switch --address 0xfbf7...` TRƯỚC KHI DEPLOY.",
      "KIỂM TRA SITE ID: Đảm bảo Site ID là `0x19316f2a859e0d3993efce3afe2e24b820ed078fc13329671a568c6984846d53` và khớp với domain `chats.sui`.",
      "Chạy lệnh: site-builder publish ./dist",
      "Để update giữ nguyên Object ID: site-builder update <ObjectID> ./dist --epochs 1",
      "Link với SuiNS: sui client call --package <suins_pkg> --module suins --function register_site..."
    ],
    tags: ["sui", "walrus", "sites", "deployment"],
    confidence: 1.0,
    source: "https://docs.sui.io/skills/walrus-sites"
  },
  {
    type: "BRAIN_PROCEDURAL",
    skill_name: "Sui Client & Tooling",
    description: "Thao tác với CLI của Sui",
    steps: [
      "sui client active-address: Lấy ví hiện tại",
      "sui client gas: Xem số dư SUI",
      "sui client publish: Deploy Move package",
      "sui client switch --env testnet: Đổi môi trường"
    ],
    tags: ["sui", "cli", "tooling"],
    confidence: 1.0,
    source: "https://docs.sui.io/skills/sui-client"
  }
];

// ═══════════════════════════════════════════════════════════════════
//  PROJECT META & ROADMAP (Thông tin dự án và Kiến trúc Brain)
// ═══════════════════════════════════════════════════════════════════

const PROJECT_META = [
  {
    type: "BRAIN_SEMANTIC",
    concept: "Antigravity Walrus Memory Brain",
    knowledge: "Dự án xây dựng một AI Brain thực sự cho Agent (Antigravity), sử dụng Walrus Memory làm nơi lưu trữ vĩnh viễn (Long-term memory) trên mạng phi tập trung. Không bị xóa khi reset session. Dùng reverse thinking: phân tách bộ nhớ thành nhiều luồng (Working, Semantic, Episodic, Procedural, Emotional).",
    category: "project_overview",
    confidence: 1.0,
    tags: ["brain", "walrus", "architecture", "overview"]
  },
  {
    type: "BRAIN_SEMANTIC",
    concept: "Brain Roadmap - Phase 1: Identity Core",
    knowledge: "Khởi tạo bản sắc cốt lõi: Tên (Antigravity), Dự án (Mini Forum), Ví Dev (0xfbf73b...115f), SuiNS (chats.sui). Lưu ở NS_BRAIN_identity.",
    category: "roadmap",
    confidence: 1.0,
    tags: ["brain", "roadmap", "phase1"]
  },
  {
    type: "BRAIN_SEMANTIC",
    concept: "Brain Roadmap - Phase 2: Episodic & Emotional Memory",
    knowledge: "Ghi lại nhật ký các sự kiện đã xảy ra (NS_BRAIN_episodic) và cảm xúc/phản hồi của user để rút kinh nghiệm (NS_BRAIN_emotional).",
    category: "roadmap",
    confidence: 1.0,
    tags: ["brain", "roadmap", "phase2"]
  },
  {
    type: "BRAIN_SEMANTIC",
    concept: "Brain Roadmap - Phase 3: Semantic & Relations Graph",
    knowledge: "Củng cố kiến thức từ các Episodes (Consolidation) và tạo đồ thị liên kết giữa các ký ức (NS_BRAIN_relations và NS_BRAIN_semantic).",
    category: "roadmap",
    confidence: 1.0,
    tags: ["brain", "roadmap", "phase3"]
  },
  {
    type: "BRAIN_SEMANTIC",
    concept: "Brain Roadmap - Phase 4: Procedural Memory",
    knowledge: "Nạp các kỹ năng (Skills), hướng dẫn code, lệnh CLI, docs (như Sui Docs) vào bộ não để Agent tự biết cách làm (NS_BRAIN_procedural).",
    category: "roadmap",
    confidence: 1.0,
    tags: ["brain", "roadmap", "phase4"]
  },
  {
    type: "BRAIN_SEMANTIC",
    concept: "Brain Roadmap - Phase 5: Meta-Cognitive Memory",
    knowledge: "Khả năng tự nhận thức: Đánh giá độ tin cậy của thông tin, phát hiện mâu thuẫn trong kiến thức cũ và mới, sửa sai (NS_BRAIN_meta).",
    category: "roadmap",
    confidence: 1.0,
    tags: ["brain", "roadmap", "phase5"]
  }
];

// ═══════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log("🧠 ═══ Antigravity Brain — Phase 4: Procedural & Meta ═══\n");

  // ── Step 1: Write Sui Procedural Skills ─────────────────────────
  console.log(`🛠️  Step 1: Writing ${PROCEDURAL_SKILLS.length} Sui Skills to NS_BRAIN_procedural...\n`);
  const proceduralClient = brainClient("NS_BRAIN_procedural");
  
  for (const skill of PROCEDURAL_SKILLS) {
    const payload = JSON.stringify(skill);
    const result = await rememberWithRetry(proceduralClient, payload);
    console.log(`   ✅ Skill: [${skill.skill_name}] → ${result.blob_id}`);
  }
  console.log();

  // ── Step 2: Write Project Meta & Roadmap ────────────────────────
  console.log(`🗺️  Step 2: Writing ${PROJECT_META.length} Project Meta items to NS_BRAIN_semantic...\n`);
  const semanticClient = brainClient("NS_BRAIN_semantic");
  
  for (const meta of PROJECT_META) {
    const payload = JSON.stringify(meta);
    const result = await rememberWithRetry(semanticClient, payload);
    console.log(`   ✅ Meta: "${meta.concept}" → ${result.blob_id}`);
  }
  console.log();

  // ── Step 3: Verify recall ───────────────────────────────────────
  console.log("🔍 Step 3: Verifying — recalling Sui Skills...\n");
  
  const skillRecall = await proceduralClient.recall({ 
    query: "programmable transaction block PTB", 
    limit: 1 
  });
  
  if (skillRecall.results.length > 0) {
    try {
      const ptb = JSON.parse(skillRecall.results[0].text);
      console.log(`   📌 Recalled Skill: ${ptb.skill_name}`);
      console.log(`      Source: ${ptb.source}`);
      console.log(`      Steps: ${ptb.steps[0]}...`);
    } catch { /* skip parse errors */ }
  } else {
    console.log("   ⚠️  No skills recalled — may need indexing time");
  }

  console.log("\n🔍 Step 4: Verifying — recalling Brain Roadmap...\n");
  const roadmapRecall = await semanticClient.recall({ 
    query: "brain roadmap memory", 
    limit: 2 
  });
  
  if (roadmapRecall.results.length > 0) {
    for (const r of roadmapRecall.results) {
      try {
        const item = JSON.parse(r.text);
        if (item.category === 'roadmap' || item.category === 'project_overview') {
            console.log(`   📌 Recalled: ${item.concept}`);
        }
      } catch { /* skip */ }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n🧠 ═══ Phase 4 Complete! Antigravity has absorbed Sui Skills & Roadmap. ═══\n");
}

main().catch((err) => {
  console.error("❌ Phase 4 initialization failed:", err);
  process.exit(1);
});

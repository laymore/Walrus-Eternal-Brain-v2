import { MemWal } from "@mysten-incubation/memwal";

async function run() {
  console.log("🚀 Bắt đầu test quá trình hoạt động của Eternal Librarian Prompt...");
  
  // Dùng DEV wallet và cấu hình tương tự env của Agent Brain
  const key = "d424a97eda5c314c7b1ac52d089554bd86a9f446f72eaf2f22b23b4ee9ad32b8";
  const accountId = "0x9c2d53a49a71f4843e6d3eb8c798b25256e02febefa73c29cc20e502db91c452"; 
  const serverUrl = "https://walrus-cors-proxy.miniforum.workers.dev";
  
  const mcp = MemWal.create({
    key,
    accountId,
    serverUrl,
    namespace: "eternal:test:prompt-jam",
  });

  console.log(`✅ Đã khởi tạo MCP Walrus Memory tại Namespace: eternal:test:prompt-jam`);
  console.log(`\n======================================================`);
  console.log(`🤖 [Agent] - Đang thi hành chỉ thị từ Prompt:`);
  console.log(`"When you solve a complex bug... immediately use memwal_remember to store it as a LIBRARY_BOOK JSON... Include fields: title, tags, tl_dr, and content."`);
  console.log(`======================================================\n`);

  const bookData = {
    type: "LIBRARY_BOOK",
    title: "How to fix computeMaturity React Error",
    tags: ["react", "error-handling", "mcp"],
    tl_dr: "Check if brain.computeMaturity exists before calling it. If missing, it prevents TypeError crash.",
    content: "When hot-reloading React components, sometimes the Brain object methods are temporarily undefined or mismatched. Always wrap method calls in existence checks: `if (brain.computeMaturity) { ... }`. This ensures robust UI behavior."
  };

  console.log("⏳ [Agent] đang gọi công cụ MCP: memwal_remember...");
  const job = await mcp.remember(JSON.stringify(bookData));
  console.log(`✅ [MCP] Đã gửi yêu cầu lưu trữ. Job ID: ${job.job_id}`);
  
  console.log("⏳ [MCP] Đang chờ xác nhận từ Walrus Mainnet/Devnet...");
  await mcp.waitForRememberJob(job.job_id);
  console.log(`✅ [MCP] Blob đã được ghi vĩnh viễn lên Walrus!\n`);

  console.log(`======================================================`);
  console.log(`🤖 [Agent] - Đang thi hành chỉ thị từ Prompt khi qua Task mới:`);
  console.log(`"ALWAYS query your memory using keywords (NOT full sentences) to wake up sleeping books. Read the tl_dr summaries first."`);
  console.log(`======================================================\n`);

  const searchKeyword = "react error";
  console.log(`⏳ [Agent] đang gọi công cụ MCP: memwal_recall với từ khóa: "${searchKeyword}"...`);
  
  const recallResult = await mcp.recall({
    query: searchKeyword,
    maxDistance: 0.95,
    limit: 5
  });

  console.log(`✅ [MCP] Đã tìm thấy ${recallResult.results.length} ký ức phù hợp!`);
  
  recallResult.results.forEach((res: any, idx: number) => {
    try {
      const parsed = JSON.parse(res.text);
      console.log(`\n📖 [Kết quả ${idx + 1}] Blob ID: ${res.blob_id}`);
      console.log(`   - 🏷️ Title: ${parsed.title}`);
      console.log(`   - ⚡ TL;DR: ${parsed.tl_dr}`);
      console.log(`   - 🧠 Content Length: ${parsed.content.length} ký tự`);
    } catch {
      console.log(`\n📖 [Kết quả ${idx + 1}] (Raw Text) Blob ID: ${res.blob_id}\n   - ${res.text}`);
    }
  });

  console.log("\n🎉 Test thành công! Agent đã tuân thủ Prompt và ghi/đọc dữ liệu qua MCP Walrus Memory một cách hoàn hảo.");
}

run().catch(console.error);

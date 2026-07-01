# Implementation Plan: NeuroAgentBrain (Mô phỏng não người trên Walrus)

Dựa trên tài liệu nghiên cứu "Thiết Kế Bộ Não Agent Mô Phỏng Não Người.pdf", chúng ta sẽ tiến hành nâng cấp **Antigravity Brain** từ một bộ nhớ tĩnh 6 lớp thành một **Hệ thần kinh động (NeuroAgentBrain)** có khả năng phân tách mẫu (Pattern Separation) và tích hợp bán cầu não (Left/Right Brain Integration).

## User Review Required

> [!IMPORTANT]
> Việc tích hợp kiến trúc sinh học này sẽ thay đổi cách bộ não Agent tiếp nhận và lưu trữ thông tin. Thay vì lưu trữ tuyến tính, mọi tương tác sẽ đi qua một Bộ định tuyến nhận thức (Cognitive Router) để quyết định lưu vào Não Trái (Logic chính xác) hay Não Phải (Ngữ cảnh mềm). Hãy xem qua cấu trúc bên dưới và xác nhận để tôi bắt đầu code.

## Proposed Changes

### Core Logic

#### [NEW] [NeuroAgentBrain.ts](file:///c:/Users/admin/Desktop/Walrus%20Forum/mini-forum-app/src/lib/NeuroAgentBrain.ts)
Tạo class `NeuroAgentBrain` (như code trong PDF) với các đặc tính sinh học:
- **Não Trái (Left Brain)**: Sử dụng namespace `agent:left-brain:procedural`. Áp dụng `MemWalManual` hoặc mô phỏng `minRelevance: 0.5` cho độ chính xác tuyệt đối (Logic, Code, JSON).
- **Não Phải (Right Brain)**: Sử dụng namespace `agent:right-brain:episodic`. Dùng cho hội thoại tự do, thiết lập `minRelevance: 0.3` để kích hoạt tư duy liên tưởng.
- **Dentate Gyrus (Hồi răng)**: Hàm `decomposeToConceptCells()` phân tách thông tin thô thành các Nơ-ron khái niệm (`BiologicalConceptCell`) độc lập để tránh nhiễu loạn ký ức.
- **Integrated Recall (Phục hồi nhận thức tích hợp)**: Truy vấn song song cả hai bán cầu não và gộp kết quả.

#### [NEW] [test-neuro-brain.mjs](file:///c:/Users/admin/Desktop/Walrus%20Forum/mini-forum-app/scripts/test-neuro-brain.mjs)
Tạo script giả lập quá trình tiếp nhận kích thích (Stimulus) của bộ não:
1. Gửi một input logic (ví dụ: đoạn code hoặc cấu hình JSON). Hệ thống sẽ định tuyến sang **Não Trái**, phân rã thành các nơ-ron khái niệm thưa và lưu trữ.
2. Gửi một input hội thoại cảm xúc (ví dụ: "Tôi thích giao diện Dark Mode"). Hệ thống sẽ định tuyến sang **Não Phải** và lưu giữ nguyên bản bối cảnh.
3. Chạy lệnh `integratedRecall()` để xem não bộ hợp nhất thông tin từ hai bán cầu như thế nào.

## Verification Plan

### Automated Tests
- Chạy `node scripts/test-neuro-brain.mjs` để kiểm chứng quá trình routing (trái/phải) và lưu trữ Blob thành công trên Walrus.

### Manual Verification
- Kiểm tra log in ra xem input có được bẻ gãy thành các Concept Cells chính xác theo đúng logic của mã hóa thưa (Sparse Coding) hay không.
- Xác nhận các blob IDs mới sinh ra và tốc độ recall từ Relayer.

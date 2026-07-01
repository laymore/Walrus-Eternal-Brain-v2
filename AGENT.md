# Agent Memory & Project Constraints

## Wallet Management & Roles
- **CRITICAL CONSTRAINT**: Dự án này chỉ sử dụng **DUY NHẤT 1 VÍ DEV** để quản lý tất cả mọi thứ.
- Mọi thao tác deploy (`site-builder`), tương tác Sui (`sui client`), hay cấu hình tên miền SuiNS đều **phải** được thực hiện dưới địa chỉ ví DEV này. (Đảm bảo đã chạy lệnh `sui client switch --address 0xfbf7...` trước khi thực hiện).

### 👑 DEV WALLET (Quyền quản trị tối cao)
- **Alias:** `exciting-chalcedony`
- **Address:** `0xfbf73b2f72858a4dbbcb4b942985bd46f410e7210fe01f8340f91946faec115f`
- **Quyền hạn:** 
  - Nắm giữ và cấu hình tên miền SuiNS (`chats.sui`).
  - Nắm giữ và update mã nguồn lên Walrus Sites.
  - Quản trị viên (Admin/Dev) trên hệ thống Memwal (kiểm duyệt, tạo sự kiện).

### 👤 NORMAL WALLETS (Ví người dùng bình thường - Không có quyền hạn)
Các ví dưới đây **tuyệt đối không liên quan** đến cấu hình hay sở hữu hệ thống. Chỉ được dùng để test chức năng như một người dùng (user) thông thường:
- `lucid-diamond`: `0xafbc48fd349fb44ce9c6f2b33423e6ae7c826d53a25920a0d4c3c475e40889c5`
- `reverent-spodumene`: `0x0b2097d53c4c634ff9bac5e51fde16565f7c1f9f9472dcec113bef02c9ebb8e9`

### 🤖 BOT WALLETS (Ví dùng để chạy script tự động - Không có quyền hạn)
Các ví này được sinh ra để mô phỏng tương tác của người dùng trên diễn đàn, hoàn toàn **không** có thẩm quyền quản trị:
- `forum-bot-1`: `0x94f189b400e33729f58659f4bab220e8cf7f3b9d04199c78cff464142744651f`
- `forum-bot-2`: `0xe12496a40eed6b1c038a9a04deef14177022441ad139e0cdda73bf4f25691a80`
- `forum-bot-3`: `0xfffa9454eb86fec987c54281f3e2d91c5e2f4b0d42b52663db9d945e1ced1313`
- `forum-bot-4`: `0x0d4ec1c89f600bbf0a8579fdbc439de9f3818c1e856308cbceccaf50d63c1f26`
- `forum-bot-5`: `0x00f88741c0340d31b80354aad8cd114e5a995340f88e6851f424c0f94bf0d848`
- `forum-bot-6`: `0xd5e5c9b690286c5302b1aa601ca14e513729685623a05a054d98923d5151e769`
- `forum-bot-7`: `0x46e0f8e0b75abc328718a79c2331de98b7718812430f653ca4b4d669518f195d`
- `forum-bot-8`: `0xab2422d9012c160b40d1a10941d91ce60761af563a16ef25a2a5382d582a1df5`
- `forum-bot-9`: `0x864f37c58c165f3e99f09a36662cc2cefc2a9217d029ad2a112a8235b1d65dce`
- `forum-bot-10`: `0x1772230736ef9abef064919e42072ac005a69d7a7cba9596267fd6830cdb146b`

## Architecture
- Memwal Database
- Walrus Sites static deployment: Object ID `0x19316f2a859e0d3993efce3afe2e24b820ed078fc13329671a568c6984846d53`
- Cloudflare Worker CORS proxy

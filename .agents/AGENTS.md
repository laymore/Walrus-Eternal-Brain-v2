# General Rules

## Deployment Rules
- **DEV Wallet Address**: MUST use `0xfbf73b2f72858a4dbbcb4b942985bd46f410e7210fe01f8340f91946faec115f` (This is the Walrus Forum DEV wallet). DO NOT USE `0xafbc48fd349fb44ce9c6f2b33423e6ae7c826d53a25920a0d4c3c475e40889c5` (which belongs to a different website).
- **Verify Active Address**: Always use `0xfbf73b2f72858a4dbbcb4b942985bd46f410e7210fe01f8340f91946faec115f`.
- **Automated Deployment**: NEVER manually run `site-builder publish` or `update`. ALWAYS run `npm run deploy` to update the canonical site (`0x19316f2a859e0d3993efce3afe2e24b820ed078fc13329671a568c6984846d53`) and automatically verify/link the `chats.sui` domain name.

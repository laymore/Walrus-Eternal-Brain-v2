// Pure pass-through to @mysten/dapp-kit — no zkLogin fallback
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';

// Re-export with the same names so existing imports still work
export { useCurrentAccount, useSignPersonalMessage };

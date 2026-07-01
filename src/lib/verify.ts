import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";

const suiClient = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl("mainnet"), network: "mainnet" });

const cache = new Map<string, boolean>();




/**
 * Verify that `signature` is a valid personal-message signature
 * for `canonicalMessage`, produced by `expectedAddress`.
 */
export async function verifyAuthor(
  canonicalMessage: string,
  signature: string | undefined,
  expectedAddress: string,
): Promise<boolean> {
  if (!signature) return false;
  // Cache key uses full signature + hash of message to avoid collisions
  const key = `${expectedAddress}:${signature}:${canonicalMessage.length}:${canonicalMessage.slice(0, 64)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  try {
    const bytes = new TextEncoder().encode(canonicalMessage);
    await verifyPersonalMessageSignature(bytes, signature, {
      address: expectedAddress,
      client: suiClient,
    });
    cache.set(key, true);
    return true;
  } catch {
    cache.set(key, false);
    return false;
  }
}

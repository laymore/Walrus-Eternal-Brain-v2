import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { PACKAGE_ID, REGISTRY_ID, ACCOUNTS_TABLE_ID, SERVER_URL } from '../config';
import { WalrusEternalBrain } from 'eternal-agent-brain-core';
import { createAccount, addDelegateKey, generateDelegateKey } from '@mysten-incubation/memwal/account';

interface BrainContextState {
  brain: WalrusEternalBrain | null;
  accountId: string | null;
  hasDeviceKey: boolean;
  isLoading: boolean;
  createBrain: () => Promise<void>;
  authorizeDevice: () => Promise<void>;
  error: string | null;
}

const BrainContext = createContext<BrainContextState>({
  brain: null,
  accountId: null,
  hasDeviceKey: false,
  isLoading: true,
  createBrain: async () => {},
  authorizeDevice: async () => {},
  error: null
});

export function BrainProvider({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [brain, setBrain] = useState<WalrusEternalBrain | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [hasDeviceKey, setHasDeviceKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkBrainState();
  }, [account?.address]);

  const checkBrainState = async () => {
    if (!account) {
      setBrain(null);
      setAccountId(null);
      setHasDeviceKey(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Check if user has an account in the Registry
      let foundAccountId: string | null = null;
      try {
        const field = await suiClient.getDynamicFieldObject({
          parentId: ACCOUNTS_TABLE_ID,
          name: { type: 'address', value: account.address }
        });
        if (field.data?.content && 'fields' in field.data.content) {
          const fields = field.data.content.fields as any;
          foundAccountId = fields.value;
        }
      } catch (err: any) {
        // Dynamic field not found means no account
        if (!err.message?.includes('Cannot find')) {
          console.error("Error checking account:", err);
        }
      }

      setAccountId(foundAccountId || null);

      // 2. Check if we have a local delegate key
      const localKey = localStorage.getItem(`memwal_delegate_key_${account.address}`);
      setHasDeviceKey(!!localKey);

      // 3. Initialize brain if both exist
      if (foundAccountId && localKey) {
        const nb = new WalrusEternalBrain({
          delegateKeyHex: localKey,
          accountId: foundAccountId,
          serverUrl: SERVER_URL,
        });
        setBrain(nb);
      } else {
        setBrain(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check brain state');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getWalletSigner = () => {
    if (!account) throw new Error("Wallet not connected");
    return {
      address: account.address,
      signAndExecuteTransaction: async (input: any) => {
        const res = await signAndExecute({ transaction: input.transaction });
        return { digest: res.digest };
      },
      signPersonalMessage: async () => { throw new Error("Not implemented"); }
    };
  };

  const createBrain = async () => {
    if (!account) return;
    try {
      setIsLoading(true);
      setError(null);
      
      const delegate = await generateDelegateKey();
      
      // We must pass suiClient to createAccount since we are in a browser context using dapp-kit
      const createRes = await createAccount({
        packageId: PACKAGE_ID,
        registryId: REGISTRY_ID,
        walletSigner: getWalletSigner(),
        suiClient,
        suiNetwork: 'mainnet'
      });

      await addDelegateKey({
        packageId: PACKAGE_ID,
        accountId: createRes.accountId,
        publicKey: delegate.publicKey,
        label: "Web Browser",
        walletSigner: getWalletSigner(),
        suiClient,
        suiNetwork: 'mainnet'
      });

      localStorage.setItem(`memwal_delegate_key_${account.address}`, delegate.privateKey);
      await checkBrainState();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create brain');
      setIsLoading(false);
    }
  };

  const authorizeDevice = async () => {
    if (!account || !accountId) return;
    try {
      setIsLoading(true);
      setError(null);
      
      const delegate = await generateDelegateKey();
      
      await addDelegateKey({
        packageId: PACKAGE_ID,
        accountId,
        publicKey: delegate.publicKey,
        label: "Web Browser (Authorized)",
        walletSigner: getWalletSigner(),
        suiClient,
        suiNetwork: 'mainnet'
      });

      localStorage.setItem(`memwal_delegate_key_${account.address}`, delegate.privateKey);
      await checkBrainState();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authorize device');
      setIsLoading(false);
    }
  };

  return (
    <BrainContext.Provider value={{ brain, accountId, hasDeviceKey, isLoading, createBrain, authorizeDevice, error }}>
      {children}
    </BrainContext.Provider>
  );
}

export const useBrain = () => useContext(BrainContext);

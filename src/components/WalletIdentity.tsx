import React from 'react';
import { useResolveSuiNSName } from '@mysten/dapp-kit';

interface WalletIdentityProps {
  address: string;
}

export const WalletIdentity: React.FC<WalletIdentityProps> = ({ address }) => {
  const { data: suinsName, isPending } = useResolveSuiNSName(address);

  if (!address) return <span>Unknown</span>;

  // Shorten the address if it's a raw 0x address
  const shortAddress = address.startsWith('0x') && address.length > 12
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;

  if (isPending) {
    return <span>{shortAddress}</span>;
  }

  return (
    <span title={address}>
      {suinsName ? suinsName : shortAddress}
    </span>
  );
};

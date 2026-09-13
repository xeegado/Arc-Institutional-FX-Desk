import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { ARC_TOKENS } from '../constants/arcNetwork';

// Minimal ERC-20 ABI required to read token balances & decimals
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export function useTokenBalances(account, provider) {
  const [balances, setBalances] = useState({
    USDC: '0.00',
    EURC: '0.00',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch balances directly from the Arc Testnet smart contracts
  const fetchBalances = useCallback(async () => {
    if (!account || !window.ethereum) {
      setBalances({ USDC: '0.00', EURC: '0.00' });
      return;
    }

    setIsLoading(true);
    try {
      // Use browser Web3 provider (MetaMask / Rabby)
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);

      // Create contract instances for USDC and EURC
      const usdcContract = new ethers.Contract(ARC_TOKENS.USDC.address, ERC20_ABI, ethersProvider);
      const eurcContract = new ethers.Contract(ARC_TOKENS.EURC.address, ERC20_ABI, ethersProvider);

      // Fetch both balances concurrently using Promise.all
      const [rawUsdc, rawEurc] = await Promise.all([
        usdcContract.balanceOf(account).catch(() => 0n), // Fallback to 0 if address is invalid/uninstantiated
        eurcContract.balanceOf(account).catch(() => 0n),
      ]);

      // Format from raw WEI/atomic units (6 decimals for USDC/EURC) to human-readable strings
      const usdcFormatted = ethers.formatUnits(rawUsdc, ARC_TOKENS.USDC.decimals);
      const eurcFormatted = ethers.formatUnits(rawEurc, ARC_TOKENS.EURC.decimals);

      setBalances({
        USDC: Number(usdcFormatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        EURC: Number(eurcFormatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      });
    } catch (err) {
      console.error('Error fetching Arc Testnet balances:', err);
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, isLoading, refetchBalances: fetchBalances };
}
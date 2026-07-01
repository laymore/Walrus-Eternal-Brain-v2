export interface MemoryItem {
  id: string;
  ns: string;
  concept: string;
  tier: 'hot' | 'warm' | 'cold' | 'archived';
  confidence: number;
  type: 'TRUST' | 'VERIFY' | 'REFUSE';
  actor?: string;
  timestamp?: string;
  importance?: number;
}

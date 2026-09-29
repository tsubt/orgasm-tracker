export type PublicUserCard = {
  id: string;
  username: string | null;
  joinedAt: Date | string;
  lastSeen: Date | string;
  trackChastityStatus: boolean;
  publicOrgasms: boolean;
  orgasmCount: number;
  lastOrgasmAt: Date | string | null;
  activeChastityStart: Date | string | null;
};

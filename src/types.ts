export interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  assetHostname: string;
  assetIp: string;
  // Nullable: some events (e.g. orphaned alerts) have no source IP.
  sourceIp: string | null;
  tags: string[];
  userId: string | null;
}

export interface User {
  id: string;
  email: string;
  role: string;
  status: string;
}

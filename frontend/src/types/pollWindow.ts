// Type definitions for Interactive Poll Window feature

export type ConnectionStatus = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface ConnectionInfo {
  status: ConnectionStatus;
  lastHeartbeat: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
  color?: string;
}

export type PollStatus = 'draft' | 'active' | 'closed';

export interface PollData {
  id: string;
  sessionId: string;
  question: string;
  options: PollOption[];
  status: PollStatus;
  totalVotes: number;
  createdAt: string;
}

export interface VoteUpdate {
  pollId: string;
  optionId: string;
  timestamp: number;
  previousVoteCount: number;
  newVoteCount: number;
}

export interface PollWindowState {
  pollId: string;
  poll: PollData | null;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
  animationQueue: VoteUpdate[];
}

export interface ChartConfig {
  layout: 'horizontal' | 'vertical';
  barSize: number;
  animationDuration: number;
  colorPalette: string[];
  fontSize: {
    question: number;
    optionLabel: number;
    voteCount: number;
  };
}

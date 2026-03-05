export type BattleStatus = 
  | 'waiting'
  | 'waiting_for_opponent'
  | 'ready'
  | 'running'
  | 'finished'
  | 'canceled' 
  | 'expired';

export interface Battle {
  id: string;
  created_by: string;
  opponent_id: string | null;
  status: BattleStatus;
  mode?: string;
  created_at: string;
  matched_at?: string | null;
  expires_at: string;
  room_version?: number;
  result_ready_at?: string;

  challenger_photo_url?: string | null;
  opponent_photo_url?: string | null;
  ready_at?: string | null;
  start_at?: string | null;
  finished_at?: string | null;
  theme?: string | null;
  stake?: any;
  winner_id?: string | null;
  created_by_ready?: boolean;
  opponent_ready?: boolean;
}

export interface EnrichedBattle extends Battle {
  opponent_profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    [key: string]: any;
  } | null;
  is_creator: boolean;
}

export interface BattleSubmission {
  id: string;
  battle_id: string;
  user_id: string;
  front_photo_path?: string | null;
  side_photo_path?: string | null;
  photo_front_url?: string | null;
  photo_side_url?: string | null;
  submitted_at: string;
  status?: string;
}

export interface BattleResult {
  battle_id: string;
  winner_id: string;
  loser_id: string;
  winner_score: number;
  loser_score: number;
  verdict_label_winner?: string;
  verdict_label_loser?: string;
  summary?: any;
  created_at?: string;
  id?: string;
  draw?: boolean;
  completed_at?: string;
}

export interface BattleEvent {
  id: string;
  battle_id: string;
  type: string;
  payload: any;
  created_at: string;
}

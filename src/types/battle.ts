export type BattleStatus = 
  | 'waiting'
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
  mode: string;
  created_at: string;
  matched_at: string | null;
  expires_at: string;
  room_version: number;
  result_ready_at?: string;

  creator_photo_url?: string | null;
  opponent_photo_url?: string | null;
  ready_at?: string | null;
  start_at?: string | null;
  finished_at?: string | null;
}

export interface EnrichedBattle extends Battle {
  opponent_profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  is_creator: boolean;
}

export interface BattleSubmission {
  id: string;
  battle_id: string;
  user_id: string;
  front_photo_path: string | null;
  side_photo_path: string | null;
  submitted_at: string;
}

export interface BattleResult {
  battle_id: string;
  winner_id: string;
  loser_id: string;
  winner_score: number;
  loser_score: number;
  verdict_label_winner: string;
  verdict_label_loser: string;
  summary: any;
  created_at: string;
}

export interface BattleEvent {
  id: string;
  battle_id: string;
  type: string;
  payload: any;
  created_at: string;
}

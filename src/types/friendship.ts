export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'canceled' | 'blocked' | 'none' | 'pending_sent' | 'pending_received';

export interface FriendProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  short_id: string | null;
  friendship_status?: FriendshipStatus; // Enriched by hooks
  is_requester?: boolean; // True if I sent the request
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  friend_profile?: FriendProfile; // Joined profile data
}

export interface Block {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface SearchResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  short_id: string | null;
  status: FriendshipStatus; // 'none', 'pending', 'accepted', 'blocked'
  direction?: 'incoming' | 'outgoing'; // To know if I sent or received
}

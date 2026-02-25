create table if not exists public.spotify_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id text not null,
  track_id text not null unique,
  track_name text not null,
  artist text not null,
  spotify_url text not null,
  preview_url text null,
  tags jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists spotify_tracks_playlist_idx on public.spotify_tracks (playlist_id, updated_at desc);


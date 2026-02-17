import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const PLAYLIST_ID = "54KgUD5Oji30CA9iNjdEZO";
const ALLOWED_TAGS = ["aura","cinematic","sigma","clean","luxury","gym","dark","romantic","calm","confident","party","focus"];

function pickTagsFromText(t: string, fallbackSeed: string): string[] {
  const s = t.toLowerCase();
  const tags: string[] = [];
  if (s.includes("love") || s.includes("romance")) tags.push("romantic");
  if (s.includes("night") || s.includes("shadow")) tags.push("dark");
  if (s.includes("calm") || s.includes("slow") || s.includes("sleep")) tags.push("calm");
  if (s.includes("gym") || s.includes("power") || s.includes("pump")) tags.push("gym");
  if (s.includes("focus") || s.includes("study")) tags.push("focus");
  if (s.includes("lux") || s.includes("gold")) tags.push("luxury");
  if (s.includes("clean")) tags.push("clean");
  if (s.includes("cinema") || s.includes("score")) tags.push("cinematic");
  if (s.includes("party") || s.includes("dance")) tags.push("party");
  if (s.includes("confident") || s.includes("boss")) tags.push("confident");
  if (s.includes("sigma")) tags.push("sigma");
  if (s.includes("aura")) tags.push("aura");
  const uniq = Array.from(new Set(tags.filter((x) => ALLOWED_TAGS.includes(x))));
  if (uniq.length >= 2) return uniq.slice(0, 4);
  function h(str: string) {
    let v = 0;
    for (let i = 0; i < str.length; i++) v = (v * 31 + str.charCodeAt(i)) >>> 0;
    return v;
  }
  const idx1 = h(fallbackSeed) % ALLOWED_TAGS.length;
  const idx2 = h(fallbackSeed + "x") % ALLOWED_TAGS.length;
  const fill = Array.from(new Set([ALLOWED_TAGS[idx1], ALLOWED_TAGS[idx2]])).filter(Boolean);
  return Array.from(new Set([...uniq, ...fill])).slice(0, 4);
}

async function getSpotifyToken(): Promise<string> {
  const id = Deno.env.get("SPOTIFY_CLIENT_ID")!;
  const secret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error("spotify_token_error");
  return data.access_token;
}

type SpotifyArtist = { name: string };
type SpotifyTrack = {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  external_urls?: { spotify?: string };
  preview_url?: string | null;
};
type PlaylistItem = { track: SpotifyTrack | null };
type PlaylistPage = { items: PlaylistItem[]; next?: string | null };

async function fetchPlaylistTracks(token: string) {
  let url = `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks?limit=100`;
  const all: {
    track_id: string;
    track_name: string;
    artist: string;
    spotify_url: string;
    preview_url: string | null;
  }[] = [];
  while (url) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json() as PlaylistPage;
    if (!r.ok) throw new Error("spotify_fetch_error");
    const items = Array.isArray(j.items) ? j.items : [];
    for (const it of items) {
      const tr = it.track;
      if (!tr) continue;
      const track_id = tr.id;
      const track_name = tr.name || "";
      const artist = Array.isArray(tr.artists) ? tr.artists.map((a) => a.name).join(", ") : "";
      const spotify_url = tr.external_urls?.spotify || "";
      const preview_url = tr.preview_url || null;
      all.push({ track_id, track_name, artist, spotify_url, preview_url });
    }
    url = j.next || "";
  }
  return all;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

  try {
    const token = await getSpotifyToken();
    const tracks = await fetchPlaylistTracks(token);
    if (!supabase) throw new Error("supabase_not_configured");
    const payload = tracks.map((t) => {
      const tags = pickTagsFromText(`${t.track_name} ${t.artist}`, t.track_id);
      return {
        playlist_id: PLAYLIST_ID,
        track_id: t.track_id,
        track_name: t.track_name,
        artist: t.artist,
        spotify_url: t.spotify_url,
        preview_url: t.preview_url,
        tags,
        updated_at: new Date().toISOString(),
      };
    });
    const chunks: typeof payload[] = [];
    for (let i = 0; i < payload.length; i += 1000) chunks.push(payload.slice(i, i + 1000));
    for (const chunk of chunks) {
      await supabase.from("spotify_tracks").upsert(chunk, { onConflict: "track_id" });
    }
    return new Response(JSON.stringify({ imported: payload.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

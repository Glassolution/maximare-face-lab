import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

function getSessionId(): string {
  let sid = sessionStorage.getItem("_pv_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("_pv_sid", sid);
  }
  return sid;
}

export function usePageTracking() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);
  const enteredAt = useRef<number>(Date.now());

  useEffect(() => {
    const sessionId = getSessionId();
    const currentPath = location.pathname;

    // Mark previous page view as exit and set duration
    if (lastPath.current && lastPath.current !== currentPath) {
      const duration = Math.round((Date.now() - enteredAt.current) / 1000);
      // Fire-and-forget update for the previous page
      supabase
        .from("page_views")
        .update({ duration_seconds: duration, is_exit: false })
        .eq("session_id", sessionId)
        .eq("page_path", lastPath.current)
        .eq("is_exit", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(() => {});
    }

    // Get current user id if logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userId = session?.user?.id || null;

      supabase
        .from("page_views")
        .insert({
          session_id: sessionId,
          user_id: userId,
          page_path: currentPath,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          is_exit: true, // Assume exit until next navigation
        })
        .then(() => {});
    });

    lastPath.current = currentPath;
    enteredAt.current = Date.now();

    // Handle tab close / navigate away
    const handleBeforeUnload = () => {
      const duration = Math.round((Date.now() - enteredAt.current) / 1000);
      // Use sendBeacon for reliability on page unload
      const body = JSON.stringify({
        session_id: sessionId,
        page_path: currentPath,
        duration_seconds: duration,
      });
      navigator.sendBeacon?.(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/update_exit_page`,
        body
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [location.pathname]);
}

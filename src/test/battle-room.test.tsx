import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import BattleRoom from "@/pages/BattleRoom";
import { useBattleTimeout } from "@/hooks/useBattleTimeout";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

vi.mock("@/components/battle/BattleProcessingOverlay", () => ({
  BattleProcessingOverlay: () => null,
}));

const rpcMock = vi.fn(async () => ({ data: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

const authMockProfile = { id: "user-2", display_name: "User 2" };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ profile: authMockProfile }),
}));

let mockState: any = {};
vi.mock("@/hooks/useBattleRoom", () => ({
  useBattleRoom: (_id: string) => ({
    battle: mockState.battle,
    opponentProfile: mockState.opponentProfile ?? { id: "user-1", display_name: "Opponent" },
    submissions: mockState.submissions ?? [],
    result: mockState.result ?? null,
    loading: false,
    error: null,
    submitPhotos: vi.fn(),
    serverTimeOffsetMs: mockState.serverTimeOffsetMs ?? 0,
    refresh: vi.fn(),
  }),
}));

describe("useBattleTimeout", () => {
  it("hardTimedOut deve mudar para true automaticamente após o deadline", async () => {
    const startInPast = new Date(Date.now() - 25000).toISOString();
    const battle = { status: "running", start_at: startInPast };
    const { result } = renderHook(() => useBattleTimeout(battle as any, null, 0));
    expect(result.current.hardTimedOut).toBe(true);
  });
});

function TestProcessCaller({ battle, nowServerApprox }: { battle: any; nowServerApprox: number }) {
  const processCalledRef = useRef(false);
  useEffect(() => {
    const startMs = battle.start_at ? new Date(battle.start_at).getTime() : null;
    if (!startMs) return;
    const ready = battle.status === "running" && nowServerApprox >= startMs + 9000;
    if (!ready) return;
    if (processCalledRef.current) return;
    processCalledRef.current = true;
    supabase.rpc("mock_process_battle_result", { p_battle_id: battle.id }).catch(() => {
      processCalledRef.current = false;
    });
  }, [battle?.id, battle?.status, battle?.start_at, nowServerApprox]);
  return null;
}

describe("processCalledRef e guards", () => {
  beforeEach(() => {
    rpcMock.mockClear();
  });

  it("mock_process_battle_result não é chamado mais de uma vez com múltiplos re-renders", async () => {
    const battle = { id: "b1", status: "running", start_at: new Date(Date.now() - 9500).toISOString() };
    const nowServerApprox = Date.now();
    const { rerender } = render(<TestProcessCaller battle={battle} nowServerApprox={nowServerApprox} />);
    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith("mock_process_battle_result", { p_battle_id: "b1" })
    );
    rerender(<TestProcessCaller battle={battle} nowServerApprox={nowServerApprox} />);
    rerender(<TestProcessCaller battle={battle} nowServerApprox={nowServerApprox} />);
    await waitFor(() => expect(rpcMock.mock.calls.filter((c) => c[0] === "mock_process_battle_result")).toHaveLength(1));
  });

  it("isCreator guard: oponente não dispara mark_battle_running_v3", async () => {
    vi.useFakeTimers();
    mockState = {
      battle: {
        id: "b2",
        status: "ready",
        created_by: "user-1", // criador é outro usuário
        start_at: new Date(Date.now() - 1000).toISOString(),
      },
      serverTimeOffsetMs: 0,
      result: null,
      submissions: [],
    };

    render(
      <MemoryRouter initialEntries={["/battles/b2"]}>
        <Routes>
          <Route path="/battles/:id" element={<BattleRoom />} />
        </Routes>
      </MemoryRouter>
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Ninguém deve ter chamado a transição para running do guard se não é o criador
    expect(rpcMock.mock.calls.find((c) => c[0] === "mark_battle_running_v3")).toBeUndefined();
    vi.useRealTimers();
  });
});

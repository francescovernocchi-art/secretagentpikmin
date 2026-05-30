import { useCallback, useEffect, useState } from "react";
import { fetchHomeDashboard, type HomeDashboardData } from "@/lib/game/home";
import { fetchMissionProgress } from "@/lib/game/planet";
import { fetchPikminUnits, updatePikminSpecialization } from "@/lib/game/pikmin-units";
import { fetchPrimaryVillage } from "@/lib/game/villages";
import { fetchSellableInventory, sellInventoryItem, fetchRecentTransactions } from "@/lib/game/market";
import { fetchChatMessagesWithLegacy, sendChatMessage } from "@/lib/game/chat";
import { fetchCurrentBiome, fetchRecentScans, runWeightedAreaScan } from "@/lib/game/scanner";
import { fetchSpaceshipParts } from "@/lib/game/spaceship";
import { agentKeyFromSession } from "@/lib/game/planet";
import { getSession } from "@/lib/session";
import type { MissionProgressData } from "@/types/phase2-db";
import type { PikminUnit, PikminSpecializationKey, ChatChannelKey, BiomeKey } from "@/types/secretPikmin";
import type { DbVillageBuilding } from "@/types/phase2-db";

export function useHomeDashboard() {
  const [data, setData] = useState<HomeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchHomeDashboard());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, reload };
}

export function useMissionProgress() {
  const [progress, setProgress] = useState<MissionProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchMissionProgress();
      setProgress(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { progress, loading, reload };
}

export function usePikminSquad(ownerAgent?: string) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = ownerAgent ?? agentKeyFromSession(session?.role);
  const [squad, setSquad] = useState<PikminUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "local">("local");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data, source: s } = await fetchPikminUnits(agent);
      setSquad(data);
      setSource(s);
    } finally {
      setLoading(false);
    }
  }, [agent]);

  const assignSpecialization = useCallback(
    async (unitId: string, spec: PikminSpecializationKey) => {
      const { data } = await updatePikminSpecialization(unitId, spec);
      setSquad(data);
    },
    [],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { squad, loading, source, reload, assignSpecialization };
}

export function useVillageDiorama(ownerAgent?: string) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = ownerAgent ?? agentKeyFromSession(session?.role);
  const [buildings, setBuildings] = useState<DbVillageBuilding[]>([]);
  const [villageName, setVillageName] = useState("");
  const [controlLevel, setControlLevel] = useState(1);
  const [maxVillages, setMaxVillages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetchPrimaryVillage(agent);
        setBuildings(res.buildings);
        setVillageName(res.village.name);
        setControlLevel(res.controlCenterLevel);
        setMaxVillages(res.maxVillages);
      } finally {
        setLoading(false);
      }
    })();
  }, [agent]);

  return { buildings, villageName, controlLevel, maxVillages, loading };
}

export function useMarket(agentKey?: string) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = agentKey ?? agentKeyFromSession(session?.role);
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchSellableInventory>>>([]);
  const [transactions, setTransactions] = useState<Awaited<ReturnType<typeof fetchRecentTransactions>>>([]);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, tx] = await Promise.all([fetchSellableInventory(agent), fetchRecentTransactions(agent)]);
      setItems(inv);
      setTransactions(tx);
    } finally {
      setLoading(false);
    }
  }, [agent]);

  const sell = useCallback(
    async (itemKey: string, qty = 1) => {
      setSelling(itemKey);
      try {
        const result = await sellInventoryItem(agent, itemKey, qty);
        await reload();
        return result;
      } finally {
        setSelling(null);
      }
    },
    [agent, reload],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, transactions, loading, selling, reload, sell };
}

export function useFamilyChat(channel?: ChatChannelKey) {
  const [messages, setMessages] = useState<Awaited<ReturnType<typeof fetchChatMessagesWithLegacy>>>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setMessages(await fetchChatMessagesWithLegacy(channel));
    } finally {
      setLoading(false);
    }
  }, [channel]);

  const send = useCallback(
    async (content: string, ch: ChatChannelKey, messageType = "text") => {
      const session = getSession();
      if (!session) return;
      const msg = await sendChatMessage({
        channel: ch,
        senderAgent: agentKeyFromSession(session.role),
        content,
        messageType,
      });
      setMessages((prev) => [...prev, msg]);
    },
    [],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { messages, loading, reload, send };
}

export function useScannerBiome() {
  const [biome, setBiome] = useState<BiomeKey>("bosco");
  const [recentScans, setRecentScans] = useState<Awaited<ReturnType<typeof fetchRecentScans>>["data"]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const { biome: b } = await fetchCurrentBiome();
      setBiome(b);
      const { data } = await fetchRecentScans(5);
      setRecentScans(data);
    })();
  }, []);

  const runAreaScan = useCallback(async () => {
    setProcessing(true);
    try {
      const result = await runWeightedAreaScan();
      setBiome(result.biome);
      const { data } = await fetchRecentScans(5);
      setRecentScans(data);
      return result;
    } finally {
      setProcessing(false);
    }
  }, []);

  return { biome, recentScans, processing, runAreaScan };
}

export function useSpaceshipParts() {
  const [parts, setParts] = useState<Awaited<ReturnType<typeof fetchSpaceshipParts>>["data"]>([]);

  const reload = useCallback(() => {
    fetchSpaceshipParts().then(({ data }) => setParts(data));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { parts, reload };
}

export function useGameNotifications(agentKey?: string) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = agentKey ?? agentKeyFromSession(session?.role);
  const [notifications, setNotifications] = useState<Awaited<ReturnType<typeof import("@/lib/game/notifications").fetchGameNotifications>>>([]);

  const reload = useCallback(async () => {
    const { fetchGameNotifications, unreadCount } = await import("@/lib/game/notifications");
    const data = await fetchGameNotifications(agent);
    setNotifications(data);
    return unreadCount(data);
  }, [agent]);

  const [unread, setUnread] = useState(0);

  useEffect(() => {
    reload().then(setUnread);
    const t = setInterval(() => reload().then(setUnread), 15000);
    return () => clearInterval(t);
  }, [reload]);

  const markRead = useCallback(async (id: string) => {
    const { markNotificationRead } = await import("@/lib/game/notifications");
    await markNotificationRead(id, agent);
    await reload().then(setUnread);
  }, [agent, reload]);

  const markAllRead = useCallback(async () => {
    const { markAllNotificationsRead } = await import("@/lib/game/notifications");
    await markAllNotificationsRead(agent);
    await reload().then(setUnread);
  }, [agent, reload]);

  return { notifications, unread, reload, markRead, markAllRead };
}

export function usePlayerBiome(agentKey?: string) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = agentKey ?? agentKeyFromSession(session?.role);
  const [biome, setBiome] = useState<BiomeKey>("bosco");
  const [location, setLocation] = useState<Awaited<ReturnType<typeof import("@/lib/game/player-location").fetchPlayerLocation>> | null>(null);

  const reload = useCallback(async () => {
    const { fetchPlayerLocation } = await import("@/lib/game/player-location");
    const loc = await fetchPlayerLocation(agent);
    setLocation(loc);
    setBiome(loc.current_biome as BiomeKey);
  }, [agent]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { biome, location, reload, setBiome };
}

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "catalogs-v4";
const LEGACY_KEYS = ["catalogs-v3", "catalogs-v2", "catalogs-v1"];

export interface CatalogEntry {
  name: string;
  weight: number; // kg
}

export interface CaliberGroup {
  id: string;
  name: string;
  values: string[];
}

export type Currency = "PLN" | "USD" | "EUR";

export interface Counterparty {
  name: string;
  currency: Currency;
}

export const CURRENCIES: Currency[] = ["PLN", "USD", "EUR"];

const DEFAULT_CONTAINERS: CatalogEntry[] = [
  { name: "Karton 600 x 400", weight: 0.5 },
  { name: "Karton 500 x 300", weight: 0.4 },
  { name: "Łuszczka 13", weight: 0.13 },
  { name: "Łuszczka 8", weight: 0.08 },
  { name: "Karton jednowarstwowy", weight: 0.3 },
];

const DEFAULT_PALLETS: CatalogEntry[] = [
  { name: "Europaleta", weight: 25 },
  { name: "Paleta Europodobna", weight: 22 },
  { name: "Paleta 100 x 120", weight: 28 },
];

const DEFAULT_CALIBERS: CaliberGroup[] = [
  {
    id: "jablka",
    name: "Jabłka",
    values: ["65+", "70+", "75+", "80+", "85+"],
  },
  {
    id: "pomidory",
    name: "Pomidory",
    values: ["A", "B", "C", "BB", "BBB"],
  },
  {
    id: "ogorki",
    name: "Ogórki",
    values: ["S", "M", "L", "XL"],
  },
];

const DEFAULT_VARIETIES: string[] = [
  "Gala",
  "Ligol",
  "Champion",
  "Idared",
  "Golden Delicious",
  "Red Jonaprince",
  "Mutsu",
  "Szampion",
];

const DEFAULT_COUNTERPARTIES: Counterparty[] = [];

interface Catalogs {
  containers: CatalogEntry[];
  pallets: CatalogEntry[];
  caliberGroups: CaliberGroup[];
  varieties: string[];
  counterparties: Counterparty[];
}

interface CatalogsContextValue extends Catalogs {
  addContainer: (entry: CatalogEntry) => void;
  updateContainer: (name: string, patch: Partial<CatalogEntry>) => void;
  removeContainer: (name: string) => void;
  addPallet: (entry: CatalogEntry) => void;
  updatePallet: (name: string, patch: Partial<CatalogEntry>) => void;
  removePallet: (name: string) => void;
  addCaliberGroup: (name: string) => void;
  renameCaliberGroup: (id: string, name: string) => void;
  removeCaliberGroup: (id: string) => void;
  addCaliber: (groupId: string, value: string) => void;
  removeCaliber: (groupId: string, value: string) => void;
  addVariety: (name: string) => void;
  removeVariety: (name: string) => void;
  addCounterparty: (name: string, currency?: Currency) => void;
  updateCounterpartyCurrency: (name: string, currency: Currency) => void;
  removeCounterparty: (name: string) => void;
  getCounterpartyCurrency: (name: string) => Currency;
  getContainerWeight: (name: string) => number;
  getPalletWeight: (name: string) => number;
}

const CatalogsContext = createContext<CatalogsContextValue | null>(null);

const normalizeList = (raw: unknown, fallback: CatalogEntry[]): CatalogEntry[] => {
  if (!Array.isArray(raw)) return fallback;
  const result: CatalogEntry[] = raw
    .map((it) => {
      if (typeof it === "string") return { name: it, weight: 0 };
      if (it && typeof it === "object") {
        const name = String((it as any).name ?? "").trim();
        const weight = Number((it as any).weight) || 0;
        return { name, weight };
      }
      return { name: "", weight: 0 };
    })
    .filter((e) => e.name);
  return result.length ? result : fallback;
};

const normalizeCalibers = (raw: unknown, fallback: CaliberGroup[]): CaliberGroup[] => {
  if (!Array.isArray(raw)) return fallback;
  const result: CaliberGroup[] = raw
    .map((g) => {
      if (!g || typeof g !== "object") return null;
      const name = String((g as any).name ?? "").trim();
      if (!name) return null;
      const id = String((g as any).id ?? crypto.randomUUID());
      const values = Array.isArray((g as any).values)
        ? (g as any).values.map((v: any) => String(v).trim()).filter(Boolean)
        : [];
      return { id, name, values };
    })
    .filter((x): x is CaliberGroup => !!x);
  return result;
};

export const CatalogsProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<Catalogs>({
    containers: DEFAULT_CONTAINERS,
    pallets: DEFAULT_PALLETS,
    caliberGroups: DEFAULT_CALIBERS,
    varieties: DEFAULT_VARIETIES,
    counterparties: DEFAULT_COUNTERPARTIES,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const varieties = Array.isArray(parsed.varieties)
          ? parsed.varieties.map((v: any) => String(v).trim()).filter(Boolean)
          : DEFAULT_VARIETIES;
        const counterparties: Counterparty[] = Array.isArray(parsed.counterparties)
          ? parsed.counterparties
              .map((v: any) => {
                if (typeof v === "string") {
                  const name = v.trim();
                  return name ? { name, currency: "PLN" as Currency } : null;
                }
                if (v && typeof v === "object") {
                  const name = String(v.name ?? "").trim();
                  if (!name) return null;
                  const cur = CURRENCIES.includes(v.currency) ? (v.currency as Currency) : "PLN";
                  return { name, currency: cur };
                }
                return null;
              })
              .filter((x: any): x is Counterparty => !!x)
          : DEFAULT_COUNTERPARTIES;
        setData({
          containers: normalizeList(parsed.containers, DEFAULT_CONTAINERS),
          pallets: normalizeList(parsed.pallets, DEFAULT_PALLETS),
          caliberGroups: normalizeCalibers(parsed.caliberGroups, DEFAULT_CALIBERS),
          varieties: varieties.length ? varieties : DEFAULT_VARIETIES,
          counterparties,
        });
        return;
      }
      for (const key of LEGACY_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          setData({
            containers: normalizeList(parsed.containers, DEFAULT_CONTAINERS),
            pallets: normalizeList(parsed.pallets, DEFAULT_PALLETS),
            caliberGroups: DEFAULT_CALIBERS,
            varieties: DEFAULT_VARIETIES,
            counterparties: DEFAULT_COUNTERPARTIES,
          });
          return;
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  const addContainer = useCallback((entry: CatalogEntry) => {
    const name = entry.name.trim();
    if (!name) return;
    setData((prev) =>
      prev.containers.some((c) => c.name === name)
        ? prev
        : { ...prev, containers: [...prev.containers, { name, weight: entry.weight || 0 }] }
    );
  }, []);

  const updateContainer = useCallback((name: string, patch: Partial<CatalogEntry>) => {
    setData((prev) => ({
      ...prev,
      containers: prev.containers.map((c) => (c.name === name ? { ...c, ...patch } : c)),
    }));
  }, []);

  const removeContainer = useCallback((name: string) => {
    setData((prev) => ({ ...prev, containers: prev.containers.filter((c) => c.name !== name) }));
  }, []);

  const addPallet = useCallback((entry: CatalogEntry) => {
    const name = entry.name.trim();
    if (!name) return;
    setData((prev) =>
      prev.pallets.some((p) => p.name === name)
        ? prev
        : { ...prev, pallets: [...prev.pallets, { name, weight: entry.weight || 0 }] }
    );
  }, []);

  const updatePallet = useCallback((name: string, patch: Partial<CatalogEntry>) => {
    setData((prev) => ({
      ...prev,
      pallets: prev.pallets.map((p) => (p.name === name ? { ...p, ...patch } : p)),
    }));
  }, []);

  const removePallet = useCallback((name: string) => {
    setData((prev) => ({ ...prev, pallets: prev.pallets.filter((p) => p.name !== name) }));
  }, []);

  const addCaliberGroup = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((prev) =>
      prev.caliberGroups.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())
        ? prev
        : {
            ...prev,
            caliberGroups: [
              ...prev.caliberGroups,
              { id: crypto.randomUUID(), name: trimmed, values: [] },
            ],
          }
    );
  }, []);

  const renameCaliberGroup = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((prev) => ({
      ...prev,
      caliberGroups: prev.caliberGroups.map((g) => (g.id === id ? { ...g, name: trimmed } : g)),
    }));
  }, []);

  const removeCaliberGroup = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      caliberGroups: prev.caliberGroups.filter((g) => g.id !== id),
    }));
  }, []);

  const addCaliber = useCallback((groupId: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setData((prev) => ({
      ...prev,
      caliberGroups: prev.caliberGroups.map((g) =>
        g.id === groupId && !g.values.includes(trimmed)
          ? { ...g, values: [...g.values, trimmed] }
          : g
      ),
    }));
  }, []);

  const removeCaliber = useCallback((groupId: string, value: string) => {
    setData((prev) => ({
      ...prev,
      caliberGroups: prev.caliberGroups.map((g) =>
        g.id === groupId ? { ...g, values: g.values.filter((v) => v !== value) } : g
      ),
    }));
  }, []);

  const addVariety = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((prev) =>
      prev.varieties.some((v) => v.toLowerCase() === trimmed.toLowerCase())
        ? prev
        : { ...prev, varieties: [...prev.varieties, trimmed] }
    );
  }, []);

  const removeVariety = useCallback((name: string) => {
    setData((prev) => ({ ...prev, varieties: prev.varieties.filter((v) => v !== name) }));
  }, []);

  const addCounterparty = useCallback((name: string, currency: Currency = "PLN") => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((prev) =>
      prev.counterparties.some((v) => v.name.toLowerCase() === trimmed.toLowerCase())
        ? prev
        : { ...prev, counterparties: [...prev.counterparties, { name: trimmed, currency }] }
    );
  }, []);

  const updateCounterpartyCurrency = useCallback((name: string, currency: Currency) => {
    setData((prev) => ({
      ...prev,
      counterparties: prev.counterparties.map((c) =>
        c.name === name ? { ...c, currency } : c
      ),
    }));
  }, []);

  const removeCounterparty = useCallback((name: string) => {
    setData((prev) => ({
      ...prev,
      counterparties: prev.counterparties.filter((v) => v.name !== name),
    }));
  }, []);

  const getCounterpartyCurrency = useCallback(
    (name: string): Currency =>
      data.counterparties.find((c) => c.name === name)?.currency ?? "PLN",
    [data.counterparties]
  );

  const getContainerWeight = useCallback(
    (name: string) => data.containers.find((c) => c.name === name)?.weight ?? 0,
    [data.containers]
  );
  const getPalletWeight = useCallback(
    (name: string) => data.pallets.find((p) => p.name === name)?.weight ?? 0,
    [data.pallets]
  );

  return (
    <CatalogsContext.Provider
      value={{
        ...data,
        addContainer,
        updateContainer,
        removeContainer,
        addPallet,
        updatePallet,
        removePallet,
        addCaliberGroup,
        renameCaliberGroup,
        removeCaliberGroup,
        addCaliber,
        removeCaliber,
        addVariety,
        removeVariety,
        addCounterparty,
        updateCounterpartyCurrency,
        removeCounterparty,
        getCounterpartyCurrency,
        getContainerWeight,
        getPalletWeight,
      }}
    >
      {children}
    </CatalogsContext.Provider>
  );
};

export const useCatalogs = () => {
  const ctx = useContext(CatalogsContext);
  if (!ctx) throw new Error("useCatalogs must be used within CatalogsProvider");
  return ctx;
};

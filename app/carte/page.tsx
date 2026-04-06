"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import { useAppContext } from "@/lib/contexts/AppContext";
import { EMOJI_MAP } from "@/lib/constants";

const CANTON_COORDS: Record<string, [number, number]> = {
  VD: [46.6, 6.6], GE: [46.2, 6.15], BE: [46.95, 7.45], ZH: [47.37, 8.54],
  FR: [46.8, 7.15], VS: [46.23, 7.36], NE: [47.0, 6.93], TI: [46.2, 8.96],
  BS: [47.56, 7.59], BL: [47.48, 7.73], LU: [47.05, 8.31], SG: [47.42, 9.37],
  AG: [47.39, 8.04], GR: [46.85, 9.53], TG: [47.55, 9.05], SO: [47.2, 7.53],
  SZ: [47.02, 8.65], ZG: [47.17, 8.52], SH: [47.7, 8.64], JU: [47.35, 7.15],
};

function MapInner({ animals, userPos, t }: { animals: any[]; userPos: [number, number] | null; t: any }) {
  const L = require("leaflet");
  const { MapContainer, TileLayer, Marker, Popup } = require("react-leaflet");

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  const offsets = useMemo(() => {
    const map: Record<string, [number, number]> = {};
    animals.forEach(a => { map[a.id] = [(Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05]; });
    return map;
  }, [animals]);

  return (
    <MapContainer center={userPos || [46.8, 7.5]} zoom={8} style={{ width: "100%", height: "100%" }} scrollWheelZoom>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OSM' />
      {animals.map((a: any) => {
        const coords = a.canton ? CANTON_COORDS[a.canton] : null;
        if (!coords) return null;
        const off = offsets[a.id] || [0, 0];
        return (
          <Marker key={a.id} position={[coords[0] + off[0], coords[1] + off[1]]}>
            <Popup>
              <div style={{ textAlign: "center", minWidth: 120 }}>
                {a.photo_url ? <img src={a.photo_url} alt={a.name} style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", margin: "0 auto 4px" }} />
                  : <div style={{ fontSize: 28 }}>{EMOJI_MAP[a.species] || "🐾"}</div>}
                <strong>{a.name}</strong>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{a.breed || a.species}</div>
                <a href={"/animals/" + a.id} style={{ fontSize: 11, color: "#f97316", fontWeight: 700 }}>{t.mapSee}</a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

const MapComponent = dynamic(() => Promise.resolve(MapInner), { ssr: false });

export default function CartePage() {
  const { t } = useAppContext();
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [filter, setFilter] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      let q = supabase.from("animals").select("*").eq("status", "disponible");
      if (filter) q = q.eq("species", filter);
      const { data } = await q;
      setAnimals(data || []);
      setLoading(false);
    }
    load();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => setUserPos([p.coords.latitude, p.coords.longitude]));
    }
  }, [filter]);

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 16px", background: "var(--c-nav)", borderBottom: "1px solid var(--c-border)", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--c-text)" }}>🗺️ {t.mapTitle}</span>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {[{ v: "", l: t.mapAll, e: "🐾" }, { v: "chien", l: t.mapDogs, e: "🐕" }, { v: "chat", l: t.mapCats, e: "🐱" }, { v: "lapin", l: t.mapRabbits, e: "🐰" }].map(s => (
            <button key={s.v} onClick={() => setFilter(s.v)}
              style={{ padding: "4px 10px", borderRadius: 50, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700,
                background: filter === s.v ? "#f97316" : "var(--c-card)", color: filter === s.v ? "#fff" : "var(--c-text-muted)" }}>
              {s.e} {s.l}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {loading ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><span style={{ fontSize: 40 }} className="animate-pulse">🗺️</span></div>
          : <MapComponent animals={animals} userPos={userPos} t={t} />}
      </div>
      <div style={{ padding: "6px 16px", background: "var(--c-nav)", borderTop: "1px solid var(--c-border)", textAlign: "center" }}>
        <span style={{ fontSize: 10, color: "var(--c-text-muted)", fontWeight: 700 }}>🐾 {animals.length} {t.mapCompanions}</span>
      </div>
    </div>
  );
}

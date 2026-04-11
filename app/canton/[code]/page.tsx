import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CANTONS } from "@/lib/cantons";
import BackButton from "@/lib/components/BackButton";

type Props = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const cantonName = CANTONS.find((c) => c.code === code)?.name || code;
  return {
    title: `Rencontres animaux ${cantonName} | Pawly`,
    description: `Trouve des compagnons de balade pour ton animal dans le canton de ${cantonName}. Matching IA, evenements, communaute — 100% gratuit.`,
    openGraph: {
      title: `Animaux a ${cantonName} | Pawly`,
      description: `Decouvre les animaux inscrits dans le canton de ${cantonName} sur Pawly.`,
      url: `https://pawlyapp.ch/canton/${code}`,
    },
  };
}

export function generateStaticParams() {
  return CANTONS.map((c) => ({ code: c.code }));
}

export default async function CantonPage({ params }: Props) {
  const { code } = await params;
  const cantonName = CANTONS.find((c) => c.code === code)?.name || code;
  const supabase = await createClient();

  // Fetch animals in this canton (limit 20)
  const { data: animals } = await supabase
    .from("animals")
    .select("id, name, species, breed, photo_url")
    .eq("canton", code)
    .eq("status", "disponible")
    .order("created_at", { ascending: false })
    .limit(20);

  // Count total animals in this canton
  const { count: totalAnimals } = await supabase
    .from("animals")
    .select("id", { count: "exact", head: true })
    .eq("canton", code)
    .eq("status", "disponible");

  // Fetch upcoming events in this canton
  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_date, location")
    .eq("canton", code)
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(5);

  const EMOJI_MAP: Record<string, string> = {
    chien: "\uD83D\uDC15",
    chat: "\uD83D\uDC31",
    lapin: "\uD83D\uDC30",
    oiseau: "\uD83D\uDC26",
    rongeur: "\uD83D\uDC39",
    autre: "\uD83D\uDC3E",
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 pb-32">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs" style={{ color: "var(--c-text-muted)" }}>
        <Link href="/explore" className="hover:underline">
          Explorer
        </Link>
        <span className="mx-1.5">/</span>
        <span style={{ color: "var(--c-text)" }}>{cantonName}</span>
      </nav>

      {/* H1 */}
      <div className="flex items-center gap-3 mb-4">
        <BackButton fallback="/explore" />
        <h1
          className="text-2xl font-black"
          style={{ color: "var(--c-text)" }}
        >
          Animaux a {cantonName}
        </h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--c-text-muted)" }}>
        Decouvre les compagnons inscrits dans le canton de {cantonName} et
        rejoins la communaute Pawly.
      </p>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <div
          className="flex-1 rounded-2xl p-4 text-center"
          style={{
            background: "var(--c-glass, rgba(255,255,255,0.05))",
            border: "1px solid var(--c-border)",
          }}
        >
          <p
            className="text-2xl font-black"
            style={{
              background: "linear-gradient(135deg, #FBBF24, #FACC15)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {totalAnimals ?? 0}
          </p>
          <p
            className="text-[11px] font-medium"
            style={{ color: "var(--c-text-muted)" }}
          >
            animaux inscrits
          </p>
        </div>
        <div
          className="flex-1 rounded-2xl p-4 text-center"
          style={{
            background: "var(--c-glass, rgba(255,255,255,0.05))",
            border: "1px solid var(--c-border)",
          }}
        >
          <p
            className="text-2xl font-black"
            style={{
              background: "linear-gradient(135deg, #FBBF24, #FACC15)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {events?.length ?? 0}
          </p>
          <p
            className="text-[11px] font-medium"
            style={{ color: "var(--c-text-muted)" }}
          >
            evenements a venir
          </p>
        </div>
      </div>

      {/* Animals Grid */}
      {animals && animals.length > 0 ? (
        <>
          <h2
            className="text-lg font-bold mb-3"
            style={{ color: "var(--c-text)" }}
          >
            Animaux a {cantonName}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            {animals.map((animal) => (
              <Link
                key={animal.id}
                href={`/animals/${animal.id}`}
                className="group"
              >
                <div
                  className="relative rounded-2xl overflow-hidden"
                  style={{ aspectRatio: "3/4" }}
                >
                  {animal.photo_url ? (
                    <Image
                      src={animal.photo_url}
                      alt={animal.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-4xl"
                      style={{ background: "var(--c-glass, rgba(255,255,255,0.08))" }}
                    >
                      {EMOJI_MAP[animal.species] || "\uD83D\uDC3E"}
                    </div>
                  )}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)",
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-bold truncate">
                      {animal.name}
                    </p>
                    <p className="text-white/70 text-[10px] truncate">
                      {animal.breed || animal.species}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-sm">
                    {EMOJI_MAP[animal.species] || "\uD83D\uDC3E"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 mb-8">
          <div className="text-5xl mb-4">{"\uD83D\uDC3E"}</div>
          <p
            className="text-sm mb-2"
            style={{ color: "var(--c-text-muted)" }}
          >
            Aucun animal inscrit dans le canton de {cantonName} pour le moment.
          </p>
          <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
            Sois le premier a inscrire ton compagnon !
          </p>
        </div>
      )}

      {/* Upcoming Events */}
      {events && events.length > 0 && (
        <>
          <h2
            className="text-lg font-bold mb-3"
            style={{ color: "var(--c-text)" }}
          >
            Evenements a venir
          </h2>
          <div className="space-y-2 mb-8">
            {events.map((event) => {
              const date = new Date(event.event_date);
              return (
                <div
                  key={event.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: "var(--c-glass, rgba(255,255,255,0.05))",
                    border: "1px solid var(--c-border)",
                  }}
                >
                  <p
                    className="text-sm font-bold mb-1"
                    style={{ color: "var(--c-text)" }}
                  >
                    {event.title}
                  </p>
                  <div
                    className="flex flex-wrap gap-2 text-[11px]"
                    style={{ color: "var(--c-text-muted)" }}
                  >
                    <span>
                      {"\uD83D\uDCC5"}{" "}
                      {date.toLocaleDateString("fr-CH", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                    <span>
                      {"\uD83D\uDD50"}{" "}
                      {date.toLocaleTimeString("fr-CH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>{"\uD83D\uDCCD"} {event.location}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* CTA */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(34, 197, 94,0.1), rgba(250,204,21,0.1))",
          border: "1px solid var(--c-border)",
        }}
      >
        <h2
          className="text-lg font-bold mb-2"
          style={{ color: "var(--c-text)" }}
        >
          Rejoins la communaute Pawly a {cantonName}
        </h2>
        <p
          className="text-sm mb-4"
          style={{ color: "var(--c-text-muted)" }}
        >
          Inscris ton animal, trouve des compagnons de balade et participe aux
          evenements pres de chez toi.
        </p>
        <Link
          href="/signup"
          className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #FBBF24, #4ADE80)" }}
        >
          Inscris-toi gratuitement
        </Link>
      </div>

      {/* Other cantons */}
      <div className="mt-8">
        <h2
          className="text-sm font-bold mb-3"
          style={{ color: "var(--c-text)" }}
        >
          Autres cantons
        </h2>
        <div className="flex flex-wrap gap-2">
          {CANTONS.filter((c) => c.code !== code).map((canton) => (
            <Link
              key={canton.code}
              href={`/canton/${canton.code}`}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
              style={{
                background: "var(--c-glass, rgba(255,255,255,0.05))",
                border: "1px solid var(--c-border)",
                color: "var(--c-text-muted)",
              }}
            >
              {canton.code} - {canton.name}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import LandingClient from "@/lib/components/LandingClient";

/* ══════════════════════════════════════════
   SSR LANDING PAGE

   This page is a Server Component. Google crawls
   the static HTML below (hero text, features, stats,
   CTAs). The interactive shell (animations, counters,
   spotlight, PromoSection) hydrates on top via
   LandingClient.
   ══════════════════════════════════════════ */

export default function HomePage() {
  return (
    <>
      {/* ──────────────────────────────────────────
          SSR-ONLY: Crawlable content for search engines.
          This content is rendered on the server and visible
          in the initial HTML. Once LandingClient hydrates,
          it takes over the full visual layout. The SSR block
          is visually hidden after hydration via CSS.
          ────────────────────────────────────────── */}
      <div
        className="pawly-ssr-content"
        aria-hidden="false"
      >
        <div className="max-w-4xl mx-auto px-6 py-16">
          {/* Hero */}
          <header className="text-center mb-16">
            <div className="mb-6">
              <Image
                src="/ruby-hero.jpg"
                alt="Ruby — Mascotte Pawly, application de rencontres pour animaux en Suisse"
                width={160}
                height={160}
                className="mx-auto rounded-full"
                style={{ objectFit: "cover" }}
                priority
              />
              <p className="text-xs mt-2" style={{ color: "var(--c-text-muted)" }}>
                Ruby — Mascotte Pawly
              </p>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-3 leading-tight">
              <span className="gradient-text">Transforme ses journées en aventures</span>
            </h1>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4" style={{ color: "var(--c-accent, #f97316)" }}>
              Trouve-lui des copains de balade
            </h2>

            <p className="text-base sm:text-lg max-w-lg mx-auto mb-4 leading-relaxed" style={{ color: "var(--c-text-muted)" }}>
              Pawly connecte les propriétaires d'animaux près de chez toi pour des balades, jeux et rencontres entre compagnons.
            </p>

            <p className="text-sm font-semibold mb-8 max-w-md mx-auto" style={{ color: "var(--c-text)" }}>
              L'app qui gère la santé et la vie de ton animal
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <span className="px-4 py-2 text-xs font-medium rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                🇨🇭 Conçu en Suisse
              </span>
              <span className="px-4 py-2 text-xs font-bold rounded-full" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
                Gratuit pour commencer
              </span>
              <span className="px-4 py-2 text-xs font-medium rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                🔒 Données protégées (nLPD)
              </span>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link href="/signup" className="btn-futuristic neon-orange text-base tracking-wide">
                Commencer gratuitement
              </Link>
            </div>
          </header>

          {/* Stats */}
          <section className="mb-16" aria-label="Statistiques Pawly">
            <div className="flex justify-around items-center gap-4 p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-center">
                <p className="text-3xl font-black" style={{ color: "var(--c-accent, #f97316)" }}>150+</p>
                <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--c-text-muted)" }}>Compagnons</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black" style={{ color: "var(--c-accent, #f97316)" }}>92%</p>
                <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--c-text-muted)" }}>Balades réussies</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black" style={{ color: "var(--c-accent, #f97316)" }}>26</p>
                <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--c-text-muted)" }}>cantons couverts</p>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="mb-16" aria-label="Comment ça marche">
            <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-8" style={{ color: "var(--c-text-muted)" }}>
              Comment ça marche
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 text-center rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-xs font-black tracking-widest" style={{ color: "var(--c-accent, #f97316)" }}>01</span>
                <div className="text-4xl my-4">📝</div>
                <h3 className="font-bold text-lg mb-2">Décris ton compagnon</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--c-text-muted)" }}>
                  Personnalité, énergie, habitudes — un questionnaire fun en 2 minutes
                </p>
              </div>
              <div className="p-6 text-center rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-xs font-black tracking-widest" style={{ color: "var(--c-accent, #f97316)" }}>02</span>
                <div className="text-4xl my-4">🧠</div>
                <h3 className="font-bold text-lg mb-2">Découvre ses copains idéaux</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--c-text-muted)" }}>
                  Notre IA analyse 12 traits pour te proposer les compagnons les plus compatibles près de chez toi
                </p>
              </div>
              <div className="p-6 text-center rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-xs font-black tracking-widest" style={{ color: "var(--c-accent, #f97316)" }}>03</span>
                <div className="text-4xl my-4">🤝</div>
                <h3 className="font-bold text-lg mb-2">Organisez votre balade</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--c-text-muted)" }}>
                  Échangez via le chat, choisissez un lieu et c'est parti pour la première rencontre !
                </p>
              </div>
            </div>
            <div className="text-center mt-8">
              <Link href="/signup" className="btn-futuristic neon-orange">
                Commencer gratuitement
              </Link>
            </div>
          </section>

          {/* Features */}
          <section className="mb-16" aria-label="Fonctionnalités">
            <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-8" style={{ color: "var(--c-text-muted)" }}>
              Tout un univers pour ton animal
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-3xl">💕</span>
                <h3 className="font-bold text-lg mt-3 mb-1" style={{ color: "var(--c-accent, #f97316)" }}>Flairer</h3>
                <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>Swipe et trouve des copains compatibles avec notre IA</p>
              </div>
              <div className="p-6 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-3xl">🎬</span>
                <h3 className="font-bold text-lg mt-3 mb-1" style={{ color: "var(--c-accent, #f97316)" }}>PawReels</h3>
                <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>Partage les meilleurs moments de ton animal en vidéo courte</p>
              </div>
              <div className="p-6 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-3xl">🔍</span>
                <h3 className="font-bold text-lg mt-3 mb-1" style={{ color: "var(--c-accent, #f97316)" }}>Explorer</h3>
                <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>Découvre les animaux les plus populaires et le contenu tendance</p>
              </div>
              <div className="p-6 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-3xl">⭐</span>
                <h3 className="font-bold text-lg mt-3 mb-1" style={{ color: "var(--c-accent, #f97316)" }}>Super Flair</h3>
                <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>Envoie un coup de coeur spécial pour te démarquer</p>
              </div>
              <div className="p-6 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-3xl">🪙</span>
                <h3 className="font-bold text-lg mt-3 mb-1" style={{ color: "var(--c-accent, #f97316)" }}>PawCoins</h3>
                <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>Gagne des coins, boost ton profil et débloque des avantages</p>
              </div>
              <div className="p-6 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-3xl">🏆</span>
                <h3 className="font-bold text-lg mt-3 mb-1" style={{ color: "var(--c-accent, #f97316)" }}>Classement</h3>
                <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>Ton animal peut devenir la star de son canton</p>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="mb-16" aria-label="Témoignages">
            <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-8" style={{ color: "var(--c-text-muted)" }}>
              Ce qu'ils en disent
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex gap-1 mb-3">
                  <span style={{ color: "#F59E0B" }}>★★★★★</span>
                </div>
                <p className="text-sm italic mb-3">
                  &ldquo;Depuis Pawly, mon chien a 3 copains de balade réguliers. Il est tellement plus épanoui !&rdquo;
                </p>
                <p className="text-xs font-bold" style={{ color: "var(--c-accent, #f97316)" }}>Sophie, Lausanne</p>
                <p className="text-[10px]" style={{ color: "var(--c-text-muted)" }}>Avec Kiko, Border Collie</p>
              </div>
              <div className="p-6 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex gap-1 mb-3">
                  <span style={{ color: "#F59E0B" }}>★★★★★</span>
                </div>
                <p className="text-sm italic mb-3">
                  &ldquo;J'ai déménagé à Genève et grâce à Pawly, j'ai trouvé des balades pour mon chat en 2 jours.&rdquo;
                </p>
                <p className="text-xs font-bold" style={{ color: "var(--c-accent, #f97316)" }}>Marc, Genève</p>
                <p className="text-[10px]" style={{ color: "var(--c-text-muted)" }}>Avec Simba, Chat Européen</p>
              </div>
              <div className="p-6 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex gap-1 mb-3">
                  <span style={{ color: "#F59E0B" }}>★★★★★</span>
                </div>
                <p className="text-sm italic mb-3">
                  &ldquo;Le test de personnalité est génial — ça a matché tout de suite avec un Golden du quartier.&rdquo;
                </p>
                <p className="text-xs font-bold" style={{ color: "var(--c-accent, #f97316)" }}>Anna, Zurich</p>
                <p className="text-[10px]" style={{ color: "var(--c-text-muted)" }}>Avec Bella, Labrador</p>
              </div>
            </div>
          </section>

          {/* Why Pawly */}
          <section className="mb-16" aria-label="Pourquoi Pawly">
            <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-8" style={{ color: "var(--c-text-muted)" }}>
              Pourquoi Pawly ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 text-center rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-2xl block mb-2">🔍</span>
                <h3 className="font-bold text-sm mb-1">Google</h3>
                <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>Google vous donne des liens. Pawly vous donne des copains.</p>
              </div>
              <div className="p-5 text-center rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-2xl block mb-2">🤖</span>
                <h3 className="font-bold text-sm mb-1">ChatGPT</h3>
                <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>ChatGPT ne connaît pas votre animal. Pawly, si.</p>
              </div>
              <div className="p-5 text-center rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-2xl block mb-2">🐾</span>
                <h3 className="font-bold text-sm mb-1" style={{ color: "var(--c-accent, #f97316)" }}>Pawly</h3>
                <p className="text-xs font-medium">La seule app suisse dédiée aux rencontres entre animaux</p>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="mb-16 text-center" aria-label="Inscription">
            <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ color: "var(--c-accent, #f97316)" }}>
              Ton compagnon mérite des amis
            </h2>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--c-text-muted)" }}>
              Rejoins les propriétaires qui offrent une vie sociale à leur animal
            </p>
            <Link href="/signup" className="btn-futuristic neon-orange text-base inline-block">
              Trouver un copain de balade 🐾
            </Link>
            <p className="text-[10px] mt-4" style={{ color: "var(--c-text-muted)" }}>
              Gratuit · 3 rencontres offertes · Sans carte de crédit
            </p>
          </section>

          {/* PawDirectory */}
          <section className="mb-12" aria-label="PawDirectory">
            <a href="https://pawdirectory.ch" target="_blank" rel="noopener noreferrer">
              <div className="p-5 flex items-center gap-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-3xl">🏥</div>
                <div>
                  <div className="font-extrabold text-sm">PawDirectory</div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--c-text-muted)" }}>
                    306+ services pour animaux en Suisse
                  </p>
                </div>
              </div>
            </a>
          </section>

          {/* Footer links for crawlers */}
          <footer className="border-t py-6 text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <nav className="flex gap-6 justify-center mb-3">
              <a href="/legal/cgu" className="text-[11px]" style={{ color: "var(--c-text-muted)" }}>CGU</a>
              <a href="/legal/privacy" className="text-[11px]" style={{ color: "var(--c-text-muted)" }}>Politique de confidentialité</a>
              <a href="https://pawdirectory.ch" target="_blank" rel="noopener noreferrer" className="text-[11px]" style={{ color: "var(--c-text-muted)" }}>PawDirectory</a>
            </nav>
            <p className="text-[10px]" style={{ color: "var(--c-text-muted)", opacity: 0.6 }}>
              © 2026 Pawly · Canton de Vaud, Suisse
            </p>
          </footer>
        </div>
      </div>

      {/* ──────────────────────────────────────────
          CLIENT INTERACTIVE SHELL
          Once this hydrates, it renders the full landing
          page with animations, counters, spotlight, etc.
          A small CSS rule hides the SSR block once JS loads.
          ────────────────────────────────────────── */}
      <Suspense fallback={null}>
        <LandingClient />
      </Suspense>
    </>
  );
}

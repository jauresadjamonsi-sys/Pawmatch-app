import BackButton from "@/lib/components/BackButton";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 md:px-6 py-8 pb-28">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <BackButton fallback="/feed" />
          <h1 className="text-3xl font-bold text-[var(--c-text)]">Politique de Confidentialité</h1>
        </div>
        <p className="text-[var(--c-text-muted)] text-sm mb-8">Dernière mise à jour : 1er avril 2026</p>
        <div className="space-y-6 text-[var(--c-text-muted)] text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">1. Responsable</h2>
            <p>Pawly, Canton de Vaud, Suisse. Conforme à la LPD suisse et au RGPD.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">2. Données collectées</h2>
            <p>Données d'inscription : nom, email, téléphone, ville. Données animaux : nom, espèce, race, age, photos, traits. Données techniques : adresse IP, navigateur.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">3. Finalités</h2>
            <p>Fourniture du service, gestion des comptes et abonnements, sécurité, amélioration du service par analyse anonymisée.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">4. Partage</h2>
            <p>Vos données ne sont jamais vendues. Elles sont partagées avec : Supabase (base de données), Stripe (paiements), Vercel (hébergement), Google (authentification OAuth).</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">5. Conservation</h2>
            <p>Données conservées tant que le compte est actif. Suppression sous 30 jours après fermeture du compte. Données de facturation conservées 10 ans.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">6. Vos droits</h2>
            <p>Droit d'accès, de rectification, d'effacement, de portabilité et d'opposition. Contactez contact@pawlyapp.ch. Réponse sous 30 jours.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">7. Sécurité</h2>
            <p>Chiffrement TLS/SSL, authentification sécurisée, contrôle d'accès RLS, stockage sécurisé des mots de passe.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">8. Cookies</h2>
            <p>Uniquement des cookies nécessaires au fonctionnement. Aucun cookie publicitaire ou de suivi.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">9. Autorité de surveillance</h2>
            <p>Préposé fédéral à la protection des données (PFPDT), Feldeggweg 1, 3003 Berne, Suisse.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">10. Contact</h2>
            <p>contact@pawlyapp.ch</p>
          </section>
        </div>
      </div>
    </div>
  );
}

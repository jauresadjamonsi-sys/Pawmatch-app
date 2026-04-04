export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Politique de Confidentialité</h1>
        <p className="text-gray-500 text-sm mb-8">Dernière mise à jour : 1er avril 2026</p>
        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Responsable</h2>
            <p>Pawly, Canton de Vaud, Suisse. Conforme a la LPD suisse et au RGPD.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Données collectées</h2>
            <p>Données d'inscription : nom, email, telephone, ville. Données animaux : nom, espece, race, age, photos, traits. Données techniques : adresse IP, navigateur.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Finalités</h2>
            <p>Fourniture du service, gestion des comptes et abonnements, securite, amélioration du service par analyse anonymisee.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Partage</h2>
            <p>Vos donnees ne sont jamais vendues. Elles sont partagees avec : Supabase (base de donnees), Stripe (paiements), Vercel (hebergement), Google (authentification OAuth).</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Conservation</h2>
            <p>Données conservées tant que le compte est actif. Suppression sous 30 jours après fermeture du compte. Données de facturation conservées 10 ans.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Vos droits</h2>
            <p>Droit d'accès, de rectification, d'effacement, de portabilité et d'opposition. Contactez privacy@pawly.ch. Réponse sous 30 jours.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Securite</h2>
            <p>Chiffrement TLS/SSL, authentification securisee, controle d acces RLS, stockage securise des mots de passe.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Cookies</h2>
            <p>Uniquement des cookies necessaires au fonctionnement. Aucun cookie publicitaire ou de suivi.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Autorite de surveillance</h2>
            <p>Prepose federal a la protection des donnees (PFPDT), Feldeggweg 1, 3003 Berne, Suisse.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Contact</h2>
            <p>privacy@pawly.ch</p>
          </section>
        </div>
      </div>
    </div>
  );
}

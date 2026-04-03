export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Politique de Confidentialite</h1>
        <p className="text-gray-500 text-sm mb-8">Derniere mise a jour : 1er avril 2026</p>
        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Responsable</h2>
            <p>Pawly, Canton de Vaud, Suisse. Conforme a la LPD suisse et au RGPD.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Donnees collectees</h2>
            <p>Donnees d inscription : nom, email, telephone, ville. Donnees animaux : nom, espece, race, age, photos, traits. Donnees techniques : adresse IP, navigateur.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Finalites</h2>
            <p>Fourniture du service, gestion des comptes et abonnements, securite, amelioration du service par analyse anonymisee.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Partage</h2>
            <p>Vos donnees ne sont jamais vendues. Elles sont partagees avec : Supabase (base de donnees), Stripe (paiements), Vercel (hebergement), Google (authentification OAuth).</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Conservation</h2>
            <p>Donnees conservees tant que le compte est actif. Suppression sous 30 jours apres fermeture du compte. Donnees de facturation conservees 10 ans.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Vos droits</h2>
            <p>Droit d acces, de rectification, d effacement, de portabilite, d opposition. Contactez privacy@pawly.ch. Reponse sous 30 jours.</p>
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

export default function CGUPage() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Conditions Generales d Utilisation</h1>
        <p className="text-gray-500 text-sm mb-8">Derniere mise a jour : 1er avril 2026</p>
        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Objet</h2>
            <p>Les presentes CGU regissent l utilisation de Compaw, plateforme de mise en relation entre proprietaires d animaux en Suisse, editee par Compaw, Canton de Vaud, Suisse.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Acceptation</h2>
            <p>L inscription implique l acceptation pleine des presentes CGU.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Inscription</h2>
            <p>L utilisateur doit fournir des informations exactes, etre age d au moins 18 ans, et ne posseder qu un seul compte.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Services</h2>
            <p>Compaw propose la creation de profils animaux, un systeme de matching, une messagerie entre utilisateurs matches, un catalogue avec filtres, et des abonnements premium.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Abonnements</h2>
            <p>Trois niveaux : Paw (gratuit), PawPlus (CHF 4.90/mois), PawPro (CHF 9.90/mois). Paiements via Stripe. Renouvellement automatique, annulable a tout moment.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Obligations</h2>
            <p>L utilisateur s engage a fournir des informations exactes, ne pas publier de contenu illicite, respecter les autres utilisateurs et leurs animaux.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Responsabilite</h2>
            <p>Compaw est un service de mise en relation et ne peut etre tenu responsable des interactions entre utilisateurs ni des dommages lors de rencontres.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Moderation</h2>
            <p>Compaw se reserve le droit de suspendre tout compte en cas de violation des CGU.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Droit applicable</h2>
            <p>Les presentes CGU sont regies par le droit suisse. Juridiction competente : Canton de Vaud.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Contact</h2>
            <p>contact@compaw.ch</p>
          </section>
        </div>
      </div>
    </div>
  );
}

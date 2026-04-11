import BackButton from "@/lib/components/BackButton";

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen px-4 md:px-6 py-8 pb-28" style={{ background: "var(--c-bg)", color: "var(--c-text)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <BackButton fallback="/feed" />
          <h1 className="text-3xl font-bold" style={{ color: "var(--c-text)" }}>Mentions Legales / Impressum</h1>
        </div>
        <p style={{ color: "var(--c-text-muted)" }} className="text-sm mb-8">Derniere mise a jour : 7 avril 2026</p>
        <div className="space-y-6 text-sm leading-relaxed" style={{ color: "var(--c-text-muted)" }}>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--c-text)" }}>1. Editeur du site</h2>
            <p><strong>Raison sociale :</strong> PawBand</p>
            <p><strong>Forme juridique :</strong> Entreprise individuelle</p>
            <p><strong>Siege social :</strong> Canton de Vaud, Suisse</p>
            <p><strong>Email :</strong> contact@pawband.ch</p>
            <p><strong>Site web :</strong> https://pawband.ch</p>
            <p><strong>Responsable de la publication :</strong> Jaures Adjamonsi</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--c-text)" }}>2. Hebergement</h2>
            <p><strong>Hebergeur :</strong> Vercel Inc.</p>
            <p><strong>Adresse :</strong> 440 N Barranca Ave #4133, Covina, CA 91723, USA</p>
            <p><strong>Site web :</strong> https://vercel.com</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--c-text)" }}>3. Base de donnees</h2>
            <p><strong>Fournisseur :</strong> Supabase Inc.</p>
            <p><strong>Localisation des donnees :</strong> Union Europeenne (Allemagne)</p>
            <p><strong>Site web :</strong> https://supabase.com</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--c-text)" }}>4. Paiements</h2>
            <p><strong>Fournisseur :</strong> Stripe Payments Europe Ltd.</p>
            <p><strong>Adresse :</strong> 1 Grand Canal Street Lower, Dublin 2, Irlande</p>
            <p><strong>Site web :</strong> https://stripe.com</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--c-text)" }}>5. Protection des donnees</h2>
            <p>Le traitement des donnees personnelles est conforme a :</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>La nouvelle Loi federale sur la protection des donnees (nLPD), en vigueur depuis le 1er septembre 2023</li>
              <li>L&apos;Ordonnance sur la protection des donnees (OPDo)</li>
              <li>Le Reglement general sur la protection des donnees (RGPD/GDPR) de l&apos;UE</li>
            </ul>
            <p className="mt-3"><strong>Autorite de surveillance :</strong> Prpose federal a la protection des donnees et a la transparence (PFPDT)</p>
            <p>Feldeggweg 1, 3003 Berne, Suisse</p>
            <p>https://www.edoeb.admin.ch</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--c-text)" }}>6. Propriete intellectuelle</h2>
            <p>L&apos;ensemble du contenu du site PawBand (textes, images, logos, code source, design) est protege par le droit d&apos;auteur suisse (LDA). Toute reproduction, meme partielle, sans autorisation ecrite prealable est interdite.</p>
            <p className="mt-2">Les marques PawBand et PawDirectory sont la propriete de leur editeur.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--c-text)" }}>7. Responsabilite</h2>
            <p>PawBand s&apos;efforce de fournir des informations exactes et a jour. Toutefois, aucune garantie n&apos;est donnee quant a l&apos;exactitude ou l&apos;exhaustivite des informations. PawBand ne peut etre tenu responsable des dommages directs ou indirects resultant de l&apos;utilisation du site.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--c-text)" }}>8. Droit applicable et for juridique</h2>
            <p>Les presentes mentions legales sont regies par le droit suisse. En cas de litige, le for juridique exclusif est le Canton de Vaud, Suisse.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--c-text)" }}>9. Contact</h2>
            <p>Pour toute question : <a href="mailto:contact@pawband.ch" className="underline" style={{ color: "var(--c-accent, #FBBF24)" }}>contact@pawband.ch</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}

import BackButton from "@/lib/components/BackButton";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 md:px-6 py-8 pb-28">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <BackButton fallback="/feed" />
          <h1 className="text-3xl font-bold text-[var(--c-text)]">Politique de Confidentialit&eacute;</h1>
        </div>
        <p className="text-[var(--c-text-muted)] text-sm mb-8">Derni&egrave;re mise &agrave; jour : 11 avril 2026</p>
        <div className="space-y-6 text-[var(--c-text-muted)] text-sm leading-relaxed">

          {/* 1. Responsable */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">1. Responsable du traitement</h2>
            <p><strong>Pawband</strong></p>
            <p>Canton de Vaud, Suisse</p>
            <p>Email : <a href="mailto:contact@pawlyapp.ch" className="underline text-[var(--c-accent,#FBBF24)]">contact@pawlyapp.ch</a></p>
            <p>Site web : <a href="https://pawlyapp.ch" className="underline text-[var(--c-accent,#FBBF24)]">https://pawlyapp.ch</a></p>
            <p className="mt-2">La pr&eacute;sente politique est conforme &agrave; la Loi f&eacute;d&eacute;rale sur la protection des donn&eacute;es (nLPD), &agrave; l&apos;Ordonnance sur la protection des donn&eacute;es (OPDo) et au R&egrave;glement g&eacute;n&eacute;ral sur la protection des donn&eacute;es (RGPD) de l&apos;UE.</p>
          </section>

          {/* 2. Donnees collectees */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">2. Donn&eacute;es collect&eacute;es</h2>
            <p className="mb-2">Nous collectons les cat&eacute;gories de donn&eacute;es suivantes :</p>

            <h3 className="font-semibold text-[var(--c-text)] mt-3 mb-1">a) Donn&eacute;es d&apos;inscription</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>Nom, pr&eacute;nom, adresse email</li>
              <li>Num&eacute;ro de t&eacute;l&eacute;phone (optionnel)</li>
              <li>Ville et canton de r&eacute;sidence</li>
              <li>Photo de profil (optionnel)</li>
              <li>Donn&eacute;es d&apos;authentification (via email/mot de passe ou OAuth Google/Apple)</li>
            </ul>

            <h3 className="font-semibold text-[var(--c-text)] mt-3 mb-1">b) Donn&eacute;es des animaux</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>Nom, esp&egrave;ce, race, &acirc;ge, sexe</li>
              <li>Photos et vid&eacute;os</li>
              <li>Traits de caract&egrave;re et pr&eacute;f&eacute;rences</li>
              <li>Informations de sant&eacute; (vaccination, st&eacute;rilisation - optionnel)</li>
            </ul>

            <h3 className="font-semibold text-[var(--c-text)] mt-3 mb-1">c) Donn&eacute;es d&apos;utilisation</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>Interactions (likes, matchs, messages)</li>
              <li>Contenu publi&eacute; (PawReels, Stories, publications)</li>
              <li>PawScore et PawCoins</li>
              <li>Historique de navigation dans l&apos;application</li>
            </ul>

            <h3 className="font-semibold text-[var(--c-text)] mt-3 mb-1">d) Donn&eacute;es de localisation</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>Localisation approximative (canton, ville) pour le matching et la carte interactive</li>
              <li>Localisation pr&eacute;cise uniquement si vous l&apos;autorisez explicitement (pour les fonctionnalit&eacute;s de proximit&eacute;)</li>
            </ul>

            <h3 className="font-semibold text-[var(--c-text)] mt-3 mb-1">e) Donn&eacute;es techniques</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>Adresse IP, type de navigateur, syst&egrave;me d&apos;exploitation</li>
              <li>Identifiant de l&apos;appareil (pour les notifications push)</li>
              <li>Journaux d&apos;acc&egrave;s et d&apos;erreurs</li>
            </ul>

            <h3 className="font-semibold text-[var(--c-text)] mt-3 mb-1">f) Donn&eacute;es de paiement</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>Les informations de paiement (carte bancaire) sont trait&eacute;es directement par Stripe et ne sont jamais stock&eacute;es sur nos serveurs</li>
              <li>Nous conservons uniquement l&apos;identifiant client Stripe et l&apos;historique des transactions</li>
            </ul>
          </section>

          {/* 3. Finalites */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">3. Finalit&eacute;s du traitement</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Fourniture du service :</strong> cr&eacute;ation de profils, matching IA, messagerie, publication de contenu</li>
              <li><strong>Gestion des comptes :</strong> inscription, authentification, gestion des abonnements</li>
              <li><strong>Am&eacute;lioration du service :</strong> analyse anonymis&eacute;e de l&apos;utilisation, optimisation de l&apos;algorithme de matching</li>
              <li><strong>S&eacute;curit&eacute; :</strong> pr&eacute;vention des fraudes, mod&eacute;ration du contenu, protection des utilisateurs</li>
              <li><strong>Communication :</strong> notifications push, emails de service (confirmations, alertes de s&eacute;curit&eacute;)</li>
              <li><strong>Obligations l&eacute;gales :</strong> conformit&eacute; fiscale et comptable</li>
            </ul>
          </section>

          {/* 4. Base legale */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">4. Base l&eacute;gale du traitement</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Ex&eacute;cution du contrat :</strong> traitement n&eacute;cessaire &agrave; la fourniture du service (art. 6 par. 1 let. b RGPD)</li>
              <li><strong>Consentement :</strong> pour les donn&eacute;es de localisation pr&eacute;cise, les notifications push et les communications marketing (art. 6 par. 1 let. a RGPD)</li>
              <li><strong>Int&eacute;r&ecirc;t l&eacute;gitime :</strong> s&eacute;curit&eacute;, am&eacute;lioration du service, pr&eacute;vention des abus (art. 6 par. 1 let. f RGPD)</li>
              <li><strong>Obligation l&eacute;gale :</strong> conservation des donn&eacute;es de facturation (art. 6 par. 1 let. c RGPD)</li>
            </ul>
          </section>

          {/* 5. Partage */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">5. Partage des donn&eacute;es</h2>
            <p className="mb-2"><strong>Vos donn&eacute;es ne sont jamais vendues.</strong> Elles peuvent &ecirc;tre partag&eacute;es avec les prestataires suivants, strictement n&eacute;cessaires au fonctionnement du service :</p>
            <ul className="list-disc ml-5 space-y-2">
              <li><strong>Supabase Inc.</strong> (base de donn&eacute;es, authentification) — Donn&eacute;es h&eacute;berg&eacute;es en UE (Allemagne)</li>
              <li><strong>Vercel Inc.</strong> (h&eacute;bergement web) — USA, conforme aux clauses contractuelles types (CCT)</li>
              <li><strong>Stripe Payments Europe Ltd.</strong> (paiements) — Irlande/UE</li>
              <li><strong>Google LLC</strong> (authentification OAuth, si utilis&eacute;e) — USA, conforme aux CCT</li>
              <li><strong>Apple Inc.</strong> (authentification Sign in with Apple, si utilis&eacute;e) — USA</li>
            </ul>
            <p className="mt-2">Nous ne partageons pas vos donn&eacute;es avec des annonceurs ou des tiers &agrave; des fins publicitaires.</p>
          </section>

          {/* 6. Transferts internationaux */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">6. Transferts internationaux de donn&eacute;es</h2>
            <p>Certaines donn&eacute;es peuvent &ecirc;tre transf&eacute;r&eacute;es vers les &Eacute;tats-Unis (Vercel, Google, Apple). Ces transferts sont encadr&eacute;s par :</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Des clauses contractuelles types (CCT) approuv&eacute;es par la Commission europ&eacute;enne</li>
              <li>Le Data Privacy Framework (DPF) UE-USA lorsque applicable</li>
              <li>La reconnaissance d&apos;ad&eacute;quation par le PFPDT pour les pays concern&eacute;s</li>
            </ul>
          </section>

          {/* 7. Conservation */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">7. Dur&eacute;e de conservation</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Donn&eacute;es de compte :</strong> conserv&eacute;es tant que le compte est actif</li>
              <li><strong>Apr&egrave;s suppression du compte :</strong> donn&eacute;es supprim&eacute;es sous 30 jours</li>
              <li><strong>Donn&eacute;es de facturation :</strong> conserv&eacute;es 10 ans (obligation l&eacute;gale suisse)</li>
              <li><strong>Journaux techniques :</strong> conserv&eacute;s 90 jours maximum</li>
              <li><strong>Messages :</strong> supprim&eacute;s avec le compte, ou sur demande</li>
              <li><strong>Contenu publi&eacute; (Reels, Stories) :</strong> supprim&eacute; avec le compte</li>
            </ul>
          </section>

          {/* 8. Droits des utilisateurs */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">8. Vos droits</h2>
            <p className="mb-2">Conform&eacute;ment &agrave; la nLPD et au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Droit d&apos;acc&egrave;s :</strong> obtenir une copie de vos donn&eacute;es personnelles</li>
              <li><strong>Droit de rectification :</strong> corriger des donn&eacute;es inexactes</li>
              <li><strong>Droit d&apos;effacement :</strong> demander la suppression de vos donn&eacute;es</li>
              <li><strong>Droit &agrave; la portabilit&eacute; :</strong> recevoir vos donn&eacute;es dans un format structur&eacute;</li>
              <li><strong>Droit d&apos;opposition :</strong> vous opposer au traitement de vos donn&eacute;es</li>
              <li><strong>Droit &agrave; la limitation :</strong> restreindre le traitement dans certains cas</li>
              <li><strong>Retrait du consentement :</strong> retirer votre consentement &agrave; tout moment pour les traitements bas&eacute;s sur le consentement</li>
            </ul>
            <p className="mt-2">Pour exercer vos droits, contactez-nous &agrave; <a href="mailto:contact@pawlyapp.ch" className="underline text-[var(--c-accent,#FBBF24)]">contact@pawlyapp.ch</a>. Nous r&eacute;pondons sous 30 jours.</p>
            <p className="mt-1">Vous pouvez &eacute;galement supprimer votre compte directement depuis les param&egrave;tres de l&apos;application.</p>
          </section>

          {/* 9. Securite */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">9. S&eacute;curit&eacute; des donn&eacute;es</h2>
            <p className="mb-2">Nous mettons en oeuvre les mesures suivantes pour prot&eacute;ger vos donn&eacute;es :</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Chiffrement TLS/SSL pour toutes les communications</li>
              <li>Authentification s&eacute;curis&eacute;e (hachage des mots de passe, OAuth 2.0)</li>
              <li>Contr&ocirc;le d&apos;acc&egrave;s au niveau des lignes (Row Level Security - RLS)</li>
              <li>Audits r&eacute;guliers de s&eacute;curit&eacute;</li>
              <li>Acc&egrave;s restreint aux donn&eacute;es pour le personnel autoris&eacute;</li>
            </ul>
          </section>

          {/* 10. Cookies */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">10. Cookies et technologies similaires</h2>
            <p>Pawband utilise uniquement des cookies strictement n&eacute;cessaires au fonctionnement du service :</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>Cookies de session :</strong> maintien de votre connexion</li>
              <li><strong>Cookies de pr&eacute;f&eacute;rences :</strong> langue, th&egrave;me</li>
            </ul>
            <p className="mt-2">Nous n&apos;utilisons <strong>aucun cookie publicitaire, de suivi ou d&apos;analyse tiers</strong>.</p>
          </section>

          {/* 11. Permissions de l'appareil */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">11. Permissions de l&apos;appareil</h2>
            <p className="mb-2">L&apos;application peut demander les permissions suivantes :</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Cam&eacute;ra :</strong> pour prendre des photos/vid&eacute;os de vos animaux (PawReels, Stories)</li>
              <li><strong>Galerie photos :</strong> pour s&eacute;lectionner des photos existantes</li>
              <li><strong>Localisation :</strong> pour la carte interactive et le matching de proximit&eacute;</li>
              <li><strong>Notifications :</strong> pour les alertes de matchs, messages et &eacute;v&eacute;nements</li>
            </ul>
            <p className="mt-2">Chaque permission est demand&eacute;e individuellement et peut &ecirc;tre r&eacute;voqu&eacute;e &agrave; tout moment dans les param&egrave;tres de votre appareil.</p>
          </section>

          {/* 12. Enfants */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">12. Protection des mineurs</h2>
            <p>Pawband est destin&eacute; aux personnes &acirc;g&eacute;es de 18 ans ou plus. Nous ne collectons pas sciemment de donn&eacute;es de mineurs. Si nous d&eacute;couvrons qu&apos;un mineur a cr&eacute;&eacute; un compte, celui-ci sera supprim&eacute; imm&eacute;diatement. Si vous &ecirc;tes parent et pensez que votre enfant utilise Pawband, contactez-nous &agrave; <a href="mailto:contact@pawlyapp.ch" className="underline text-[var(--c-accent,#FBBF24)]">contact@pawlyapp.ch</a>.</p>
          </section>

          {/* 13. Notifications push */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">13. Notifications push</h2>
            <p>Avec votre consentement, nous envoyons des notifications push pour :</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Nouveaux matchs et messages re&ccedil;us</li>
              <li>&Eacute;v&eacute;nements &agrave; proximit&eacute;</li>
              <li>D&eacute;fis quotidiens et r&eacute;compenses</li>
              <li>Alertes de s&eacute;curit&eacute; du compte</li>
            </ul>
            <p className="mt-2">Vous pouvez d&eacute;sactiver les notifications &agrave; tout moment dans les param&egrave;tres de l&apos;application ou de votre appareil.</p>
          </section>

          {/* 14. Achats integres */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">14. Achats int&eacute;gr&eacute;s</h2>
            <p>Pawband propose des abonnements premium (PawPlus, PawPro) et des achats de PawCoins. Les paiements sont trait&eacute;s par Stripe (web) ou via les syst&egrave;mes d&apos;achat int&eacute;gr&eacute; d&apos;Apple et Google (mobile). Nous ne stockons aucune donn&eacute;e de carte bancaire.</p>
          </section>

          {/* 15. Modifications */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">15. Modifications de la politique</h2>
            <p>Nous nous r&eacute;servons le droit de modifier cette politique. En cas de changement substantiel, nous vous informerons par notification dans l&apos;application et/ou par email. La date de derni&egrave;re mise &agrave; jour est indiqu&eacute;e en haut de cette page.</p>
          </section>

          {/* 16. Autorite de surveillance */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">16. Autorit&eacute; de surveillance</h2>
            <p>Si vous estimez que le traitement de vos donn&eacute;es viole vos droits, vous pouvez d&eacute;poser une plainte aupr&egrave;s de :</p>
            <p className="mt-2"><strong>Pr&eacute;pos&eacute; f&eacute;d&eacute;ral &agrave; la protection des donn&eacute;es et &agrave; la transparence (PFPDT)</strong></p>
            <p>Feldeggweg 1, 3003 Berne, Suisse</p>
            <p><a href="https://www.edoeb.admin.ch" className="underline text-[var(--c-accent,#FBBF24)]" target="_blank" rel="noopener noreferrer">www.edoeb.admin.ch</a></p>
          </section>

          {/* 17. Contact */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--c-text)] mb-2">17. Contact</h2>
            <p>Pour toute question concernant cette politique de confidentialit&eacute; ou le traitement de vos donn&eacute;es :</p>
            <p className="mt-2"><strong>Pawband</strong></p>
            <p>Email : <a href="mailto:contact@pawlyapp.ch" className="underline text-[var(--c-accent,#FBBF24)]">contact@pawlyapp.ch</a></p>
            <p>Site web : <a href="https://pawlyapp.ch" className="underline text-[var(--c-accent,#FBBF24)]">https://pawlyapp.ch</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}

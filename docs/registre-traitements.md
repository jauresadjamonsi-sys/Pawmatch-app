# Registre des activites de traitement des donnees personnelles

**Conforme a l'art. 12 nLPD (Suisse) et art. 30 RGPD (UE)**

**Responsable du traitement :** PawBand / PawDirectory
**Represente par :** Jaures Adjamonsi
**Siege :** Canton de Vaud, Suisse
**Contact :** contact@pawband.ch
**Date de creation :** 7 avril 2026
**Derniere mise a jour :** 7 avril 2026

---

## 1. PAWLY (pawband.ch)

### 1.1 Inscription et gestion des comptes

| Champ | Detail |
|-------|--------|
| **Finalite** | Creation et gestion des comptes utilisateurs |
| **Base legale** | Consentement (art. 6.1.a RGPD), execution du contrat (art. 6.1.b) |
| **Categories de personnes** | Utilisateurs inscrits (18+ ans) |
| **Donnees collectees** | Nom complet, adresse email, mot de passe (hashe), telephone (optionnel), ville, canton, photo de profil |
| **Source** | Saisie directe par l'utilisateur ou Google OAuth |
| **Destinataires** | Supabase (stockage), Google (OAuth) |
| **Transfert hors Suisse** | Supabase : UE (Allemagne) — clausules contractuelles types. Google : USA — DPF certifie |
| **Duree de conservation** | Tant que le compte est actif. Suppression sous 30 jours apres demande de cloture |
| **Mesures de securite** | TLS/SSL, mots de passe hashes (bcrypt), RLS Supabase, tokens JWT |

### 1.2 Profils animaux

| Champ | Detail |
|-------|--------|
| **Finalite** | Creation de profils animaux pour le matching et la mise en relation |
| **Base legale** | Execution du contrat (art. 6.1.b RGPD) |
| **Categories de personnes** | Proprietaires d'animaux inscrits |
| **Donnees collectees** | Nom de l'animal, espece, race, age, genre, poids, ville, canton, description, photo(s), traits de personnalite, statut vaccinal, sterilisation, alimentation, allergies |
| **Source** | Saisie directe par le proprietaire |
| **Destinataires** | Supabase (BDD), Supabase Storage (photos) |
| **Transfert hors Suisse** | Supabase : UE (Allemagne) |
| **Duree de conservation** | Tant que le profil animal existe. Suppression en cascade avec le compte |
| **Mesures de securite** | RLS (seul le proprietaire peut modifier), stockage chiffre |

### 1.3 Matching et messagerie

| Champ | Detail |
|-------|--------|
| **Finalite** | Mise en relation entre proprietaires d'animaux compatibles |
| **Base legale** | Execution du contrat (art. 6.1.b RGPD) |
| **Categories de personnes** | Utilisateurs actifs dans le systeme de matching |
| **Donnees collectees** | Likes/passes (anonymises), matchs mutuels, messages texte, horodatages |
| **Source** | Interactions utilisateur (swipe, messages) |
| **Destinataires** | Supabase (stockage) |
| **Transfert hors Suisse** | Supabase : UE (Allemagne) |
| **Duree de conservation** | Tant que le match existe. Messages supprimes avec le compte |
| **Mesures de securite** | RLS (seuls les participants au match ont acces), chiffrement en transit |

### 1.4 Abonnements et paiements

| Champ | Detail |
|-------|--------|
| **Finalite** | Gestion des abonnements Premium et Pro |
| **Base legale** | Execution du contrat (art. 6.1.b RGPD), obligation legale (art. 6.1.c pour facturation) |
| **Categories de personnes** | Utilisateurs payants |
| **Donnees collectees** | Plan souscrit, dates de debut/fin, ID client Stripe, statut du paiement |
| **Source** | Stripe Checkout, webhooks Stripe |
| **Destinataires** | Stripe (paiement), Supabase (statut de l'abonnement) |
| **Transfert hors Suisse** | Stripe : Irlande (UE). Donnees bancaires traitees exclusivement par Stripe |
| **Duree de conservation** | 10 ans apres la derniere transaction (obligation legale suisse) |
| **Mesures de securite** | PCI-DSS Level 1 (Stripe), aucune donnee bancaire stockee par PawBand |

### 1.5 Geolocalisation

| Champ | Detail |
|-------|--------|
| **Finalite** | Affichage de la carte des animaux, detection du canton |
| **Base legale** | Consentement explicite (permission navigateur) |
| **Categories de personnes** | Utilisateurs qui activent la geolocalisation |
| **Donnees collectees** | Coordonnees GPS (latitude, longitude) — non stockees en base |
| **Source** | API Geolocation du navigateur |
| **Destinataires** | Aucun — traitement local uniquement |
| **Transfert hors Suisse** | Aucun |
| **Duree de conservation** | Session uniquement (pas de stockage persistant) |
| **Mesures de securite** | Consentement obligatoire, donnees non transmises au serveur |

### 1.6 Donnees techniques (logs)

| Champ | Detail |
|-------|--------|
| **Finalite** | Securite, debug, amelioration du service |
| **Base legale** | Interet legitime (art. 6.1.f RGPD) |
| **Categories de personnes** | Tous les visiteurs |
| **Donnees collectees** | Adresse IP, user-agent, pages visitees, horodatages |
| **Source** | Serveur web (Vercel), Supabase |
| **Destinataires** | Vercel (logs), Supabase (auth logs) |
| **Transfert hors Suisse** | Vercel : USA (certifie DPF). Supabase : UE |
| **Duree de conservation** | 90 jours (Vercel), 30 jours (Supabase auth logs) |
| **Mesures de securite** | Acces restreint, retention limitee |

### 1.7 Cookies

| Champ | Detail |
|-------|--------|
| **Finalite** | Fonctionnement du site (session, preferences) |
| **Base legale** | Interet legitime / cookies strictement necessaires (exemptes de consentement) |
| **Categories de personnes** | Tous les visiteurs |
| **Donnees collectees** | Token de session Supabase, preference de theme, preference de langue, consentement cookies |
| **Source** | Navigateur client |
| **Destinataires** | Aucun tiers |
| **Duree de conservation** | Session (token auth), 1 an (preferences) |
| **Mesures de securite** | HttpOnly, Secure, SameSite=Lax |

---

## 2. PAWDIRECTORY (pawdirectory.ch)

### 2.1 Comptes professionnels

| Champ | Detail |
|-------|--------|
| **Finalite** | Gestion des comptes professionnels pour l'annuaire |
| **Base legale** | Execution du contrat (art. 6.1.b RGPD) |
| **Categories de personnes** | Professionnels animaliers inscrits |
| **Donnees collectees** | Nom, email, telephone, nom de l'etablissement, adresse, categorie, description, horaires, site web, photo |
| **Source** | Saisie directe, Google OAuth |
| **Destinataires** | Supabase (stockage), Google (OAuth) |
| **Transfert hors Suisse** | Supabase : UE (Allemagne), Google : USA (DPF) |
| **Duree de conservation** | Tant que le compte est actif. 30 jours apres demande de suppression |
| **Mesures de securite** | TLS/SSL, RLS, authentification securisee |

### 2.2 Annuaire public

| Champ | Detail |
|-------|--------|
| **Finalite** | Affichage des services animaliers pour le public |
| **Base legale** | Interet legitime (annuaire public), consentement du professionnel |
| **Categories de personnes** | Etablissements animaliers references |
| **Donnees collectees** | Nom, adresse, telephone, email, categorie, description, horaires, coordonnees GPS, photos |
| **Source** | Import automatise (Google Places API), saisie manuelle par le professionnel |
| **Destinataires** | Public (affichage sur le site), Google Places (enrichissement) |
| **Transfert hors Suisse** | Google Places API : USA (DPF certifie) |
| **Duree de conservation** | Tant que l'etablissement est reference. Suppression sur demande |
| **Mesures de securite** | Donnees publiques par nature. Validation avant publication |

### 2.3 Avis et evaluations

| Champ | Detail |
|-------|--------|
| **Finalite** | Systeme d'avis pour aider les proprietaires d'animaux |
| **Base legale** | Interet legitime (transparence), consentement de l'auteur |
| **Categories de personnes** | Utilisateurs inscrits qui laissent un avis |
| **Donnees collectees** | Nom de l'auteur, note (1-5), commentaire, date |
| **Source** | Saisie directe par l'utilisateur |
| **Destinataires** | Public (affichage), professionnel concerne |
| **Transfert hors Suisse** | Supabase : UE (Allemagne) |
| **Duree de conservation** | Tant que l'avis est publie. Suppression sur demande |
| **Mesures de securite** | Moderation, signalement d'abus |

### 2.4 Abonnements professionnels

| Champ | Detail |
|-------|--------|
| **Finalite** | Gestion des abonnements Premium et Pro pour les professionnels |
| **Base legale** | Execution du contrat (art. 6.1.b) |
| **Categories de personnes** | Professionnels payants |
| **Donnees collectees** | Plan souscrit, dates, ID client Stripe, statut |
| **Source** | Stripe Checkout |
| **Destinataires** | Stripe (paiement), Supabase (statut) |
| **Transfert hors Suisse** | Stripe : Irlande (UE) |
| **Duree de conservation** | 10 ans (obligation legale) |
| **Mesures de securite** | PCI-DSS Level 1 (Stripe) |

### 2.5 Publicite (Google AdSense)

| Champ | Detail |
|-------|--------|
| **Finalite** | Monetisation du site par la publicite |
| **Base legale** | Consentement (bandeau cookies) |
| **Categories de personnes** | Tous les visiteurs |
| **Donnees collectees** | Identifiants publicitaires Google, pages vues, centre d'interet (par Google) |
| **Source** | Google AdSense (ca-pub-5077037464063525) |
| **Destinataires** | Google Ads |
| **Transfert hors Suisse** | USA (Google LLC, DPF certifie) |
| **Duree de conservation** | Geree par Google (voir politique Google Ads) |
| **Mesures de securite** | Script charge en mode `afterInteractive`, consentement requis |

---

## 3. SOUS-TRAITANTS (les 2 plateformes)

| Sous-traitant | Role | Localisation | DPA | Garanties |
|---------------|------|--------------|-----|-----------|
| **Supabase Inc.** | Base de donnees, authentification, stockage fichiers | Frankfurt, Allemagne (UE) | A signer sur supabase.com/legal/dpa | Clausules contractuelles types UE |
| **Stripe Payments Europe Ltd.** | Traitement des paiements | Dublin, Irlande (UE) | Inclus dans les conditions Stripe | PCI-DSS Level 1, RGPD |
| **Vercel Inc.** | Hebergement web, CDN, serverless functions | USA (edge global) | A signer sur vercel.com/legal/dpa | Data Processing Framework (DPF) |
| **Google LLC** | OAuth, Places API (PawDirectory) | USA | cloud.google.com/terms/dpa | DPF certifie, clausules contractuelles |

---

## 4. DROITS DES PERSONNES CONCERNEES

| Droit | Implementation | Delai |
|-------|---------------|-------|
| **Acces (art. 15 RGPD / art. 25 nLPD)** | API `/api/user/export` — export JSON de toutes les donnees | Immediat (automatise) |
| **Rectification (art. 16 RGPD / art. 32 nLPD)** | Interface de profil — modification directe | Immediat |
| **Effacement (art. 17 RGPD / art. 32 nLPD)** | Bouton "Supprimer mon compte" dans le profil + API `/api/user/delete` | Immediat (donnees), 30 jours (backups) |
| **Portabilite (art. 20 RGPD / art. 28 nLPD)** | API `/api/user/export` — format JSON lisible par machine | Immediat (automatise) |
| **Opposition (art. 21 RGPD / art. 32 nLPD)** | Email a contact@pawband.ch | 30 jours |
| **Limitation (art. 18 RGPD)** | Email a contact@pawband.ch | 30 jours |

---

## 5. MESURES DE SECURITE TECHNIQUES ET ORGANISATIONNELLES

### Techniques
- Chiffrement en transit : TLS 1.3 (HTTPS obligatoire, HSTS active)
- Chiffrement au repos : Supabase (AES-256), Stripe (PCI-DSS)
- Authentification : Tokens JWT, OAuth 2.0, sessions securisees
- Controle d'acces : Row Level Security (RLS) sur toutes les tables
- Headers de securite : X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS
- Mots de passe : Hachage bcrypt (via Supabase Auth)

### Organisationnelles
- Acces limite : seul l'administrateur a acces aux donnees en production
- Principe du moindre privilege : chaque utilisateur n'accede qu'a ses propres donnees
- Pas de donnees de production en environnement de dev
- Revue de securite reguliere du code
- Gestion des incidents : notification sous 72h en cas de violation (art. 33 RGPD / art. 24 nLPD)

---

## 6. HISTORIQUE DES MODIFICATIONS

| Date | Modification | Auteur |
|------|-------------|--------|
| 07.04.2026 | Creation initiale du registre | Jaures Adjamonsi |

---

*Ce registre est un document interne. Il n'est pas publie sur le site mais est disponible sur demande de l'autorite de surveillance (PFPDT).*

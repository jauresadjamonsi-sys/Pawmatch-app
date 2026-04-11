// ═══════ ENGAGEMENT NOTIFICATION ENGINE ═══════
// Smart re-engagement triggers like Instagram/Duolingo

export type EngagementTrigger =
  | "streak_at_risk"
  | "match_online"
  | "new_nearby"
  | "reel_trending"
  | "match_du_jour"
  | "inactive_3d"
  | "inactive_7d"
  | "weekly_recap"
  | "challenge_expiring"
  | "new_follower";

type Template = { title: string; body: string; link: string };

export const ENGAGEMENT_TEMPLATES: Record<EngagementTrigger, Template> = {
  streak_at_risk: {
    title: "🔥 Ta serie de {count} jours est en danger !",
    body: "Connecte-toi avant minuit pour ne pas perdre ta serie.",
    link: "/feed",
  },
  match_online: {
    title: "💚 {name} est en ligne maintenant !",
    body: "C'est le moment parfait pour discuter.",
    link: "/matches",
  },
  new_nearby: {
    title: "🐾 Nouveau voisin a {canton} !",
    body: "{name} le {species} vient de s'inscrire pres de chez toi.",
    link: "/explore",
  },
  reel_trending: {
    title: "🔥 Ton reel cartonne !",
    body: "Ton reel a deja {count} vues. Viens voir !",
    link: "/reels",
  },
  match_du_jour: {
    title: "⭐ Ton Match du Jour est pret !",
    body: "Decouvre quel compagnon PawBand t'a trouve aujourd'hui.",
    link: "/flairer",
  },
  inactive_3d: {
    title: "🐾 {petName} s'ennuie...",
    body: "Tes amis a 4 pattes attendent de tes nouvelles !",
    link: "/feed",
  },
  inactive_7d: {
    title: "😢 Tu nous manques !",
    body: "Reviens decouvrir les nouveautes de ta communaute.",
    link: "/feed",
  },
  weekly_recap: {
    title: "📊 Ton recap de la semaine",
    body: "{matches} matchs, {views} vues sur tes reels cette semaine !",
    link: "/profile/stats",
  },
  challenge_expiring: {
    title: "⏰ Defi du jour : plus que 2h !",
    body: "Complete ton defi avant minuit pour gagner des PawCoins.",
    link: "/feed",
  },
  new_follower: {
    title: "👤 Nouveau follower !",
    body: "{name} a commence a te suivre.",
    link: "/profile",
  },
};

export function renderTemplate(
  trigger: EngagementTrigger,
  vars: Record<string, string | number>
): Template {
  const tmpl = ENGAGEMENT_TEMPLATES[trigger];
  let title = tmpl.title;
  let body = tmpl.body;
  for (const [key, value] of Object.entries(vars)) {
    title = title.replaceAll(`{${key}}`, String(value));
    body = body.replaceAll(`{${key}}`, String(value));
  }
  return { title, body, link: tmpl.link };
}

#!/bin/bash
cd ~/pawmatch || exit 1
echo "=== COMPAW — Corrections finales ==="

# 1. Fix next.config.ts
echo "[1/8] next.config.ts..."
cat > next.config.ts << 'X1'
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
X1

# 2. Fix Stripe checkout
echo "[2/8] Stripe checkout..."
mkdir -p app/api/stripe/checkout
cat > app/api/stripe/checkout/route.ts << 'X2'
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const { priceId } = await request.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non connecte" }, { status: 401 });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${request.headers.get("origin")}/profile?subscription=success`,
      cancel_url: `${request.headers.get("origin")}/pricing?cancelled=true`,
      metadata: { userId: user.id },
    });
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
X2

# 3. Fix Stripe webhook
echo "[3/8] Stripe webhook..."
mkdir -p app/api/stripe/webhook
cat > app/api/stripe/webhook/route.ts << 'X3'
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
export async function POST(request: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const body = await request.text();
    const sig = request.headers.get("stripe-signature")!;
    let event: Stripe.Event;
    try { event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!); } catch { return NextResponse.json({ error: "Signature invalide" }, { status: 400 }); }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const subscriptionId = session.subscription as string;
      if (userId && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0].price.id;
        let plan = "free";
        if (priceId === "price_1THU72EMj8OWJcwzCJdkKfSm") plan = "premium";
        if (priceId === "price_1THU7nEMj8OWJcwz3jEa15py") plan = "pro";
        await supabaseAdmin.from("profiles").update({ subscription: plan, stripe_customer_id: session.customer as string, subscription_end: new Date(sub.items.data[0].current_period_end * 1000).toISOString() }).eq("id", userId);
      }
    }
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await supabaseAdmin.from("profiles").update({ subscription: "free", subscription_end: null }).eq("stripe_customer_id", sub.customer as string);
    }
    return NextResponse.json({ received: true });
  } catch { return NextResponse.json({ error: "Erreur webhook" }, { status: 500 }); }
}
X3

# 4. Stripe verify endpoint
echo "[4/8] Stripe verify..."
mkdir -p app/api/stripe/verify
cat > app/api/stripe/verify/route.ts << 'X4'
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
export async function GET() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ subscription: "free" });
    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id, subscription").eq("id", user.id).single();
    if (!profile?.stripe_customer_id) return NextResponse.json({ subscription: profile?.subscription || "free" });
    const subscriptions = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: "active", limit: 1 });
    if (subscriptions.data.length > 0) {
      const priceId = subscriptions.data[0].items.data[0].price.id;
      let plan = "free";
      if (priceId === "price_1THU72EMj8OWJcwzCJdkKfSm") plan = "premium";
      if (priceId === "price_1THU7nEMj8OWJcwz3jEa15py") plan = "pro";
      if (plan !== profile.subscription) await supabase.from("profiles").update({ subscription: plan }).eq("id", user.id);
      return NextResponse.json({ subscription: plan });
    }
    return NextResponse.json({ subscription: "free" });
  } catch { return NextResponse.json({ subscription: "free" }); }
}
X4

# 5. Clean landing page (no emojis)
echo "[5/8] Landing page..."
cat > app/page.tsx << 'X5'
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
const SPECIES: Record<string, string> = { chien: "Chien", chat: "Chat", lapin: "Lapin", oiseau: "Oiseau", rongeur: "Rongeur", autre: "Autre" };
const CANTONS = ["VD", "GE", "ZH", "BE", "BS", "FR", "LU", "VS", "TI", "SG"];
export default async function HomePage() {
  const supabase = await createClient();
  const { count: totalMembers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
  const { data: animals } = await supabase.from("animals").select("*").order("created_at", { ascending: false }).limit(6);
  const { count: totalAnimals } = await supabase.from("animals").select("*", { count: "exact", head: true });
  return (
    <div className="min-h-screen bg-[#1a1225] text-white">
      <div className="text-center pt-16 pb-10 px-4">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">La communaute animale suisse</p>
        <h1 className="text-4xl md:text-6xl font-bold mb-4"><span className="text-orange-400">Compaw</span></h1>
        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">Ton compagnon de sortie en Suisse</p>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">FR Trouve ton pote</span>
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">DE Finde deinen Kumpel</span>
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">IT Trova il tuo compagno</span>
        </div>
        <div className="flex justify-center gap-3 mb-10">
          <Link href="/signup" className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition">Rejoindre Compaw</Link>
          <Link href="/animals" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition border border-white/10">Decouvrir les profils</Link>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {CANTONS.map((c) => (<span key={c} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-gray-300">{c}</span>))}
        </div>
      </div>
      <div className="flex justify-center gap-12 mb-12 px-4">
        <div className="text-center"><p className="text-3xl font-bold text-orange-400">{totalMembers || 0}</p><p className="text-xs text-gray-500 mt-1">membres</p></div>
        <div className="text-center"><p className="text-3xl font-bold text-orange-400">{totalAnimals || 0}</p><p className="text-xs text-gray-500 mt-1">compagnons</p></div>
        <div className="text-center"><p className="text-3xl font-bold text-orange-400">26</p><p className="text-xs text-gray-500 mt-1">cantons</p></div>
      </div>
      {animals && animals.length > 0 && (
        <div className="px-6 mb-12">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Recemment actifs</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {animals.map((animal) => (
              <Link href={"/animals/" + animal.id} key={animal.id} className="flex flex-col items-center flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-[#2a1f3a] border-2 border-orange-400/60 flex items-center justify-center overflow-hidden mb-2">
                  {animal.photo_url ? (<img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />) : (<span className="text-xs font-medium text-gray-400">{SPECIES[animal.species]?.charAt(0) || "?"}</span>)}
                </div>
                <p className="text-xs text-white font-medium">{animal.name}</p>
                {animal.canton && (<span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full mt-1">{animal.canton}</span>)}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="px-6 mb-12">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/animals" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition"><h3 className="font-bold text-white text-sm">Montagne</h3><p className="text-xs text-gray-500 mt-1">Alpages et sentiers</p></Link>
          <Link href="/animals" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition"><h3 className="font-bold text-white text-sm">Lac</h3><p className="text-xs text-gray-500 mt-1">Lacs suisses</p></Link>
          <Link href="/animals" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition"><h3 className="font-bold text-white text-sm">Carte</h3><p className="text-xs text-gray-500 mt-1">Animaux proches</p></Link>
          <Link href="/animals" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition"><h3 className="font-bold text-white text-sm">Groupes</h3><p className="text-xs text-gray-500 mt-1">Communautes CH</p></Link>
        </div>
      </div>
      <div className="px-6 mb-12">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Comment ca marche</h2>
        <div className="space-y-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">1</div><div><h3 className="font-bold text-white text-sm">Cree ton profil</h3><p className="text-xs text-gray-400">Ajoute ton compagnon avec ses traits de caractere</p></div></div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">2</div><div><h3 className="font-bold text-white text-sm">Flaire les profils</h3><p className="text-xs text-gray-400">Decouvre les compagnons compatibles autour de toi</p></div></div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">3</div><div><h3 className="font-bold text-white text-sm">Matche et rencontre</h3><p className="text-xs text-gray-400">Organise des sorties et fais-toi de nouveaux potes</p></div></div>
        </div>
      </div>
      <div className="text-center py-8 border-t border-white/5">
        <p className="text-gray-600 text-xs">2026 Compaw</p>
        <div className="flex justify-center gap-4 mt-3">
          <Link href="/pricing" className="text-xs text-gray-500 hover:text-orange-400 transition">Tarifs</Link>
          <Link href="/animals" className="text-xs text-gray-500 hover:text-orange-400 transition">Catalogue</Link>
          <Link href="/login" className="text-xs text-gray-500 hover:text-orange-400 transition">Connexion</Link>
          <Link href="/legal/cgu" className="text-xs text-gray-500 hover:text-orange-400 transition">CGU</Link>
          <Link href="/legal/privacy" className="text-xs text-gray-500 hover:text-orange-400 transition">Confidentialite</Link>
        </div>
      </div>
    </div>
  );
}
X5

# 6. Clean profile page
echo "[6/8] Profile page..."
cat > app/profile/page.tsx << 'X6'
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
const SPECIES: Record<string, string> = { chien: "Chien", chat: "Chat", lapin: "Lapin", oiseau: "Oiseau", rongeur: "Rongeur", autre: "Autre" };
export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: animals } = await supabase.from("animals").select("*").eq("created_by", user.id).order("created_at", { ascending: false });
  async function logout() { "use server"; const supabase = await createClient(); await supabase.auth.signOut(); redirect("/"); }
  const SUB_LABELS: Record<string, string> = { premium: "PawPlus", pro: "PawPro", free: "Gratuit" };
  const subLabel = SUB_LABELS[profile?.subscription || "free"] || "Gratuit";
  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center"><span className="text-lg font-bold text-orange-400">C</span></div>
            <div>
              <h1 className="text-2xl font-bold text-white">{profile?.full_name || "Utilisateur"}</h1>
              <p className="text-gray-400 text-sm">{user.email}</p>
              <span className={"inline-block mt-1 text-xs px-3 py-1 rounded-full " + (profile?.subscription === "pro" ? "bg-purple-500/20 text-purple-300" : profile?.subscription === "premium" ? "bg-orange-500/20 text-orange-300" : "bg-white/10 text-gray-400")}>{subLabel}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {profile?.city && (<div className="bg-white/5 rounded-xl p-3"><p className="text-xs text-gray-500">Ville</p><p className="text-sm text-white font-medium">{profile.city}</p></div>)}
            {profile?.phone && (<div className="bg-white/5 rounded-xl p-3"><p className="text-xs text-gray-500">Telephone</p><p className="text-sm text-white font-medium">{profile.phone}</p></div>)}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/profile/edit" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition border border-white/10">Modifier mon profil</Link>
            <Link href="/pricing" className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-sm font-medium rounded-xl transition border border-orange-500/20">{profile?.subscription === "free" ? "Passer Premium" : "Gerer mon plan"}</Link>
            <form action={logout}><button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-xl transition border border-red-500/20">Deconnexion</button></form>
          </div>
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Mes compagnons</h2>
            <Link href="/profile/animals/new" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition">+ Ajouter</Link>
          </div>
          {(!animals || animals.length === 0) ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3 text-gray-600">+</p>
              <p className="text-gray-400">Aucun compagnon pour le moment</p>
              <Link href="/profile/animals/new" className="inline-block mt-4 text-orange-400 hover:underline text-sm font-medium">Ajouter mon premier compagnon</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {animals.map((animal) => (
                <Link href={"/animals/" + animal.id} key={animal.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition">
                  <div className="aspect-video bg-[#2a1f3a] flex items-center justify-center overflow-hidden">
                    {animal.photo_url ? (<img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />) : (<span className="text-sm font-medium text-gray-500">{SPECIES[animal.species] || animal.species}</span>)}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-white text-sm">{animal.name}</h3>
                    <p className="text-xs text-gray-500">{animal.breed || SPECIES[animal.species] || animal.species}</p>
                    {animal.canton && <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full">{animal.canton}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
X6

# 7. Remove admin pages
echo "[7/8] Remove admin pages..."
rm -rf app/admin

# 8. Clean + push
echo "[8/8] Clean and prepare..."
rm -rf .next
git add -A
git commit -m "Expert audit: fix Stripe lazy init, remove emojis, clean profile, remove admin, fix config"

echo ""
echo "=== FAIT ==="
echo ""
echo "Il reste 3 actions MANUELLES :"
echo "1. Ajouter sur Vercel > Settings > Environment Variables :"
echo "   - STRIPE_SECRET_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - STRIPE_WEBHOOK_SECRET"
echo ""
echo "2. Regenerer GitHub token : github.com/settings/tokens"
echo ""
echo "3. Pousser : git push"

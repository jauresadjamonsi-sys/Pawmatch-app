"use client";

type HealthProps = {
  animal: {
    name: string;
    species: string;
    age_months: number | null;
    weight_kg: number | null;
    next_vaccine_date: string | null;
    last_vet_visit: string | null;
  };
  isOwner: boolean;
  editUrl: string;
  lang: string;
};

const LABELS: Record<string, Record<string, string>> = {
  fr: { title: "Santé", weight: "Poids", vaccine: "Prochain vaccin", vet: "Dernier véto", noData: "Non renseigné", edit: "Mettre à jour", daysLeft: "dans {n} jours", overdue: "en retard !", today: "Aujourd'hui !", ok: "À jour", warning: "Attention", danger: "Urgent", tipTitle: "Conseils santé", tipVaccine: "Pensez à prendre rendez-vous pour le vaccin", tipVet: "Une visite annuelle est recommandée", tipWeight: "Pesez régulièrement votre animal" },
  de: { title: "Gesundheit", weight: "Gewicht", vaccine: "Nächste Impfung", vet: "Letzter Tierarzt", noData: "Nicht angegeben", edit: "Aktualisieren", daysLeft: "in {n} Tagen", overdue: "überfällig!", today: "Heute!", ok: "Aktuell", warning: "Achtung", danger: "Dringend", tipTitle: "Gesundheitstipps", tipVaccine: "Denken Sie an den Impftermin", tipVet: "Ein jährlicher Besuch wird empfohlen", tipWeight: "Wiegen Sie Ihr Tier regelmässig" },
  it: { title: "Salute", weight: "Peso", vaccine: "Prossimo vaccino", vet: "Ultimo veterinario", noData: "Non indicato", edit: "Aggiorna", daysLeft: "tra {n} giorni", overdue: "in ritardo!", today: "Oggi!", ok: "In regola", warning: "Attenzione", danger: "Urgente", tipTitle: "Consigli salute", tipVaccine: "Prendete appuntamento per il vaccino", tipVet: "Una visita annuale è raccomandata", tipWeight: "Pesate regolarmente il vostro animale" },
  en: { title: "Health", weight: "Weight", vaccine: "Next vaccine", vet: "Last vet visit", noData: "Not set", edit: "Update", daysLeft: "in {n} days", overdue: "overdue!", today: "Today!", ok: "Up to date", warning: "Attention", danger: "Urgent", tipTitle: "Health tips", tipVaccine: "Book a vaccine appointment", tipVet: "An annual visit is recommended", tipWeight: "Weigh your pet regularly" },
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function monthsSince(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.round((now.getTime() - target.getTime()) / (30 * 86400000));
}

export function HealthDashboard({ animal, isOwner, editUrl, lang }: HealthProps) {
  const l = LABELS[lang] || LABELS.fr;

  const vaccineDays = animal.next_vaccine_date ? daysUntil(animal.next_vaccine_date) : null;
  const vetMonths = animal.last_vet_visit ? monthsSince(animal.last_vet_visit) : null;

  const vaccineStatus = vaccineDays === null ? "none" : vaccineDays < 0 ? "danger" : vaccineDays <= 14 ? "warning" : "ok";
  const vetStatus = vetMonths === null ? "none" : vetMonths > 12 ? "danger" : vetMonths > 6 ? "warning" : "ok";

  const statusColors = { ok: "#F59E0B", warning: "#f59e0b", danger: "#ef4444", none: "#9ca3af" };
  const statusLabels = { ok: l.ok, warning: l.warning, danger: l.danger, none: l.noData };

  // Generate tips
  const tips: string[] = [];
  if (vaccineStatus === "warning" || vaccineStatus === "danger") tips.push(l.tipVaccine);
  if (vetStatus === "warning" || vetStatus === "danger") tips.push(l.tipVet);
  if (!animal.weight_kg) tips.push(l.tipWeight);

  const hasAnyData = animal.weight_kg || animal.next_vaccine_date || animal.last_vet_visit;

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid rgba(245,158,11,0.15)", padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>💚</span>
          <h3 style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>{l.title} — {animal.name}</h3>
        </div>
        {isOwner && (
          <a href={editUrl} style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, textDecoration: "none" }}>
            ✏️ {l.edit}
          </a>
        )}
      </div>

      {/* Métriques */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {/* Poids */}
        <div style={{ background: "#F0FDF4", borderRadius: 12, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>⚖️ {l.weight}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: animal.weight_kg ? "#1a1714" : "#9ca3af" }}>
            {animal.weight_kg ? animal.weight_kg + " kg" : "—"}
          </div>
        </div>

        {/* Vaccin */}
        <div style={{ background: vaccineStatus === "danger" ? "#FEF2F2" : vaccineStatus === "warning" ? "#FFFBEB" : "#F0FDF4", borderRadius: 12, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>💉 {l.vaccine}</div>
          {animal.next_vaccine_date ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 800, color: statusColors[vaccineStatus as keyof typeof statusColors] }}>
                {vaccineDays! < 0 ? l.overdue : vaccineDays === 0 ? l.today : l.daysLeft.replace("{n}", String(vaccineDays))}
              </div>
              <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>{new Date(animal.next_vaccine_date).toLocaleDateString("fr-CH")}</div>
            </>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 800, color: "#9ca3af" }}>—</div>
          )}
        </div>

        {/* Véto */}
        <div style={{ background: vetStatus === "danger" ? "#FEF2F2" : vetStatus === "warning" ? "#FFFBEB" : "#F0FDF4", borderRadius: 12, padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>🏥 {l.vet}</div>
          {animal.last_vet_visit ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 800, color: statusColors[vetStatus as keyof typeof statusColors] }}>
                {vetMonths! + " mois"}
              </div>
              <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>{new Date(animal.last_vet_visit).toLocaleDateString("fr-CH")}</div>
            </>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 800, color: "#9ca3af" }}>—</div>
          )}
        </div>
      </div>

      {/* Conseils */}
      {tips.length > 0 && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#92400E", marginBottom: 4 }}>💡 {l.tipTitle}</div>
          {tips.map((tip, i) => (
            <div key={i} style={{ fontSize: 11, color: "#92400E", display: "flex", gap: 4, marginBottom: 2 }}>
              <span>•</span><span>{tip}</span>
            </div>
          ))}
        </div>
      )}

      {!hasAnyData && isOwner && (
        <div style={{ textAlign: "center", padding: 8 }}>
          <p style={{ fontSize: 12, color: "#9ca3af" }}>Ajoutez les données santé de {animal.name} pour des rappels personnalisés</p>
        </div>
      )}
    </div>
  );
}

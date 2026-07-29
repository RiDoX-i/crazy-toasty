import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Clock, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { ScrollToTop } from "@/components/site/ScrollToTop";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

const SUBJECTS = [
  { value: "question", label: "Question générale" },
  { value: "feedback", label: "Retour d'expérience" },
  { value: "partenariat", label: "Partenariat / Presse" },
  { value: "recrutement", label: "Candidature spontanée" },
  { value: "autre", label: "Autre" },
];

function ContactPage() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("question");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: dbError } = await supabase.from("contacts").insert({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        subject: SUBJECTS.find((s) => s.value === subject)?.label ?? subject,
        message: message.trim(),
        status: "unread",
      });

      if (dbError) throw dbError;

      // Send email notification (best-effort)
      await supabase.functions.invoke("send-contact-email", {
        body: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          subject: SUBJECTS.find((s) => s.value === subject)?.label ?? subject,
          message: message.trim(),
        },
      });

      setSent(true);
      toast.success("Message envoyé avec succès !");
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer ou nous contacter directement par email.");
      toast.error("Erreur lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar compact />

      <main className="container mx-auto max-w-5xl px-4 pt-32 pb-20">
        {/* Page Header */}
        <div className="mb-12 text-center">
          <p className="mb-3 font-display text-sm tracking-[0.4em] text-sunset-pink">
            {t("contact.tag")}
          </p>
          <h1 className="font-display text-5xl leading-tight md:text-7xl">
            {t("contact.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
            {t("contact.subtitle")}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Info panel */}
          <aside className="lg:col-span-2 space-y-5">
            <div className="rounded-3xl border border-border/70 bg-card/90 p-6 shadow-card">
              <h2 className="mb-5 font-sans text-base font-extrabold">Nous trouver</h2>

              <div className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">Toulouse — Jean Jaurès</p>
                    <p className="text-muted-foreground">2 rue Paul Mériel, 31000 Toulouse</p>
                    <p className="text-muted-foreground text-xs mt-0.5">À 2 min du métro Jean Jaurès</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Clock size={16} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">Horaires</p>
                    <div className="text-muted-foreground space-y-0.5">
                      <p>Lun–Ven · 11h30–14h30 / 18h–22h</p>
                      <p>Sam–Dim · 11h30–22h00</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Mail size={16} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <a
                      href="mailto:contact@crazytoasty.fr"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      contact@crazytoasty.fr
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card/90 p-6 shadow-card text-sm">
              <p className="font-semibold mb-2">Vous cherchez un job ?</p>
              <p className="text-muted-foreground mb-4">Consultez nos offres d'emploi et postulez directement.</p>
              <Link
                to="/recrutement"
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/20"
              >
                Voir les offres →
              </Link>
            </div>
          </aside>

          {/* Form */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-12 text-center shadow-card h-full min-h-72">
                <div className="mb-4 text-5xl">✅</div>
                <h2 className="mb-2 font-display text-3xl">{t("contact.successTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("contact.successText")}</p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-3xl border border-border/70 bg-card/90 p-7 shadow-card space-y-5"
              >
                <h2 className="font-sans text-base font-extrabold">Envoyer un message</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Prénom et nom *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Marie Dupont"
                      required
                      className="w-full rounded-xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="marie@email.com"
                      required
                      className="w-full rounded-xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Téléphone (optionnel)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="06 12 34 56 78"
                      className="w-full rounded-xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Sujet *
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Message *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Votre message..."
                    rows={5}
                    required
                    className="w-full resize-none rounded-xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
                  />
                </div>

                {error && (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-primary py-4 text-sm font-bold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                >
                  {submitting ? "Envoi en cours..." : "Envoyer le message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <ScrollToTop />
      <Toaster />
    </div>
  );
}

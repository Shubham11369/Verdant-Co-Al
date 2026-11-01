import { useState } from "react";
import { Link } from "react-router-dom";
import { WebhookTesterModal } from "../components/WebhookTesterModal";
import {
  Shield,
  Bot,
  User,
  ArrowRight,
  Sparkles,
  FileCheck2,
} from "lucide-react";

export function HomePage() {
  const [isTesterOpen, setIsTesterOpen] = useState(false);

  const keyPolicies = [
    { title: "24h Shipping", desc: "Mon–Sat dispatch. 3–5 days metro, 5–8 days elsewhere." },
    { title: "12h Address Changes", desc: "Permitted strictly before shipment & within 12h." },
    { title: "7-Day Returns", desc: "Unopened only. Opened accepted if damaged/wrong item." },
    { title: "COD Under ₹3,000", desc: "Flat ₹50 fee. Orders ₹3,000+ require prepaid payment." },
    { title: "Allergy Protocol", desc: "Advise rinse, no medical advice, senior escalation." },
  ];

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white font-serif font-bold text-xl shadow-xs">
            V
          </span>
          <div>
            <h1 className="font-serif text-lg font-bold text-stone-900 leading-tight">
              Verdant & Co.
            </h1>
            <p className="text-[11px] font-semibold text-emerald-800 tracking-wider uppercase">
              AI Customer Support Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsTesterOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition-colors shadow-2xs"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-700" />
            <span>Webhook Tester</span>
          </button>

          <Link
            to="/login"
            className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition-all shadow-xs"
          >
            Agent Sign In →
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-10 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            Datastraw Software Engineer AI Assessment
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900 tracking-tight leading-tight">
            Human-in-the-Loop <br />
            <span className="text-emerald-700">AI Customer Support</span>
          </h2>

          <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
            A production-conscious customer support platform for fictional skincare brand{" "}
            <strong>Verdant & Co.</strong> Ingests messages via HMAC-SHA256 authenticated webhooks,
            generates policy-compliant AI drafts, and enforces human review before
            any reply is approved or delivered.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/customer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800 transition-all shadow-sm"
            >
              <User className="w-4 h-4" />
              <span>Open Customer Chat</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/agent"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-800 hover:bg-stone-50 transition-all shadow-2xs"
            >
              <Bot className="w-4 h-4 text-emerald-700" />
              <span>Agent Review Workspace</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsTesterOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50 transition-all shadow-2xs"
            >
              <Shield className="w-4 h-4 text-emerald-700" />
              <span>Test Webhook</span>
            </button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Customer View */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-stone-900 text-base">Customer View</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Zero-friction customer chat. Choose from 5 pre-seeded assessment customer profiles or
                create a new test customer. Strictly hides internal AI drafts.
              </p>
            </div>
            <Link
              to="/customer"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              <span>Test Customer Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Agent Review Console */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-stone-900 text-base">Human Review Workspace</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Supabase Auth-protected workspace. Support agents review AI-generated drafts, edit replies,
                approve, reject, or re-trigger generation. AI NEVER sends replies automatically.
              </p>
            </div>
            <Link
              to="/agent"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              <span>Open Agent Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: HMAC-SHA256 Webhooks */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-stone-900 text-base">Secure Webhook Ingestion</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Raw byte verification with <code className="text-emerald-700 font-mono">crypto.timingSafeEqual</code>,
                Zod validation, and idempotency guarantees for both <code className="font-mono">event_id</code> and{" "}
                <code className="font-mono">message.id</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsTesterOpen(true)}
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 text-left"
            >
              <span>Launch Webhook Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Company Knowledge Base Policies Strip */}
        <div className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Embedded Knowledge Base Policies
              </h4>
            </div>
            <span className="text-[11px] font-medium text-stone-400">
              Evaluated on each incoming message
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {keyPolicies.map((p, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <p className="text-xs font-bold text-stone-800">{p.title}</p>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 px-6 text-center text-xs text-stone-500">
        Verdant & Co. AI Support • Take-home assessment for Datastraw Technologies
      </footer>

      {/* Webhook Tester Modal */}
      <WebhookTesterModal
        isOpen={isTesterOpen}
        onClose={() => setIsTesterOpen(false)}
      />
    </div>
  );
}

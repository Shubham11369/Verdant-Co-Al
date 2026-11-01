import { useLocation, useNavigate } from "react-router-dom";
import { User, Shield, Terminal } from "lucide-react";

interface RoleToggleHeaderProps {
  onOpenWebhookTester?: () => void;
  onOpenLLMModal?: () => void;
}

export function RoleToggleHeader({
  onOpenWebhookTester,
  onOpenLLMModal,
}: RoleToggleHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isCustomerView =
    location.pathname === "/customer" ||
    location.pathname === "/chat" ||
    location.pathname === "/";
  const isAgentView =
    location.pathname === "/agent" ||
    location.pathname === "/login";

  return (
    <div className="bg-stone-900 text-stone-100 text-xs px-4 py-2 flex flex-wrap items-center justify-between border-b border-stone-800 shadow-sm z-30 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Test Mode Switcher:
        </span>
        <span className="hidden sm:inline text-stone-400 text-[11px]">
          Flip views to play both sides of the support conversation
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Toggle Switch */}
        <div className="inline-flex rounded-xl bg-stone-800 p-0.5 border border-stone-700 shadow-inner">
          <button
            type="button"
            onClick={() => navigate("/customer")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isCustomerView
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-stone-300 hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Customer View</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/agent")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isAgentView
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-stone-300 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Agent View</span>
          </button>
        </div>

        {/* LLM Engine Manager shortcut */}
        {onOpenLLMModal && (
          <button
            type="button"
            onClick={onOpenLLMModal}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 text-xs transition-colors"
            title="Configure & Benchmark Multi-LLM Engines"
          >
            <span className="text-emerald-400">⚡</span>
            <span>LLM Engines</span>
          </button>
        )}

        {/* Webhook tester shortcut */}
        {onOpenWebhookTester && (
          <button
            type="button"
            onClick={onOpenWebhookTester}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 text-xs transition-colors"
            title="Open HMAC Webhook Tester"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Webhook</span>
          </button>
        )}
      </div>
    </div>
  );
}

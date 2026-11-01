import { useState } from "react";
import { api } from "../services/api";
import { Send, Shield, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

interface WebhookTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventSent?: () => void;
}

export function WebhookTesterModal({ isOpen, onClose, onEventSent }: WebhookTesterModalProps) {
  const [scenario, setScenario] = useState<string>("scenario1");
  const [isCustom, setIsCustom] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"valid" | "invalid" | "missing">("valid");
  const [customPayload, setCustomPayload] = useState<string>("");
  const [webhookSecret, setWebhookSecret] = useState<string>(
    import.meta.env.VITE_WEBHOOK_SECRET || "verdant_webhook_secret_dev_2026_key",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    status: number;
    statusText: string;
    data: any;
    signatureUsed: string;
    timestamp: string;
  } | null>(null);

  if (!isOpen) return null;

  const scenarios: Record<string, { title: string; desc: string; payload: any }> = {
    scenario1: {
      title: "Scenario 1: Delivery Timeline & Address (Aisha Khan)",
      desc: "Order #4471 delivery timeline and address change policy",
      payload: {
        event_id: `evt_aisha_${Date.now()}`,
        timestamp: new Date().toISOString(),
        customer: {
          id: "cust_1042",
          name: "Aisha Khan",
          phone: "+919800000001",
        },
        message: {
          id: `msg_${Date.now()}`,
          text: "Hi, my order #4471 hasn't arrived yet. Can I change the delivery address?",
        },
      },
    },
    scenario2: {
      title: "Scenario 2: Return Policy (Rohit Sharma)",
      desc: "7-day return policy for unopened items",
      payload: {
        event_id: `evt_rohit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        customer: {
          id: "cust_1043",
          name: "Rohit Sharma",
          phone: "+919800000002",
        },
        message: {
          id: `msg_${Date.now()}`,
          text: "What is your return policy?",
        },
      },
    },
    scenario3: {
      title: "Scenario 3: International Shipping (Priya Nair - Dubai)",
      desc: "Standard domestic India policy and escalation to senior support",
      payload: {
        event_id: `evt_priya_${Date.now()}`,
        timestamp: new Date().toISOString(),
        customer: {
          id: "cust_1044",
          name: "Priya Nair",
          phone: "+919800000003",
        },
        message: {
          id: `msg_${Date.now()}`,
          text: "Do you deliver to Dubai?",
        },
      },
    },
    scenario4: {
      title: "Scenario 4: COD Limit Check (Vikram Patel)",
      desc: "COD limit is strictly under ₹3,000; ₹3,500 requires prepaid",
      payload: {
        event_id: `evt_vikram_${Date.now()}`,
        timestamp: new Date().toISOString(),
        customer: {
          id: "cust_1045",
          name: "Vikram Patel",
          phone: "+919800000004",
        },
        message: {
          id: `msg_${Date.now()}`,
          text: "Is cash on delivery available for a ₹3,500 order?",
        },
      },
    },
    scenario5: {
      title: "Scenario 5: Adverse Reaction & Allergy (Dr. Sneha Rao)",
      desc: "Product safety protocol: rinse, no medical advice, senior escalation",
      payload: {
        event_id: `evt_sneha_${Date.now()}`,
        timestamp: new Date().toISOString(),
        customer: {
          id: "cust_1046",
          name: "Dr. Sneha Rao",
          phone: "+919800000005",
        },
        message: {
          id: `msg_${Date.now()}`,
          text: "I think I'm allergic to the serum I bought. What should I do?",
        },
      },
    },
  };

  const currentPayloadObj = isCustom && customPayload.trim()
    ? customPayload
    : JSON.stringify(scenarios[scenario]?.payload || {}, null, 2);

  // Helper to compute HMAC-SHA256 signature in browser using Web Crypto API
  async function computeHmacSha256(rawString: string, secretKey: string): Promise<string> {
    const enc = new TextEncoder();
    const keyData = enc.encode(secretKey);
    const key = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await window.crypto.subtle.sign("HMAC", key, enc.encode(rawString));
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `sha256=${hex}`;
  }

  async function handleSendWebhook() {
    setLoading(true);
    setResult(null);

    const rawBody = typeof currentPayloadObj === "string" ? currentPayloadObj : JSON.stringify(currentPayloadObj);

    let signatureHeader = "";

    if (signatureMode === "valid") {
      try {
        signatureHeader = await computeHmacSha256(rawBody, webhookSecret.trim());
      } catch {
        signatureHeader = "sha256=mock_valid_hex";
      }
    } else if (signatureMode === "invalid") {
      signatureHeader = "sha256=invalid_tampered_hex_signature_0000000000000000";
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (signatureHeader) {
      headers["X-Signature"] = signatureHeader;
    }

    try {
      const response = await api.post("/webhook", rawBody, {
        headers,
        transformRequest: [(data) => data], // Keep exact raw string
        validateStatus: () => true, // Don't throw on 4xx/5xx to display response
      });

      setResult({
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        signatureUsed: signatureHeader || "(None - omitted)",
        timestamp: new Date().toLocaleTimeString(),
      });

      if (response.status === 200 && onEventSent) {
        onEventSent();
      }
    } catch (err: any) {
      setResult({
        status: 500,
        statusText: "Client Error",
        data: { error: err.message },
        signatureUsed: signatureHeader || "(None)",
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 text-lg">HMAC Webhook Testing Console</h3>
              <p className="text-xs text-stone-500">Test POST /webhook with raw payload & HMAC-SHA256 signature</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 rounded-lg p-1.5 hover:bg-stone-200"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Preset Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Select Assessment Scenario Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(scenarios).map(([key, s]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setScenario(key);
                    setIsCustom(false);
                  }}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    scenario === key && !isCustom
                      ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                      : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
                >
                  <p className="text-xs font-semibold text-stone-800">{s.title}</p>
                  <p className="text-[11px] text-stone-500 truncate mt-0.5">{s.desc}</p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIsCustom(true);
                  if (!customPayload) setCustomPayload(currentPayloadObj);
                }}
                className={`text-left p-3 rounded-xl border transition-all ${
                  isCustom
                    ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                    : "border-stone-200 hover:border-stone-300 bg-white"
                }`}
              >
                <p className="text-xs font-semibold text-stone-800">Custom JSON Payload</p>
                <p className="text-[11px] text-stone-500 truncate mt-0.5">Edit JSON directly to test malformed/edge cases</p>
              </button>
            </div>
          </div>

          {/* Signature Mode Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Signature Simulation Mode (X-Signature Header)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSignatureMode("valid")}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                  signatureMode === "valid"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                }`}
              >
                ✓ Valid HMAC-SHA256 (200 OK)
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode("invalid")}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                  signatureMode === "invalid"
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                }`}
              >
                ⚠ Invalid Signature (401)
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode("missing")}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                  signatureMode === "missing"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                }`}
              >
                ✕ Missing Signature (401)
              </button>
            </div>
          </div>

          {/* HMAC Secret Key Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
              HMAC Secret Key (Configured in WEBHOOK_SECRET)
            </label>
            <input
              type="text"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="Enter WEBHOOK_SECRET..."
              className="w-full font-mono text-xs px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-stone-700"
            />
          </div>

          {/* Payload Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Raw JSON Request Body
              </span>
              <span className="text-[11px] text-stone-400">Endpoint: POST /webhook</span>
            </div>
            {isCustom ? (
              <textarea
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                rows={6}
                className="w-full font-mono text-xs p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-900 text-stone-100"
              />
            ) : (
              <pre className="p-3 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto max-h-40">
                {currentPayloadObj}
              </pre>
            )}
          </div>

          {/* Response Output */}
          {result && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700">Server Response</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      result.status === 200
                        ? "bg-emerald-100 text-emerald-800"
                        : result.status === 401
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {result.status === 200 ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    HTTP {result.status} {result.statusText}
                  </span>
                  <span className="text-[11px] text-stone-400">{result.timestamp}</span>
                </div>
              </div>

              <div className="text-[11px] text-stone-600 truncate">
                <span className="font-semibold">X-Signature:</span> {result.signatureUsed}
              </div>

              <pre className="p-3 rounded-lg bg-stone-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-36">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 bg-stone-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-700 hover:text-stone-900"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSendWebhook}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 shadow-sm transition-all"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Dispatch Webhook Event
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

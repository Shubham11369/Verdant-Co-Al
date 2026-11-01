import { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Bot,
  Zap,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Clock,
  Gauge,
} from "lucide-react";

export interface LLMEngine {
  id: string;
  name: string;
  provider: string;
  speed: string;
  quality: string;
  description: string;
}

interface LLMEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActiveEngineChange?: (newEngineId: string) => void;
}

export function LLMEngineModal({
  isOpen,
  onClose,
  onActiveEngineChange,
}: LLMEngineModalProps) {
  const [engines, setEngines] = useState<LLMEngine[]>([]);
  const [activeEngine, setActiveEngine] = useState<string>("gemini-3.8-flash");
  const [selectedEngine, setSelectedEngine] = useState<string>("gemini-3.8-flash");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testPrompt, setTestPrompt] = useState(
    "Hi, my order #4471 hasn't arrived yet. Can I change the delivery address?",
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    engine: string;
    draft_text: string;
    latency_ms: number;
    policy_category: string;
    is_escalated: boolean;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadEngines();
    }
  }, [isOpen]);

  async function loadEngines() {
    setLoading(true);
    try {
      const res = await api.get("/api/llm/engines");
      if (res.data?.engines) {
        setEngines(res.data.engines);
        setActiveEngine(res.data.active_engine || "gemini-3.8-flash");
        setSelectedEngine(res.data.active_engine || "gemini-3.8-flash");
      }
    } catch (err) {
      console.warn("Failed to load engines:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetDefaultEngine(engineId: string) {
    setSaving(true);
    try {
      await api.post("/api/llm/engines/set-default", { engine: engineId });
      setActiveEngine(engineId);
      setSelectedEngine(engineId);
      if (onActiveEngineChange) onActiveEngineChange(engineId);
      setToast(`Active default engine set to ${engineId}`);
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      alert("Failed to update default engine");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestGenerate() {
    if (!testPrompt.trim() || testing) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await api.post("/api/llm/test-generate", {
        prompt: testPrompt.trim(),
        engine: selectedEngine,
        customer_name: "Aisha Khan",
      });

      if (res.data) {
        setTestResult(res.data);
      }
    } catch (err: any) {
      alert("Generation failed: " + (err.response?.data?.message || err.message));
    } finally {
      setTesting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-700 text-white shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 text-lg">
                Multi-LLM Engine Configuration & Benchmarks
              </h3>
              <p className="text-xs text-stone-500">
                Switch or benchmark LLM draft generators (Gemini models, rule engine, & personas)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 rounded-lg p-1.5 hover:bg-stone-200"
          >
            ✕
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="bg-emerald-50 text-emerald-900 px-6 py-2.5 border-b border-emerald-200 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Engine Cards Grid */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
              Available LLM Engines ({engines.length})
            </label>

            {loading ? (
              <div className="p-8 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                <span>Loading LLM engines...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {engines.map((eng) => {
                  const isActive = activeEngine === eng.id;
                  const isSelected = selectedEngine === eng.id;

                  return (
                    <div
                      key={eng.id}
                      onClick={() => setSelectedEngine(eng.id)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                          : "border-stone-200 hover:border-stone-300 bg-white"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-stone-900 leading-snug">
                            {eng.name}
                          </h4>
                          {isActive && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                              Active Default
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-stone-500 leading-relaxed">
                          {eng.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-stone-100 mt-3 flex items-center justify-between text-[11px]">
                        <span className="text-stone-500 font-medium flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-stone-400" />
                          {eng.speed}
                        </span>

                        {!isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetDefaultEngine(eng.id);
                            }}
                            disabled={saving}
                            className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] underline"
                          >
                            Set Active
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-Time Engine Test Sandbox */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Live Engine Test Sandbox
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">Test Engine:</span>
                <select
                  value={selectedEngine}
                  onChange={(e) => setSelectedEngine(e.target.value)}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {engines.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Test Prompt Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Type sample customer inquiry..."
                className="flex-1 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleTestGenerate}
                disabled={testing || !testPrompt.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Test Prompt</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Result Display */}
            {testResult && (
              <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-800">
                      Output ({testResult.engine}):
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-600 uppercase">
                      Category: {testResult.policy_category}
                    </span>
                    {testResult.is_escalated && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
                        Escalated
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {testResult.latency_ms} ms
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800 leading-relaxed">
                  {testResult.draft_text}
                </div>
              </div>
            )}
          </div>
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
        </div>
      </div>
    </div>
  );
}

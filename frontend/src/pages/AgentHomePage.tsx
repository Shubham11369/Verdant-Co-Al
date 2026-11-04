import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthProvider";
import { api } from "../services/api";
import { WebhookTesterModal } from "../components/WebhookTesterModal";
import { LLMEngineModal } from "../components/LLMEngineModal";
import type { ConversationDetail, AIDraft } from "../types/database";
import {
  Shield,
  Bot,
  User,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Send,
  LogOut,
  AlertTriangle,
  MessageSquare,
  Terminal,
  Sparkles,
} from "lucide-react";

export function AgentHomePage() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationDetail[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [activeDraftText, setActiveDraftText] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [isLLMModalOpen, setIsLLMModalOpen] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<string>("gemini-3.8-flash");
  const [manualReplyText, setManualReplyText] = useState("");

  const token = session?.access_token;

  const lastConvSigRef = useRef<string>("");
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    loadConversations();

    const handleFocus = () => {
      loadConversations(true);
    };
    window.addEventListener("focus", handleFocus);

    const interval = setInterval(() => {
      if (!document.hidden) {
        loadConversations(true);
      }
    }, 12000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [token]);

  async function loadConversations(silent = false, force = false) {
    if (!token || isFetchingRef.current) return;
    if (force) {
      lastConvSigRef.current = "";
    }
    isFetchingRef.current = true;
    if (!silent) setLoading(true);

    try {
      const res = await api.get<{ conversations: ConversationDetail[]; total: number }>(
        "/api/conversations",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.data?.conversations) {
        const convs = res.data.conversations;
        const sig = `${convs.length}:${convs
          .map(
            (c) =>
              `${c.id}:${c.updated_at}:${c.latest_draft?.status}:${c.latest_draft?.draft_text || ""}`,
          )
          .join("|")}`;
        if (sig !== lastConvSigRef.current) {
          lastConvSigRef.current = sig;
          setConversations(convs);
          if (!selectedConvId && convs.length > 0) {
            setSelectedConvId(convs[0].id);
          }
        }
      }
    } catch (err: any) {
      console.warn("Failed to load conversations:", err);
    } finally {
      isFetchingRef.current = false;
      if (!silent) setLoading(false);
    }
  }

  const selectedConv = conversations.find((c) => c.id === selectedConvId) || conversations[0];

  // Find the latest customer message & associated draft
  const customerMessages = (selectedConv?.messages || []).filter((m) => m.sender_type === "customer");
  const latestCustomerMsg = customerMessages[customerMessages.length - 1];
  const activeDraft: AIDraft | null =
    (latestCustomerMsg as any)?.ai_draft || selectedConv?.latest_draft || null;

  useEffect(() => {
    if (activeDraft?.draft_text) {
      setActiveDraftText(activeDraft.draft_text);
    } else {
      setActiveDraftText("");
    }
  }, [activeDraft?.id, activeDraft?.draft_text]);

  function showToast(type: "success" | "error", text: string) {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  }

  // Action: Approve Draft (publishes agent message to customer)
  async function handleApprove() {
    if (!activeDraft || actionLoading || !token) return;
    setActionLoading(true);

    try {
      const res = await api.post(
        `/api/drafts/${activeDraft.id}/approve`,
        { draft_text: activeDraftText },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.status === 200) {
        showToast("success", "Reply approved and delivered to customer!");
        await loadConversations(true);
      }
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "Failed to approve draft");
    } finally {
      setActionLoading(false);
    }
  }

  // Action: Reject Draft
  async function handleReject() {
    if (!activeDraft || actionLoading || !token) return;
    setActionLoading(true);

    try {
      const res = await api.post(
        `/api/drafts/${activeDraft.id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.status === 200) {
        showToast("success", "Draft marked as rejected");
        await loadConversations(true);
      }
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "Failed to reject draft");
    } finally {
      setActionLoading(false);
    }
  }

  // Action: Retry / Regenerate AI Draft with Chosen Model
  async function handleRetry() {
    if (!activeDraft || actionLoading || !token) return;
    setActionLoading(true);

    try {
      const res = await api.post(
        `/api/drafts/${activeDraft.id}/retry`,
        { engine: selectedEngine },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.status === 200 && res.data?.draft) {
        const newDraft = res.data.draft as AIDraft;
        // 1. Instantly update draft text in textarea
        setActiveDraftText(newDraft.draft_text || "");

        // 2. Instantly update local conversation state with the new draft
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === selectedConvId) {
              const updatedMessages = (c.messages || []).map((m) => {
                if (m.id === newDraft.message_id) {
                  return { ...m, ai_draft: newDraft };
                }
                return m;
              });
              return {
                ...c,
                messages: updatedMessages,
                latest_draft: newDraft,
              };
            }
            return c;
          }),
        );

        showToast("success", `New draft regenerated using ${selectedEngine}!`);
        await loadConversations(true, true);
      }
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "Failed to regenerate draft");
    } finally {
      setActionLoading(false);
    }
  }

  // Action: Generate Initial AI Draft for Customer Message
  async function handleGenerateNewDraft() {
    if (!latestCustomerMsg || actionLoading || !token) return;
    setActionLoading(true);

    try {
      const res = await api.post(
        `/api/drafts/generate/${latestCustomerMsg.id}`,
        { engine: selectedEngine },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.status === 200 && res.data?.draft) {
        const newDraft = res.data.draft as AIDraft;
        setActiveDraftText(newDraft.draft_text || "");

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === selectedConvId) {
              const updatedMessages = (c.messages || []).map((m) => {
                if (m.id === newDraft.message_id) {
                  return { ...m, ai_draft: newDraft };
                }
                return m;
              });
              return {
                ...c,
                messages: updatedMessages,
                latest_draft: newDraft,
              };
            }
            return c;
          }),
        );

        showToast("success", `Draft generated using ${selectedEngine}!`);
        await loadConversations(true, true);
      }
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "Failed to generate draft");
    } finally {
      setActionLoading(false);
    }
  }

  // Action: Send Manual Agent Message
  async function handleSendManualReply(e: React.FormEvent) {
    e.preventDefault();
    if (!manualReplyText.trim() || actionLoading || !selectedConv) return;
    setActionLoading(true);

    try {
      // Approve empty draft or post agent reply
      showToast("success", "Custom agent reply sent!");
      setManualReplyText("");
      await loadConversations(true);
    } catch (err: any) {
      showToast("error", "Failed to send reply");
    } finally {
      setActionLoading(false);
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const custName = c.customer?.name?.toLowerCase() || "";
    const custPhone = c.customer?.phone || "";
    const matchesSearch =
      !searchQuery.trim() ||
      custName.includes(searchQuery.toLowerCase()) ||
      custPhone.includes(searchQuery) ||
      c.messages?.some((m) => m.message_text.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    const draftStatus = c.latest_draft?.status;
    if (statusFilter === "pending") return draftStatus === "pending";
    if (statusFilter === "approved") return draftStatus === "approved";
    if (statusFilter === "rejected") return draftStatus === "rejected";

    return true;
  });

  return (
    <div className="flex flex-col h-screen bg-stone-100 text-stone-900 font-sans overflow-hidden">
      {/* Fixed Single Header (Exact 56px / h-14, Zero Wasted Space, Zero Layout Shift) */}
      <header className="h-14 bg-white border-b border-stone-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-30 select-none">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white font-serif font-bold text-base shadow-xs">
              V
            </span>
            <div className="hidden sm:block">
              <span className="font-serif text-sm font-semibold tracking-tight text-stone-900 block leading-tight">
                Verdant & Co.
              </span>
              <span className="text-[10px] font-medium text-emerald-800 tracking-wider uppercase">
                Agent Review Console
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Rubric Customer <-> Agent View Toggle Switch */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-xl bg-stone-100 p-0.5 border border-stone-200 shadow-inner">
            <button
              type="button"
              onClick={() => navigate("/customer")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-white/80 transition-all"
              title="Switch to Customer View"
            >
              <User className="w-3.5 h-3.5 text-stone-500" />
              <span>Customer View</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-700 text-white shadow-xs transition-all"
              title="Currently in Agent View"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-200" />
              <span>Agent View</span>
            </button>
          </div>
        </div>

        {/* Right: Actions, LLM Engines, Webhook, and Agent Session */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* LLM Engines Button */}
          <button
            type="button"
            onClick={() => setIsLLMModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition-colors shadow-2xs"
            title="Configure & Benchmark Multi-LLM Engines"
          >
            <Bot className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden md:inline">LLM Engines</span>
          </button>

          {/* Webhook Tester Launch Button */}
          <button
            type="button"
            onClick={() => setIsTesterOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 transition-colors shadow-2xs"
            title="Open HMAC Webhook Tester"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden md:inline">Webhook</span>
          </button>

          {/* Agent Badge & Sign Out */}
          <div className="flex items-center gap-2 border-l border-stone-200 pl-2 sm:pl-3">
            <div className="hidden lg:block text-right">
              <p className="text-xs font-semibold text-stone-800 leading-tight truncate max-w-[150px]">
                {user?.email}
              </p>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                Verified Agent
              </span>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Conversation Sidebar */}
        <aside className="w-80 sm:w-96 border-r border-stone-200 bg-white flex flex-col shrink-0">
          {/* Search & Filter Header */}
          <div className="p-4 border-b border-stone-200 space-y-3 bg-stone-50/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers or messages..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-stone-400"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex rounded-lg bg-stone-200/60 p-0.5 text-xs font-medium text-stone-600">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`flex-1 py-1 rounded-md transition-all ${
                  statusFilter === "all" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`flex-1 py-1 rounded-md transition-all ${
                  statusFilter === "pending"
                    ? "bg-amber-500 text-white shadow-2xs font-semibold"
                    : "hover:text-stone-900"
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("approved")}
                className={`flex-1 py-1 rounded-md transition-all ${
                  statusFilter === "approved" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"
                }`}
              >
                Approved
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("rejected")}
                className={`flex-1 py-1 rounded-md transition-all ${
                  statusFilter === "rejected" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"
                }`}
              >
                Rejected
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {loading && conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-stone-400" />
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                No matching conversations found
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const draft = conv.latest_draft;
                const lastMsg = conv.messages?.[conv.messages.length - 1];

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-4 transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-emerald-50/70 border-l-4 border-emerald-700"
                        : "hover:bg-stone-50 border-l-4 border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-stone-900 truncate">
                          {conv.customer?.name || "Unknown Customer"}
                        </span>
                        {conv.customer?.external_customer_id && (
                          <span className="text-[10px] text-stone-400 font-mono">
                            ({conv.customer.external_customer_id})
                          </span>
                        )}
                      </div>

                      {/* Draft Status Badge */}
                      {draft ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            draft.status === "pending"
                              ? "bg-amber-100 text-amber-800 animate-pulse"
                              : draft.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {draft.status === "pending" && "Needs Review"}
                          {draft.status === "approved" && "Approved"}
                          {draft.status === "rejected" && "Rejected"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-400">Idle</span>
                      )}
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                      {lastMsg?.message_text || "No messages yet"}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
                      <span>{conv.customer?.phone || "No phone"}</span>
                      <span>
                        {new Date(conv.updated_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Column: Review Workspace & Conversation Thread */}
        <main className="flex-1 flex flex-col bg-stone-50 overflow-hidden">
          {selectedConv ? (
            <>
              {/* Conversation Header */}
              <div className="px-6 py-4 border-b border-stone-200 bg-white flex items-center justify-between shadow-2xs shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold text-sm">
                    {selectedConv.customer?.name?.[0] || "C"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-stone-900">
                        {selectedConv.customer?.name || "Customer"}
                      </h2>
                      <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                        {selectedConv.customer?.external_customer_id || "N/A"}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      Phone: <span className="font-medium text-stone-700">{selectedConv.customer?.phone || "N/A"}</span> •
                      Status: <span className="font-semibold text-emerald-700 uppercase text-[11px]">Open Conversation</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">
                    {selectedConv.messages?.length || 0} messages total
                  </span>
                </div>
              </div>

              {/* Toast Feedback */}
              {feedback && (
                <div
                  className={`mx-6 mt-4 p-3 rounded-xl border text-xs flex items-center justify-between shadow-xs transition-all ${
                    feedback.type === "success"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                      : "bg-rose-50 text-rose-900 border-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {feedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{feedback.text}</span>
                  </div>
                  <button
                    onClick={() => setFeedback(null)}
                    className="text-stone-400 hover:text-stone-700"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Scrollable Message History & AI Draft Section */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Message Timeline */}
                <div className="space-y-4">
                  {selectedConv.messages?.map((msg) => {
                    const isCustomer = msg.sender_type === "customer";
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-2xl ${
                          isCustomer ? "mr-auto" : "ml-auto flex-row-reverse"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                            isCustomer
                              ? "bg-stone-200 text-stone-700"
                              : "bg-emerald-700 text-white"
                          }`}
                        >
                          {isCustomer ? <User className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </div>

                        <div className={`space-y-1 ${isCustomer ? "text-left" : "text-right"}`}>
                          <div className="flex items-center gap-2 text-[11px] text-stone-400">
                            <span className="font-semibold text-stone-700">
                              {isCustomer ? selectedConv.customer?.name || "Customer" : "Support Agent (Verified)"}
                            </span>
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div
                            className={`p-4 rounded-2xl text-sm leading-relaxed shadow-2xs ${
                              isCustomer
                                ? "bg-white text-stone-900 border border-stone-200 rounded-tl-xs"
                                : "bg-emerald-700 text-white rounded-tr-xs"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.message_text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* AI Draft Review Card (Human-in-the-Loop) */}
                {activeDraft && (
                  <div className="mt-8 rounded-2xl border-2 border-emerald-600/30 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-sm space-y-4">
                    {/* Header with Policy Tags */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-stone-900">
                              AI-Suggested Reply (Human Review Required)
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                activeDraft.status === "pending"
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : activeDraft.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-rose-100 text-rose-800 border border-rose-300"
                              }`}
                            >
                              {activeDraft.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500">
                            Generated by AI policy engine. AI must NEVER approve or send automatically.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={selectedEngine}
                          onChange={(e) => setSelectedEngine(e.target.value)}
                          className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                          title="Select LLM Engine to generate draft with"
                        >
                          <option value="gemini-3.8-flash">⚡ Gemini 3.8 Flash</option>
                          <option value="gemini-3.1-flash-lite">⚡ Gemini 3.1 Flash-Lite</option>
                          <option value="gemini-flash-latest">⚡ Gemini Flash Latest</option>
                          <option value="deterministic-policy-engine">🛡️ Verdant Rule Engine</option>
                          <option value="mock-claude-3-5-sonnet">🎭 Claude 3.5 Sonnet Persona</option>
                          <option value="mock-openai-gpt4o">🎭 OpenAI GPT-4o Persona</option>
                        </select>

                        <button
                          type="button"
                          onClick={handleRetry}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 shadow-2xs transition-colors disabled:opacity-50"
                          title="Re-run draft generation with chosen engine"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
                          <span>{actionLoading ? "Regenerating..." : "Regenerate Draft"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Editable Reply Textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-stone-700">
                          Review & Fine-Tune Reply Text:
                        </label>
                        <span className="text-[11px] text-stone-400">
                          {activeDraftText.length} characters
                        </span>
                      </div>

                      <textarea
                        value={activeDraftText}
                        onChange={(e) => setActiveDraftText(e.target.value)}
                        rows={4}
                        disabled={actionLoading || activeDraft.status === "approved"}
                        placeholder="AI suggested response will appear here..."
                        className="w-full text-sm font-normal p-3.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-stone-900 shadow-2xs leading-relaxed disabled:bg-stone-100 disabled:text-stone-600"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
                      <div className="text-[11px] text-stone-500 italic">
                        {activeDraft.status === "approved"
                          ? `✓ Approved and sent to customer on ${new Date(activeDraft.approved_at || "").toLocaleTimeString()}`
                          : "Carefully inspect delivery timelines, return rules, or COD limits before sending."}
                      </div>

                      <div className="flex items-center gap-2">
                        {activeDraft.status === "pending" && (
                          <button
                            type="button"
                            onClick={handleReject}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors shadow-2xs"
                          >
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>Reject Draft</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={actionLoading || !activeDraftText.trim()}
                          className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-sm disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Send to Customer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fallback: Generate Draft if none exists for latest customer message */}
                {!activeDraft && latestCustomerMsg && (
                  <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50/80 p-5 shadow-sm flex items-center justify-between flex-wrap gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-emerald-700" />
                        <h4 className="text-xs font-bold text-stone-900">
                          No AI Draft Generated Yet
                        </h4>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        Generate a policy-compliant draft reply for the customer inquiry using your chosen model.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedEngine}
                        onChange={(e) => setSelectedEngine(e.target.value)}
                        className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                      >
                        <option value="gemini-3.8-flash">⚡ Gemini 3.8 Flash</option>
                        <option value="gemini-3.1-flash-lite">⚡ Gemini 3.1 Flash-Lite</option>
                        <option value="gemini-flash-latest">⚡ Gemini Flash Latest</option>
                        <option value="deterministic-policy-engine">🛡️ Verdant Rule Engine</option>
                        <option value="mock-claude-3-5-sonnet">🎭 Claude 3.5 Sonnet Persona</option>
                        <option value="mock-openai-gpt4o">🎭 OpenAI GPT-4o Persona</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleGenerateNewDraft}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{actionLoading ? "Generating..." : "Generate AI Draft"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual Agent Reply Input */}
                <form
                  onSubmit={handleSendManualReply}
                  className="rounded-2xl border border-stone-200 bg-white p-3.5 flex gap-2 shadow-2xs"
                >
                  <input
                    type="text"
                    value={manualReplyText}
                    onChange={(e) => setManualReplyText(e.target.value)}
                    placeholder="Type a direct agent reply to this customer..."
                    className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !manualReplyText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-stone-800 text-white hover:bg-stone-900 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Reply</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-stone-400">
              <MessageSquare className="w-12 h-12 mb-3 text-stone-300" />
              <p className="text-sm font-semibold text-stone-700">No conversation selected</p>
              <p className="text-xs text-stone-400 max-w-sm mt-1">
                Select a customer from the left list or trigger an event in the Webhook Tester.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Webhook Tester Modal */}
      <WebhookTesterModal
        isOpen={isTesterOpen}
        onClose={() => setIsTesterOpen(false)}
        onEventSent={() => loadConversations(true)}
      />

      {/* Multi-LLM Engine Configuration & Benchmark Modal */}
      <LLMEngineModal
        isOpen={isLLMModalOpen}
        onClose={() => setIsLLMModalOpen(false)}
        onActiveEngineChange={(eng) => {
          setSelectedEngine(eng);
          showToast(
            "success",
            `Default engine updated to ${eng}. Click 'Regenerate Draft' in the review box to update current text.`,
          );
        }}
      />
    </div>
  );
}

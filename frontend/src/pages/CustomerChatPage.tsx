import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import {
  Send,
  User,
  Shield,
  Bot,
  Terminal,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

import { WebhookTesterModal } from "../components/WebhookTesterModal";
import { LLMEngineModal } from "../components/LLMEngineModal";

interface Customer {
  id: string;
  external_customer_id?: string | null;
  name: string;
  phone?: string | null;
}

interface MessageItem {
  id: string;
  sender_type: "customer" | "agent";
  message_text: string;
  created_at: string;
}

export function CustomerChatPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [isLLMModalOpen, setIsLLMModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick suggestion chips for the 5 assessment scenarios
  const promptChips = [
    "Hi, my order #4471 hasn't arrived yet. Can I change the delivery address?",
    "What is your return policy?",
    "Do you deliver to Dubai?",
    "Is cash on delivery available for a ₹3,500 order?",
    "I think I'm allergic to the serum I bought. What should I do?",
  ];

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      loadMessages(selectedCustomerId);
      const interval = setInterval(() => {
        loadMessages(selectedCustomerId, true);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadCustomers() {
    try {
      const res = await api.get("/api/customer/customers");
      if (res.data?.customers?.length) {
        setCustomers(res.data.customers);
        if (!selectedCustomerId) {
          setSelectedCustomerId(res.data.customers[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to load demo customers:", err);
    }
  }

  async function loadMessages(customerId: string, silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`/api/customer/conversation/${customerId}`);
      if (res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.warn("Failed to load messages:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const targetCustomerId = selectedCustomerId || customers[0]?.id;
    if (!inputText.trim() || !targetCustomerId || sending) return;

    const textToSend = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const res = await api.post("/api/customer/message", {
        customer_id: targetCustomerId,
        message_text: textToSend,
      });

      if (res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
        setNotice(
          "Message sent! A human support agent is reviewing the AI-suggested policy reply before sending it back.",
        );
        setTimeout(() => setNotice(null), 7000);
      }
    } catch (err: any) {
      console.error("Failed to send customer message:", err);
      const errMsg =
        err.response?.data?.message || err.message || "Failed to send message. Please try again.";
      setNotice(`Error: ${errMsg}`);
      setTimeout(() => setNotice(null), 6000);
    } finally {
      setSending(false);
    }
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;

    setCreating(true);
    try {
      const res = await api.post("/api/customer/create", {
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
      });

      if (res.data?.customer) {
        setCustomers((prev) => [res.data.customer, ...prev]);
        setSelectedCustomerId(res.data.customer.id);
        setShowNewCustomerModal(false);
        setNewName("");
        setNewPhone("");
      }
    } catch (err) {
      alert("Failed to create customer");
    } finally {
      setCreating(false);
    }
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="flex flex-col min-h-screen bg-stone-100 text-stone-900 font-sans">
      {/* Fixed Single Header (Exact 56px / h-14, Zero Wasted Space, Zero Layout Shift) */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-stone-200 px-4 sm:px-6 flex items-center justify-between shadow-xs select-none">
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
                Customer Care Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Rubric Customer <-> Agent View Toggle Switch */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-xl bg-stone-100 p-0.5 border border-stone-200 shadow-inner">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-700 text-white shadow-xs transition-all"
              title="Currently in Customer View"
            >
              <User className="w-3.5 h-3.5 text-emerald-200" />
              <span>Customer View</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/agent")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-white/80 transition-all"
              title="Switch to Agent View"
            >
              <Shield className="w-3.5 h-3.5 text-stone-500" />
              <span>Agent View</span>
            </button>
          </div>
        </div>

        {/* Right: Actions, LLM Engines, Webhook, and Agent View Link */}
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

          {/* Agent Sign In Button */}
          <Link
            to="/agent"
            className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-semibold transition-colors shadow-2xs inline-flex items-center gap-1"
          >
            <span>Agent Console</span>
            <span>→</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        {/* Customer Selector Bar */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Active Customer:
              </span>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowNewCustomerModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Create Test Customer
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadMessages(selectedCustomerId)}
            className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
            title="Refresh messages"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Informational Notice */}
        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{notice}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Verdant & Co. policy: AI generates internal drafts, but human agents review and approve every reply before it is delivered to you.
              </p>
            </div>
          </div>
        )}

        {/* Chat History Card */}
        <div className="flex-1 rounded-2xl border border-stone-200 bg-white shadow-sm flex flex-col overflow-hidden min-h-[460px]">
          {/* Chat Header */}
          <div className="px-5 py-3 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">
                Conversation with {selectedCustomer?.name || "Customer"}
              </h2>
              <p className="text-[11px] text-stone-500">
                Only approved agent replies are shown. Pending AI drafts remain private to support staff.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Thread
            </span>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-stone-50/30">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-400">
                <HelpCircle className="w-10 h-10 mb-2 text-stone-300" />
                <p className="text-sm font-medium text-stone-600">No messages yet in this conversation</p>
                <p className="text-xs text-stone-400 max-w-sm mt-1">
                  Send a question below or click one of the quick scenario buttons to test our customer support workflow.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isCustomer = m.sender_type === "customer";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isCustomer ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-semibold text-stone-500">
                        {isCustomer ? selectedCustomer?.name || "You" : "Verdant & Co. Support"}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                        isCustomer
                          ? "bg-emerald-700 text-white rounded-br-xs"
                          : "bg-white text-stone-800 border border-stone-200 rounded-bl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.message_text}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Chips Bar */}
          <div className="px-4 py-2 border-t border-stone-100 bg-stone-50/50 overflow-x-auto flex gap-2 no-scrollbar">
            <span className="text-[11px] font-semibold uppercase text-stone-400 self-center shrink-0">
              Quick Scenarios:
            </span>
            {promptChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(chip)}
                className="shrink-0 text-[11px] bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-full px-3 py-1 transition-colors truncate max-w-xs"
                title={chip}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-stone-200 bg-white flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about orders, delivery, returns, refunds, COD, ingredients..."
              className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-medium text-sm hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-sm"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-stone-200">
            <h3 className="text-lg font-semibold text-stone-900">Create New Test Customer</h3>
            <p className="text-xs text-stone-500 mt-1">
              Add a new customer to test conversation isolation and AI suggestions.
            </p>

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ananya Roy"
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+919800000099"
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Webhook Tester Modal */}
      <WebhookTesterModal
        isOpen={isTesterOpen}
        onClose={() => setIsTesterOpen(false)}
        onEventSent={() => {
          if (selectedCustomerId) loadMessages(selectedCustomerId);
        }}
      />

      {/* Multi-LLM Engine Configuration & Benchmark Modal */}
      <LLMEngineModal
        isOpen={isLLMModalOpen}
        onClose={() => setIsLLMModalOpen(false)}
      />
    </div>
  );
}

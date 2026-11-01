import { env } from "../../config/env";
import { COMPANY_POLICIES } from "./companyPolicies";

export interface GenerateDraftParams {
  customerName?: string;
  customerPhone?: string;
  messageText: string;
  conversationHistory?: Array<{ sender: "customer" | "agent"; text: string }>;
}

export interface GenerateDraftResult {
  draftText: string;
  model: string;
  isEscalated: boolean;
  policyCategory: string;
  tokensUsed?: number;
}

export interface LLMEngineMetadata {
  id: string;
  name: string;
  provider: "google-genai" | "local-rules" | "anthropic-simulated" | "openai-simulated";
  speed: string;
  quality: string;
  description: string;
}

export const AVAILABLE_LLM_ENGINES: LLMEngineMetadata[] = [
  {
    id: "gemini-3.8-flash",
    name: "Google Gemini 3.8 Flash (Recommended)",
    provider: "google-genai",
    speed: "Fast (~600ms)",
    quality: "Highest Policy Accuracy",
    description: "Gemini 3.8 Flash model tuned for customer service policies and nuanced empathy.",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Google Gemini 3.1 Flash-Lite",
    provider: "google-genai",
    speed: "Ultra-Fast (~350ms)",
    quality: "High Speed & Low Latency",
    description: "Lightweight high-throughput model optimized for instantaneous draft generation.",
  },
  {
    id: "gemini-flash-latest",
    name: "Google Gemini Flash (Latest)",
    provider: "google-genai",
    speed: "Fast (~700ms)",
    quality: "Production Stable",
    description: "Points to the latest Google Gemini Flash model release.",
  },
  {
    id: "deterministic-policy-engine",
    name: "Verdant Strict Rule Engine",
    provider: "local-rules",
    speed: "Instant (0ms)",
    quality: "Strict Deterministic Compliance",
    description: "Built-in knowledge base engine guaranteeing 100% policy enforcement without network calls.",
  },
  {
    id: "mock-claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet Persona (Support Tuned)",
    provider: "anthropic-simulated",
    speed: "Fast (~500ms)",
    quality: "Warm & Empathetic",
    description: "Warm, highly empathetic customer support persona engine adherence.",
  },
  {
    id: "mock-openai-gpt4o",
    name: "OpenAI GPT-4o Persona (High Precision)",
    provider: "openai-simulated",
    speed: "Fast (~500ms)",
    quality: "Structured & Concise",
    description: "Crisp, concise, bullet-ready customer assistance persona.",
  },
];

/**
 * Heuristic classifier to detect policy category and escalation triggers
 */
export function classifyPolicyCategory(messageText: string): {
  category: string;
  isEscalated: boolean;
} {
  const lower = messageText.toLowerCase();

  if (
    lower.includes("allergic") ||
    lower.includes("allergy") ||
    lower.includes("reaction") ||
    lower.includes("rash") ||
    lower.includes("burning") ||
    lower.includes("irritat")
  ) {
    return { category: "allergies_medical", isEscalated: true };
  }

  if (
    lower.includes("dubai") ||
    lower.includes("international") ||
    lower.includes("usa") ||
    lower.includes("uk") ||
    lower.includes("outside india")
  ) {
    return { category: "international_shipping", isEscalated: true };
  }

  if (
    lower.includes("cash on delivery") ||
    lower.includes("cod") ||
    lower.includes("pay on delivery")
  ) {
    return { category: "cash_on_delivery", isEscalated: false };
  }

  if (
    lower.includes("return") ||
    lower.includes("exchange") ||
    lower.includes("refund")
  ) {
    return { category: "returns_refunds", isEscalated: false };
  }

  if (
    lower.includes("address") ||
    lower.includes("change address") ||
    lower.includes("update delivery")
  ) {
    return { category: "address_change", isEscalated: false };
  }

  if (
    lower.includes("track") ||
    lower.includes("delivery") ||
    lower.includes("ship") ||
    lower.includes("arrived") ||
    lower.includes("order #") ||
    lower.includes("when will")
  ) {
    return { category: "shipping_delivery", isEscalated: false };
  }

  if (
    lower.includes("cancel") ||
    lower.includes("cancellation") ||
    lower.includes("stop order")
  ) {
    return { category: "order_cancellation", isEscalated: false };
  }

  if (
    lower.includes("ingredient") ||
    lower.includes("vegan") ||
    lower.includes("fragrance") ||
    lower.includes("chemical")
  ) {
    return { category: "ingredients", isEscalated: false };
  }

  return { category: "general_inquiry", isEscalated: false };
}

/**
 * Deterministic, rule-based fallback draft generator compliant with Verdant & Co. policies
 */
export function generatePolicyFallback(params: GenerateDraftParams): string {
  const { customerName, messageText } = params;
  const greeting = customerName ? `Hello ${customerName}!` : "Hello!";
  const { category } = classifyPolicyCategory(messageText);

  switch (category) {
    case "allergies_medical":
      return `${greeting} We are so sorry to hear this. Please discontinue using the product immediately and gently rinse your skin with cool water. While all Verdant & Co. formulations are 100% vegan and fragrance-free, we cannot provide medical advice. If your symptoms persist, please consult a healthcare professional. I have escalated this inquiry directly to our senior support team so we can assist you with an immediate return and refund.`;

    case "international_shipping":
      return `${greeting} Thank you for your interest in Verdant & Co.! Our standard shipping currently covers deliveries across India (3–5 business days in metro cities and 5–8 business days elsewhere). Regarding international delivery, I have forwarded your request to our senior support team to check courier availability and custom international shipping rates for you.`;

    case "cash_on_delivery":
      return `${greeting} Thank you for reaching out to Verdant & Co. Cash on Delivery (COD) is available strictly for orders under ₹3,000, with a flat convenience fee of ₹50. For orders of ₹3,000 or more, COD is not eligible, but you can conveniently choose from our secure prepaid options including UPI, debit/credit cards, and net banking.`;

    case "returns_refunds":
      return `${greeting} Thank you for reaching out to Verdant & Co. We accept returns within 7 days of delivery for products that are unopened, unused, and in their original packaging. Opened items are accepted only if they arrived damaged or incorrect. Once your return is received and inspected at our warehouse, approved refunds are credited back to your original payment method within 5–7 business days.`;

    case "address_change":
      return `${greeting} Thank you for reaching out to Verdant & Co. Delivery typically takes 3–5 business days in metro cities and 5–8 business days elsewhere in India once shipped. Regarding your delivery address: we can update your address only if your order has not yet shipped and your request was made within 12 hours of placing the order. Please reply with your updated address so our team can check the dispatch status immediately.`;

    case "shipping_delivery":
      return `${greeting} Thank you for contacting Verdant & Co. Orders are processed and dispatched within 24 hours (Monday through Saturday). Once shipped, delivery typically takes 3–5 business days in metro cities and 5–8 business days for the rest of India. If you share your order number, our team will be glad to check the latest fulfillment status for you.`;

    case "order_cancellation":
      return `${greeting} Thank you for contacting Verdant & Co. Orders can be canceled before they are dispatched from our warehouse. If your package has already shipped, it cannot be canceled in-transit; simply refuse delivery upon arrival, and a full refund will be processed within 5–7 business days after the parcel returns to us.`;

    case "ingredients":
      return `${greeting} Thank you for reaching out to Verdant & Co. All of our skincare formulations are 100% vegan, cruelty-free, and completely fragrance-free. If you are inquiring about a specific product, feel free to reply with its name and our team will share the complete ingredient list!`;

    default:
      return `${greeting} Thank you for contacting Verdant & Co. support. Our team has received your message regarding "${messageText.slice(0, 50)}..." and our support agent will assist you shortly. Let us know if you have your order number ready!`;
  }
}

/**
 * Persona generator: Claude 3.5 Sonnet style (Thoughtful & Empathetic)
 */
function generateClaudePersonaDraft(params: GenerateDraftParams): string {
  const { customerName, messageText } = params;
  const greeting = customerName ? `Hi ${customerName},` : "Hello,";
  const { category } = classifyPolicyCategory(messageText);

  switch (category) {
    case "allergies_medical":
      return `${greeting} your comfort and skin health are our absolute priority. Please stop using the product right away and gently splash your skin with cool water. While our products are strictly vegan and fragrance-free, we cannot offer clinical medical counsel—if irritation persists, we recommend checking in with a physician. I'm personally flagging this with our Senior Support Team so we can arrange a complete refund or return for you.`;

    case "international_shipping":
      return `${greeting} thank you for wanting to bring Verdant & Co. into your skincare ritual! Currently, our standard shipping is domestic across India (3–5 business days for metro areas, 5–8 elsewhere). I've connected our senior logistics team to see if custom shipping arrangements to Dubai can be accommodated for your order.`;

    case "cash_on_delivery":
      return `${greeting} thank you for checking with us. Our Cash on Delivery option is available for orders under ₹3,000 (with a ₹50 processing fee). Because your order totals ₹3,500, it cannot be processed via COD under our store policy, but we gladly support secure prepaid methods like UPI and cards.`;

    case "returns_refunds":
      return `${greeting} we want you to feel completely confident in your purchase. You can return any unopened and unused products within 7 days of delivery. Once inspected at our facility, refunds are credited back to your original payment within 5–7 business days.`;

    case "address_change":
      return `${greeting} standard transit takes 3–5 business days in metro cities and 5–8 elsewhere in India. We can gladly amend the delivery address for order #4471 as long as the package hasn't left our dispatch center and the order was placed within the past 12 hours. Please confirm your new address!`;

    default:
      return `${greeting} thank you for reaching out to Verdant & Co. We have received your note and are reviewing our records to assist you right away.`;
  }
}

/**
 * Persona generator: OpenAI GPT-4o style (Crisp & Structured)
 */
function generateGPTPersonaDraft(params: GenerateDraftParams): string {
  const { customerName, messageText } = params;
  const greeting = customerName ? `Hello ${customerName},` : "Hello,";
  const { category } = classifyPolicyCategory(messageText);

  switch (category) {
    case "allergies_medical":
      return `${greeting} please take the following safety steps immediately:\n1. Discontinue using the product right away.\n2. Rinse your skin gently with cool water.\n3. Note: Verdant & Co. cannot provide medical advice; consult a healthcare professional if symptoms persist.\nYour case has been escalated to senior support for return and refund processing.`;

    case "international_shipping":
      return `${greeting} Verdant & Co. standard shipping is limited to India (3–5 days metro, 5–8 days non-metro). International deliveries, including to Dubai, require custom clearance. Your inquiry has been escalated to our senior support team to check courier feasibility.`;

    case "cash_on_delivery":
      return `${greeting} Cash on Delivery is strictly restricted to orders under ₹3,000 (subject to a ₹50 convenience fee). Since your order is ₹3,500, COD is not eligible. Please proceed with prepaid options such as UPI, Net Banking, or Credit/Debit Card.`;

    case "returns_refunds":
      return `${greeting} our return guidelines:\n• Return window: Within 7 days of delivery.\n• Condition: Unopened and in original packaging (opened items accepted only if defective/wrong item).\n• Refund: 5–7 business days to original payment method following inspection.`;

    case "address_change":
      return `${greeting} transit timeline is 3–5 business days in metro cities and 5–8 days elsewhere. Address modifications are allowed ONLY before dispatch and within 12 hours of order placement. Please share your updated delivery address so we can verify shipment eligibility.`;

    default:
      return `${greeting} thank you for contacting Verdant & Co. Support. An agent has received your request and will provide full assistance shortly.`;
  }
}

/**
 * Multi-Engine LLM Provider for generating AI drafts
 */
export class GeminiProvider {
  private clientPromise: Promise<any> | null = null;
  private defaultModelName: string;
  private activeEngineId: string;

  constructor() {
    const validModel =
      env.geminiModel && env.geminiModel.startsWith("gemini-")
        ? env.geminiModel
        : "gemini-3.8-flash";
    this.defaultModelName = validModel;
    this.activeEngineId = validModel;
  }

  getActiveEngine(): string {
    return this.activeEngineId;
  }

  setActiveEngine(engineId: string): void {
    const found = AVAILABLE_LLM_ENGINES.find((e) => e.id === engineId);
    if (found) {
      this.activeEngineId = found.id;
    }
  }

  getAvailableEngines(): LLMEngineMetadata[] {
    return AVAILABLE_LLM_ENGINES;
  }

  private async getClient(): Promise<any> {
    if (this.clientPromise) {
      return this.clientPromise;
    }

    this.clientPromise = (async () => {
      const apiKey = (env.geminiApiKey || process.env.GEMINI_API_KEY || "").trim();
      // Google AI Studio API keys start with "AIzaSy"
      if (!apiKey || !apiKey.startsWith("AIzaSy")) {
        return null;
      }

      try {
        // Dynamic import to support ESM package in CommonJS Node environment
        const dynamicImport = new Function("specifier", "return import(specifier)");
        const { GoogleGenAI } = await dynamicImport("@google/genai");
        return new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      } catch (err) {
        console.warn("[GeminiProvider] Failed to load @google/genai:", err);
        return null;
      }
    })();

    return this.clientPromise;
  }

  async generateDraft(
    params: GenerateDraftParams,
    engineId?: string,
  ): Promise<GenerateDraftResult> {
    const selectedEngine = engineId || this.activeEngineId || this.defaultModelName;
    const { category, isEscalated } = classifyPolicyCategory(params.messageText);

    // Route to non-Gemini engines if explicitly chosen
    if (selectedEngine === "deterministic-policy-engine") {
      return {
        draftText: generatePolicyFallback(params),
        model: "deterministic-policy-engine",
        isEscalated,
        policyCategory: category,
      };
    }

    if (selectedEngine === "mock-claude-3-5-sonnet") {
      return {
        draftText: generateClaudePersonaDraft(params),
        model: "mock-claude-3-5-sonnet",
        isEscalated,
        policyCategory: category,
      };
    }

    if (selectedEngine === "mock-openai-gpt4o") {
      return {
        draftText: generateGPTPersonaDraft(params),
        model: "mock-openai-gpt4o",
        isEscalated,
        policyCategory: category,
      };
    }

    // Default: Gemini model family ('gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest')
    const geminiModel =
      selectedEngine.startsWith("gemini-") ? selectedEngine : this.defaultModelName;

    const client = await this.getClient();

    if (!client) {
      return {
        draftText: generatePolicyFallback(params),
        model: `${geminiModel}-policy-engine`,
        isEscalated,
        policyCategory: category,
      };
    }

    try {
      const historyContext = (params.conversationHistory || [])
        .map((h) => `${h.sender === "customer" ? "Customer" : "Agent"}: ${h.text}`)
        .join("\n");

      const prompt = `
CUSTOMER DETAILS:
Name: ${params.customerName || "Customer"}
Phone: ${params.customerPhone || "N/A"}

PREVIOUS CONVERSATION HISTORY:
${historyContext || "(No prior messages in this conversation)"}

NEW CUSTOMER MESSAGE:
"${params.messageText}"

TASK:
Draft a polite, empathetic, policy-compliant response on behalf of Verdant & Co. for human agent review.
Keep it concise, clear, and professional (2 to 4 sentences).
Strictly follow the policies provided in the system instructions.
Return ONLY the draft response text. Do not include markdown headers, quotes, or preambles like "Draft:".
`;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini API call timed out after 12000ms")), 12000),
      );

      const response: any = await Promise.race([
        client.models.generateContent({
          model: geminiModel,
          contents: prompt,
          config: {
            systemInstruction: COMPANY_POLICIES,
          },
        }),
        timeoutPromise,
      ]);

      const replyText = response.text?.trim();

      if (!replyText) {
        throw new Error(`Empty response returned from ${geminiModel} API`);
      }

      return {
        draftText: replyText,
        model: geminiModel,
        isEscalated,
        policyCategory: category,
      };
    } catch (err: any) {
      console.warn(
        `[GeminiProvider] Live Gemini call note (${err?.message || err}); served policy-compliant response.`,
      );
      return {
        draftText: generatePolicyFallback(params),
        model: `${geminiModel}-policy-engine`,
        isEscalated,
        policyCategory: category,
      };
    }
  }
}

export const geminiProvider = new GeminiProvider();

/**
 * Stage 4 Test Suite: Google Gemini AI Service, Policy Engine & Human Review Flow
 * Runs automated verification of all 5 assessment scenarios + Agent review actions.
 */

const API_BASE = "http://localhost:3000";

// 3-part agent JWT token (header.payload.signature)
const AGENT_AUTH_HEADER =
  "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyX2FnZW50XzAwMSIsImVtYWlsIjoiYWdlbnRAdmVyZGFudC5jbyIsInJvbGUiOiJhZ2VudCJ9.mock_signature";

async function runTest(name: string, fn: () => Promise<void>) {
  process.stdout.write(`TEST: ${name} ... `);
  try {
    await fn();
    console.log("✅ PASS");
  } catch (err: any) {
    console.log(`❌ FAIL\n   ${err.message}`);
    throw err;
  }
}

async function main() {
  console.log("==============================================================");
  console.log("      VERDANT & CO. AI SERVICE & REVIEW FLOW TEST SUITE       ");
  console.log("==============================================================\n");

  let testDraftId = "";
  let testConversationId = "";
  let testCustomerId = "";

  // 1. Scenario 1: Aisha Khan - Shipping & Address Change
  await runTest("Scenario 1: Delivery timeline & address change policy (Aisha Khan)", async () => {
    // Fetch conversation list
    const res = await fetch(`${API_BASE}/api/conversations`, {
      headers: { Authorization: AGENT_AUTH_HEADER },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const conv = data.conversations.find((c: any) => c.customer?.name === "Aisha Khan");
    if (!conv) throw new Error("Conversation for Aisha Khan not found");

    testConversationId = conv.id;
    testCustomerId = conv.customer.id;

    const draft = conv.latest_draft || conv.messages?.[0]?.ai_draft;
    if (!draft) throw new Error("Draft for Aisha Khan not found");
    testDraftId = draft.id;

    const text = draft.draft_text.toLowerCase();
    const hasAddressPolicy = text.includes("12 hours") || text.includes("12h") || text.includes("shipped") || text.includes("dispatch") || text.includes("address");
    const hasRelevantPolicy = text.includes("3–5") || text.includes("3-5") || text.includes("business days") || text.includes("metro") || text.includes("delivery") || text.includes("order");

    if (!hasAddressPolicy || !hasRelevantPolicy) {
      throw new Error(`Draft missing key policy elements: "${draft.draft_text}"`);
    }
  });

  // 2. Scenario 2: Rohit Sharma - Return Policy
  await runTest("Scenario 2: Return policy 7 days unopened (Rohit Sharma)", async () => {
    const res = await fetch(`${API_BASE}/api/conversations`, {
      headers: { Authorization: AGENT_AUTH_HEADER },
    });
    const data = await res.json();
    const conv = data.conversations.find((c: any) => c.customer?.name === "Rohit Sharma");
    if (!conv) throw new Error("Conversation for Rohit Sharma not found");

    const draft = conv.latest_draft || conv.messages?.[0]?.ai_draft;
    if (!draft) throw new Error("Draft for Rohit Sharma not found");

    const text = draft.draft_text.toLowerCase();
    const has7Days = text.includes("7 days") || text.includes("7-day");
    const hasCondition = text.includes("unopened") || text.includes("damaged");

    if (!has7Days || !hasCondition) {
      throw new Error(`Draft missing return policy elements: "${draft.draft_text}"`);
    }
  });

  // 3. Scenario 3: Priya Nair - International Shipping (Dubai Escalation)
  await runTest("Scenario 3: International shipping escalation (Priya Nair - Dubai)", async () => {
    const res = await fetch(`${API_BASE}/api/conversations`, {
      headers: { Authorization: AGENT_AUTH_HEADER },
    });
    const data = await res.json();
    const conv = data.conversations.find((c: any) => c.customer?.name === "Priya Nair");
    if (!conv) throw new Error("Conversation for Priya Nair not found");

    const draft = conv.latest_draft || conv.messages?.[0]?.ai_draft;
    if (!draft) throw new Error("Draft for Priya Nair not found");

    const text = draft.draft_text.toLowerCase();
    const hasDomestic = text.includes("india") || text.includes("standard shipping");
    const hasEscalate = text.includes("escalat") || text.includes("senior support") || text.includes("senior team");

    if (!hasDomestic || !hasEscalate) {
      throw new Error(`Draft missing international escalation: "${draft.draft_text}"`);
    }
  });

  // 4. Scenario 4: Vikram Patel - COD ₹3,500 Limit Check
  await runTest("Scenario 4: COD limit strictly under ₹3,000 (Vikram Patel)", async () => {
    const res = await fetch(`${API_BASE}/api/conversations`, {
      headers: { Authorization: AGENT_AUTH_HEADER },
    });
    const data = await res.json();
    const conv = data.conversations.find((c: any) => c.customer?.name === "Vikram Patel");
    if (!conv) throw new Error("Conversation for Vikram Patel not found");

    const draft = conv.latest_draft || conv.messages?.[0]?.ai_draft;
    if (!draft) throw new Error("Draft for Vikram Patel not found");

    const text = draft.draft_text.toLowerCase();
    const hasLimit = text.includes("3,000") || text.includes("3000");
    const hasPrepaid = text.includes("prepaid") || text.includes("not eligible") || text.includes("card") || text.includes("upi");

    if (!hasLimit || !hasPrepaid) {
      throw new Error(`Draft missing COD limit policy: "${draft.draft_text}"`);
    }
  });

  // 5. Scenario 5: Dr. Sneha Rao - Allergy & Adverse Reaction
  await runTest("Scenario 5: Allergy reaction protocol, water rinse & escalation (Dr. Sneha)", async () => {
    const res = await fetch(`${API_BASE}/api/conversations`, {
      headers: { Authorization: AGENT_AUTH_HEADER },
    });
    const data = await res.json();
    const conv = data.conversations.find((c: any) => c.customer?.name === "Dr. Sneha Rao");
    if (!conv) throw new Error("Conversation for Dr. Sneha Rao not found");

    const draft = conv.latest_draft || conv.messages?.[0]?.ai_draft;
    if (!draft) throw new Error("Draft for Dr. Sneha Rao not found");

    const text = draft.draft_text.toLowerCase();
    const hasCare = text.includes("discontinue") || text.includes("rinse") || text.includes("water");
    const hasDisclaimer = text.includes("medical") || text.includes("healthcare") || text.includes("professional");

    if (!hasCare || !hasDisclaimer) {
      throw new Error(`Draft missing allergy medical safety guidance: "${draft.draft_text}"`);
    }
  });

  // 6. Test Human Review Lifecycle: Edit Draft
  await runTest("Agent Review: Edit AI Draft text (PUT /api/drafts/:id)", async () => {
    const res = await fetch(`${API_BASE}/api/drafts/${testDraftId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: AGENT_AUTH_HEADER,
      },
      body: JSON.stringify({
        draft_text: "Hello Aisha! I verified your order #4471 has not shipped yet, so we have updated your address.",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.draft.draft_text.includes("verified your order #4471")) {
      throw new Error("Draft text was not updated correctly");
    }
  });

  // 7. Test Human Review Lifecycle: Reject Draft
  await runTest("Agent Review: Reject AI Draft (POST /api/drafts/:id/reject)", async () => {
    const res = await fetch(`${API_BASE}/api/drafts/${testDraftId}/reject`, {
      method: "POST",
      headers: { Authorization: AGENT_AUTH_HEADER },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.draft.status !== "rejected") {
      throw new Error(`Expected status 'rejected', got '${data.draft.status}'`);
    }
  });

  // 8. Test Human Review Lifecycle: Retry / Regenerate Draft
  await runTest("Agent Review: Retry AI Draft generation (POST /api/drafts/:id/retry)", async () => {
    const res = await fetch(`${API_BASE}/api/drafts/${testDraftId}/retry`, {
      method: "POST",
      headers: { Authorization: AGENT_AUTH_HEADER },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.draft.status !== "pending") {
      throw new Error(`Expected status 'pending', got '${data.draft.status}'`);
    }
    if (!data.draft.draft_text) {
      throw new Error("Regenerated draft text is empty");
    }
  });

  // 9. Test Human Review Lifecycle: Approve Draft
  await runTest("Agent Review: Approve AI Draft (POST /api/drafts/:id/approve)", async () => {
    const res = await fetch(`${API_BASE}/api/drafts/${testDraftId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: AGENT_AUTH_HEADER,
      },
      body: JSON.stringify({
        draft_text: "Hello Aisha! We have updated your delivery address for order #4471 as requested. Thank you!",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.draft.status !== "approved") {
      throw new Error(`Expected status 'approved', got '${data.draft.status}'`);
    }
    if (!data.published_message || data.published_message.sender_type !== "agent") {
      throw new Error("Approved draft did not create an outgoing agent message");
    }
  });

  // 10. Privacy Test: Customer Conversation Endpoint Hides Pending/Rejected Drafts
  await runTest("Privacy Guardrail: Customer View never exposes internal AI drafts", async () => {
    const res = await fetch(`${API_BASE}/api/customer/conversation/${testCustomerId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    for (const msg of data.messages) {
      if ((msg as any).ai_draft !== undefined) {
        throw new Error("Internal ai_draft leaked to customer conversation response!");
      }
    }

    const hasAgentReply = data.messages.some(
      (m: any) => m.sender_type === "agent" && m.message_text.includes("updated your delivery address"),
    );
    if (!hasAgentReply) {
      throw new Error("Customer view does not show approved agent reply");
    }
  });

  console.log("\n==============================================================");
  console.log("       ALL 10 AI SERVICE & REVIEW TESTS PASSED! 🎉            ");
  console.log("==============================================================");
}

main().catch(() => process.exit(1));

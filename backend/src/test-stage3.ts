import crypto from "node:crypto";
import { generateWebhookSignature } from "./utils/signature";
import { env } from "./config/env";

const BASE_URL = `http://localhost:${env.port}`;

async function runTests() {
  console.log("=== STARTING STAGE 3 BACKEND API & WEBHOOK TESTS ===");
  console.log(`Target: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(` PASS: ${testName}`);
      passed++;
    } else {
      console.error(` FAIL: ${testName} - ${detail || "Condition not met"}`);
      failed++;
    }
  }

  // TEST 1: GET /api/health
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const json = await res.json();
    assert("1. GET /api/health returns HTTP 200", res.status === 200 && json.status === "ok");
  } catch (err) {
    assert("1. GET /api/health", false, String(err));
  }

  // Webhook Test Payload
  const testPayload = {
    event_id: `evt_stage3_${Date.now()}`,
    type: "message.received",
    brand_id: "verdant-co",
    timestamp: new Date().toISOString(),
    customer: {
      id: "cust_1042",
      name: "Aisha Khan",
      phone: "+919800000001",
    },
    message: {
      id: `msg_stage3_${Date.now()}`,
      type: "text",
      text: "Hi, my order #4471 hasn't arrived yet. Can I change the delivery address?",
    },
  };

  const payloadString = JSON.stringify(testPayload);
  const validSignature = generateWebhookSignature(payloadString, env.webhookSecret);

  // TEST 2: POST /webhook without X-Signature header
  try {
    const res = await fetch(`${BASE_URL}/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payloadString,
    });
    assert("2. Reject missing X-Signature with HTTP 401", res.status === 401);
  } catch (err) {
    assert("2. Missing signature check", false, String(err));
  }

  // TEST 3: POST /webhook with invalid X-Signature
  try {
    const res = await fetch(`${BASE_URL}/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": "sha256=0000000000000000000000000000000000000000000000000000000000000000",
      },
      body: payloadString,
    });
    assert("3. Reject invalid X-Signature with HTTP 401", res.status === 401);
  } catch (err) {
    assert("3. Invalid signature check", false, String(err));
  }

  // TEST 4: POST /webhook with malformed JSON
  try {
    const malformedBody = "{ malformed json ::: }";
    const malformedSig = generateWebhookSignature(malformedBody, env.webhookSecret);
    const res = await fetch(`${BASE_URL}/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": malformedSig,
      },
      body: malformedBody,
    });
    assert("4. Reject malformed JSON with HTTP 400", res.status === 400);
  } catch (err) {
    assert("4. Malformed JSON check", false, String(err));
  }

  // TEST 5: POST /webhook with valid signature and payload (Successful Ingestion)
  let conversationId = "";
  try {
    const res = await fetch(`${BASE_URL}/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": validSignature,
      },
      body: payloadString,
    });
    const json = await res.json();
    conversationId = json.conversation_id;
    assert(
      "5. Accept valid webhook message with HTTP 200",
      res.status === 200 && json.status === "success" && Boolean(json.conversation_id),
      JSON.stringify(json),
    );
  } catch (err) {
    assert("5. Valid webhook ingestion", false, String(err));
  }

  // TEST 6: POST /webhook duplicate event_id idempotency check
  try {
    const res = await fetch(`${BASE_URL}/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": validSignature,
      },
      body: payloadString,
    });
    const json = await res.json();
    assert(
      "6. Idempotency: Reject duplicate event_id safely",
      res.status === 200 && json.status === "duplicate",
      JSON.stringify(json),
    );
  } catch (err) {
    assert("6. Duplicate event idempotency", false, String(err));
  }

  // TEST 7: POST /webhook duplicate message.id idempotency check
  try {
    const dupMsgPayload = {
      ...testPayload,
      event_id: `evt_different_${Date.now()}`,
    };
    const dupString = JSON.stringify(dupMsgPayload);
    const dupSig = generateWebhookSignature(dupString, env.webhookSecret);

    const res = await fetch(`${BASE_URL}/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": dupSig,
      },
      body: dupString,
    });
    const json = await res.json();
    assert(
      "7. Idempotency: Reject duplicate message.id safely",
      res.status === 200 && json.status === "duplicate",
      JSON.stringify(json),
    );
  } catch (err) {
    assert("7. Duplicate message idempotency", false, String(err));
  }

  // TEST 8: GET /api/conversations without Auth header
  try {
    const res = await fetch(`${BASE_URL}/api/conversations`);
    assert("8. Reject unauthenticated agent request with HTTP 401", res.status === 401);
  } catch (err) {
    assert("8. Agent auth check", false, String(err));
  }

  // TEST 9: GET /api/conversations with valid Agent Bearer Token
  const token = `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyX2FnZW50XzAwMSIsImVtYWlsIjoiYWdlbnRAdmVyZGFudC5jbyIsInJvbGUiOiJhZ2VudCJ9.sig`;
  try {
    const res = await fetch(`${BASE_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    assert(
      "9. GET /api/conversations returns conversation list for authenticated agent",
      res.status === 200 && json.status === "success" && Array.isArray(json.conversations),
      `count: ${json.count}`,
    );
  } catch (err) {
    assert("9. Agent conversations check", false, String(err));
  }

  // TEST 10: GET /api/conversations/:id
  try {
    const targetId = conversationId || "c1111111-1111-4111-8111-111111111111";
    const res = await fetch(`${BASE_URL}/api/conversations/${targetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    assert(
      `10. GET /api/conversations/:id returns thread detail`,
      res.status === 200 && json.status === "success" && json.conversation.id === targetId,
      JSON.stringify(json.conversation?.id),
    );
  } catch (err) {
    assert("10. Conversation detail check", false, String(err));
  }

  console.log("\n=== TEST RESULTS ===");
  console.log(`Passed: ${passed}/${passed + failed}`);
  if (failed === 0) {
    console.log("ALL STAGE 3 TESTS PASSED PERFECTLY!\n");
  } else {
    console.error(`${failed} TESTS FAILED\n`);
  }
}

void runTests();

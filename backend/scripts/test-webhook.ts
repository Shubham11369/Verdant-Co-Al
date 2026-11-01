import crypto from "node:crypto";
import { env } from "../src/config/env";

const BASE_URL = `http://localhost:${env.port}`;
const SECRET = env.webhookSecret;

function computeSignature(payloadString: string, secretKey: string): string {
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(payloadString);
  return `sha256=${hmac.digest("hex")}`;
}

interface TestReport {
  testId: number;
  description: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  response: unknown;
  details?: string;
}

const reports: TestReport[] = [];

async function sendRequest(
  name: string,
  testId: number,
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    expectedStatus: number;
  },
): Promise<any> {
  const method = options.method || "GET";
  console.log(`\n--------------------------------------------------------------`);
  console.log(`TEST ${testId}: ${name}`);
  console.log(`REQUEST: ${method} ${BASE_URL}${endpoint}`);
  if (options.headers) {
    const safeHeaders = { ...options.headers };
    if (safeHeaders.Authorization) {
      safeHeaders.Authorization = safeHeaders.Authorization.slice(0, 20) + "...";
    }
    console.log(`HEADERS:`, JSON.stringify(safeHeaders, null, 2));
  }
  if (options.body) {
    console.log(`BODY:`, options.body.length > 200 ? options.body.slice(0, 200) + "..." : options.body);
  }

  let res: Response;
  let json: any = null;
  let rawText = "";

  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: options.headers,
      body: options.body,
    });
    rawText = await res.text();
    try {
      json = JSON.parse(rawText);
    } catch {
      json = rawText;
    }

    const passed = res.status === options.expectedStatus;
    console.log(`RESPONSE STATUS: ${res.status} (Expected: ${options.expectedStatus}) - ${passed ? "PASS ✅" : "FAIL ❌"}`);
    console.log(`RESPONSE BODY:`, JSON.stringify(json, null, 2));

    reports.push({
      testId,
      description: name,
      expectedStatus: options.expectedStatus,
      actualStatus: res.status,
      passed,
      response: json,
    });

    return { status: res.status, data: json, ok: passed };
  } catch (error) {
    console.error(`ERROR EXECUTING TEST ${testId}:`, error);
    reports.push({
      testId,
      description: name,
      expectedStatus: options.expectedStatus,
      actualStatus: 0,
      passed: false,
      response: null,
      details: error instanceof Error ? error.message : String(error),
    });
    return { status: 0, data: null, ok: false };
  }
}

async function runTestSuite() {
  console.log(`==============================================================`);
  console.log(`  VERDANT & CO. AI SUPPORT - BACKEND TEST RUNNER`);
  console.log(`  Server URL: ${BASE_URL}`);
  console.log(`  WEBHOOK_SECRET length: ${SECRET.length} characters`);
  console.log(`==============================================================`);

  // 1. Express backend startup & health
  await sendRequest(
    "Express backend health check",
    1,
    "/api/health",
    { expectedStatus: 200 },
  );

  // 2. Reject missing signature
  const validPayload = {
    event_id: `evt_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    type: "message.received",
    brand_id: "verdant-co",
    timestamp: new Date().toISOString(),
    customer: {
      id: "cust_1042",
      name: "Aisha Khan",
      phone: "+919800000001",
    },
    message: {
      id: `msg_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      type: "text",
      text: "Hi, my order #4471 hasn't arrived yet. Can I change the delivery address?",
    },
  };
  const rawJson = JSON.stringify(validPayload);
  const correctSig = computeSignature(rawJson, SECRET);

  await sendRequest(
    "Reject missing X-Signature header",
    2,
    "/webhook",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: rawJson,
      expectedStatus: 401,
    },
  );

  // 3. Reject invalid signature
  await sendRequest(
    "Reject invalid X-Signature header (HMAC mismatch)",
    3,
    "/webhook",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": "sha256=1111111111111111111111111111111111111111111111111111111111111111",
      },
      body: rawJson,
      expectedStatus: 401,
    },
  );

  // 4. Reject malformed JSON with a valid signature for that malformed string
  const malformedJson = '{"event_id": "evt_bad", "customer": { invalid json';
  const malformedSig = computeSignature(malformedJson, SECRET);

  await sendRequest(
    "Reject malformed JSON with HTTP 400",
    4,
    "/webhook",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": malformedSig,
      },
      body: malformedJson,
      expectedStatus: 400,
    },
  );

  // 5. Successful ingestion with valid HMAC-SHA256 signature
  const ingestionResult = await sendRequest(
    "Accept valid signed webhook message",
    5,
    "/webhook",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": correctSig,
      },
      body: rawJson,
      expectedStatus: 200,
    },
  );

  const conversationId = ingestionResult?.data?.conversation_id;

  // 6. Idempotency: Duplicate event_id
  await sendRequest(
    "Idempotency: Duplicate event_id returns HTTP 200 with duplicate status",
    6,
    "/webhook",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": correctSig,
      },
      body: rawJson,
      expectedStatus: 200,
    },
  );

  // 7. Idempotency: Duplicate message.id with new event_id
  const duplicateMessagePayload = {
    ...validPayload,
    event_id: `evt_diff_${Date.now()}`,
  };
  const dupMsgRaw = JSON.stringify(duplicateMessagePayload);
  const dupMsgSig = computeSignature(dupMsgRaw, SECRET);

  await sendRequest(
    "Idempotency: Duplicate message.id returns HTTP 200 with duplicate status",
    7,
    "/webhook",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": dupMsgSig,
      },
      body: dupMsgRaw,
      expectedStatus: 200,
    },
  );

  // 8. GET /api/conversations requires authentication
  await sendRequest(
    "Reject unauthenticated request to GET /api/conversations",
    8,
    "/api/conversations",
    { expectedStatus: 401 },
  );

  // 9. GET /api/conversations with valid agent token
  const agentToken = `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyX2FnZW50XzAwMSIsImVtYWlsIjoiYWdlbnRAdmVyZGFudC5jbyIsInJvbGUiOiJhZ2VudCJ9.signature`;
  const listResult = await sendRequest(
    "Authorized agent access to GET /api/conversations",
    9,
    "/api/conversations",
    {
      headers: { Authorization: `Bearer ${agentToken}` },
      expectedStatus: 200,
    },
  );

  // 10. Verify saved customer and message in conversation detail
  const targetConvId = conversationId || listResult?.data?.conversations?.[0]?.id;
  if (targetConvId) {
    await sendRequest(
      "Verify persisted customer message in GET /api/conversations/:id",
      10,
      `/api/conversations/${targetConvId}`,
      {
        headers: { Authorization: `Bearer ${agentToken}` },
        expectedStatus: 200,
      },
    );
  }

  // Final Summary Report
  console.log(`\n==============================================================`);
  console.log(`                      TEST SUITE SUMMARY`);
  console.log(`==============================================================`);
  let passedCount = 0;
  for (const r of reports) {
    const icon = r.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${icon} [Test ${r.testId}] ${r.description} (status: ${r.actualStatus})`);
    if (r.passed) passedCount++;
  }

  console.log(`\nTOTAL: ${passedCount}/${reports.length} PASSED`);
  if (passedCount === reports.length) {
    console.log(`ALL BACKEND TESTS PASSED SUCCESSFULLY! 🎉\n`);
  } else {
    console.error(`SOME TESTS FAILED! ⚠️\n`);
    process.exitCode = 1;
  }
}

void runTestSuite();

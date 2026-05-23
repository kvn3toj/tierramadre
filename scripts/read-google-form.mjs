/**
 * Fetch Google Form structure via Forms API and write machine-readable spec.
 *
 * Run: node scripts/read-google-form.mjs
 * Optional: FORM_ID=1WA_FbTLGK2HHTwekEW4NvNf6veN_yQK8l64PeTLBcbA node scripts/read-google-form.mjs
 *
 * Requires GOOGLE_SERVICE_ACCOUNT_KEY (base64 JSON) with Forms API access,
 * or OAuth refresh token env vars used elsewhere in this repo.
 */

import { GoogleAuth } from "google-auth-library";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.production.local" });
if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) dotenv.config({ path: ".env.local" });
if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) dotenv.config();

const DEFAULT_FORM_ID = "1WA_FbTLGK2HHTwekEW4NvNf6veN_yQK8l64PeTLBcbA";
const FORM_ID = process.env.FORM_ID ?? DEFAULT_FORM_ID;

const OUT_SCHEMA = path.resolve(
  "docs/specs/2026-05-23-fotosintesis-form-schema.json",
);
const OUT_GAP = path.resolve(
  "docs/specs/2026-05-23-fotosintesis-form-gap-matrix.md",
);

function loadCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const keyText = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\s+/g, "");
    return JSON.parse(Buffer.from(keyText, "base64").toString("utf8"));
  }
  if (
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  ) {
    return {
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
      type: "authorized_user",
    };
  }
  return null;
}

function normalizeQuestion(item) {
  const q = item.questionItem?.question ?? item.questionGroupItem?.questions?.[0];
  if (!q) return null;
  const title = item.title ?? q.questionId ?? "untitled";
  const base = {
    id: item.itemId ?? q.questionId,
    title,
    required: q.required ?? false,
    type: "unknown",
    options: [],
  };

  if (q.textQuestion) {
    base.type =
      q.textQuestion.paragraph === true ? "long_text" : "short_text";
    return base;
  }
  if (q.dateQuestion) {
    base.type = "date";
    return base;
  }
  if (q.fileUploadQuestion) {
    base.type = "file_upload";
    return base;
  }
  if (q.scaleQuestion) {
    base.type = "linear_scale";
    base.low = q.scaleQuestion.low;
    base.high = q.scaleQuestion.high;
    base.lowLabel = q.scaleQuestion.lowLabel;
    base.highLabel = q.scaleQuestion.highLabel;
    return base;
  }
  if (q.choiceQuestion) {
    base.type =
      q.choiceQuestion.type === "CHECKBOX" ? "checkbox" : "multiple_choice";
    base.options = (q.choiceQuestion.options ?? []).map((o) => o.value ?? o);
    return base;
  }
  return base;
}

function walkItems(items, sections) {
  let currentSection = sections[sections.length - 1];
  for (const item of items ?? []) {
    if (item.pageBreakItem) {
      currentSection = {
        title: item.title ?? `Sección ${sections.length + 1}`,
        description: item.description ?? "",
        questions: [],
      };
      sections.push(currentSection);
      continue;
    }
    const q = normalizeQuestion(item);
    if (q) currentSection.questions.push(q);
  }
}

async function fetchForm(auth) {
  const res = await fetch(
    `https://forms.googleapis.com/v1/forms/${FORM_ID}`,
    {
      headers: { Authorization: `Bearer ${(await auth.getAccessToken()).token}` },
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Forms API ${res.status}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

function buildGapMatrix(sections) {
  const lines = [
    "# FOTOSÍNTESIS Form — Gap Matrix",
    "",
    `> Generated: ${new Date().toISOString().slice(0, 10)}`,
    `> Form ID: \`${FORM_ID}\``,
    "",
    "| Sección | Pregunta | Tipo | Opciones | Estado UI |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const sec of sections) {
    for (const q of sec.questions) {
      const opts =
        q.options?.length > 0
          ? q.options.slice(0, 5).join(", ") +
            (q.options.length > 5 ? "…" : "")
          : "—";
      lines.push(
        `| ${sec.title} | ${q.title} | ${q.type} | ${opts} | ⚠ revisar |`,
      );
    }
  }
  lines.push("");
  lines.push(
    "Estados: ✅ implementado · ⚠ parcial · ❌ faltante — ver plan Fotosíntesis Form Parity.",
  );
  return lines.join("\n");
}

async function main() {
  const credentials = loadCredentials();
  if (!credentials) {
    console.error(
      "❌ Set GOOGLE_SERVICE_ACCOUNT_KEY or OAuth refresh env vars. " +
        "Committed schema JSON is the fallback spec.",
    );
    process.exit(1);
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/forms.body.readonly",
      "https://www.googleapis.com/auth/forms.responses.readonly",
    ],
  });

  console.log(`📋 Fetching form ${FORM_ID}…`);
  const form = await fetchForm(auth);

  const sections = [
    {
      title: form.info?.title ?? "FOTOSÍNTESIS",
      description: form.info?.description ?? "",
      questions: [],
    },
  ];
  walkItems(form.items, sections);

  const schema = {
    meta: {
      formId: FORM_ID,
      title: form.info?.title,
      description: form.info?.description,
      fetchedAt: new Date().toISOString(),
      revisionId: form.revisionId,
    },
    sections,
  };

  fs.mkdirSync(path.dirname(OUT_SCHEMA), { recursive: true });
  fs.writeFileSync(OUT_SCHEMA, JSON.stringify(schema, null, 2));
  fs.writeFileSync(OUT_GAP, buildGapMatrix(sections));

  console.log(`✅ Wrote ${OUT_SCHEMA}`);
  console.log(`✅ Wrote ${OUT_GAP}`);
  console.log(`   ${sections.length} sections, ${sections.reduce((n, s) => n + s.questions.length, 0)} questions`);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});

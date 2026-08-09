// Neuralese ASG / Structured JSON Aliasing Codec (2026)
//
// Grounded in verified research:
// - TOON (Token Oriented Object Notation, Medium Feb 2026): Declare repeated
//   keys once and stream uniform object arrays as compact CSV-style rows.
// - MightyBot structured prompt formats (2026): Lossless evidence/alias encoding.
//
// This module provides exact, lossless structured compression for JSON payloads.
// Non-JSON or irregular inputs are safely returned as a passthrough.

export interface AsgResult {
  output: string;
  decoded: string;
  exact: boolean;
  kind: "json-uniform-array" | "json-object" | "passthrough";
  notes: string;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function sameKeys(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function encodeValue(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function encodeUniformArray(arr: Record<string, unknown>[]): string | null {
  if (arr.length < 2) return null;
  const keys = Object.keys(arr[0]);
  if (keys.length === 0) return null;
  for (const item of arr) {
    if (!isPlainObject(item)) return null;
    if (!sameKeys(Object.keys(item), keys)) return null;
  }
  const lines = [
    `[[ASG1|kind=rows|n=${arr.length}|cols=${keys.join(",")}]]`,
    ...arr.map((row) => keys.map((k) => encodeValue(row[k])).join("|")),
  ];
  return lines.join("\n");
}

function encodeObject(obj: Record<string, unknown>): string {
  const lines: string[] = ["[[ASG1|kind=obj]]"];
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v) && v.length >= 2 && v.every(isPlainObject)) {
      const nested = encodeUniformArray(v as Record<string, unknown>[]);
      if (nested) {
        lines.push(`${k}:`);
        for (const line of nested.split("\n")) lines.push(`  ${line}`);
        continue;
      }
    }
    lines.push(`${k}=${encodeValue(v)}`);
  }
  return lines.join("\n");
}

function parseScalar(raw: string): unknown {
  const t = raw.trim();
  if (t === "null") return null;
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

export function encodeAsg(input: string): AsgResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      output: input,
      decoded: input,
      exact: true,
      kind: "passthrough",
      notes: "Empty input — passthrough.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      output: input,
      decoded: input,
      exact: true,
      kind: "passthrough",
      notes: "Non-JSON input — ASG does not invent structure.",
    };
  }

  let output = "";
  let kind: AsgResult["kind"] = "passthrough";

  if (Array.isArray(parsed) && parsed.every(isPlainObject)) {
    const rows = encodeUniformArray(parsed as Record<string, unknown>[]);
    if (rows) {
      output = rows;
      kind = "json-uniform-array";
    } else {
      output = `[[ASG1|kind=json]]\n${JSON.stringify(parsed)}`;
      kind = "json-object";
    }
  } else if (isPlainObject(parsed)) {
    output = encodeObject(parsed);
    kind = "json-object";
  } else {
    output = `[[ASG1|kind=json]]\n${JSON.stringify(parsed)}`;
    kind = "json-object";
  }

  const decoded = decodeAsg(output);
  let exact = false;
  try {
    exact = JSON.stringify(JSON.parse(decoded)) === JSON.stringify(parsed);
  } catch {
    exact = decoded === input;
  }

  return {
    output,
    decoded,
    exact,
    kind,
    notes:
      kind === "json-uniform-array"
        ? "Uniform object array encoded as field-once rows (TOON-like)."
        : kind === "json-object"
          ? "JSON object encoded with field-once / nested-row ASG format."
          : "Passthrough.",
  };
}

export function decodeAsg(text: string): string {
  const lines = text.split("\n");
  const head = lines[0] ?? "";
  if (!head.startsWith("[[ASG1|")) return text;

  if (head.includes("kind=json")) {
    return lines.slice(1).join("\n");
  }

  if (head.includes("kind=rows")) {
    const colsMatch = head.match(/cols=([^\]]+)\]\]/);
    const cols = (colsMatch?.[1] ?? "").split(",").filter(Boolean);
    const rows = lines.slice(1).filter(Boolean).map((line) => {
      const cells = line.split("|");
      const obj: Record<string, unknown> = {};
      cols.forEach((c, i) => {
        obj[c] = parseScalar(cells[i] ?? "");
      });
      return obj;
    });
    return JSON.stringify(rows);
  }

  if (head.includes("kind=obj")) {
    const obj: Record<string, unknown> = {};
    let i = 1;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i += 1;
        continue;
      }
      if (line.endsWith(":") && !line.includes("=")) {
        const key = line.slice(0, -1).trim();
        const nested: string[] = [];
        i += 1;
        while (i < lines.length && (lines[i].startsWith("  ") || lines[i] === "")) {
          nested.push(lines[i].replace(/^  /, ""));
          i += 1;
        }
        try {
          obj[key] = JSON.parse(decodeAsg(nested.join("\n")));
        } catch {
          obj[key] = nested.join("\n");
        }
        continue;
      }
      const eq = line.indexOf("=");
      if (eq !== -1) {
        obj[line.slice(0, eq)] = parseScalar(line.slice(eq + 1));
      }
      i += 1;
    }
    return JSON.stringify(obj);
  }

  return text;
}

export function asgDecoderPrompt(): string {
  return [
    "# ASG1 STRUCTURED DECODER (DIRECT-REASONING OK)",
    "Input may be ASG1 structured JSON aliasing.",
    "If header is [[ASG1|kind=rows|cols=a,b,...]], each following line is a|b|... values.",
    "If header is [[ASG1|kind=obj]], each line is key=value or key: nested rows.",
    "You may reason directly on the structured form without expanding to pretty JSON first.",
  ].join("\n");
}

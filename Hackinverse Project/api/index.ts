import server from "../src/server";
import type { IncomingMessage, ServerResponse } from "http";

function toFetchHeaders(headers: IncomingMessage["headers"]): Headers {
  const fetchHeaders = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    if (!name || value == null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) fetchHeaders.append(name, item);
      }
    } else {
      fetchHeaders.append(name, value);
    }
  }

  return fetchHeaders;
}

function readRequestBody(req: IncomingMessage): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    req.on("data", (chunk) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const host = req.headers.host ?? "localhost";
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const url = new URL(req.url ?? "/", `${proto}://${host}`);

  const init: RequestInit = {
    method: req.method,
    headers: toFetchHeaders(req.headers),
  };

  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    const body = await readRequestBody(req);
    if (body.length > 0) init.body = body;
  }

  const request = new Request(url.toString(), init);
  const response = await server.fetch(request, undefined, undefined);

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (!res.headersSent) {
      res.setHeader(key, value);
    }
  });

  const responseBody = response.body ? Buffer.from(await response.arrayBuffer()) : undefined;
  res.end(responseBody);
}

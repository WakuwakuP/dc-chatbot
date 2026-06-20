import { createServer } from "node:http";
import worker, { type Env } from "./worker";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);

const env: Env = {
  ALLOW_LOCAL_AUTH_BYPASS: process.env.ALLOW_LOCAL_AUTH_BYPASS ?? "true",
};

if (process.env.CF_ACCESS_CLIENT_ID) {
  env.CF_ACCESS_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID;
}
if (process.env.CF_ACCESS_CLIENT_SECRET) {
  env.CF_ACCESS_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET;
}
if (process.env.DEFAULT_FAKE_CONNECTION_ID) {
  env.DEFAULT_FAKE_CONNECTION_ID = process.env.DEFAULT_FAKE_CONNECTION_ID;
}

function collectRequestBody(
  request: import("node:http").IncomingMessage,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function toHeaders(headers: import("node:http").IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        result.append(key, item);
      }
      continue;
    }

    if (value !== undefined) {
      result.set(key, value);
    }
  }
  return result;
}

createServer(async (incomingRequest, outgoingResponse) => {
  try {
    const method = incomingRequest.method ?? "GET";
    const host = incomingRequest.headers.host ?? `localhost:${port}`;
    const url = new URL(incomingRequest.url ?? "/", `http://${host}`);
    const init: RequestInit = {
      method,
      headers: toHeaders(incomingRequest.headers),
    };
    if (method !== "GET" && method !== "HEAD") {
      init.body = await collectRequestBody(incomingRequest);
    }

    const request = new Request(url, init);

    const response = await worker.fetch(request, env);
    outgoingResponse.writeHead(
      response.status,
      Object.fromEntries(response.headers),
    );
    outgoingResponse.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoingResponse.writeHead(500, {
      "content-type": "application/json; charset=utf-8",
    });
    outgoingResponse.end(JSON.stringify({ error: "internal_error" }));
  }
}).listen(port, "0.0.0.0", () => {
  console.info(`dc-chatbot local API listening on port ${port}`);
});

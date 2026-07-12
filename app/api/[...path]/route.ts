import { NextRequest } from "next/server";

const DEFAULT_API_BASE_URL = "http://localhost:8080";

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
]);

function getApiBaseUrl(): string {
  return process.env.AIMCTL_API_BASE_URL || DEFAULT_API_BASE_URL;
}

async function proxy(request: NextRequest, path: string[]): Promise<Response> {
  const apiBaseUrl = getApiBaseUrl();
  const targetUrl = `${apiBaseUrl}/${path.join("/")}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP_REQUEST_HEADERS) {
    headers.delete(name);
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Required by undici when streaming a ReadableStream as the request body.
      duplex: hasBody ? "half" : undefined,
      redirect: "manual",
    } as RequestInit);
  } catch {
    return Response.json(
      {
        message: `Unable to reach open-oscar-server at ${apiBaseUrl}. Is it running?`,
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("connection");
  responseHeaders.delete("transfer-encoding");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

function mergeHeaders(initHeaders, jsonHeaders) {
  const headers = new Headers(initHeaders);

  for (const [key, value] of new Headers(jsonHeaders).entries()) {
    headers.set(key, value);
  }

  return headers;
}

export class NextResponse extends Response {
  static json(data, init = {}) {
    return new NextResponse(JSON.stringify(data), {
      ...init,
      headers: mergeHeaders(init.headers, {
        "content-type": "application/json",
      }),
    });
  }
}

export class NextRequest extends Request {}

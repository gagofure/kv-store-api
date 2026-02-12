/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  MY_KV: KVNamespace
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    try {
      // ----------------------------
      // Store value
      // ----------------------------
      if (url.pathname === "/set" && request.method === "POST") {
        const body = await request.json<{ key: string; value: string }>()

        if (!body?.key || !body?.value) {
          return Response.json(
            { error: "Missing key or value" },
            { status: 400 }
          )
        }

        await env.MY_KV.put(body.key, body.value)

        return Response.json({
          success: true,
          key: body.key
        })
      }

      // ----------------------------
      // Retrieve value
      // ----------------------------
      if (url.pathname === "/get" && request.method === "GET") {
        const key = url.searchParams.get("key")

        if (!key) {
          return Response.json(
            { error: "Missing key" },
            { status: 400 }
          )
        }

        const value = await env.MY_KV.get(key)

        if (value === null) {
          return Response.json(
            { error: "Key not found" },
            { status: 404 }
          )
        }

        return Response.json({ key, value })
      }

      // ----------------------------
      // Health check
      // ----------------------------
      if (url.pathname === "/" && request.method === "GET") {
        return Response.json({
          status: "running",
          timestamp: new Date().toISOString()
        })
      }

      return Response.json({ error: "Not Found" }, { status: 404 })

    } catch (error) {
      return Response.json(
        { error: "Internal Server Error" },
        { status: 500 }
      )
    }
  }
}



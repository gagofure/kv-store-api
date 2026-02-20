export interface Env {
  MY_KV: KVNamespace
  RATE_LIMIT_KV: KVNamespace
}

// Rate limiting constants
const RATE_LIMIT_REQUESTS = 30 // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in ms

function getRateLimitKey(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || "unknown"
}

async function isRateLimited(key: string, env: Env): Promise<boolean> {
  const now = Date.now()
  const windowKey = Math.floor(now / 60000) // bucket per minute
  const countKey = `ratelimit:${key}:${windowKey}`

  try {
    const countStr = await env.RATE_LIMIT_KV.get(countKey)
    const currentCount = countStr ? parseInt(countStr) : 0

    if (currentCount >= RATE_LIMIT_REQUESTS) {
      return true
    }

    // Increment the counter
    await env.RATE_LIMIT_KV.put(countKey, (currentCount + 1).toString(), {
      expirationTtl: 120, // expire after 2 minutes
    })

    return false
  } catch (error) {
    console.error("Rate limit check failed:", error)
    // On error, allow the request through
    return false
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // Check rate limit
    const clientKey = getRateLimitKey(request)
    if (await isRateLimited(clientKey, env)) {
      return Response.json(
        {
          error: "Rate limit exceeded",
          message: `Maximum ${RATE_LIMIT_REQUESTS} requests per minute allowed`,
          retryAfter: RATE_LIMIT_WINDOW / 1000,
        },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }

    try {
      // ----------------------------
      // Match /kv/:key
      // ----------------------------
      const kvPrefix = "/kv/"
      if (path.startsWith(kvPrefix)) {
        const key = decodeURIComponent(path.slice(kvPrefix.length))
        if (!key) {
          return Response.json({ error: "Missing key" }, { status: 400 })
        }

        // ----------------------------
        // PUT (store)
        // ----------------------------
        if (method === "PUT") {
          const value = await request.text()
          if (!value) {
            return Response.json({ error: "Missing value in body" }, { status: 400 })
          }

          const ttlParam = url.searchParams.get("ttl")
          const options: Parameters<KVNamespace["put"]>[1] = {}

          if (ttlParam) {
            const ttl = parseInt(ttlParam)
            if (!isNaN(ttl) && ttl > 0) {
              options.expirationTtl = ttl
            }
          }

          await env.MY_KV.put(key, value, options)

          return Response.json({ key, value, status: "stored" })
        }

        // ----------------------------
        // GET (retrieve)
        // ----------------------------
        if (method === "GET") {
          const value = await env.MY_KV.get(key)
          if (value === null) {
            return Response.json({ error: "Key not found" }, { status: 404 })
          }
          return Response.json({ key, value })
        }

        // ----------------------------
        // DELETE (delete)
        // ----------------------------
        if (method === "DELETE") {
          await env.MY_KV.delete(key)
          return Response.json({ key, status: "deleted" })
        }

        return Response.json({ error: "Method not allowed" }, { status: 405 })
      }

      // ----------------------------
      // Health check for root
      // ----------------------------
      if (path === "/" && method === "GET") {
        return Response.json({
          status: "running",
          timestamp: new Date().toISOString()
        })
      }

      // ----------------------------
      // GET individual student: /students/:id
      // ----------------------------
      const studentPrefix = "/students/"
      if (path.startsWith(studentPrefix) && method === "GET") {
        const studentId = path.slice(studentPrefix.length)
        
        try {
          const studentsData = await env.MY_KV.get("students")
          if (!studentsData) {
            return Response.json({ error: "No students found" }, { status: 404 })
          }

          const students = JSON.parse(studentsData)
          const student = students.find((s: any) => s.key === `student:${studentId}`)

          if (!student) {
            return Response.json({ error: "Student not found" }, { status: 404 })
          }

          return Response.json({
            id: student.key,
            data: JSON.parse(student.value)
          })
        } catch (err) {
          return Response.json({ error: "Failed to parse students data" }, { status: 500 })
        }
      }

      // ----------------------------
      // GET all students: /students
      // ----------------------------
      if (path === "/students" && method === "GET") {
        try {
          const studentsData = await env.MY_KV.get("students")
          if (!studentsData) {
            return Response.json({ error: "No students found" }, { status: 404 })
          }

          const students = JSON.parse(studentsData)
          const formatted = students.map((s: any) => ({
            id: s.key,
            data: JSON.parse(s.value)
          }))

          return Response.json({ students: formatted })
        } catch (err) {
          return Response.json({ error: "Failed to parse students data" }, { status: 500 })
        }
      }

      // ----------------------------
      // Health check for root
      // ----------------------------

      // ----------------------------
      // GET all sales: /sales
      // ----------------------------
      if (path === "/sales" && method === "GET") {
        try {
          const salesData = await env.MY_KV.get("sales")
          if (!salesData) {
            return Response.json({ error: "No sales found" }, { status: 404 })
          }

          const sales = JSON.parse(salesData)
          const formatted = sales.map((s: any) => ({
            id: s.key,
            data: JSON.parse(s.value)
          }))

          return Response.json({ sales: formatted })
        } catch (err) {
          return Response.json({ error: "Failed to parse sales data" }, { status: 500 })
        }
      }

      // ----------------------------
      // GET individual sale: /sales/:id
      // ----------------------------
      const salePrefix = "/sales/"
      if (path.startsWith(salePrefix) && method === "GET") {
        const saleId = path.slice(salePrefix.length)
        
        try {
          const salesData = await env.MY_KV.get("sales")
          if (!salesData) {
            return Response.json({ error: "No sales found" }, { status: 404 })
          }

          const sales = JSON.parse(salesData)
          const sale = sales.find((s: any) => s.key === `sales:${saleId}`)

          if (!sale) {
            return Response.json({ error: "Sale not found" }, { status: 404 })
          }

          return Response.json({
            id: sale.key,
            data: JSON.parse(sale.value)
          })
        } catch (err) {
          return Response.json({ error: "Failed to parse sales data" }, { status: 500 })
        }
      }

      return Response.json({ error: "Not Found" }, { status: 404 })

    } catch (error) {
      console.error(error)
      return Response.json({ error: "Internal Server Error" }, { status: 500 })
    }
  }
}

# kv-store-api

A simple **Cloudflare Workers KV** project that exposes a minimal key‑value HTTP API:

- `PUT /kv/:key` – store a value in KV  
- `GET /kv/:key` – retrieve a value from KV  
- `DELETE /kv/:key` – delete a key  
- Optional TTL support via `?ttl=seconds` query parameter on writes

It uses **Cloudflare Workers** for the runtime and **Workers KV** for persistence, following the standard `env.MY_KV.get/put/delete` pattern. [developers.cloudflare](https://developers.cloudflare.com/kv/api/write-key-value-pairs/)

## Features

- Simple, stateless HTTP interface for a key‑value store  
- Backed by **Workers KV**, Cloudflare’s globally distributed key‑value storage [ts.cloudflare](https://ts.cloudflare.community/workers/runtime-apis/kv/)
- Optional **expiration TTL** for keys, using KV’s `expirationTtl` option [developers.cloudflare](https://developers.cloudflare.com/kv/api/write-key-value-pairs/)
- Ready to extend into a config store, feature flags, or basic session/cache layer

## Prerequisites

- **Node.js** (LTS) installed  
- **Cloudflare account**  
- **Wrangler CLI** installed globally:

```bash
npm install -g wrangler
```

Check Wrangler:

```bash
wrangler --version
```

- A **Workers KV namespace** created in the Cloudflare dashboard and bound in your Wrangler config. [ts.cloudflare](https://ts.cloudflare.community/workers/wrangler/workers-kv/)

## Configuration

This project uses `wrangler.json` (or `wrangler.toml`) for configuration.

Example `wrangler.json`:

```json
{
  "name": "kv-store-api",
  "main": "src/index.js",
  "compatibility_date": "2024-10-01",
  "account_id": "YOUR_ACCOUNT_ID",
  "kv_namespaces": [
    {
      "binding": "STORE",
      "id": "YOUR_KV_NAMESPACE_ID"
    }
  ]
}
```

- `account_id`: Your Cloudflare account ID (see dashboard URL). [developers.cloudflare](https://developers.cloudflare.com/workers/wrangler/configuration/)
- `kv_namespaces[].binding`: Name used in code (e.g. `env.STORE`).  
- `kv_namespaces[].id`: Namespace ID from the Workers KV page. [ts.cloudflare](https://ts.cloudflare.community/workers/runtime-apis/kv/)

KV docs show the same binding structure and namespace usage. [ts.cloudflare](https://ts.cloudflare.community/workers/wrangler/workers-kv/)

## Authentication (Wrangler)

If `wrangler login` doesn’t work on your machine, you can use an API token via the `CLOUDFLARE_API_TOKEN` environment variable. [cloudflare-docs-zh.pages](https://cloudflare-docs-zh.pages.dev/workers/wrangler/ci-cd/)

1. Create an API token in Cloudflare:

   - My Profile → **API Tokens** → **Create Token**  
   - Use a template that grants Workers + KV permissions (e.g. “Edit Cloudflare Workers”). [developers.cloudflare](https://developers.cloudflare.com/workers/wrangler/migration/v1-to-v2/wrangler-legacy/authentication/)

2. Set it in your shell before running Wrangler:

   On macOS / Linux:

   ```bash
   export CLOUDFLARE_API_TOKEN=YOUR_TOKEN_VALUE
   ```

   On Windows PowerShell:

   ```powershell
   $env:CLOUDFLARE_API_TOKEN="YOUR_TOKEN_VALUE"
   ```

3. Confirm:

   ```bash
   wrangler whoami
   ```

Should print your account info without opening a browser. [cloudflare-docs-zh.pages](https://cloudflare-docs-zh.pages.dev/workers/wrangler/ci-cd/)

## Local development

Clone the repo and start a local dev server:

```bash
git clone https://github.com/gagofure/kv-store-api.git
cd kv-store-api

wrangler dev
```

Wrangler will start a local server, typically at:

```text
http://127.0.0.1:8787
```

### Example requests

Assuming default local URL:

#### Put a value

```bash
curl -X PUT "http://127.0.0.1:8787/kv/foo" -d 'bar'
```

Response:

```json
{
  "key": "foo",
  "value": "bar",
  "status": "stored"
}
```

#### Put a value with TTL (seconds)

```bash
curl -X PUT "http://127.0.0.1:8787/kv/temp?ttl=60" -d 'this will expire in 60s'
```

This uses KV’s `expirationTtl` to expire the key after 60 seconds. [developers.cloudflare](https://developers.cloudflare.com/kv/api/write-key-value-pairs/)

#### Get a value

```bash
curl "http://127.0.0.1:8787/kv/foo"
```

Response:

```json
{
  "key": "foo",
  "value": "bar"
}
```

If the key doesn’t exist, the Worker returns a 404 JSON error.

#### Delete a value

```bash
curl -X DELETE "http://127.0.0.1:8787/kv/foo"
```

Response:

```json
{
  "key": "foo",
  "status": "deleted"
}
```

KV’s `delete()` behaves as successful even if the key already doesn’t exist. [developers.cloudflare](https://developers.cloudflare.com/kv/api/delete-key-value-pairs/)

## Deploy

From the repo root:

```bash
wrangler deploy
```

On success, Wrangler prints a public URL like:

```text
https://kv-store-api.<your-account>.workers.dev
```

You can then call:

- `https://...workers.dev/kv/foo` – GET/PUT/DELETE as above.

The KV API usage here follows the official `env.<BINDING>.get/put/delete` pattern from Cloudflare’s KV docs, including TTL support via `expirationTtl`. [ts.cloudflare](https://ts.cloudflare.community/workers/runtime-apis/kv/)

## Project structure

Typical structure:

```text
kv-store-api/
├─ src/
│  └─ index.js      # Worker code (KV-backed key/value API)
├─ wrangler.json    # Wrangler configuration (account_id, kv_namespaces, etc.)
└─ README.md
```


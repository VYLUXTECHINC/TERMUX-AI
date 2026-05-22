#!/usr/bin/env node
// Ask each AI on your endpoint what they are
const https = require("https")

const BASE_URL = "https://all-in-1-ais.officialhectormanuel.workers.dev"
const MODELS = ["deepseek"]

function query(model) {
  return new Promise((resolve) => {
    const question = "What AI model are you? Identify yourself in one sentence."
    const url = `${BASE_URL}/?query=${encodeURIComponent(question)}&model=${model}`
    const start = Date.now()
    https.get(url, (res) => {
      let data = ""
      res.on("data", (c) => (data += c))
      res.on("end", () => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1)
        try {
          const parsed = JSON.parse(data)
          resolve({ model, elapsed, response: parsed.success ? parsed.message.content : parsed.message })
        } catch {
          resolve({ model, elapsed, error: "Parse failed", raw: data.slice(0, 200) })
        }
      })
    }).on("error", (e) => resolve({ model, error: e.message }))
  })
}

async function main() {
  console.log("\n  Querying each AI model...\n")
  for (const model of MODELS) {
    const r = await query(model)
    const icon = r.error ? "✖" : "✓"
    console.log(`  ${icon} ${model.toUpperCase()} (${r.elapsed || "?"}s)`)
    console.log(`    ${r.response || r.error || "no response"}`)
    console.log("")
  }
}

main()

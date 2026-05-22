#!/usr/bin/env node

const https = require("https")
const readline = require("readline")
const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const BASE_URL = "https://all-in-1-ais.officialhectormanuel.workers.dev"
const HOME = process.env.HOME || "/data/data/com.termux/files/home"
const HISTORY_FILE = path.join(HOME, ".vylux-history.json")
const CONFIG_FILE = path.join(HOME, ".vylux-config.json")

let currentModel = "deepseek"
let messages = []

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", cyan: "\x1b[36m", yellow: "\x1b[33m",
  red: "\x1b[31m", blue: "\x1b[34m", magenta: "\x1b[35m",
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"))
      if (cfg.model) currentModel = cfg.model
      if (cfg.messages) messages = cfg.messages
    }
  } catch {}
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ model: currentModel, messages: messages.slice(-50) }, null, 2))
  } catch {}
}

function queryAPI(query, model) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/?query=${encodeURIComponent(query)}&model=${model || currentModel}`
    https.get(url, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.success) resolve(parsed.message.content)
          else reject(new Error(parsed.message || "API error"))
        } catch { reject(new Error("Failed to parse response")) }
      })
    }).on("error", reject)
  })
}

function buildPrompt(userInput) {
  const parts = ["You are VYLUX AI made by VYLUX TECH. A terminal coding assistant."]
  if (messages.length > 0) {
    parts.push(...messages.slice(-10).map((m) => `${m.role}: ${m.content}`))
  }
  parts.push(`User: ${userInput}`)
  return parts.join("\n")
}

function printBanner() {
  console.clear()
  console.log(`${C.cyan}╔══════════════════════════════════════════╗`)
  console.log(`${C.cyan}║        ${C.bold}VYLUX AI${C.reset}${C.cyan}  -  Terminal           ║`)
  console.log(`${C.cyan}║     ${C.dim}made by VYLUX TECH${C.reset}${C.cyan}              ║`)
  console.log(`${C.cyan}╠══════════════════════════════════════════╣`)
  console.log(`${C.cyan}║  ${C.reset}Model: ${C.green}${currentModel.toUpperCase()}${C.reset}${C.cyan}                         ║`)
  console.log(`${C.cyan}║  ${C.reset}/model deepseek|gemini   switch model     ║`)
  console.log(`${C.cyan}║  ${C.reset}/clear                  clear history    ║`)
  console.log(`${C.cyan}║  ${C.reset}/exit                    quit             ║`)
  console.log(`${C.cyan}╚══════════════════════════════════════════╝${C.reset}\n`)
}

function handleSpecialCommand(input) {
  if (input === "/exit" || input === "/quit") { saveConfig(); console.log(`\n${C.green}Goodbye!${C.reset}\n`); process.exit(0) }
  if (input === "/clear") { messages = []; saveConfig(); printBanner(); console.log(`${C.dim}Conversation cleared.${C.reset}\n`); return true }
  if (input === "/help") { printHelp(); return true }
  if (input.startsWith("/model ")) {
    const model = input.slice(7).trim().toLowerCase()
    if (model === "deepseek" || model === "gemini") {
      currentModel = model; saveConfig(); printBanner()
      console.log(`${C.green}Switched to ${model.toUpperCase()}${C.reset}\n`)
    } else { console.log(`${C.red}Use: deepseek or gemini${C.reset}`) }
    return true
  }
  if (input.startsWith("exec:")) {
    try { const r = execSync(input.slice(5).trim(), { encoding: "utf8", timeout: 30000 }); console.log(r) }
    catch (e) { console.log(`${C.red}${e.message}${C.reset}`) }
    return true
  }
  return false
}

function printHelp() {
  console.log(`\n${C.yellow}Commands:${C.reset}`)
  console.log(`  ${C.green}/model deepseek|gemini${C.reset}  Switch AI model`)
  console.log(`  ${C.green}/clear${C.reset}                  Clear conversation`)
  console.log(`  ${C.green}/exit${C.reset}                   Exit`)
  console.log(`  ${C.green}exec: <cmd>${C.reset}             Run shell command\n`)
}

async function askAI(userInput) {
  const prompt = buildPrompt(userInput)
  process.stdout.write(`\n${C.cyan}VYLUX AI${C.reset} `)
  try {
    const response = await queryAPI(prompt, currentModel)
    messages.push({ role: "User", content: userInput })
    messages.push({ role: "Assistant", content: response })
    saveConfig()

    if (response.includes("```")) {
      const blocks = response.split("```")
      for (let i = 0; i < blocks.length; i++) {
        if (i % 2 === 0) { process.stdout.write(blocks[i]) }
        else {
          const lines = blocks[i].split("\n")
          const lang = lines[0] || ""
          console.log(`\n${C.dim}┌─ ${lang} ──────────────────────${C.reset}`)
          console.log(`${C.green}${lines.slice(1).join("\n")}${C.reset}`)
          console.log(`${C.dim}└──────────────────────────────${C.reset}`)
        }
      }
    } else { console.log(response) }
    console.log("")
  } catch (e) { console.log(`${C.red}Error: ${e.message}${C.reset}\n`) }
}

// --- Main ---
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "" })

loadConfig()
printBanner()

if (messages.length > 0) {
  console.log(`${C.dim}Resuming session (${Math.floor(messages.length / 2)} messages)${C.reset}\n`)
}

queryAPI("You are VYLUX AI made by VYLUX TECH. Welcome the user briefly in character.", currentModel)
  .then((w) => { console.log(`${C.cyan}${w}${C.reset}\n`); loop() })
  .catch(() => { console.log(`${C.green}Welcome to VYLUX AI. Type /help${C.reset}\n`); loop() })

function loop() {
  rl.question(`${C.green}❯${C.reset} `, async (input) => {
    const t = input.trim()
    if (!t) return loop()
    if (!handleSpecialCommand(t)) await askAI(t)
    loop()
  })
}

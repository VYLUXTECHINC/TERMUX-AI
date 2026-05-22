#!/usr/bin/env node

const https = require("https")
const readline = require("readline")
const fs = require("fs")
const path = require("path")
const { execSync, spawn } = require("child_process")
const os = require("os")

const BASE_URL = "https://all-in-1-ais.officialhectormanuel.workers.dev"
const HOME = os.homedir()
const CONFIG_FILE = path.join(HOME, ".vylux-config.json")
const HISTORY_FILE = path.join(HOME, ".vylux-history.json")

let currentModel = "deepseek"
let messages = []
let sessionFile = null
let clipboard = null

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m", italic: "\x1b[3m",
  green: "\x1b[32m", cyan: "\x1b[36m", yellow: "\x1b[33m",
  red: "\x1b[31m", blue: "\x1b[34m", magenta: "\x1b[35m",
  bgGreen: "\x1b[42m", bgBlue: "\x1b[44m", bgRed: "\x1b[41m",
  white: "\x1b[37m",
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
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({
      model: currentModel,
      messages: messages.slice(-100)
    }, null, 2))
  } catch {}
}

function logHistory(input, output) {
  try {
    const entries = fs.existsSync(HISTORY_FILE)
      ? JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")) : []
    entries.push({ input, output, model: currentModel, ts: Date.now() })
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries.slice(-500), null, 2))
  } catch {}
}

function queryAPI(query, model) {
  return new Promise((resolve, reject) => {
    const m = model || currentModel
    const url = `${BASE_URL}/?query=${encodeURIComponent(query)}&model=${m}`
    const start = Date.now()
    https.get(url, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1)
        try {
          const parsed = JSON.parse(data)
          if (parsed.success) resolve({ content: parsed.message.content, elapsed })
          else reject(new Error(parsed.message || "API error"))
        } catch { reject(new Error("Failed to parse response")) }
      })
    }).on("error", reject)
  })
}

function buildPrompt(userInput) {
  const parts = [
    "You are VYLUX AI made by VYLUX TECH. A terminal-based coding assistant running inside Termux on Android.",
    "You can help users: edit files, write code, explain concepts, run commands, debug issues.",
    "When showing code, wrap it in ``` blocks with the language name.",
    "Be concise but thorough. The user is in a terminal environment.",
    "",
    "Current working directory: " + process.cwd(),
    "Platform: " + process.platform,
    "Architecture: " + process.arch,
    "",
  ]
  if (messages.length > 0) {
    parts.push("--- Previous conversation ---")
    parts.push(...messages.slice(-20).map((m) => `${m.role}: ${m.content}`))
    parts.push("--- End of previous conversation ---")
    parts.push("")
  }
  parts.push(`User: ${userInput}`)
  parts.push("")
  parts.push("Assistant:")
  return parts.join("\n")
}

// ─── File operations ───

function readFile(filepath) {
  const resolved = path.resolve(filepath)
  if (!fs.existsSync(resolved)) return { error: `File not found: ${filepath}` }
  const stat = fs.statSync(resolved)
  if (stat.size > 100000) return { error: "File too large (>100KB)" }
  const content = fs.readFileSync(resolved, "utf8")
  return { content, path: resolved, size: stat.size, lines: content.split("\n").length }
}

function writeFile(filepath, content) {
  const resolved = path.resolve(filepath)
  const dir = path.dirname(resolved)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(resolved, content, "utf8")
  return { path: resolved, size: content.length }
}

function editFile(filepath, oldText, newText) {
  const resolved = path.resolve(filepath)
  if (!fs.existsSync(resolved)) return { error: "File not found" }
  let content = fs.readFileSync(resolved, "utf8")
  if (!content.includes(oldText)) return { error: "Text to replace not found" }
  content = content.replace(oldText, newText)
  fs.writeFileSync(resolved, content, "utf8")
  return { path: resolved, replacements: 1 }
}

function grepFiles(pattern, dir) {
  const target = dir || "."
  try {
    const result = execSync(`rg -n --color=never "${pattern.replace(/"/g, '\\"')}" "${target}"`, {
      encoding: "utf8", timeout: 15000, maxBuffer: 1024 * 1024
    })
    return result.trim().split("\n").slice(0, 100)
  } catch (e) {
    if (e.status === 1) return []
    return [{ error: e.message }]
  }
}

function globFiles(patterns, dir) {
  const target = dir || "."
  try {
    const result = execSync(`find "${target}" -type f ${patterns.map(p => `-name "${p}"`).join(" ")} 2>/dev/null | head -200`, {
      encoding: "utf8", timeout: 10000
    })
    return result.trim().split("\n").filter(Boolean)
  } catch { return [] }
}

function listDir(dirPath) {
  const resolved = path.resolve(dirPath || ".")
  if (!fs.existsSync(resolved)) return { error: "Directory not found" }
  const items = fs.readdirSync(resolved, { withFileTypes: true })
  return items.map(i => ({
    name: i.name,
    type: i.isDirectory() ? "dir" : i.isFile() ? "file" : "other",
    size: i.isFile() ? fs.statSync(path.join(resolved, i.name)).size : null
  }))
}

function runCommand(cmd) {
  try {
    const result = execSync(cmd, { encoding: "utf8", timeout: 60000, maxBuffer: 1024 * 1024 })
    return { stdout: result, exitCode: 0 }
  } catch (e) {
    return { stdout: e.stdout || "", stderr: e.stderr || e.message, exitCode: e.status || 1 }
  }
}

// ─── System prompt to prepend to every query ───
const SYSTEM_PROMPT = `You are VYLUX AI made by VYLUX TECH — a terminal coding assistant.

Your capabilities:
- Read and write files
- Edit existing files (find-and-replace)
- List directories and search code
- Run shell commands
- Answer coding questions

When you need to perform actions, respond with action blocks:
To read a file:  [read: path/to/file]
To write:        [write: path/to/file]
                 content
                 [/write]
To edit:         [edit: path/to/file]
                 old text → new text
                 [/edit]
To run command:  [exec: command]
To search:       [grep: pattern]
To list:         [ls: path]

Always explain what you're doing and show results.`

function hasActionTags(text) {
  return /\[(read|write|edit|exec|grep|ls):/.test(text)
}

function extractActions(text) {
  const actions = []
  // exec: command
  const execRe = /\[exec:\s*([^\]]+)\]/g
  let m
  while ((m = execRe.exec(text)) !== null) {
    actions.push({ type: "exec", value: m[1].trim() })
  }
  // read: filepath
  const readRe = /\[read:\s*([^\]]+)\]/g
  while ((m = readRe.exec(text)) !== null) {
    actions.push({ type: "read", value: m[1].trim() })
  }
  // ls: path
  const lsRe = /\[ls:\s*([^\]]*)\]/g
  while ((m = lsRe.exec(text)) !== null) {
    actions.push({ type: "ls", value: m[1].trim() || "." })
  }
  // grep: pattern
  const grepRe = /\[grep:\s*([^\]]+)\]/g
  while ((m = grepRe.exec(text)) !== null) {
    actions.push({ type: "grep", value: m[1].trim() })
  }
  // write: file with content between [write: file] content [/write]
  const writeRe = /\[write:\s*([^\]]+)\]\s*([\s\S]*?)\s*\[\/write\]/g
  while ((m = writeRe.exec(text)) !== null) {
    actions.push({ type: "write", file: m[1].trim(), value: m[2] })
  }
  // edit: file with old→new
  const editRe = /\[edit:\s*([^\]]+)\]\s*([\s\S]*?)\s*\[\/edit\]/g
  while ((m = editRe.exec(text)) !== null) {
    const parts = m[2].split("→").map(s => s.trim())
    if (parts.length === 2) {
      actions.push({ type: "edit", file: m[1].trim(), oldText: parts[0], newText: parts[1] })
    }
  }
  return actions
}

function performAction(action) {
  switch (action.type) {
    case "exec": {
      const result = runCommand(action.value)
      return `[Result: exit code ${result.exitCode}]\n${result.stdout}${result.stderr ? "\n[stderr]\n" + result.stderr : ""}`
    }
    case "read": {
      const result = readFile(action.value)
      if (result.error) return `[Error] ${result.error}`
      return `[File: ${result.path} (${result.lines} lines, ${result.size} bytes)]\n${result.content}`
    }
    case "ls": {
      const result = listDir(action.value)
      if (Array.isArray(result)) {
        const lines = result.map(i => `${i.type === "dir" ? "📁" : "📄"} ${i.name}${i.size != null ? ` (${i.size})` : ""}`)
        return `[Directory: ${path.resolve(action.value)}]\n${lines.join("\n")}`
      }
      return `[Error] ${result.error}`
    }
    case "grep": {
      const results = grepFiles(action.value)
      if (results.length === 0) return "[No matches]"
      return `[Matches for: ${action.value}]\n${results.join("\n")}`
    }
    case "write": {
      const result = writeFile(action.file, action.value)
      return `[Written: ${result.path} (${result.size} bytes)]`
    }
    case "edit": {
      const result = editFile(action.file, action.oldText, action.newText)
      if (result.error) return `[Error] ${result.error}`
      return `[Edited: ${result.path}]`
    }
    default:
      return "[Unknown action]"
  }
}

async function executeMultiStep(response) {
  const actions = extractActions(response)
  if (actions.length === 0) return response

  const parts = []
  let remaining = response

  for (const action of actions) {
    // Find where this action appears and split
    const result = performAction(action)
    parts.push(`  ${C.dim}→ ${action.type}: ${action.value}${C.reset}`)
    parts.push(`  ${C.dim}${result.split("\n").slice(0, 5).join("\n")}${result.split("\n").length > 5 ? "\n  ..." : ""}${C.reset}`)
  }

  console.log(parts.join("\n"))
}

// ─── UI ───

async function askAI(userInput) {
  const spinner = ["|", "/", "-", "\\"]
  let i = 0
  const spinnerInterval = setInterval(() => {
    process.stdout.write(`\r${C.yellow}${spinner[i]}${C.reset}`)
    i = (i + 1) % spinner.length
  }, 120)

  const prompt = buildPrompt(userInput)

  try {
    const { content: response, elapsed } = await queryAPI(prompt, currentModel)
    clearInterval(spinnerInterval)
    process.stdout.write("\r \r")

    messages.push({ role: "User", content: userInput })
    messages.push({ role: "Assistant", content: response })
    saveConfig()
    logHistory(userInput, response)

    const hasCode = response.includes("```")
    const hasActions = hasActionTags(response)

    if (hasCode) {
      const blocks = response.split("```")
      for (let b = 0; b < blocks.length; b++) {
        if (b % 2 === 0) {
          process.stdout.write(blocks[b])
        } else {
          const lines = blocks[b].split("\n")
          const lang = lines[0] || ""
          console.log(`\n${C.dim}┌─${lang ? " " + lang + " " : ""}─${"─".repeat(Math.max(0, 50 - lang.length))}┐${C.reset}`)
          process.stdout.write(`${C.green}`)
          process.stdout.write(lines.slice(1).join("\n"))
          process.stdout.write(`${C.reset}`)
          console.log(`\n${C.dim}└${"─".repeat(52)}┘${C.reset}`)
        }
      }
    } else {
      process.stdout.write(response)
    }

    console.log(`\n${C.dim}${"─".repeat(40)}${C.reset}`)
    console.log(`${C.dim}model: ${currentModel}  |  ${elapsed}s${C.reset}\n`)

    if (hasActions) {
      await executeMultiStep(response)
    }
  } catch (e) {
    clearInterval(spinnerInterval)
    process.stdout.write("\r \r")
    console.log(`\n${C.red}✖ ${e.message}${C.reset}\n`)
  }
}

function printBanner() {
  console.log(``)
  console.log(`${C.cyan}  ╔══════════════════════════════════════╗`)
  console.log(`${C.cyan}  ║  ${C.bold}${C.white}VYLUX AI${C.reset}${C.cyan}  —  Terminal Coding Assistant  ║`)
  console.log(`${C.cyan}  ║  ${C.dim}Made by VYLUX TECH${C.reset}${C.cyan}              ║`)
  console.log(`${C.cyan}  ╠${"═".repeat(36)}╣`)
  console.log(`${C.cyan}  ║  ${C.reset}Model: ${C.green}${currentModel.toUpperCase()}${C.reset}${" ".repeat(24 - currentModel.length)}${C.cyan}║`)
  console.log(`${C.cyan}  ╚══════════════════════════════════════╝${C.reset}`)
  console.log(``)
  console.log(`${C.dim}  Commands:  /model   /clear   /exit   /help   /exec   /read   /ls   /grep${C.reset}`)
  console.log(`${C.dim}  ${"─".repeat(54)}${C.reset}`)
  console.log(``)
}

function printHelp() {
  console.log(`${C.bold}${C.yellow}  Commands${C.reset}`)
  console.log(`  ${C.green}/model deepseek|gemini${C.reset}     Switch AI model`)
  console.log(`  ${C.green}/clear${C.reset}                       Clear conversation`)
  console.log(`  ${C.green}/exit${C.reset}                        Quit`)
  console.log(`  ${C.green}/exec <command>${C.reset}              Run a shell command`)
  console.log(`  ${C.green}/read <file>${C.reset}                 Read a file`)
  console.log(`  ${C.green}/write <file>${C.reset}                Write to a file (then paste)`)
  console.log(`  ${C.green}/ls [dir]${C.reset}                    List directory`)
  console.log(`  ${C.green}/grep <pattern>${C.reset}              Search files with ripgrep`)
  console.log(`  ${C.green}/glob <pattern>${C.reset}              Find files by glob pattern`)
  console.log(`  ${C.green}/pwd${C.reset}                         Show current directory`)
  console.log(`  ${C.green}/history${C.reset}                     Show recent history`)
  console.log(`  ${C.green}/session <file>${C.reset}              Save/resume session`)
  console.log(`  ${C.green}/stats${C.reset}                       Session stats`)
  console.log(`  ${C.green}/help${C.reset}                        This help`)
  console.log(``)
  console.log(`${C.yellow}  Multi-step actions${C.reset} (AI can use these automatically)`)
  console.log(`  [read: path]     [write: path] content [/write]`)
  console.log(`  [exec: command]  [grep: pattern]  [ls: path]`)
  console.log(``)
}

function handleCommand(input) {
  const cmd = input.split(" ")[0]
  const arg = input.slice(cmd.length).trim()

  if (cmd === "/exit" || cmd === "/quit") {
    saveConfig()
    console.log(`\n${C.green}  Goodbye from VYLUX AI!${C.reset}\n`)
    process.exit(0)
  }

  if (cmd === "/clear") {
    messages = []
    saveConfig()
    console.clear()
    printBanner()
    console.log(`${C.dim}  Conversation cleared.${C.reset}\n`)
    return true
  }

  if (cmd === "/help") {
    printHelp()
    return true
  }

  if (cmd === "/model") {
    const model = arg.toLowerCase()
    if (model === "deepseek" || model === "gemini") {
      currentModel = model
      saveConfig()
      console.log(`\n${C.green}  Switched to ${model.toUpperCase()}${C.reset}\n`)
    } else {
      console.log(`\n${C.red}  Use: /model deepseek or /model gemini${C.reset}\n`)
    }
    return true
  }

  if (cmd === "/exec") {
    if (!arg) { console.log(`${C.red}  Usage: /exec <command>${C.reset}\n`); return true }
    const result = runCommand(arg)
    if (result.stdout) console.log(result.stdout)
    if (result.stderr) console.log(`${C.red}${result.stderr}${C.reset}`)
    console.log(`${C.dim}exit code: ${result.exitCode}${C.reset}\n`)
    return true
  }

  if (cmd === "/read") {
    if (!arg) { console.log(`${C.red}  Usage: /read <file>${C.reset}\n`); return true }
    const result = readFile(arg)
    if (result.error) { console.log(`${C.red}  ${result.error}${C.reset}\n`); return true }
    console.log(`${C.dim}  ${result.path} (${result.lines} lines, ${result.size}B)${C.reset}`)
    console.log(`${C.green}${result.content}${C.reset}`)
    console.log(``)
    return true
  }

  if (cmd === "/write") {
    if (!arg) { console.log(`${C.red}  Usage: /write <file>${C.reset}\n`); return true }
    console.log(`${C.yellow}  Paste content (Ctrl+D to finish, Ctrl+C to cancel):${C.reset}`)
    let content = ""
    const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl2.on("line", (line) => { content += line + "\n" })
    rl2.on("close", () => {
      const result = writeFile(arg, content.trimEnd())
      console.log(`${C.green}  Written ${result.size} bytes to ${result.path}${C.reset}\n`)
      promptUser()
    })
    return "readline-suspend"
  }

  if (cmd === "/ls") {
    const result = listDir(arg || ".")
    if (Array.isArray(result)) {
      console.log(``)
      result.forEach(i => {
        const icon = i.type === "dir" ? `${C.blue}📁${C.reset}` : `${C.dim}📄${C.reset}`
        const sizeStr = i.size != null ? ` ${C.dim}(${(i.size / 1024).toFixed(1)}KB)${C.reset}` : ""
        console.log(`  ${icon} ${i.name}${sizeStr}`)
      })
      console.log(``)
    } else {
      console.log(`${C.red}  ${result.error}${C.reset}\n`)
    }
    return true
  }

  if (cmd === "/grep") {
    if (!arg) { console.log(`${C.red}  Usage: /grep <pattern>${C.reset}\n`); return true }
    const results = grepFiles(arg)
    if (results.length === 0) { console.log(`${C.dim}  No matches${C.reset}\n`); return true }
    results.forEach(r => console.log(`  ${r}`))
    console.log(``)
    return true
  }

  if (cmd === "/glob") {
    if (!arg) { console.log(`${C.red}  Usage: /glob <pattern>${C.reset}\n`); return true }
    const files = globFiles(arg.split(" "))
    if (files.length === 0) { console.log(`${C.dim}  No matches${C.reset}\n`); return true }
    files.forEach(f => console.log(`  ${f}`))
    console.log(``)
    return true
  }

  if (cmd === "/pwd") {
    console.log(`  ${C.green}${process.cwd()}${C.reset}\n`)
    return true
  }

  if (cmd === "/history") {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const entries = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"))
        const recent = entries.slice(-10).reverse()
        console.log(``)
        recent.forEach((e, i) => {
          const date = new Date(e.ts).toLocaleString()
          console.log(`  ${C.dim}${i + 1}. [${date}] ${e.model}${C.reset}`)
          console.log(`     ${C.green}Q: ${e.input.slice(0, 80)}${e.input.length > 80 ? "..." : ""}${C.reset}`)
        })
        console.log(``)
      } else {
        console.log(`${C.dim}  No history${C.reset}\n`)
      }
    } catch { console.log(`${C.red}  Error reading history${C.reset}\n`) }
    return true
  }

  if (cmd === "/stats") {
    const totalQueries = messages.length / 2
    console.log(``)
    console.log(`  ${C.bold}Session Stats${C.reset}`)
    console.log(`  ${C.dim}Messages:${C.reset} ${totalQueries} queries, ${messages.length - totalQueries} responses`)
    console.log(`  ${C.dim}Model:${C.reset} ${currentModel.toUpperCase()}`)
    console.log(`  ${C.dim}CWD:${C.reset} ${process.cwd()}`)
    console.log(``)
    return true
  }

  if (cmd === "/session") {
    if (!arg) { console.log(`${C.red}  Usage: /session <file> or /session (shows current)${C.reset}\n`); return true }
    if (fs.existsSync(arg)) {
      try {
        const loaded = JSON.parse(fs.readFileSync(arg, "utf8"))
        messages = loaded.messages || []
        if (loaded.model) currentModel = loaded.model
        sessionFile = arg
        console.log(`${C.green}  Loaded session: ${messages.length / 2} messages${C.reset}\n`)
      } catch { console.log(`${C.red}  Failed to load session${C.reset}\n`) }
    } else {
      try {
        fs.writeFileSync(arg, JSON.stringify({ model: currentModel, messages }, null, 2))
        sessionFile = arg
        console.log(`${C.green}  Saved session to ${arg}${C.reset}\n`)
      } catch { console.log(`${C.red}  Failed to save session${C.reset}\n`) }
    }
    return true
  }

  return false
}

// ─── Main loop ───

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "",
})

loadConfig()
console.clear()
printBanner()

if (messages.length > 0) {
  const count = Math.floor(messages.length / 2)
  const last = messages[messages.length - 1]
  console.log(`  ${C.dim}Resuming session (${count} messages). Last: ${(last?.content || "").slice(0, 50)}...${C.reset}\n`)
}

// Welcome
queryAPI("You are VYLUX AI made by VYLUX TECH. Welcome the user with 1-2 sentences about your coding capabilities, then ask what they want to build.", currentModel)
  .then((w) => {
    console.log(`  ${C.cyan}${w.content}${C.reset}\n`)
    promptUser()
  })
  .catch(() => {
    console.log(`  ${C.green}Welcome to VYLUX AI. Ready to code. Type /help for commands.${C.reset}\n`)
    promptUser()
  })

function promptUser() {
  const dir = path.basename(process.cwd()) || "/"
  rl.question(`${C.green}${dir}${C.reset} ${C.blue}❯${C.reset} `, async (input) => {
    const t = input.trim()
    if (!t) return promptUser()

    const handled = handleCommand(t)
    if (handled === "readline-suspend") return
    if (handled) return promptUser()

    await askAI(t)
    promptUser()
  })
}

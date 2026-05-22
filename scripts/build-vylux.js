#!/usr/bin/env node
// Build for Android — run on Pterodactyl Node.js egg
const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const NDK_VERSION = "r28b"
const NDK_DIR = "/opt/android-ndk"
const BUILD_DIR = "/home/container/vylux-build"
const OUTPUT_DIR = "/home/container/output"
const REPO = "https://github.com/VYLUXTECHINC/TERMUX-AI.git"

function run(cmd, opts = {}) {
  console.log(`  → ${cmd}`)
  try {
    execSync(cmd, { encoding: "utf8", timeout: opts.timeout || 3600000, stdio: "inherit", ...opts })
  } catch (e) {
    if (!opts.ignoreError) throw e
  }
}

async function main() {
  console.log(`\n  Building for Android aarch64\n`)

  // Install deps
  console.log(`[1/5] Installing dependencies...`)
  run("apt-get update -qq")
  run("apt-get install -y -qq curl wget unzip xz-utils cmake ninja-build python3 pkg-config git build-essential libssl-dev libffi-dev patchelf file bc")

  // NDK
  console.log(`[2/5] Setting up Android NDK ${NDK_VERSION}...`)
  if (!fs.existsSync(`${NDK_DIR}/ndk-build`)) {
    run("mkdir -p /opt")
    run("wget -q --show-progress https://dl.google.com/android/repository/android-ndk-r28b-linux.zip -O /tmp/ndk.zip")
    run("unzip -q /tmp/ndk.zip -d /opt/")
    run(`mv /opt/android-ndk-${NDK_VERSION} ${NDK_DIR}`)
    run("rm /tmp/ndk.zip")
  }

  const TC = `${NDK_DIR}/toolchains/llvm/prebuilt/linux-x86_64`
  process.env.ANDROID_NDK_HOME = NDK_DIR
  process.env.NDK = NDK_DIR
  process.env.PATH = `${TC}/bin:${process.env.PATH}`
  process.env.AR = `${TC}/bin/llvm-ar`
  process.env.CC = `${TC}/bin/aarch64-linux-android24-clang`
  process.env.CXX = `${TC}/bin/aarch64-linux-android24-clang++`
  process.env.LD = `${TC}/bin/ld`
  process.env.STRIP = `${TC}/bin/llvm-strip`

  // Clone
  console.log(`[3/5] Cloning repo...`)
  if (!fs.existsSync(BUILD_DIR)) {
    run(`git clone ${REPO} ${BUILD_DIR}`)
  } else {
    run(`cd ${BUILD_DIR} && git pull`)
  }

  // Build
  console.log(`[4/5] Building...`)
  run(`cd ${BUILD_DIR} && source scripts/env.sh && ./scripts/build-opencode.sh`, { timeout: 7200000 })

  // Copy output
  console.log(`[5/5] Copying artifacts...`)
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const dist = `${BUILD_DIR}/build/dist`
  if (fs.existsSync(dist)) {
    for (const f of fs.readdirSync(dist)) {
      fs.copyFileSync(path.join(dist, f), path.join(OUTPUT_DIR, f))
      console.log(`  ✓ ${f}`)
    }
  }

  console.log(`\n  Build complete. Files in ${OUTPUT_DIR}/\n`)
  run(`ls -lh ${OUTPUT_DIR}/`, { ignoreError: true })
}

main().catch(e => { console.error(`\n✖ ${e.message}\n`); process.exit(1) })

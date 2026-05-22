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
    const out = execSync(cmd, { encoding: "utf8", timeout: opts.timeout || 3600000, stdio: "inherit", ...opts })
    return out
  } catch (e) {
    if (!opts.ignoreError) throw e
    return e.stdout || ""
  }
}

function section(n, label) {
  console.log(`\n\x1b[32m[${n}/6] ${label}\x1b[0m\n`)
}

async function main() {
  console.log(`\x1b[36m`)
  console.log(`  ╔══════════════════════════════════════╗`)
  console.log(`  ║     VYLUX AI Builder v1.0           ║`)
  console.log(`  ║  Running on Node.js egg              ║`)
  console.log(`  ╚══════════════════════════════════════╝`)
  console.log(`\x1b[0m`)
  console.log(`  Platform: ${process.platform} ${process.arch}`)
  console.log(`  RAM:     ${(require("os").totalmem() / 1024 / 1024 / 1024).toFixed(1)}GB`)
  console.log(`  CWD:     ${process.cwd()}`)
  console.log(`  Node:    ${process.version}`)
  console.log(``)

  // 1. Install deps
  section(1, "Installing build dependencies")
  run("apt-get update -qq")
  run("apt-get install -y -qq curl wget unzip xz-utils cmake ninja-build python3 pkg-config git build-essential libssl-dev libffi-dev patchelf file bc")

  // 2. Download NDK
  section(2, `Downloading Android NDK ${NDK_VERSION}`)
  if (!fs.existsSync(`${NDK_DIR}/ndk-build`)) {
    run("mkdir -p /opt")
    run("wget -q --show-progress https://dl.google.com/android/repository/android-ndk-r28b-linux.zip -O /tmp/ndk.zip")
    run("unzip -q /tmp/ndk.zip -d /opt/")
    run(`mv /opt/android-ndk-${NDK_VERSION} ${NDK_DIR}`)
    run("rm /tmp/ndk.zip")
    console.log(`  NDK installed to ${NDK_DIR}`)
  } else {
    console.log(`  NDK already present`)
  }

  // 3. Set env
  section(3, "Setting up Android toolchain")
  const TOOLCHAIN = `${NDK_DIR}/toolchains/llvm/prebuilt/linux-x86_64`
  process.env.ANDROID_NDK_HOME = NDK_DIR
  process.env.NDK = NDK_DIR
  process.env.PATH = `${TOOLCHAIN}/bin:${process.env.PATH}`
  process.env.AR = `${TOOLCHAIN}/bin/llvm-ar`
  process.env.CC = `${TOOLCHAIN}/bin/aarch64-linux-android24-clang`
  process.env.CXX = `${TOOLCHAIN}/bin/aarch64-linux-android24-clang++`
  process.env.LD = `${TOOLCHAIN}/bin/ld`
  process.env.STRIP = `${TOOLCHAIN}/bin/llvm-strip`

  // 4. Clone
  section(4, "Cloning TERMUX-AI repo")
  if (!fs.existsSync(BUILD_DIR)) {
    run(`git clone ${REPO} ${BUILD_DIR}`)
  } else {
    run(`cd ${BUILD_DIR} && git pull`)
  }

  // 5. Build
  section(5, "Building VYLUX AI")
  run(`cd ${BUILD_DIR} && source scripts/env.sh && ./scripts/build-opencode.sh`)

  // 6. Copy output
  section(6, "Copying artifacts to output/")
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const distDir = `${BUILD_DIR}/build/dist`
  if (fs.existsSync(distDir)) {
    for (const f of fs.readdirSync(distDir)) {
      const src = path.join(distDir, f)
      const dst = path.join(OUTPUT_DIR, f)
      fs.copyFileSync(src, dst)
      console.log(`  ✓ ${f} (${(fs.statSync(dst).size / 1024 / 1024).toFixed(1)}MB)`)
    }
  }

  console.log(`\n\x1b[36m  ╔══════════════════════════════════════╗`)
  console.log(`  ║         BUILD COMPLETE               ║`)
  console.log(`  ╚══════════════════════════════════════╝\x1b[0m`)
  console.log(`\n  Download from: /home/container/output/\n`)
  run(`ls -lh ${OUTPUT_DIR}/`, { ignoreError: true })
}

main().catch((e) => {
  console.error(`\n\x1b[31m✖ Build failed: ${e.message}\x1b[0m\n`)
  process.exit(1)
})

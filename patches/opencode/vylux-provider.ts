import type { LanguageModelV3 } from "@ai-sdk/provider"

const BASE_URL = "https://all-in-1-ais.officialhectormanuel.workers.dev"

function flattenMessages(prompt: LanguageModelV3["prompt"]): string {
  const parts: string[] = []
  let systemMsg = ""
  for (const entry of prompt) {
    const texts = (entry.content as Array<{ type: string; text?: string }>)
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!)
      .join(" ")
    if (!texts) continue
    if (entry.role === "system") {
      systemMsg = texts
    } else if (entry.role === "user" || entry.role === "assistant") {
      parts.push(`${entry.role === "user" ? "User" : "Assistant"}: ${texts}`)
    }
  }
  const conversation = parts.join("\n")
  return systemMsg ? `${systemMsg}\n\n${conversation}` : conversation
}

function makeModel(modelId: string): LanguageModelV3 {
  return {
    specificationVersion: "v1",
    provider: "vylux",
    modelId,
    defaultObjectGenerationMode: "json",

    async doGenerate({ prompt }: any) {
      const query = flattenMessages(prompt)
      const url = `${BASE_URL}/?query=${encodeURIComponent(query)}&model=${modelId}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`API error (${response.status}): ${await response.text()}`)
      }
      const data = await response.json()
      if (!data.success) {
        throw new Error(`API error: ${JSON.stringify(data)}`)
      }
      return {
        text: data.message.content,
        finishReason: "stop" as const,
        usage: { promptTokens: 0, completionTokens: 0 },
        rawCall: { rawPrompt: prompt, rawSettings: { model: modelId } },
      }
    },

    async doStream({ prompt }: any) {
      const query = flattenMessages(prompt)
      const url = `${BASE_URL}/?query=${encodeURIComponent(query)}&model=${modelId}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`API error (${response.status}): ${await response.text()}`)
      }
      const data = await response.json()
      if (!data.success) {
        throw new Error(`API error: ${JSON.stringify(data)}`)
      }

      const content = data.message.content || ""

      const stream = new ReadableStream({
        start(controller) {
          if (content) {
            controller.enqueue({ type: "text", text: content } as any)
          }
          controller.enqueue({
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 0, completionTokens: 0 },
          } as any)
          controller.close()
        },
      })

      return {
        stream,
        rawCall: { rawPrompt: prompt, rawSettings: { model: modelId } },
      }
    },
  }
}

export function createVyluxProvider(_options: any) {
  return {
    languageModel(modelId: string) {
      return makeModel(modelId)
    },
  }
}

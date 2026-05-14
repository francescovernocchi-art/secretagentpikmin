import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway";

const Schema = z.object({
  ingredientA: z.object({ key: z.string().min(1).max(60), name: z.string().min(1).max(80), emoji: z.string().min(1).max(8) }),
  ingredientB: z.object({ key: z.string().min(1).max(60), name: z.string().min(1).max(80), emoji: z.string().min(1).max(8) }),
});

/**
 * Inventa una scoperta sperimentale quando nessuna ricetta combacia.
 * Restituisce nome, emoji, descrizione + xp piccolo.
 */
export const inventDiscovery = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      // Fallback: scoperta divertente generica senza AI
      return {
        result_name: `${data.ingredientA.name} + ${data.ingredientB.name}`,
        result_emoji: "✨",
        description: "Esperimento misterioso! Nessuna reazione chiara.",
        xp: 5,
      };
    }

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const prompt = `Sei il computer di bordo di un laboratorio segreto in stile Pikmin / agente 007.
Un bambino di 7 anni (Lorenzo) ha appena combinato questi due ingredienti:
- ${data.ingredientA.emoji} ${data.ingredientA.name}
- ${data.ingredientB.emoji} ${data.ingredientB.name}

Inventa il risultato dell'esperimento. Deve essere:
- adatto a un bambino, divertente e fantasioso
- breve (nome max 30 caratteri, descrizione max 90)
- coerente con i due ingredienti
- in italiano
- con UNA emoji singola

Restituisci JSON con: result_name, result_emoji (1 emoji), description, xp (intero 5-15).`;

    try {
      const { experimental_output } = await generateText({
        model,
        prompt,
        experimental_output: Output.object({
          schema: z.object({
            result_name: z.string().min(1).max(40),
            result_emoji: z.string().min(1).max(8),
            description: z.string().min(1).max(140),
            xp: z.number().int().min(5).max(15),
          }),
        }),
      });
      return experimental_output;
    } catch (e) {
      console.error("AI merge failed:", e);
      return {
        result_name: "Reazione sconosciuta",
        result_emoji: "❔",
        description: "Il computer di bordo non capisce... riprova!",
        xp: 5,
      };
    }
  });

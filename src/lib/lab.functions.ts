import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


const IngredientSchema = z.object({
  key: z.string().min(1).max(60),
  name: z.string().min(1).max(80),
  emoji: z.string().min(1).max(8),
});

const Schema = z.object({
  ingredients: z.array(IngredientSchema).min(2).max(6),
});

/**
 * Inventa una scoperta sperimentale quando nessuna ricetta combacia.
 * Supporta da 2 a 6 ingredienti combinati insieme.
 */
export const inventDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data }) => {
    const list = data.ingredients.map((i) => `- ${i.emoji} ${i.name}`).join("\n");
    const fallbackName = data.ingredients
      .map((i) => i.name)
      .slice(0, 3)
      .join(" + ") + (data.ingredients.length > 3 ? " + …" : "");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        result_name: fallbackName,
        result_emoji: "✨",
        description: "Esperimento misterioso! Nessuna reazione chiara.",
        xp: 5 + Math.min(10, data.ingredients.length * 2),
      };
    }

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const prompt = `Sei il computer di bordo di un laboratorio segreto in stile Pikmin / agente 007.
Un bambino di 7 anni (Lorenzo) ha appena combinato questi ${data.ingredients.length} ingredienti:
${list}

Inventa il risultato dell'esperimento. Deve essere:
- adatto a un bambino, divertente e fantasioso
- breve (nome max 30 caratteri, descrizione max 100)
- coerente con TUTTI gli ingredienti combinati
- più ingredienti = risultato più potente / sorprendente
- in italiano
- con UNA emoji singola

Restituisci JSON con: result_name, result_emoji (1 emoji), description, xp (intero, scala 5-30 in base alla complessità).`;

    try {
      const { experimental_output } = await generateText({
        model,
        prompt,
        experimental_output: Output.object({
          schema: z.object({
            result_name: z.string().min(1).max(40),
            result_emoji: z.string().min(1).max(8),
            description: z.string().min(1).max(160),
            xp: z.number().int().min(5).max(30),
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

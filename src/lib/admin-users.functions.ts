import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CreateInput = z.object({
  username: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_]+$/, "Solo minuscole, numeri e _"),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(60),
  role: z.enum(["papa", "lorenzo"]),
  emoji: z.string().min(1).max(8),
});

const EMAIL_DOMAIN = "famiglia.pikmin";

export const createFamilyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("agent_key")
      .eq("user_id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (prof?.agent_key !== "papa") {
      throw new Error("Solo il Comandante può creare nuovi agenti");
    }

    const email = `${data.username}@${EMAIL_DOMAIN}`;

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.name,
        agent_key: data.role,
        emoji: data.emoji,
        username: data.username,
      },
    });
    if (error) throw new Error(error.message);

    return {
      userId: created.user?.id ?? null,
      username: data.username,
      email,
    };
  });

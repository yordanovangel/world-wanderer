import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "list_quests",
  title: "List published quests",
  description: "List published quests (photo adventures) with title, mode and creation date.",
  inputSchema: {
    mode: z
      .enum(["solo", "multiplayer", "treasure_hunt"]) 
      .optional()
      .describe("Filter by quest mode."),
    search: z.string().trim().min(1).max(100).optional().describe("Case-insensitive title search."),
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum quests to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ mode, search, limit }) => {
    const supabase = supabaseAnon();
    let query = supabase
      .from("quests")
      .select("id, title, description, mode, status, time_limit_sec, max_players, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (mode) query = query.eq("mode", mode);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { quests: data ?? [] },
    };
  },
});

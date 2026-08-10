import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "get_quest_leaderboard",
  title: "Get quest leaderboard",
  description: "Get the public leaderboard (rank, nickname, score, duration) for a quest.",
  inputSchema: {
    quest_id: z.string().uuid().describe("ID of the quest."),
    limit: z.number().int().min(1).max(50).default(10).describe("How many entries to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ quest_id, limit }) => {
    const supabase = supabaseAnon();
    const { data, error } = await supabase
      .from("quest_leaderboard")
      .select("rank, nickname, total_score, duration_sec, status, completed_at")
      .eq("quest_id", quest_id)
      .order("rank")
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { entries: data ?? [] },
    };
  },
});

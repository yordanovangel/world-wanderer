import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "get_quest",
  title: "Get quest details",
  description:
    "Get a published quest with its public task hints (hidden scoring criteria are never returned).",
  inputSchema: { quest_id: z.string().uuid().describe("ID of the quest.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ quest_id }) => {
    const supabase = supabaseAnon();
    const { data: quest, error } = await supabase
      .from("quests")
      .select("id, title, description, mode, status, time_limit_sec, max_players, created_at")
      .eq("id", quest_id)
      .eq("status", "published")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!quest) {
      return { content: [{ type: "text", text: "No published quest with that id." }], isError: true };
    }

    const { data: tasks, error: tErr } = await supabase
      .from("quest_tasks_public")
      .select("id, order_idx, title, description, max_points")
      .eq("quest_id", quest_id)
      .order("order_idx");
    if (tErr) return { content: [{ type: "text", text: tErr.message }], isError: true };

    const result = { ...quest, tasks: tasks ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});

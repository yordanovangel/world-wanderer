import { defineMcp } from "@lovable.dev/mcp-js";
import listQuests from "./tools/list-quests";
import getQuest from "./tools/get-quest";
import getLeaderboard from "./tools/get-leaderboard";

export default defineMcp({
  name: "world-wanderer",
  title: "World Wanderer",
  version: "0.1.0",
  instructions:
    "Read-only tools for the World Wanderer photo-quest app. Use `list_quests` to browse published quests, `get_quest` for a quest and its public task hints, and `get_quest_leaderboard` for public rankings. Only public data is exposed — no player photos, accounts or private sessions.",
  tools: [listQuests, getQuest, getLeaderboard],
});

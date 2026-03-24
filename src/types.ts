import { type } from "arktype";

export const StreamplaceMessage = type({
  $type: "'place.stream.chat.message'",
  text: "string",
  createdAt: "string.date.parse",
  streamer: "string",
  facets: type("unknown[]").optional(),
  reply: type({
    root: "string",
    parent: "string",
  }).optional(),
});

import { type } from "arktype";

export const STREAMPLACE_CHAT_NSID = "place.stream.chat.message" as const;

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
export type StreamplaceMessage = typeof StreamplaceMessage.infer;

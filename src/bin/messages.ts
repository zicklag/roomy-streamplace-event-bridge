import { getMessages } from "../indexer";

const messages = getMessages({
  start: 0,
  end: Date.now(),
  stream: process.argv[2] || "did:plc:ulg2bzgrgs7ddjjlmhtegk3v",
});

messages.forEach((x) => console.log(x));

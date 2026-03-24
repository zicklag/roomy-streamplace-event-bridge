import { Database } from "bun:sqlite";

import { JetstreamSubscription } from "@atcute/jetstream";
import { STREAMPLACE_CHAT_NSID, StreamplaceMessage } from "./streamplace";
import { type } from "arktype";

const DATA_DIR = process.env.DATA_DIR || process.cwd();

const db = new Database(`${DATA_DIR}/indexer.db`);

db.run(`
  -- Table containing all of the 'place.stream.chat.message' records that we
  -- have collected.
  create table if not exists chat_messages (

    -- The ID in the format 'did/rkey'
    id text not null primary key,

    -- The stream that this message was sent in
    stream text,

    -- The record data in JSON
    record text not null,

    -- The unix timestamp of the record in milliseconds
    timestamp int not null
  )
`);

export async function startIndexer() {
  // Subscribe to all streamplace chats
  const subscription = new JetstreamSubscription({
    url: "wss://jetstream2.us-east.bsky.network",
    wantedCollections: [STREAMPLACE_CHAT_NSID],
  });

  for await (const event of subscription) {
    if (event.kind != "commit") continue;

    try {
      const messageId = `${event.did}/${event.commit.rkey}`;

      if (event.commit.operation == "delete") {
        db.run(`delete from chat_messages where id = ?`, [messageId]);
      } else if (event.commit.operation == "create") {
        db.run(
          `
            insert into chat_messages (id, stream, record, timestamp)
            values (?, ?, ?, ?)
          `,
          [
            messageId,
            (event.commit.record as { streamer?: string }).streamer || null,
            JSON.stringify(event.commit.record),
            Math.floor(event.time_us / 1000),
          ],
        );
      } else if (event.commit.operation == "update") {
        db.run(
          `
            update chat_messages
            set record = ?
            where id = ?
          `,
          [JSON.stringify(event.commit.record), messageId],
        );
      }
    } catch (e) {
      console.error("Error indexing streamplace message");
    }
  }
}

type Message = {
  author: string;
  timestamp: number;
} & StreamplaceMessage;

export function getMessages({
  start,
  end,
  stream,
}: {
  start: number;
  end: number;
  stream: string;
}): Message[] {
  const stmt = db.query(
    `
      select record, id, timestamp from chat_messages
      where
        timestamp > ?
          and
        timestamp < ?
          and
        stream = ?
    `,
  );
  return stmt.all(start, end, stream).flatMap((row) => {
    const r = row as { id: string; record: string; timestamp: number };
    const did = r.id.split("/")[0];
    if (!did) return [];
    const msg = StreamplaceMessage(JSON.parse(r.record));
    if (msg instanceof type.errors) {
      return [];
    }
    return [{ ...msg, author: did, timestamp: r.timestamp }];
  });
}

import { sleep } from "bun";
import type { ConferenceEvent } from "./calendarEventLoader";
import type { RoomySink } from "./roomy";
import { getMessages } from "./indexer";
import { Did, Event, newUlid, toBytes } from "@roomy-space/sdk";

const STREAM_ROOM_MAP: Record<string, string> = {
  "zicklag's room": "did:plc:ulg2bzgrgs7ddjjlmhtegk3v",
};

export async function startImporter(
  roomy: RoomySink,
  events: ConferenceEvent[],
) {
  for (const event of events) {
    startEventImportTask(roomy, event);
  }
}

async function startEventImportTask(roomy: RoomySink, event: ConferenceEvent) {
  // Identify the stream based on the event room name
  const stream = STREAM_ROOM_MAP[event.additionalData.room];

  // Warn if there is no stream to import messages from.
  if (!stream) {
    console.warn(
      `Could not identify the stream associated to the room "${event.additionalData.room}" for the event "${event.name}"\n\n\
The thread will be created but events will not be imported from stream.`,
    );
  }

  // Wait until the event is over
  await sleep(event.endsAt);

  // Get all the messages from the event
  if (stream) console.log(`Importing messages for event: "${event.name}"`);
  const messages = stream
    ? getMessages({
        start: event.startsAt.getTime(),
        end: event.endsAt.getTime(),
        stream,
      })
    : [];

  // Create the thread we will be sending to
  const threadId = newUlid();
  const events: Event[] = [
    {
      $type: "space.roomy.room.createRoom.v0",
      id: threadId,
      kind: "space.roomy.thread",
      name: event.name,
    },
    {
      $type: "space.roomy.link.createRoomLink.v0",
      id: newUlid(),
      linkToRoom: threadId,
      room: roomy.parentChannel,
    },
  ];

  // Import all the messages to the roomy thread
  for (const msg of messages) {
    events.push({
      $type: "space.roomy.message.createMessage.v0",
      id: newUlid(),
      room: threadId,
      body: {
        mimeType: "text/markdown",
        data: toBytes(new TextEncoder().encode(msg.text)),
      },
      extensions: {
        "space.roomy.extension.authorOverride.v0": {
          did: msg.author as Did,
        },
        "space.roomy.extension.timestampOverride.v0": {
          timestamp: msg.timestamp,
        },
      },
    });
  }
}

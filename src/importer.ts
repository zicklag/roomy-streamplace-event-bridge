import { sleep } from "bun";
import { STREAM_ROOM_MAP, type ConferenceEvent } from "./calendarEventLoader";
import type { RoomySink } from "./roomy";
import { getMessages } from "./indexer";
import { Did, Event, newUlid, toBytes } from "@roomy-space/sdk";

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

  // Warn if this isn't a virtual / hybrid event
  if (
    event.mode != "community.lexicon.calendar.event#hybrid" &&
    event.mode != "community.lexicon.calendar.event#virtual"
  ) {
    console.warn(
      `In person event will not have chats imported: "${event.name}"`,
    );
  } else if (!stream) {
    // Warn if there is no stream to import messages from.
    console.warn(
      `Could not identify the stream associated to the room "${event.additionalData.room}" for the event "${event.name}" \n\
    The thread will be created but events will not be imported from stream.`,
    );
  }

  // Skip this event if it is already past the time for it
  if (event.endsAt.getTime() < Date.now()) {
    console.warn(
      `Event "${event.name}" is in the past, so assuming it has already been imported and skipping import`,
    );
    return;
  }

  // Wait until the event is over
  await sleep(event.endsAt);

  // Get all the messages from the event
  console.log(`Importing messages for event: "${event.name}"`);
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

  await roomy.sendEvents(events);
  console.log(`Done importing messages for event: "${event.name}"`);
}

import { Agent } from "@atproto/api";
import { type } from "arktype";

const ATMOSPHERE_CONF_DID = "did:plc:3xewinw4wtimo2lqfy5fm5sw";
const STREAM1_DID = "did:plc:7tattzlorncahxgtdiuci7x7";
const STREAM2_DID = "did:plc:djb6ssvz5wvuuqpdihlgh3xa";
const STREAM3_DID = "did:plc:jcahd7fl7h23c24ftxuhkhiw";

const ZICKLAG_DID = "did:plc:ulg2bzgrgs7ddjjlmhtegk3v";

const DID = process.env.EVENTS_DID || ATMOSPHERE_CONF_DID;

export const STREAM_ROOM_MAP: Record<string, string> = {
  "zicklag's room": "did:plc:2zmxikig2sj7gqaezl5gntae",
  // Conference rooms & streams

  // Friday
  // "Performance Theatre": STREAM1_DID,
  // "Performance Theater": STREAM1_DID,

  // Sun - Saturday
  "Great Hall": STREAM1_DID,
  "Great Hall South": STREAM1_DID,
  "Performance Theatre": STREAM2_DID,
  "Performance Theater": STREAM2_DID,
  "Room 2301": STREAM3_DID,
  "2301 Classroom": STREAM3_DID,
};

export const ConferenceEvent = type({
  $type: "'community.lexicon.calendar.event'",
  name: "string",
  mode: "'community.lexicon.calendar.event#hybrid' | 'community.lexicon.calendar.event#inperson' | 'community.lexicon.calendar.event#virtual'",
  endsAt: "string.date.parse",
  startsAt: "string.date.parse",
  additionalData: type({
    room: "string",
    isAtmosphereconf: "true",
  }),
});
export type ConferenceEvent = typeof ConferenceEvent.infer;

export async function loadAtmosphereConfEvents(): Promise<ConferenceEvent[]> {
  // Create an agent to fetch events from the calendar
  const agent = new Agent("https://bsky.social");

  // Initialize calendar events list
  let calendarEvents: ConferenceEvent[] = [];

  // Loop and read all events from the account, keeping the cursor
  let cursor: string | undefined;
  while (true) {
    // Fetch list
    const resp = await agent.com.atproto.repo.listRecords(
      {
        collection: "community.lexicon.calendar.event",
        repo: DID,
        limit: 100,
        cursor,
      },
      {
        headers: {
          "atproto-proxy": `${DID}#atproto_pds`,
        },
      },
    );

    // Update cursor for next loop
    cursor = resp.data.cursor;

    // Get records
    const records = resp.data.records;

    // Exit loop once we have all events
    if (records.length <= 0) break;

    // Extend list with new records
    calendarEvents = [
      ...calendarEvents,
      ...records.flatMap((x) => {
        // Parse the event.
        const event = ConferenceEvent(x.value);

        // Skip unparsable events, which will also skip non-conference events.
        if (event instanceof type.errors) return [];

        // Add 15 minute overrun to capture chats that run past official end time.
        event.endsAt = new Date(event.endsAt.getTime() + 1000 * 60 * 20);

        // Return the event
        return [event];
      }),
    ];
  }

  // Return final events list
  return calendarEvents;
}

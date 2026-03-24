import { Agent } from "@atproto/api";
import { type } from "arktype";

const ATMOSPHERE_CONF_DID = "did:plc:3xewinw4wtimo2lqfy5fm5sw";
const ZICKLAG_DID = "did:plc:ulg2bzgrgs7ddjjlmhtegk3v";

const DID = ZICKLAG_DID;

export const ConferenceEvent = type({
  $type: "'community.lexicon.calendar.event'",
  name: "string",
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

        // Return the event
        return [event];
      }),
    ];
  }

  // Return final events list
  return calendarEvents;
}

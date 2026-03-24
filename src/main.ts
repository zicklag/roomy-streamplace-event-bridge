import { connectToRoomy } from "./roomy";
import { loadAtmosphereConfEvents } from "./calendarEventLoader";
import { startIndexer } from "./indexer";
import "./monkeypatchProxySupport";
import { startImporter } from "./importer";

// Start indexer that will watch for messages over the firehose.
startIndexer();

// Fetch the calendarEvents that we will be creating threads for.
const confEvents = await loadAtmosphereConfEvents();

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

confEvents.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

console.log("==== Events ====");
confEvents.forEach((x) =>
  console.log(
    `${dateFormatter.format(x.startsAt)} - ${timeFormatter.format(x.endsAt)}  ${x.mode == "community.lexicon.calendar.event#inperson" ? "(in-person )" : "( streamed )"}  ${x.name}`,
  ),
);
console.log(`Loaded ${confEvents.length} events`);

console.log("==== Connect Roomy ====");

// Connect to roomy
const roomy = await connectToRoomy();

console.log("==== Starting Importer ====");

// Start the event importer
startImporter(roomy, confEvents);

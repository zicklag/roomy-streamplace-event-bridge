import { connectToRoomy } from "./roomy";
import { loadAtmosphereConfEvents } from "./calendarEventLoader";
import { startIndexer } from "./indexer";
import "./monkeypatchProxySupport";
import { startImporter } from "./importer";

// Start indexer that will watch for messages over the firehose.
startIndexer();

// Fetch the calendarEvents that we will be creating threads for.
const confEvents = await loadAtmosphereConfEvents();

console.log("==== Events ====");
confEvents.forEach((x) => console.log(`${x.name} ${x.startsAt} - ${x.endsAt}`));

console.log("==== Connect Roomy ====");

// Connect to roomy
const roomy = await connectToRoomy();

console.log("==== Starting Importer ====");

// Start the event importer
startImporter(roomy, confEvents);

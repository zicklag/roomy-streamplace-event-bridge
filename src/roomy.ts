import { Agent, CredentialSession } from "@atproto/api";
import {
  RoomyClient,
  Event,
  ConnectedSpace,
  modules,
  StreamDid,
  Ulid,
} from "@roomy-space/sdk";

if (!process.env.ATPROTO_USERNAME)
  throw new Error("ATPROTO_USERNAME env var required");
const username = process.env.ATPROTO_USERNAME;

if (!process.env.ATPROTO_APP_PASSWORD)
  throw new Error("ATPROTO_APP_PASSWORD env var required");
const password = process.env.ATPROTO_APP_PASSWORD;

if (!process.env.ROOMY_SPACE_DID)
  throw new Error("ROOMY_SPACE_DID env var required");
const spaceDid = StreamDid.assert(process.env.ROOMY_SPACE_DID);

if (!process.env.ROOMY_PARENT_CHANNEL)
  throw new Error("ROOMY_PARENT_CHANNEL env var required");
const parentChannel = Ulid.assert(process.env.ROOMY_PARENT_CHANNEL);

export type RoomySink = Awaited<ReturnType<typeof connectToRoomy>>;
export async function connectToRoomy() {
  // Connect to roomy space
  const session = new CredentialSession(new URL("https://bsky.social"));
  await session.login({
    identifier: username,
    password: password,
  });
  const agent = new Agent(session);
  const client = await RoomyClient.create({
    agent: agent as any, // version mismatch, we'll just force it for now
    leafUrl: "https://leaf.muni.town",
    leafDid: `did:web:leaf.muni.town`,
    spaceNsid: "space.roomy.space.personal.dev",
    profileSpaceNsid: "space.roomy.profileSpace",
  });
  const connectedSpace = await ConnectedSpace.connect({
    client,
    module: modules.space,
    streamDid: spaceDid,
  });

  return {
    parentChannel,
    sendEvents: (events: Event[]) => connectedSpace.sendEvents(events),
  };
}

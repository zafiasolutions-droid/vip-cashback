import db from "../db.server";

export const loader = async () => {
  const channels = await db.twitchChannel.findMany();

  return Response.json({
    count: channels.length,
    channels,
  });
};
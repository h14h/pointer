import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (process.env.NODE_ENV === "development") {
    const { tidewaveHandler } = await import("tidewave/next-js/handler");
    // Remote access is opt-in via TIDEWAVE_ALLOW_REMOTE=true (see .env.example).
    // Default stays localhost-only so public clones don't open Tidewave MCP.
    const allowRemoteAccess = process.env.TIDEWAVE_ALLOW_REMOTE === "true";
    const handler = await tidewaveHandler({ allowRemoteAccess });
    return handler(req, res);
  } else {
    res.status(404).end();
  }
}

export const config = {
  runtime: "nodejs",
  api: {
    bodyParser: false, // Tidewave already parses the body internally
  },
};

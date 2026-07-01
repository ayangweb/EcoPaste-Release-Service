import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ApiError } from "./types.js";

export const setCommonHeaders = (res: VercelResponse): void => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

export const setCacheHeaders = (res: VercelResponse): void => {
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
};

export const sendError = (
  res: VercelResponse,
  statusCode: number,
  message: string
): void => {
  const body: ApiError = {
    error: {
      message,
    },
  };

  res.status(statusCode).json(body);
};

export const getPathname = (req: VercelRequest): string => {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `https://${host}`);
  const pathname = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";

  return pathname;
};

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "sensai",
  name: "sensAI",
  ...(process.env.GEMINI_API_KEY
    ? {
        credentials: {
          gemini: {
            apiKey: process.env.GEMINI_API_KEY,
          },
        },
      }
    : {}),
});

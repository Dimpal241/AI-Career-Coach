import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { generateIndustryInsights } from "@/lib/inngest/functions";

export const runtime = "nodejs"; 

const handler = serve({
  client: inngest,
  functions: [generateIndustryInsights],
});

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;

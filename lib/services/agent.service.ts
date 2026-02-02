import { httpRequest } from "@/lib/http/client";
import {
  AgentRequest,
  AgentResponse
} from "@/lib/types/agent";

export async function analyzeWithAgent(
  payload: AgentRequest
): Promise<AgentResponse> {
  return httpRequest<AgentResponse>(
    "/api/analyze/agent",
    {
      method: "POST",
      body: payload
    }
  );
}

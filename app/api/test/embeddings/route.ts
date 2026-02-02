import { NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { cosineSimilarity } from "@/lib/similarity";

export async function GET() {
  try {
    const textA =
  "Senior frontend engineer specializing in React, Next.js, UI performance, and web accessibility";

const textB =
  "Frontend developer focused on React, modern JavaScript, UI optimization, and scalable web interfaces";

const textC =
  "Backend engineer working with Java, Spring Boot, REST APIs, databases, and microservices architecture";


    const embA = await embedText(textA);
    const embB = await embedText(textB);
    const embC = await embedText(textC);

    return NextResponse.json({
      similarity_A_B: cosineSimilarity(embA, embB),
      similarity_A_C: cosineSimilarity(embA, embC),
      embedding_length: embA.length
    });
  } catch (err: any) {
    console.error("EMBEDDING TEST ERROR:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

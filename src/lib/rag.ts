import { supabaseAdmin } from "@/server/supabase";
import { openaiClient } from "./openai";

export interface ChecklistItem {
  id: string;
  category: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Store checklist item with embedding in pgvector
 */
export async function storeChecklistItem(
  id: string,
  category: string,
  content: string,
  metadata?: Record<string, any>
): Promise<void> {
  const embedding = await generateEmbedding(content);

  const { error } = await supabaseAdmin.from("checklist_embeddings").upsert({
    id,
    category,
    content,
    embedding,
    metadata,
  });

  if (error) {
    throw new Error(`Failed to store checklist item: ${error.message}`);
  }
}

/**
 * Search for similar checklist items using vector similarity
 */
export async function searchChecklistItems(
  query: string,
  category?: string,
  limit: number = 5
): Promise<ChecklistItem[]> {
  const queryEmbedding = await generateEmbedding(query);

  // Build the query
  let rpcQuery = supabaseAdmin.rpc("match_checklist_items", {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit,
  });

  if (category) {
    rpcQuery = rpcQuery.eq("category", category);
  }

  const { data, error } = await rpcQuery;

  if (error) {
    throw new Error(`Failed to search checklist items: ${error.message}`);
  }

  return data || [];
}

/**
 * Get checklist items by category
 */
export async function getChecklistByCategory(
  category: string
): Promise<ChecklistItem[]> {
  const { data, error } = await supabaseAdmin
    .from("checklist_embeddings")
    .select("*")
    .eq("category", category);

  if (error) {
    throw new Error(`Failed to get checklist: ${error.message}`);
  }

  return data || [];
}

/**
 * Build RAG context from checklist items
 */
export async function buildRAGContext(
  campaignCategory: string,
  transcript: string
): Promise<string> {
  // Get relevant checklist items based on transcript
  const relevantItems = await searchChecklistItems(
    transcript,
    campaignCategory,
    10
  );

  if (relevantItems.length === 0) {
    // Fallback to all items in category
    const allItems = await getChecklistByCategory(campaignCategory);
    return allItems.map((item) => item.content).join("\n");
  }

  return relevantItems.map((item) => item.content).join("\n");
}

/**
 * Seed default checklist items for common categories
 */
export async function seedDefaultChecklists(): Promise<void> {
  const checklists = [
    // Retail category
    {
      id: "retail-001",
      category: "Retail",
      content: "Ask about current inventory levels compared to last quarter",
    },
    {
      id: "retail-002",
      category: "Retail",
      content: "Inquire about sales trends and customer traffic patterns",
    },
    {
      id: "retail-003",
      category: "Retail",
      content: "Ask about supply chain issues or delivery delays",
    },
    {
      id: "retail-004",
      category: "Retail",
      content: "Inquire about pricing changes or promotional activities",
    },
    {
      id: "retail-005",
      category: "Retail",
      content: "Ask about customer feedback on specific products",
    },

    // Healthcare category
    {
      id: "healthcare-001",
      category: "Healthcare",
      content: "Ask about patient volume trends",
    },
    {
      id: "healthcare-002",
      category: "Healthcare",
      content: "Inquire about staffing levels and recruitment challenges",
    },
    {
      id: "healthcare-003",
      category: "Healthcare",
      content: "Ask about equipment availability and maintenance",
    },
    {
      id: "healthcare-004",
      category: "Healthcare",
      content: "Inquire about insurance reimbursement changes",
    },
    {
      id: "healthcare-005",
      category: "Healthcare",
      content: "Ask about new service offerings or expansions",
    },

    // Technology category
    {
      id: "tech-001",
      category: "Technology",
      content: "Ask about product adoption rates and user feedback",
    },
    {
      id: "tech-002",
      category: "Technology",
      content: "Inquire about competitive landscape and market positioning",
    },
    {
      id: "tech-003",
      category: "Technology",
      content: "Ask about feature requests and product roadmap priorities",
    },
    {
      id: "tech-004",
      category: "Technology",
      content: "Inquire about integration challenges or technical issues",
    },
    {
      id: "tech-005",
      category: "Technology",
      content: "Ask about pricing sensitivity and contract renewal rates",
    },
  ];

  for (const item of checklists) {
    await storeChecklistItem(item.id, item.category, item.content);
  }
}


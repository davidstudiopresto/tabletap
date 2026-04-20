import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXTRACTION_PROMPT = `Tu es un assistant spécialisé dans l'extraction de menus de restaurant à partir d'images.

Analyse cette image de carte de restaurant et extrais TOUS les plats visibles.

Pour chaque plat, extrais :
- number: le numéro du plat s'il en a un (ex: "H1", "B12", "34"), sinon chaîne vide
- name: le nom du plat
- description: la description si visible, sinon chaîne vide
- price: le prix en nombre décimal (ex: 12.50)
- category: la catégorie/section du plat telle qu'elle apparaît sur la carte

Organise le résultat par catégories.

IMPORTANT: Retourne UNIQUEMENT un JSON valide, sans texte avant ou après, avec cette structure exacte :
{
  "categories": [
    {
      "name": "Nom de la catégorie",
      "items": [
        {
          "number": "H1",
          "name": "Nom du plat",
          "description": "Description",
          "price": 12.50,
          "category": "Nom de la catégorie"
        }
      ]
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return Response.json({ error: "No files provided" }, { status: 400 });
    }

    const allCategories: Record<
      string,
      { number: string; name: string; description: string; price: number; category: string }[]
    > = {};

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");

      let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";
      if (file.type === "image/png") mediaType = "image/png";
      else if (file.type === "image/webp") mediaType = "image/webp";
      else if (file.type === "image/gif") mediaType = "image/gif";

      // For PDFs, we'd convert to images first. For now, handle images directly.
      if (file.type === "application/pdf") {
        // PDF handling — skip for now, would need pdf2pic + sharp
        continue;
      }

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") continue;

      try {
        const parsed = JSON.parse(textBlock.text);
        for (const cat of parsed.categories) {
          if (!allCategories[cat.name]) {
            allCategories[cat.name] = [];
          }
          allCategories[cat.name].push(...cat.items);
        }
      } catch {
        // If JSON parsing fails, try to extract from markdown code block
        const match = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            for (const cat of parsed.categories) {
              if (!allCategories[cat.name]) {
                allCategories[cat.name] = [];
              }
              allCategories[cat.name].push(...cat.items);
            }
          } catch {
            // Skip
          }
        }
      }
    }

    const categories = Object.entries(allCategories).map(([name, items]) => ({
      name,
      items,
    }));

    return Response.json({ categories });
  } catch (error) {
    console.error("Menu extraction error:", error);
    return Response.json({ error: "Extraction failed" }, { status: 500 });
  }
}

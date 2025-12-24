
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Difficulty, ShoppingListItem, NearbyStore } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const findNearbySupermarkets = async (lat: number, lng: number): Promise<NearbyStore[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Find the 5 closest grocery stores or supermarkets near my current location. Please provide their names, addresses, and phone numbers.",
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: { latitude: lat, longitude: lng }
        }
      }
    },
  });

  const stores: NearbyStore[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.maps) {
        // Maps tool provides uri and title. 
        // We'll also try to parse the text response for phone numbers if the model included them.
        stores.push({
          name: chunk.maps.title || "Unknown Store",
          address: "Nearby Location", // Fallback, usually contained in maps metadata or text
          uri: chunk.maps.uri,
          phone: "Contact via Maps" // Default fallback
        });
      }
    });
  }

  // If we have grounding but want better detail, we can sometimes see the model's text response 
  // contains the phone numbers. We'll leave the structured extraction for maps uris as primary.
  return stores;
};

export const estimateTotalCost = async (items: ShoppingListItem[]): Promise<number> => {
  if (items.length === 0) return 0;
  
  const prompt = `Estimate the total price in USD for these groceries: ${items.map(i => `${i.amount} of ${i.name}`).join(', ')}. Provide ONLY the numerical sum.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          estimatedTotal: { type: Type.NUMBER }
        },
        required: ["estimatedTotal"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text);
    return data.estimatedTotal || 0;
  } catch {
    return items.length * 3.5; // Rough fallback
  }
};

export const generateRecipeImage = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `Professional gourmet food photography of: ${prompt}. Close up, soft lighting, 8k resolution, appetizing, masterchef style.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "4:3",
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("No image data found");
};

export const analyzeFridgeImage = async (
  base64Image: string, 
  servings: number, 
  ageGroup: string, 
  allergies: string[]
): Promise<{ ingredients: string[], recipes: Recipe[] }> => {
  const allergyText = allergies.length > 0 ? `STRICTLY AVOID these allergens: ${allergies.join(", ")}.` : "";
  
  const systemInstruction = `You are "The AI Executive Chef". Your mission is to:
  1. Carefully analyze the fridge image to detect ALL visible ingredients.
  2. The user wants to serve ${servings} people (${ageGroup}).
  3. ${allergyText} Ensure all suggested recipes are safe.
  4. Scale all recipe ingredient quantities specifically for ${servings} servings.
  5. Compare detected ingredients vs required quantities. If you detect an ingredient but it's not enough for ${servings} people, mark it as "isMissing: true" and specify the exact additional amount needed to buy.
  6. Create 3 gourmet recipes suitable for ${ageGroup}.
  7. Provide a specific, descriptive "imagePrompt" for each.
  8. Return JSON.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
      recipes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: Object.values(Difficulty) },
            prepTime: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.STRING },
                  isMissing: { type: Type.BOOLEAN }
                },
                required: ["name", "amount", "isMissing"]
              }
            },
            steps: { type: Type.ARRAY, items: { type: Type.STRING } },
            imagePrompt: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["id", "title", "description", "difficulty", "prepTime", "calories", "ingredients", "steps", "tags", "imagePrompt"]
        }
      }
    },
    required: ["ingredients", "recipes"]
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: `Examine this fridge interior. Suggest 3 recipes for ${servings} ${ageGroup}. ${allergyText}` },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }
        ]
      }
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.7
    }
  });

  return JSON.parse(response.text);
};

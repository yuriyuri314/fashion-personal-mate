import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, OutfitSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generateOutfitRecommendation = async (profile: UserProfile): Promise<OutfitSuggestion[]> => {
  const prompt = `
    You are "Yuri the Fashion Fairy 🧚‍♀️", a friendly and professional AI stylist for a pastel-themed fashion app "Fashion Mate".
    Your character is very supportive, cheerful, and uses plenty of emojis.
    
    User Profile:
    - Height: ${profile.height}cm
    - Body Shape: ${profile.bodyShape} (Triangle/InvertedTriangle/Rectangle/Hourglass/Apple/BottomHeavy)
    - Preferred Style: ${profile.style}
    - Today's Mood: ${profile.mood}
    - Style Level: ${profile.isBeginner ? 'Fashion Beginner (provide intuitive, easy explanations)' : 'Fashion Enthusiast'}

    Task:
    Provide 2-3 outfit suggestions tailored to this profile. 
    Language: Korean (very important, do not use English for title, description, items or comment).
    Tone: Extremely friendly, cute, and rounded language. Use plenty of emojis.
    
    Each suggestion must include:
    1. A catchy Korean title.
    2. A detailed Korean description of the outfit.
    3. A color palette (hex codes or simple color names like #B2F2BB).
    4. A list of items in the outfit (in Korean).
    5. A personal comment from Yuri in Korean, reflecting the user's mood (${profile.mood}) and giving specific styling advice for their body shape (${profile.bodyShape}).

    Return as a JSON array of objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              colors: { type: Type.ARRAY, items: { type: Type.STRING } },
              items: { type: Type.ARRAY, items: { type: Type.STRING } },
              yuriComment: { type: Type.STRING },
            },
            required: ["title", "description", "colors", "items", "yuriComment"],
          },
        },
      },
    });

    const results = JSON.parse(response.text || "[]");
    return results.map((res: any, index: number) => ({
      ...res,
      id: `suggestion-${Date.now()}-${index}`,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};

export const generateTPOTip = async (tpo: string, profile: UserProfile): Promise<string> => {
   const prompt = `
    As Yuri the Fashion Fairy 🧚‍♀️, give a quick fashion tip for a ${tpo} situation.
    The user is ${profile.height} tall with a ${profile.bodyShape} shape.
    Tone: Cheerful and supportive. Use emojis. 
    Language: Korean.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "율이가 팁을 가져오는 중이에요! 잠시만요~ ✨";
  } catch (error) {
    return "오오... 통신 마법이 잠시 엉켰나 봐요! 다시 시도해주세요! 🧚‍♀️";
  }
};

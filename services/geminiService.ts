
import { GoogleGenAI, Type } from "@google/genai";
import { Player } from "../types";

export const analyzeRoster = async (roster: Player[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    As a World of Warcraft Raid Leader expert, analyze the following guild roster for mythic raiding and split runs.
    Provide:
    1. A summary of class balance (are we missing buffs?).
    2. Split group recommendations (how to divide these players into 2 balanced raid groups).
    3. Low item level alerts.
    4. Strategic advice for the upcoming raid tier.

    Roster Data:
    ${JSON.stringify(roster, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Error generating analysis. Please try again later.";
  }
};

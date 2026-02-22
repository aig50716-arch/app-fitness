import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateWorkoutPlan = async (goal: string, profile: any) => {
  const model = "gemini-3-flash-preview";
  const prompt = `Crie um plano de treino personalizado para um usuário com o seguinte perfil:
  Objetivo: ${goal}
  Peso: ${profile.weight}kg
  Altura: ${profile.height}cm
  
  Por favor, retorne o treino em formato JSON com a seguinte estrutura:
  {
    "name": "Nome do Treino",
    "description": "Breve descrição",
    "exercises": [
      { "name": "Nome do Exercício", "sets": 3, "reps": 12, "instructions": "Dica rápida" }
    ]
  }
  Responda apenas com o JSON.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating workout:", error);
    return null;
  }
};

export const getFitnessAdvice = async (query: string) => {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Você é um personal trainer experiente. Responda à seguinte pergunta de forma motivadora e técnica: ${query}`,
  });
  return response.text;
};

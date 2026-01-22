import { GoogleGenAI, Type } from "@google/genai";
import { ModelMetrics, FeatureImportance, State } from "../types";

export class GeminiService {
  static async analyzeResults(metrics: ModelMetrics, importances: FeatureImportance[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Act as a senior biomedical signal processing researcher. 
      Analyze the following ML model results for Drowsiness Detection using GSR and Stroop tests:
      
      Metrics:
      - Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%
      - Precision: ${(metrics.precision * 100).toFixed(1)}%
      - Recall: ${(metrics.recall * 100).toFixed(1)}%
      - F1 Score: ${(metrics.f1 * 100).toFixed(1)}%
      
      Feature Importances:
      ${importances.map(i => `- ${i.feature}: ${(i.importance * 100).toFixed(1)}%`).join('\n')}
      
      Explain:
      1. Why the metrics are at this level.
      2. Why certain features (like Stroop RT or GSR Mean) dominate the classification.
      3. Suggestions for improving accuracy (e.g., HRV, EOG, or deep learning).
      
      Keep the explanation academic yet accessible for a final-year engineering student.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "No analysis generated.";
  }

  static async getClinicalCommentary(rtMs: number, gsrMean: number, peakCount: number, state: State): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      As a biomedical researcher, provide a brief (2-3 sentences) clinical interpretation for these subject values:
      - Reaction Time: ${rtMs} ms
      - GSR Mean: ${gsrMean} uS
      - SCR Peak Count: ${peakCount}
      - Predicted State: ${state}
      
      Explain the physiological significance of these specific values.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Interpretation unavailable.";
  }

  static async parseAndPredict(message: string): Promise<{ rtMs?: number; gsrMean?: number; peakCount?: number; explanation: string }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      You are an AI Medical Assistant integrated into the NeuroGuard platform. 
      The user will provide details about a subject's current state (Reaction Time, GSR levels, etc.).
      
      Your tasks:
      1. Extract numerical features: 'rtMs' (Stroop Reaction Time in milliseconds), 'gsrMean' (GSR Mean value in uS), and 'peakCount' (Number of phasic peaks).
      2. If values are missing, try to infer or leave them null.
      3. Provide a brief, professional interpretation of these values from a biomedical perspective.

      User message: "${message}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rtMs: { type: Type.NUMBER, description: "Reaction time in milliseconds" },
            gsrMean: { type: Type.NUMBER, description: "GSR mean conductance in uS" },
            peakCount: { type: Type.NUMBER, description: "Count of phasic peaks" },
            explanation: { type: Type.STRING, description: "Professional medical commentary" }
          },
          required: ["explanation"]
        }
      }
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { explanation: "I couldn't parse the data properly. Please provide RT in ms and GSR Mean in uS." };
    }
  }
}
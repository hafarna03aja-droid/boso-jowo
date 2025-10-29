import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

export const generateSermon = async (topic: string, tone: string, audience: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const prompt = `
        Gaweaken teks kultum (khutbah singkat) nganggo Boso Jowo Kromo Alus gaya Yogyakarta-Surakarta.
        Yen ono ayat Al-Qur'an utowo hadits, tulisen nganggo teks Arab asli banjur artine.
        Gunakake format Markdown kanggo judhul, sub-judul, lan daftar.

        Topik: "${topic}"
        Gaya Bahasa: ${tone}
        Kanggo: ${audience}

        Struktur:
        # Pambuko
        (salam, puji syukur, sholawat)
        ## Isi
        (penjelasan topik, dalil yen saget)
        ### Panutup
        (kesimpulan, dungo, salam)
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using Pro for better formatting and language nuance
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating sermon:", error);
        return "Nyuwun pangapunten, wonten masalah nalika damel teks kultum. Cobi malih mangke.";
    }
};

export const generateMcScript = async (eventType: string, tone: string, agenda: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const prompt = `
        Gaweaken teks pranatacara (MC) lengkap nganggo Boso Jowo Kromo Alus gaya Yogyakarta-Surakarta.
        Yen ono ayat Al-Qur'an utowo kutipan, tulisen nganggo teks Arab asli banjur artine yen perlu.
        Gunakake format Markdown kanggo judhul, sub-judul, lan kanggo mbedakake saben bagian acara.

        Jenis Acara: "${eventType}"
        Gaya Bahasa: "${tone}"
        Rundown Acara (yen wonten):
        ${agenda}

        Struktur Teks MC:
        # Pambuko
        (salam, atur pakurmatan, puji syukur)
        ## Isi Acara
        (ngaturaken rantamaning acara siji mbaka siji, kanthi basa ingkang runtut)
        ### Panutup
        (nyuwun pangapunten, dungo, salam panutup)
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating MC script:", error);
        return "Nyuwun pangapunten, wonten masalah nalika damel teks MC. Cobi malih mangke.";
    }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
    const cleanText = text.replace(/#+\s/g, '').replace(/[*_]/g, '').replace(/\n/g, ' ');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Waosaken teks menika kanthi intonasi ingkang sae: "${cleanText}"` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Error generating speech:", error);
        return null;
    }
};


interface LiveSessionCallbacks {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
}

export const startLiveSession = (callbacks: LiveSessionCallbacks) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }, // Changed voice as per user request
            },
            systemInstruction: `You are a friendly Javanese language tutor specializing in the 'Kromo Alus' Yogyakarta-Surakarta dialect. The user is practicing delivering a sermon (kultum). Your role is to listen and provide brief, encouraging feedback in the same dialect. If they pause or finish, you can say things like "Nggih, sae sanget." (Yes, very good.) or "Monggo dipunlajengaken." (Please continue.). Keep your responses very short and supportive.`,
        },
    });
};
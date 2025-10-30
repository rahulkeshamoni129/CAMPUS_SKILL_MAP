const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateRecommendation = async (studentData) => {
  const prompt = `Student profile: ${JSON.stringify(studentData)}
  Suggest missing skills, suitable job roles, and expected salary range.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    });

    return result.response.text();
  } catch (error) {
    console.error("LLM Error:", error);
    return "LLM recommendation failed.";
  }
};

module.exports = { generateRecommendation };

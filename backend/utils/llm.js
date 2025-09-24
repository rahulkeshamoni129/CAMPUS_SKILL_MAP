const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY);

const generateRecommendation = async (studentData) => {
  const prompt = `Student profile: ${JSON.stringify(studentData)}
  Suggest missing skills, suitable job roles, and expected salary range.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('LLM Error:', error.message);
    return "LLM recommendation failed.";
  }
};

module.exports = { generateRecommendation };
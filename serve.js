const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error("A chave GOOGLE_API_KEY não foi encontrada no arquivo .env");
}
const genAI = new GoogleGenerativeAI(apiKey);

app.post('/ask-ai', async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) {
        return res.status(400).json({ error: 'Nenhuma mensagem foi fornecida.' });
    }
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(userMessage);
        const response = await result.response;
        const text = response.text();
        res.json({ response: text });
    } catch (error) {
        console.error("Erro na API do Google:", error);
        res.status(500).json({ error: 'Houve um erro ao se comunicar com a IA.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando e pronto para uso em http://localhost:${PORT}`);
});
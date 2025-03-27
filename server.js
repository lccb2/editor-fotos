const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do multer para salvar as imagens temporariamente
const upload = multer({ dest: "uploads/" });

// Criar a pasta "outputs" se não existir
if (!fs.existsSync("outputs")) {
    fs.mkdirSync("outputs");
}

// Função para quebrar texto em múltiplas linhas
const wrapText = (text, maxWidth, fontSize) => {
    const words = text.split(" ");
    let lines = [];
    let currentLine = "";

    for (let word of words) {
        let testLine = currentLine ? `${currentLine} ${word}` : word;
        let testWidth = testLine.length * (fontSize / 2); // Estimativa do tamanho do texto

        if (testWidth > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    return lines;
};

// Rota para processar a imagem
app.post("/edit-image", upload.single("image"), async (req, res) => {
    const { text, color = "white", font = "Arial", fontSize = 40, xPosition = 50, yPosition = 50 } = req.body;
    const imagePath = req.file.path;
    const outputImage = `outputs/${Date.now()}_edited.png`;

    // Garantir que os valores são números
    const xPos = parseInt(xPosition, 10);
    const yPos = parseInt(yPosition, 10);
    const fontSz = parseInt(fontSize, 10);

    try {
        // Obter as dimensões da imagem original
        const imageMetadata = await sharp(imagePath).metadata();
        const imageWidth = imageMetadata.width;
        const imageHeight = imageMetadata.height;

        // Quebrar o texto em linhas para caber na imagem
        const lines = wrapText(text, imageWidth - xPos * 2, fontSz);
        const lineHeight = fontSz * 1.2;
        const requiredHeight = lines.length * lineHeight + yPos;

        // Criar o SVG ajustando a altura conforme necessário
        let svgText = `<svg width="${imageWidth}" height="${Math.max(requiredHeight, imageHeight)}">`;
        let currentY = yPos;

        for (let line of lines) {
            svgText += `<text x="${xPos}" y="${currentY}" font-size="${fontSz}" fill="${color}" font-family="${font}">${line}</text>`;
            currentY += lineHeight;
        }
        svgText += `</svg>`;

        // Criar a imagem final com o texto sobreposto
        await sharp(imagePath)
            .extend({
                top: 0,
                bottom: requiredHeight > imageHeight ? requiredHeight - imageHeight : 0,
                left: 0,
                right: 0,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .composite([{
                input: Buffer.from(svgText, "utf-8"),
                top: 0,
                left: 0
            }])
            .toFile(outputImage);

        // Retornar a URL da imagem editada
        res.json({ imageUrl: `http://localhost:5000/${outputImage}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao editar imagem" });
    }
});

// Servir as imagens editadas
app.use(express.static("outputs"));

// Iniciar o servidor na porta 5000
app.listen(5000, () => console.log("Servidor rodando na porta 5000"));

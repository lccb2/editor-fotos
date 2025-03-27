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

// Função para quebrar o texto em várias linhas com base na largura da imagem
const wrapText = async (text, font, fontSize, maxWidth) => {
    const words = text.split(" ");
    let lines = [];
    let currentLine = "";

    for (let word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        
        // Criar uma imagem temporária para medir o texto
        const { width } = await sharp({
            create: {
                width: 1000, // Tamanho arbitrário para medir texto
                height: 100,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
        })
            .text(testLine, { font, fontSize })
            .metadata();

        // Se o texto ultrapassar a largura máxima, quebramos a linha
        if (width > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        lines.push(currentLine); // Adiciona a última linha
    }
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

        // Quebrar o texto em múltiplas linhas respeitando a largura da imagem
        const lines = await wrapText(text, font, fontSz, imageWidth - xPos * 2); 

        // Definir altura do SVG com base na quantidade de linhas
        const lineHeight = fontSz * 1.2;
        const requiredHeight = lines.length * lineHeight + yPos; // Altura do SVG cresce conforme as linhas

        // Criar um SVG dinâmico que cresce conforme a quantidade de texto
        let svgText = `<svg width="${imageWidth}" height="${requiredHeight}">`;
        let currentY = yPos;

        for (let line of lines) {
            svgText += `<text x="${xPos}" y="${currentY}" font-size="${fontSz}" fill="${color}" font-family="${font}">${line}</text>`;
            currentY += lineHeight; // Move para a próxima linha
        }

        svgText += `</svg>`;

        // Compor a imagem original com o SVG de texto
        await sharp(imagePath)
            .extend({ // Garante que a imagem seja expandida se necessário
                top: 0,
                bottom: requiredHeight > imageHeight ? requiredHeight - imageHeight : 0,
                left: 0,
                right: 0,
                background: { r: 0, g: 0, b: 0, alpha: 0 }, // Fundo transparente
            })
            .composite([{
                input: Buffer.from(svgText),
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

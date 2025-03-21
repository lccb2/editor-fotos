const express = require('express');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');


const app = express();
app.use(express.json()); // Middleware para JSON

// 🔹 Rota raiz para evitar o erro "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Servidor rodando! Use os endpoints disponíveis.');
});

// 🔹 Endpoint para adicionar texto à imagem
app.patch('/image/text/:imageName', async (req, res) => {
  const { text } = req.body;
  const imageName = req.params.imageName;
  
  // 🔹 Constrói o caminho absoluto da imagem
  const imagePath = path.resolve(__dirname, "images", `${imageName}.jpg`);
  const editedImagePath = path.resolve(__dirname, "images", `edited_${imageName}.jpg`);

  // 🔹 Verifica se a imagem existe
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({
      success: false,
      message: 'Imagem não encontrada!',
      error: 'Arquivo inexistente'
    });
  }

  try {
    // 🔹 Carrega a imagem e a fonte, depois adiciona o texto
    const image = await Jimp.read(imagePath);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

    image.print(font, 10, 10, text);
    await image.writeAsync(editedImagePath);

    res.json({
      success: true,
      message: 'Texto alterado com sucesso!',
      data: { imageName, newText: text }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Erro ao editar imagem',
      error: err.message
    });
  }
});

// 🔹 Iniciar o servidor
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});

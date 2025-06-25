const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const { createCanvas } = require("canvas");
const sharp = require("sharp");
const archiver = require("archiver");

const app = express();
const port = 3000;

app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

app.post("/convert", upload.single("pdfFile"), async (req, res) => {
  const tempPath = req.file.path;
  const originalName = path.parse(req.file.originalname).name;
  const extension = path.extname(req.file.originalname);
  const renamedPdfPath = path.join("uploads", `${originalName}${extension}`);

  // Renombrar archivo temporal con su nombre original
  fs.renameSync(tempPath, renamedPdfPath);

  const quality = req.body.quality;
  const outputDir = path.join(__dirname, "output", originalName);
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const data = new Uint8Array(fs.readFileSync(renamedPdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const totalPages = pdf.numPages;
    const imagePaths = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");

      await page.render({ canvasContext: context, viewport }).promise;

      const buffer = canvas.toBuffer("image/png");
      const outputName = `${originalName}-pag-${String(i).padStart(2, "0")}.jpg`;
      const outputPath = path.join(outputDir, outputName);

      let qualityVal = 90;
      if (quality === "low") qualityVal = 40;
      else if (quality === "medium") qualityVal = 70;

      await sharp(buffer)
        .jpeg({ quality: qualityVal })
        .toFile(outputPath);

      imagePaths.push(outputPath);
    }

    // Crear ZIP
    const zipName = `${originalName}.zip`;
    const zipPath = path.join(__dirname, "output", zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip");

    archive.pipe(output);
    imagePaths.forEach(file => {
      archive.file(file, { name: path.basename(file) });
    });

    await archive.finalize();

    output.on("close", () => {
      console.log(`✅ ZIP generado: ${zipName}`);
      res.json({ zipName }); // Enviar el nombre al frontend
    });

  } catch (error) {
    console.error("❌ Error al convertir:", error);
    res.status(500).send("Ocurrió un error durante la conversión.");
  }
});

// Ruta para descargar el archivo ZIP
app.get("/descargar/:zipName", (req, res) => {
  const zipPath = path.join(__dirname, "output", req.params.zipName);
  if (fs.existsSync(zipPath)) {
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${req.params.zipName}"`,
    });
    res.sendFile(zipPath);
  } else {
    res.status(404).send("Archivo no encontrado.");
  }
});

app.listen(port, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${port}`);
});

const pdfFileInput = document.getElementById('pdfFile');
const previewPages = document.getElementById('previewPages');
const previewLoader = document.getElementById('previewLoader');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const step4 = document.getElementById('step4');
const convertBtn = document.getElementById('convertBtn');
const downloadBtn = document.getElementById('downloadBtn');
const restartBtn = document.getElementById('restartBtn');

let currentFile;
let zipName;

// Obtener la calidad seleccionada desde los radio buttons
function getSelectedQuality() {
  const radios = document.querySelectorAll('input[name="quality"]');
  for (const radio of radios) {
    if (radio.checked) return radio.value;
  }
  return null;
}

// Mostrar previsualización del PDF
async function mostrarPrevisualizacion(file) {
  if (!file) return;

  currentFile = file;
  previewPages.innerHTML = '';
  previewLoader.classList.remove('hidden');

  const reader = new FileReader();
  reader.onload = async function () {
    try {
      const typedarray = new Uint8Array(reader.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

      for (let i = 1; i <= pdf.numPages && i <= 3; i++) {
        const page = await pdf.getPage(i);
        const scale = 0.4;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        previewPages.appendChild(canvas);
      }

      previewLoader.classList.add('hidden');
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
    } catch (error) {
      previewLoader.textContent = '❌ Error al procesar el archivo.';
      console.error(error);
    }
  };
  reader.readAsArrayBuffer(file);
}

// Cambio por input file
pdfFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  mostrarPrevisualizacion(file);
});

// Drag & Drop
const dropZone = document.getElementById('step1');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');

  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    mostrarPrevisualizacion(file);
  } else {
    alert("❌ Solo se permite arrastrar archivos PDF.");
  }
});

// Enviar archivo y convertir
convertBtn.addEventListener('click', async () => {
  if (!currentFile) {
    alert("Selecciona un archivo PDF válido.");
    return;
  }

  const quality = getSelectedQuality();
  if (!quality) {
    alert("Selecciona la calidad de las imágenes.");
    return;
  }

  const formData = new FormData();
  formData.append('pdfFile', currentFile);
  formData.append('quality', quality);

  step2.classList.add('hidden');
  step3.classList.remove('hidden');

  try {
    const response = await fetch('/convert', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error("Error al convertir el archivo");

    const data = await response.json();
    zipName = data.zipName;

    // Forzar descarga automática
    const link = document.createElement('a');
    link.href = `/descargar/${zipName}`;
    link.download = zipName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    step3.classList.add('hidden');
    step4.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    alert("❌ Ocurrió un error durante la conversión. Intenta de nuevo.");
    window.location.reload();
  }
});

// Descargar manualmente
downloadBtn.addEventListener('click', () => {
  if (zipName) {
    const link = document.createElement('a');
    link.href = `/descargar/${zipName}`;
    link.download = zipName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});

// Reiniciar el flujo
restartBtn.addEventListener('click', () => {
  window.location.reload();
});

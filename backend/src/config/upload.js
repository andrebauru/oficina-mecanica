const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Criar diretório de uploads se não existir (/storage/uploads/)
const uploadDir = path.join(__dirname, '../../storage/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro de tipos de arquivo permitidos - apenas JPG, PNG e PDF
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'application/pdf'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Use apenas JPG, PNG ou PDF.'));
  }
};

// Configurar multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Validar arquivo antes de salvar
const validateFile = (file) => {
  if (!file) {
    return { valid: false, error: 'Nenhum arquivo foi enviado' };
  }

  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'application/pdf'
  ];

  if (!allowedMimes.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: `Tipo MIME não permitido. Use apenas JPG, PNG ou PDF. Recebido: ${file.mimetype}` 
    };
  }

  return { valid: true };
};

module.exports = {
  upload,
  uploadDir,
  validateFile
};

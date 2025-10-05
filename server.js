// server.js (example). Run behind HTTPS or behind a reverse proxy that terminates TLS.
const express = require('express');
const multer = require('multer');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(helmet()); // basic security headers

// Simple storage: uploaded files go into ./uploads with original filename
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Use timestamp + sanitized original name to avoid collisions
    const safeName = file.originalname.replace(/[^a-z0-9.\-_]/gi, '_');
    cb(null, Date.now() + '_' + safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // limit: 15 MB per file
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'), false);
    cb(null, true);
  }
});

app.post('/upload-photo', upload.array('photos', 6), (req, res) => {
  // NOTE: Authenticate this endpoint in production (e.g., token in header)
  try {
    // req.files is array of files saved on disk
    const records = (req.files || []).map(f => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      savedAs: f.filename,
      path: f.path,
      size: f.size
    }));

    // Example logging - in production write to a secure DB with access controls
    const logEntry = { time: new Date().toISOString(), ip: req.ip, records };
    fs.appendFileSync('upload_log.jsonl', JSON.stringify(logEntry) + '\n');

    res.status(200).json({ ok: true, uploaded: records.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 443;
app.listen(PORT, () => console.log('listening on', PORT));

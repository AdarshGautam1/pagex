import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { BadRequestError } from '../lib/errors';

const storage = multer.memoryStorage();

const ALLOWED_COVER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_COVER_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const ALLOWED_PDF_EXTENSIONS = new Set(['.pdf']);
const ALLOWED_PDF_MIMES = new Set(['application/pdf']);

export const uploadBookFiles = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB maximum for any file in multipart
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (file.fieldname === 'cover') {
      const isExtValid = ALLOWED_COVER_EXTENSIONS.has(ext);
      const isMimeValid = ALLOWED_COVER_MIMES.has(file.mimetype) || file.mimetype?.startsWith('image/');
      if (!isExtValid && !isMimeValid) {
        cb(new BadRequestError('Cover must be a valid image (.jpg, .jpeg, .png, .webp)'));
        return;
      }
      cb(null, true);
    } else if (file.fieldname === 'pdf') {
      const isExtValid = ext === '.pdf';
      const isMimeValid = ALLOWED_PDF_MIMES.has(file.mimetype) || file.mimetype === 'application/octet-stream' || file.mimetype === 'application/x-pdf';
      if (!isExtValid && !ALLOWED_PDF_MIMES.has(file.mimetype)) {
        cb(new BadRequestError('Book file must be a valid PDF (.pdf)'));
        return;
      }
      cb(null, true);
    } else {
      cb(new BadRequestError(`Unexpected field '${file.fieldname}' in upload`));
    }
  },
}).fields([
  { name: 'cover', maxCount: 1 },
  { name: 'pdf', maxCount: 1 },
]);

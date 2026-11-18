import multer from 'multer'
import path from 'path'
import { randomUUID } from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { saveFile } from './file-storage'

// Kept in memory (up to the size limit below), then handed to file storage
const storage = multer.memoryStorage()

// File filter to allow only images
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed'))
  }
}

// Create multer upload instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

// Middleware to handle upload errors
export const handleUploadErrors = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred during file upload
    return res.status(400).json({
      error: true,
      message: `Upload error: ${err.message}`,
    })
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      error: true,
      message: err.message || 'An unknown error occurred during file upload',
    })
  }
  next()
}

// Stores an uploaded image and returns the URL path it is served at
export const saveUploadedImage = (file: Express.Multer.File) =>
  saveFile(
    `images/${randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
    file.buffer,
    file.mimetype,
  )

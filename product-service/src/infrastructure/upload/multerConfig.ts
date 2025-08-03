// ========================================
// Multer Configuration for File Uploads
// src/infrastructure/upload/multerConfig.ts
// ========================================

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// 업로드 디렉토리 확인 및 생성
const uploadDir = path.join(process.cwd(), 'uploads', 'products');

// 디렉토리 생성 시 에러 처리
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  // 디렉토리 생성 실패 시 무시
}

// 파일 저장 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    try {
      const timestamp = Date.now();
      const uniqueId = uuidv4().split('-')[0]; // UUID의 첫 번째 부분만 사용
      const ext = path.extname(file.originalname);
      const safeFileName = `product_${timestamp}_${uniqueId}${ext}`;
      cb(null, safeFileName);
    } catch (error) {
      cb(error as Error, '');
    }
  },
});

// 파일 필터 (이미지만 허용)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
  }
};

// Multer 설정
export const uploadConfig = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
    files: 10, // 최대 10개 파일 (ProductEditModal에서 언급한 최대값)
  },
});

// 이미지 업로드 미들웨어 (최대 10개)
export const uploadImages = (req: any, res: any, next: any) => {
  const upload = uploadConfig.array('images', 10);
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: `파일 업로드 오류: ${err.message}`,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
    next();
  });
};

// 조건부 이미지 업로드 미들웨어 (multipart 요청일 때만 처리)
export const uploadImagesOptional = (req: any, res: any, next: any) => {
  const contentType = req.get('Content-Type') || '';
  
  // multipart/form-data 요청인 경우에만 multer 처리
  if (contentType.startsWith('multipart/form-data')) {
    const upload = uploadConfig.array('images', 10);
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: `파일 업로드 오류: ${err.message}`,
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      }
      next();
    });
  } else {
    // JSON 요청인 경우 그대로 통과
    next();
  }
};
/**
 * Document validation utilities for pre-ingestion checks
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresOCR: boolean;
  metadata: {
    fileType: string;
    fileSize: number;
    isEncrypted?: boolean;
    isCorrupted?: boolean;
  };
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'text/csv': '.csv',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/tiff': '.tiff'
};

/**
 * Validate a file before upload
 */
export async function validateDocument(file: File): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let requiresOCR = false;

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 10MB`);
  }

  if (file.size === 0) {
    errors.push('File is empty (0 bytes)');
  }

  // Check file type
  if (!Object.keys(SUPPORTED_TYPES).includes(file.type)) {
    errors.push(`File type "${file.type}" is not supported. Supported types: ${Object.values(SUPPORTED_TYPES).join(', ')}`);
  }

  // Check if file is an image (requires OCR)
  if (file.type.startsWith('image/')) {
    requiresOCR = true;
    warnings.push('Image files will be processed using OCR for text extraction');
  }

  // Check PDF structure
  if (file.type === 'application/pdf') {
    const pdfValidation = await validatePDF(file);
    errors.push(...pdfValidation.errors);
    warnings.push(...pdfValidation.warnings);
    requiresOCR = requiresOCR || pdfValidation.requiresOCR;
  }

  // Check for corruption by reading first bytes
  try {
    const reader = new FileReader();
    const firstChunk = await new Promise<ArrayBuffer>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file.slice(0, 1024));
    });

    // Basic magic number checks
    const bytes = new Uint8Array(firstChunk);
    
    if (file.type === 'application/pdf') {
      const pdfHeader = String.fromCharCode(...bytes.slice(0, 4));
      if (pdfHeader !== '%PDF') {
        errors.push('File appears to be corrupted (invalid PDF header)');
      }
    } else if (file.type.includes('word')) {
      // DOCX files are ZIP archives
      const zipHeader = bytes.slice(0, 4);
      if (zipHeader[0] !== 0x50 || zipHeader[1] !== 0x4B) {
        errors.push('File appears to be corrupted (invalid DOCX/ZIP header)');
      }
    }
  } catch (error) {
    errors.push('Unable to read file contents - file may be corrupted');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    requiresOCR,
    metadata: {
      fileType: file.type,
      fileSize: file.size,
    }
  };
}

/**
 * Validate PDF-specific issues
 */
async function validatePDF(file: File): Promise<Partial<ValidationResult>> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let requiresOCR = false;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Check for encryption
    const content = new TextDecoder().decode(bytes);
    if (content.includes('/Encrypt')) {
      errors.push('PDF is encrypted and cannot be processed');
    }

    // Try to detect if PDF is image-based (scanned)
    // This is a heuristic: if no /Font objects found, likely image-based
    const hasFonts = /\/Font/.test(content);
    const hasText = /\/Contents/.test(content);
    
    if (!hasFonts && hasText) {
      requiresOCR = true;
      warnings.push('PDF appears to be image-based or scanned. OCR will be used for text extraction.');
    }

    // Check for very large PDFs that might cause issues
    if (file.size > 5 * 1024 * 1024) {
      warnings.push('Large PDF files may take longer to process');
    }

  } catch (error) {
    errors.push('Failed to analyze PDF structure');
  }

  return { errors, warnings, requiresOCR };
}

/**
 * Get user-friendly error messages for common issues
 */
export function getValidationGuidance(validation: ValidationResult): string {
  if (validation.isValid && validation.warnings.length === 0) {
    return 'Document is ready for upload';
  }

  let guidance = '';

  if (validation.errors.length > 0) {
    guidance += '❌ Issues found:\n';
    validation.errors.forEach(error => {
      guidance += `• ${error}\n`;
    });
    guidance += '\n';
  }

  if (validation.warnings.length > 0) {
    guidance += '⚠️ Warnings:\n';
    validation.warnings.forEach(warning => {
      guidance += `• ${warning}\n`;
    });
  }

  if (validation.requiresOCR) {
    guidance += '\n💡 This document will use OCR for text extraction, which may take longer.';
  }

  return guidance.trim();
}
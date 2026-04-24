import * as faceapi from 'face-api.js';

export interface FaceDetectionResult {
  descriptor: Float32Array;
  detection: faceapi.FaceDetection;
  image: string;
}

export interface FaceMatchResult {
  studentId: string;
  studentName: string;
  confidence: number;
  detected: boolean;
}

class FaceRecognitionService {
  private modelsLoaded = false;
  private readonly MODEL_URL = '/models'; // We'll need to handle model loading
  private readonly CONFIDENCE_THRESHOLD = 0.6; // Lower is more strict (face-api uses distance)

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    try {
      // Load models from CDN since local hosting is complex
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
        faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
        faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
      ]);
      
      this.modelsLoaded = true;
      console.log('Face recognition models loaded successfully');
    } catch (error) {
      console.error('Error loading face recognition models:', error);
      throw new Error('Failed to load face recognition models');
    }
  }

  async detectFace(image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): Promise<FaceDetectionResult | null> {
    if (!this.modelsLoaded) {
      throw new Error('Models not loaded. Call loadModels() first.');
    }

    const detection = await faceapi
      .detectSingleFace(image)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    return {
      descriptor: detection.descriptor,
      detection: detection.detection,
      image: await this.imageToBase64(image),
    };
  }

  async detectMultipleFaces(image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): Promise<FaceDetectionResult[]> {
    if (!this.modelsLoaded) {
      throw new Error('Models not loaded. Call loadModels() first.');
    }

    const detections = await faceapi
      .detectAllFaces(image)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const imageBase64 = await this.imageToBase64(image);

    return detections.map(detection => ({
      descriptor: detection.descriptor,
      detection: detection.detection,
      image: imageBase64,
    }));
  }

  calculateDistance(descriptor1: Float32Array, descriptor2: Float32Array): number {
    return faceapi.euclideanDistance(descriptor1, descriptor2);
  }

  matchFace(
    faceDescriptor: Float32Array,
    knownDescriptors: Float32Array[]
  ): { match: boolean; confidence: number; bestMatchIndex: number } {
    let minDistance = Infinity;
    let bestMatchIndex = -1;

    knownDescriptors.forEach((knownDescriptor, index) => {
      const distance = this.calculateDistance(faceDescriptor, knownDescriptor);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatchIndex = index;
      }
    });

    const match = minDistance < this.CONFIDENCE_THRESHOLD;
    const confidence = Math.max(0, Math.min(100, (1 - minDistance) * 100));

    return { match, confidence, bestMatchIndex };
  }

  async matchFaceAgainstStudents(
    faceDescriptor: Float32Array,
    students: Array<{ id: string; name: string; faceDescriptors: Float32Array[] }>
  ): Promise<FaceMatchResult | null> {
    let bestMatch: FaceMatchResult | null = null;
    let bestConfidence = 0;

    for (const student of students) {
      for (const storedDescriptor of student.faceDescriptors) {
        const distance = this.calculateDistance(faceDescriptor, storedDescriptor);
        const confidence = Math.max(0, Math.min(100, (1 - distance) * 100));

        if (distance < this.CONFIDENCE_THRESHOLD && confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = {
            studentId: student.id,
            studentName: student.name,
            confidence,
            detected: true,
          };
        }
      }
    }

    return bestMatch;
  }

  async processAttendanceImage(
    imageElement: HTMLImageElement,
    enrolledStudents: Array<{ id: string; name: string; faceDescriptors: Float32Array[] }>
  ): Promise<FaceMatchResult[]> {
    const detectedFaces = await this.detectMultipleFaces(imageElement);
    const results: FaceMatchResult[] = [];
    const matchedStudentIds = new Set<string>();

    for (const face of detectedFaces) {
      const match = await this.matchFaceAgainstStudents(face.descriptor, enrolledStudents);
      
      if (match && !matchedStudentIds.has(match.studentId)) {
        results.push(match);
        matchedStudentIds.add(match.studentId);
      }
    }

    return results;
  }

  private async imageToBase64(image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = image instanceof HTMLVideoElement ? image.videoWidth : image.width;
    canvas.height = image instanceof HTMLVideoElement ? image.videoHeight : image.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.drawImage(image, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  async createImageFromBase64(base64: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = base64;
    });
  }

  isModelsLoaded(): boolean {
    return this.modelsLoaded;
  }
}

export const faceRecognitionService = new FaceRecognitionService();

const DEFAULT_THRESHOLD = 0.58;

const toFloatArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((v) => Number(v));
};

const euclideanDistance = (a, b) => {
  if (a.length !== b.length || a.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

const parseStudentEncodings = (rawEncoding) => {
  if (!Array.isArray(rawEncoding)) return [];

  if (Array.isArray(rawEncoding[0])) {
    return rawEncoding.map((encoding) => toFloatArray(encoding));
  }

  return [toFloatArray(rawEncoding)];
};

export const matchFaces = ({ detectedEmbeddings, enrolledStudents, threshold = DEFAULT_THRESHOLD }) => {
  const safeThreshold = Number.isFinite(Number(threshold)) ? Number(threshold) : DEFAULT_THRESHOLD;
  const matches = [];
  const matchedStudentIds = new Set();

  for (const rawDetected of detectedEmbeddings) {
    const detected = toFloatArray(rawDetected);
    let best = null;

    for (const student of enrolledStudents) {
      if (matchedStudentIds.has(student.id)) {
        continue;
      }

      const storedEncodings = parseStudentEncodings(student.faceEncoding);
      for (const encoding of storedEncodings) {
        const distance = euclideanDistance(detected, encoding);
        if (!best || distance < best.distance) {
          const confidence = Math.max(0, Math.min(100, (1 - distance) * 100));
          best = {
            studentId: student.id,
            studentName: student.name,
            distance,
            confidence,
          };
        }
      }
    }

    if (best && best.distance <= safeThreshold) {
      matches.push({
        studentId: best.studentId,
        studentName: best.studentName,
        confidence: best.confidence,
        detected: true,
      });
      matchedStudentIds.add(best.studentId);
    }
  }

  return matches;
};

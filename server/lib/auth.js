import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'unsafe_dev_secret';
const EXPIRY = '8h';

export const signAuthToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRY });

export const verifyAuthToken = (token) => jwt.verify(token, JWT_SECRET);

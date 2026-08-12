import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env';
import apiRoutes from './routes/index';
import { apiLimiter } from './middleware/rateLimit';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export function createApp() {
    const app = express();
    app.set('trust proxy', 1);
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(cors({
        origin: env.clientOrigin.split(',').map((o) => o.trim()),
        credentials: true,
    }));
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.get('/api/health', (_req, res) => {
        res.json({ success: true, message: 'University Portal API is running.', time: new Date().toISOString() });
    });
    app.use('/api', apiLimiter);
    app.use('/api', apiRoutes);
    const clientDist = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
    });
    return app;
}

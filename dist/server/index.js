import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers.js';
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'CycleScope API',
        timestamp: new Date().toISOString(),
    });
});
// tRPC endpoint
app.use('/api/trpc', createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}),
}));
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'CycleScope API',
        version: '1.0.0',
        description: 'Automated market intelligence analysis using OpenAI Assistants',
        endpoints: {
            health: '/health',
            trpc: '/api/trpc',
        },
        documentation: 'https://github.com/schiang418/cyclescope-api',
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 CycleScope API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 tRPC endpoint: http://localhost:${PORT}/api/trpc`);
});

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(
    {
        origin: process.env.CLIENT_URL,
        credentials: true
    }
));

const port = process.env.PORT || 3000;

import auhtRoutes from './routes/auth.routes.js';
import problemRoutes from './routes/problem.routes.js';
import executeRoutes from './routes/executeCode.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import playlistRoutes from './routes/playlist.routes.js';

app.get('/',(req, res) => {
    res.send('Hello from the backend!');
})

app.use('/api/v1/auth',auhtRoutes);
app.use('/api/v1/problems',problemRoutes);
app.use('/api/v1/execute',executeRoutes);
app.use("/api/v1/submission",submissionRoutes);
app.use("api/v1/playlist",playlistRoutes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
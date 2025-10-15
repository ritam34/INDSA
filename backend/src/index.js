import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const port = process.env.PORT || 3000;

import auhtRoutes from './routes/auth.routes.js';

app.get('/',(req, res) => {
    res.send('Hello from the backend!');
})

app.use('/api/v1/auth',auhtRoutes)

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
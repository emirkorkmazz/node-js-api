const express = require('express');
const bodyParser = require('body-parser');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger/swagger.json');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const reviewsRoutes = require('./routes/reviewsRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const photoRoutes = require('./routes/photoRoutes');
const menuRoutes = require('./routes/menuRoutes');
const app = express();
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const imagesPath = path.join(__dirname, '..', 'images');
app.use('/images', express.static(imagesPath));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api', authRoutes, userRoutes, restaurantRoutes, reviewsRoutes, favoriteRoutes, photoRoutes, menuRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: ${process.env.API_URL}:${PORT}`);
  console.log(`Swagger dokümantasyonu: ${process.env.API_URL}:${PORT}/api-docs`);
});
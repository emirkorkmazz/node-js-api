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
const app = express();
const dotenv = require('dotenv');

dotenv.config();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api', authRoutes, userRoutes, restaurantRoutes, reviewsRoutes, favoriteRoutes);

const PORT = process.env.PORT || 3000;
console.log(process.env.PORT);
app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
  console.log(`Swagger dokümantasyonu: http://localhost:${PORT}/api-docs`);
});
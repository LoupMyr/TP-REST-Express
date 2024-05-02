const express = require("express");
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const productRoutes = require('./routes/product');
const userRoutes = require('./routes/user');
const orderRoutes = require('./routes/order');

const app = express();
const port = 8000;

app.use(express.json());
app.use('/', productRoutes);
app.use('/', userRoutes);
app.use('/', orderRoutes);


const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'API express',
        version: '1.0.0',
    },
};

const options = {
    swaggerDefinition,
    apis: ['./routes/*.js'],
};
const swaggerSpec = swaggerJSDoc(options);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
    res.send("Nothing to see here !");
});

app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
});

module.exports = app

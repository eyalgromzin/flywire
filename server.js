const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const {addRoutes} = require('./routes')

addRoutes(app)

//jsut update the db for urls for new urls
app.listen(port, () => console.log(`Listening on port ${port}`));


//to run server docker : 
// docker-compose up



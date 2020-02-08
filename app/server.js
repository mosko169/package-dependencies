const express = require('express');
const bodyparser = require('body-parser');

const packagesAPI = require('./packages/rest_api')();

async function main() {
    const app = express();
    app.use(bodyparser.json());
    let apiRouter = express.Router();

    app.use('/api', apiRouter);

    app.use('/packages', packagesAPI);
    
    console.info("starting server");
    app.listen(8080);
}

main();
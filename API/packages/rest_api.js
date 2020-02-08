const express = require('express');

const dependenciesRouter = require('./dependencies/rest_api.js')();

function getPackagesRouter() {

    let router = express.Router();
    router.use('/dependencies', dependenciesRouter);

    return router;
}

module.exports = getPackagesRouter;
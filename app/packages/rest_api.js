const express = require('express');

const dependenciesRouter = require('./dependencies/rest_api.js')();

function parsePackageParams(req, res, next) {
    req.packageName = req.params.packageName;
    req.packageVersion = req.params.packageVersion;

    next();
}

/**
 * API Router for package related operations
 */
function getPackagesRouter() {

    let router = express.Router();

    // router for a specific package related API
    let packageRouter = express.Router();
    
    packageRouter.use('/dependencies', dependenciesRouter);

    router.use('/:packageName/:packageVersion', parsePackageParams, packageRouter);

    return router;
}

module.exports = getPackagesRouter;
const express = require('express');

const DependencyCalculator = require('./dependency_calculator');
const DependencyMetadataFetcher = require('../metadata/package_metadata_fetcher');

/**
 * API Router for package dependencies operations
 */
function getDependenciesRouter() {
    let depMetadataFetcher = new DependencyMetadataFetcher();
    const depCalculator = new DependencyCalculator(depMetadataFetcher);

    let router = express.Router();
    router.get('/:packageName/:packageVersion', async (req, res) => {
        try {
            let packageName = req.params.packageName;
            let packageVersion = req.params.packageVersion;
            
            let depTree = await depCalculator.getPackageDependenciesTree(packageName, packageVersion);
            res.send(depTree);
        } catch (err) {
            console.error(err);
            res.send("An error has occured! " + err.message);
            res.status(500);
        }
    });

    return router;
}

module.exports = getDependenciesRouter;
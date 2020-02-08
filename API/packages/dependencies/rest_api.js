const express = require('express');

const DependencyCalculator = require('./dependency_calculator');
const PackageMetadata = require('./package_metadata');


function getDependenciesRouter() {

    const depCalculator = new DependencyCalculator();

    let router = express.Router();
    router.get('/:packageName/:packageVersion', async (req, res) => {
        try {
            let packageName = req.params.packageName;
            let packageVersion = req.params.packageVersion;
            
            let depTree = await depCalculator.getPackageDependenciesTree(new PackageMetadata(packageName, packageVersion));
            res.send(depTree);
        } catch (err) {
            res.send("An error has occured! " + err.message);
            res.status(500);
        }
    });

    return router;
}

module.exports = getDependenciesRouter;
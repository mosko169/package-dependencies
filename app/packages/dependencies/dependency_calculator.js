
const Bluebird = require('bluebird');


class DependencyTreeNode {
    constructor(name, version, dependencies = {}) {
        this.name = name;
        this.version = version;
        this.dependencies = dependencies;
    }
}

class DependencyCalculator {
    constructor(packageMetadataFetcher) {
        this.packageMetadataFetcher = packageMetadataFetcher;
    }
    
    /**
     * Retrieves the dependencies tree of a given package
     * @param {String} name - name of package
     * @param {String} version - version of package
     */
    async getPackageDependenciesTree(name, version) {
        let packageDependencies = await this._fetchPackageDependencies(name, version);
        let dependencyTreeNode = new DependencyTreeNode(name, version);
        await Bluebird.map(packageDependencies, async dependency => {
            try {
                dependencyTreeNode.dependencies[dependency.name] = await this.getPackageDependenciesTree(dependency.name, dependency.version);
            } catch (err) {
                // if failed to fetch dependency tree, just return the dependency itself
                dependencyTreeNode.dependencies[dependency.name] = new DependencyTreeNode(name, version);
                console.warn("Failed to fetch dependencies of package", dependency.name, "in version", dependency.version, ", error:", err);
            }
        })
    
        return dependencyTreeNode;
    }    

    async _fetchPackageDependencies(name, version) {
        let packageMetadata = await this.packageMetadataFetcher.fetchPackageMetadata(name, version);
        return (packageMetadata && packageMetadata.dependencies) || [];
    }
}

module.exports = DependencyCalculator;

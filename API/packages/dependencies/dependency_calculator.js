
const request = require('request-promise');
const urljoin = require('url-join');
const semver = require('semver');
const Bluebird = require('bluebird');

const PackageMetadata = require('./package_metadata');

const BASE_URL = 'https://registry.npmjs.org'

const HTTP_STATUS_CODE_200_OK = 200;



class DependencyTreeNode {
    constructor(packageMetadata, dependencies = {}) {
        this.packageMetadata = packageMetadata;
        this.dependencies = dependencies;
    }
}

class DependencyCalculator {
    constructor() {
        
    }

    parseDependencyVersion(rawVersion) {
        if (rawVersion.startsWith("~")) {
            rawVersion = rawVersion.substr(1);
        }
        let version = semver.parse(rawVersion);
        if (!version) {
            return null;
        }
    
        return version.version;
    }
    
    parseRawDependencies(dependencies = {}) {
        let parsedDependencies = [];
        for (let depName in dependencies) {
            let depVersion = this.parseDependencyVersion(dependencies[depName]);
            if (!depVersion) {
                console.warn("failed to parse required version of package", depName, ". raw version recieved:", dependencies[depName]);
            }
            parsedDependencies.push(new PackageMetadata(depName, depVersion));
        }
        return parsedDependencies;
    }
    
    async _fetchPackageDependencies(packageMetadata) {
        if (!packageMetadata.version) {
            return [];
        }
    
        let requestOptions = {
            url: urljoin(BASE_URL, packageMetadata.name, packageMetadata.version),
            json: true,
            resolveWithFullResponse: true
        }
    
        let response = await request(requestOptions);
        if (response.statusCode != HTTP_STATUS_CODE_200_OK) {
            throw new Error('failed to fetch dependencies, invalid http response status code recieved:', response.statusCode);
        }
    
        let dependencies = response.body.dependencies || {};
        return this.parseRawDependencies(dependencies);
    }
    
    getDependencyId(packageMetadata) {
        return packageMetadata.name + "::" + packageMetadata.version;
    }
    
    async getPackageDependenciesTree(packageMetadata) {
        let packageDependencies = await this._fetchPackageDependencies(packageMetadata);
        let dependencyTreeNode = new DependencyTreeNode(packageMetadata);
        await Bluebird.map(packageDependencies, async dependency => {
            try {
                dependencyTreeNode.dependencies[dependency.name] = await this.getPackageDependenciesTree(dependency);
            } catch (err) {
                console.warn("Failed to fetch dependencies of package", dependency.name, "in version", dependency.version, ", error:", err);
            }
        })
    
        return dependencyTreeNode;
    }    
}

module.exports = DependencyCalculator;

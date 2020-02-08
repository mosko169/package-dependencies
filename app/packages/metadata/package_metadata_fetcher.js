const request = require('request-promise');
const urljoin = require('url-join');
const semver = require('semver');
const LRUCache = require('lru-cache');

const PACKAGES_CACHE_SIZE = 100;
const PACKAGE_CACHE_MAX_AGE = 10000; // in MS

const BASE_URL = 'https://registry.npmjs.org';

const HTTP_STATUS_CODE_200_OK = 200;

const PackageMetadata = require('./package_metadata');

class PackageMetadataFetcher {
    constructor(options = {}) {
        this._packagesCache = new LRUCache({max: PACKAGES_CACHE_SIZE,
                                            maxAge: PACKAGE_CACHE_MAX_AGE});
    }

    static _getPackageId(name, version) {
        return name + "::" + version;
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
            parsedDependencies.push({name: depName, version: depVersion});
        }
        return parsedDependencies;
    }

    async fetchPackageMetadata(name, version) {
        if (!version) {
            return [];
        }

        let packageId = PackageMetadataFetcher._getPackageId(name, version);

        let cachedMetadata = this._packagesCache.get(packageId);
        if (!cachedMetadata) {
            cachedMetadata = await this.fetchPackageMetadataFromSource(name, version);
            this._packagesCache.set(packageId, cachedMetadata);
        }

        return cachedMetadata;
    }

    async fetchPackageMetadataFromSource(name, version) {
        let requestOptions = {
            url: urljoin(BASE_URL, name, version),
            json: true,
            resolveWithFullResponse: true
        }
    
        let response = await request(requestOptions);
        if (response.statusCode != HTTP_STATUS_CODE_200_OK) {
            throw new Error('failed to fetch dependencies, invalid http response status code recieved:', response.statusCode);
        }
        
        let dependencies = response.body.dependencies || {};
        dependencies = this.parseRawDependencies(dependencies);
        return new PackageMetadata(name, version, dependencies);
    }
}

PackageMetadataFetcher.BASE_URL = BASE_URL;
module.exports = PackageMetadataFetcher;

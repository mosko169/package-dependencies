const request = require('request-promise');
const urljoin = require('url-join');
const semver = require('semver');
const LRUCache = require('lru-cache');

const log = require('../../common/logger');
const PackageMetadata = require('./package_metadata');

// Amount of package metadata records that can exist in the cache at a given time
const PACKAGES_CACHE_SIZE = 100;

// Maximum age of a package metadata record in cache before it gets invalidated
const PACKAGE_CACHE_MAX_AGE = 10000; // in MS

const BASE_URL = 'https://registry.npmjs.org';
const HTTP_STATUS_CODE_200_OK = 200;

/**
 * Package Metadata Fetcher,
 * Responsible for fetching metadata either from cache if exists, or from NPM
 * 
 * This module acts as a sort of a memcache for the package metadata responses
 * and should be turned into a micro service in the future to support multiple instances
 * of Web Servers requesting data in an autoscale environment
 */
class PackageMetadataFetcher {
    constructor(options = {}) {
        this._packagesCache = new LRUCache({max: PACKAGES_CACHE_SIZE,
                                            maxAge: PACKAGE_CACHE_MAX_AGE});
    }

    /**
     * Fetches package metadata
     * @param {String} name 
     * @param {String} version
     */
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

    /**
     * Fetches package metadata from NPM
     * @param {String} name 
     * @param {String} version
     */
    async fetchPackageMetadataFromSource(name, version) {
        let requestOptions = {
            url: urljoin(BASE_URL, name, version),
            json: true,
            resolveWithFullResponse: true,
            simple: false
        }
    
        let response = await request(requestOptions);
        if (response.statusCode != HTTP_STATUS_CODE_200_OK) {
            throw new Error('failed to fetch dependencies of ' + name + ' with version ' + version + ', invalid http response status code recieved: ' + response.statusCode);
        }
        
        let dependencies = response.body.dependencies || {};
        dependencies = this.parseRawDependencies(dependencies);
        return new PackageMetadata(name, version, dependencies);
    }

    /**
     * Parses semver versioning syntax
     * @note    Minimal logic was implemented due to lack of time :(
     */
    parseDependencyVersion(rawVersion) {
        if (rawVersion.startsWith("~") || rawVersion.startsWith("^")) {
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
                log.warn("failed to parse required version of package " + depName + ". raw version recieved: " + dependencies[depName]);
            }
            parsedDependencies.push({name: depName, version: depVersion});
        }
        return parsedDependencies;
    }

    static _getPackageId(name, version) {
        return name + "::" + version;
    }
}

PackageMetadataFetcher.BASE_URL = BASE_URL;
module.exports = PackageMetadataFetcher;

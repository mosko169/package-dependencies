
const assert = require('assert');
const expect = require('chai').expect;
const nock = require('nock');
const sinon = require('sinon');

const PackageMetadata = require('../../../app/packages/metadata/package_metadata');
const PackageMetadataFetcher = require('../../../app/packages/metadata/package_metadata_fetcher');

describe('package metadata fetcher tests', () => {
    it.only('fetch package, attempt to fetch again will retrieve from cache', async () => {

        const scope = nock(PackageMetadataFetcher.BASE_URL)
            .get('/package3/1.1.1')
            .reply(200, {
                dependencies: {
                    "package1": "1.1.1",
                    "package2": "2.2.2"
                }
            });

        let fetcher = new PackageMetadataFetcher();
        let metadataFetcherSpy = new sinon.spy(fetcher, "fetchPackageMetadataFromSource");

        let metadata = await fetcher.fetchPackageMetadata('package3', '1.1.1');
        expect(metadata.dependencies.map(dependency => dependency.name)).to.have.members(["package1", "package2"]);
        
        // call again
        metadata = await fetcher.fetchPackageMetadata('package3', '1.1.1');
        expect(metadata.dependencies.map(dependency => dependency.name)).to.have.members(["package1", "package2"]);

        // make sure fetching from source was performed only once
        assert(metadataFetcherSpy.calledOnce);
    });

});
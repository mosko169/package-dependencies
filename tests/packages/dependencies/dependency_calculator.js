
const assert = require('assert');
const expect = require('chai').expect;

const PackageMetadata = require('../../../app/packages/metadata/package_metadata');
const DependencyCalculator = require('../../../app/packages/dependencies/dependency_calculator');

class MockPackageMetadataFetcher {
    constructor(packages = []) {
        this.packages = {};

        // convert the array to a map
        packages.forEach(packageRecord => {
            this.packages[packageRecord.name] = packageRecord;
        });
    }

    async fetchPackageMetadata(name, version) {
        return this.packages[name];
    }
}

describe('dependency calculator tests', () => {
    it('test dependencies calculation', async () => {
        let package1 = new PackageMetadata("package1", "1.1.1", []);
        let package2 = new PackageMetadata("package2", "1.1.1", [{name: package1.name, version: package1.version}]);
        let package3 = new PackageMetadata("package3", "1.1.1", [{name: package2.name, version: package2.version}]);
        let package4 = new PackageMetadata("package4", "1.1.1", []);
        let package5 = new PackageMetadata("package5", "1.1.1", [{name: package4.name, version: package4.version}, {name: package3.name, version: package3.version}]);
        
        let depMetadataFetcher = new MockPackageMetadataFetcher([package1, package2, package3, package4, package5]);

        let depCalc = new DependencyCalculator(depMetadataFetcher);

        let depTree5 = await depCalc.getPackageDependenciesTree(package5.name, package5.version);
        let package5Deps = depTree5.dependencies;
        expect(Object.keys(package5Deps)).to.have.members([package4.name, package3.name]);

        let package4Deps = package5Deps[package4.name].dependencies;
        assert.equal(Object.keys(package4Deps).length, 0);

        let package3Deps = package5Deps[package3.name].dependencies;
        expect(Object.keys(package3Deps)).to.have.members([package2.name]);

        let package2Deps = package3Deps[package2.name].dependencies;
        expect(Object.keys(package2Deps)).to.have.members([package1.name]);

        let package1Deps = package2Deps[package1.name].dependencies;
        assert.equal(Object.keys(package1Deps).length, 0);
    });

    it('test dependencies calculation, dependency failed will continue', async () => {
        let package1 = new PackageMetadata("package1", "1.1.1", []);
        let package2 = new PackageMetadata("package2", "1.1.1", []);
        let package3 = new PackageMetadata("package3", "1.1.1", [{name: package2.name, version: package2.version}]);
        let package4 = new PackageMetadata("package4", "1.1.1", [{name: package3.name, version: package3.version}, {name: package1.name, version: package1.version}]);
        
        let depMetadataFetcher = new MockPackageMetadataFetcher([package1, package2, package3, package4]);

        let originalFetchPackageMetadataFunc = depMetadataFetcher.fetchPackageMetadata;

        // simulate failure in fetching package 3 metadata
        depMetadataFetcher.fetchPackageMetadata = (packageName) => {
            if (packageName == package3.name) {
                throw new Error("failed to fetch dep");
            }
            return originalFetchPackageMetadataFunc.call(depMetadataFetcher, packageName);
        }

        let depCalc = new DependencyCalculator(depMetadataFetcher);

        let depTree4 = await depCalc.getPackageDependenciesTree(package4.name, package4.version);
        let package4Deps = depTree4.dependencies;

        expect(Object.keys(package4Deps)).to.have.members([package3.name, package1.name]);

        // check that package3 dependencies was not resolved
        let package3Deps = package4Deps[package3.name].dependencies;
        assert.equal(Object.keys(package3Deps), 0);

        let package1Deps = package4Deps[package1.name].dependencies;
        assert.equal(Object.keys(package1Deps).length, 0);
    });
})
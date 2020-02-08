
/**
 * Basic package metadata struct
 */
class PackageMetadata {
    constructor(packageName, packageVersion, dependencies = []) {
        this.name = packageName;
        this.version = packageVersion;
        this.dependencies = dependencies;
    }
}

module.exports = PackageMetadata;

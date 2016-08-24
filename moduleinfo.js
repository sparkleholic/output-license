var fs = require('fs'),
    path = require('path'),
    log = require('npmlog');

function ModuleInfo(pkgFile) {
    try {
        var pkgInfo = JSON.parse(fs.readFileSync(pkgFile));
        this.pkgFile = path.resolve(pkgFile);
        this.detail = pkgInfo;
        this.name = pkgInfo.name;
        this.version = pkgInfo.version;
        if (pkgInfo.license) {
            if (typeof pkgInfo.license === 'object') {
                this.license = pkgInfo.license['type'] || undefined;
            } else if (typeof pkgInfo.license === 'string') {
                this.license = pkgInfo.license;
            } else {
                log.warn('ModuleInfo#ModuleInfo()', 'Unsupported type of pkgInfo.license:', pkgInfo.license);
                this.license = undefined;
            }
        } else if (pkgInfo.licenses && pkgInfo.licenses[0]) {
            if (typeof pkgInfo.licenses[0] === 'object') {
                this.license = pkgInfo.licenses[0]['type'] || undefined;
            } else if (typeof pkgInfo.licenses[0] === 'string') {
                this.license = pkgInfo.licenses[0];
            } else {
                log.warn('ModuleInfo#ModuleInfo()', 'Unsupported type of pkgInfo.licenses:', pkgInfo.licenses);
                this.license = undefined;
            }
        } else {
            this.license = undefined;
        }
    } catch ( e ) {
        log.error('ModuleInfo#ModuleInfo()', e , 'at ' + pkgFile);
        throw e;
    }
}

ModuleInfo.prototype = {
    getName: function() {
        return this.name;
    },
    getVersion: function() {
        return this.version;
    },
    getLicense: function() {
        return this.license;
    },
    getPkgFile: function() {
        return this.pkgFile;
    },
    getDetail: function() {
        return this.getDetail;
    },
    setName: function(name) {
        this.name = name;
    },
    setVersion: function(version) {
        this.version = version;
    },
    setLicense: function(license) {
        this.license = license;
    }
}

module.exports = ModuleInfo;

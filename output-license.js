

/***
    1. Find package.json under node_modules
    2. Make ModuleInfo instance
    3. Check license. If no license in ModuleInfo,
       Try 'npm view <module-name>'
    4. Make data by "License".
    5. Clarify no-license modules to 'undefined'
    6. output data.
*/

var Promise = require("bluebird"),
    fs = Promise.promisifyAll(require('fs')),
    path = require('path'),
    util = require('util'),
    vm = require('vm'),
    exec = require('child_process').exec,
    log = require('npmlog'),
    Table = require('cli-table');

var ModuleInfo = require('./moduleinfo');

log.level = 'warn';

var MODULES_DIR = path.join(__dirname, './node_modules');

if (process.argv.length > 2) {
    MODULES_DIR = path.resolve(process.argv[2]);
}

function walkDirAsync (dir, name, level) {
    var results = [];
    return fs.readdirAsync(dir).map(function(file) {
        file = path.join(dir, file);
        return fs.lstatAsync(file).then( (stats) => {
            if ( stats.isFile() || stats.isSymbolicLink() ) {
                if (path.basename(file) === name) {
                    results.push(file);
                }
                return;
            }
            if ( (typeof level === 'number') && (--level < 1) ) {
                return;
            }
            return walkDirAsync(file, name, level).then(function(filesInDir) {
                results = results.concat(filesInDir);
            });
        });
    }).then(function() {
        return results;
    });
}

function findLicenses(dir, refJson) {
    if (dir) {
        MODULES_DIR = path.resolve(dir);
    }
    console.log("Finding modules under " + MODULES_DIR);
    walkDirAsync(MODULES_DIR, 'package.json')
    .then( (files) => {
        var pkgFiles = [];
        files.forEach( (file)=> {
            if ('node_modules' === path.basename(path.join(file, '../..'))) {
                pkgFiles.push(file);
            }
        });
        return pkgFiles;
    })
    .then( (pkgFiles) => {
        var moduleInfos = pkgFiles.map( (pkgFile) => {
            return new ModuleInfo(pkgFile);
        });
        return moduleInfos;
    })
    .then( (moduleInfos) => {
        return Promise.all(moduleInfos).map( (moduleInfo) => {
            if (!moduleInfo.getLicense()) {
                return getRegistryInfo(moduleInfo.getName())
                    .then( (info) => {
                        if (info.licenses) {
                            if (Array.isArray(info.licenses) && info.licenses[0]) {
                                if ('object' === typeof info.licenses[0] && info.licenses[0]['type']) {
                                    moduleInfo.setLicense(info.licenses[0]['type']);
                                } else if ('string' === typeof info.licenses[0]) {
                                    moduleInfo.setLicense(info.licenses[0]);
                                } else {
                                    log.warn('findLicenses()#getRegistryInfo()#info.license:', 'no license info : ' + moduleInfo.getName());
                                }
                            }
                        } else if (info.license) {
                            if (typeof info.license === 'object' && info.license['type']) {
                                moduleInfo.setLicense(info.license['type']);
                            } else if (typeof info.license === 'string') {
                                moduleInfo.setLicense(info.license);
                            } else {
                                log.warn('findLicenses()#getRegistryInfo()#info.license:', 'invalid license type : ' + info.license + ' , ' + moduleInfo.getName() );
                            }
                        } else {
                            log.warn('findLicenses()#getRegistryInfo()', 'no license info : ' + moduleInfo.getName() + ', pkgFile:', moduleInfo.getPkgFile());
                        }

                        if (refJson && refJson[moduleInfo.getName()]) {
                            moduleInfo.setLicense(refJson[moduleInfo.getName()]);
                        }
                        return moduleInfo;
                    })
            } else {
                return moduleInfo;
            }
        })
    })
    .then( (moduleInfos) => {
        var licMap = {};
        moduleInfos.forEach( (moduleInfo) => {
            var id = moduleInfo.getName() + '-' + moduleInfo.getVersion();
            var license = moduleInfo.getLicense();
            licMap[license] = licMap[license] || [];
            if (licMap[license].indexOf(id) === -1) {
                licMap[license].push(id);
            }
        });
        return licMap;
    })
    .then( (licMap) => {
        var table = new Table( {
            head: [ 'LICENSE', 'node_modules'],
            colWidths: [43, 60]
        });
        for (var lic in licMap ) {
            table.push([lic + ' ('+ licMap[lic].length +')'
                , licMap[lic].join('\n')]);
        }
        console.log(table.toString());
    })
}

function getRegistryInfo(name) {
    return new Promise( (resolve, reject) => {
        exec('npm view ' + name, (error, stdout, stderr) => {
            if (error) {
                log.warn('getRegistryInfo()', 'Error occurs onquerying registry info:' + name);
                return reject(error);
            }
            var sandbox = {};
            if (stdout) {
                const script = new vm.Script('info = ' + stdout);
                const context = new vm.createContext(sandbox);
                script.runInContext(context);
                log.info(util.inspect(sandbox));
            }
            if (!sandbox.info) {
                return reject(new Error('getRegistryInfo()#failure querying registry info: ' + name));
            }
            resolve(sandbox.info);
        });
    })
}

module.exports = findLicenses;

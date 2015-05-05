
var fs = require('fs');
var vm = require('vm');


exports.require = function (filePath) {
    var content = fs.readFileSync(filePath).toString();

    return exports.parse(content);
};

exports.parse = function(content){
    var script = '(function(){ return ' + content + '; })()';

    try {
        return vm.runInThisContext(script);
    } catch (ex) {
        ex.code = 'MODULE_PARSE_FAILED';
        throw ex;
    }
};
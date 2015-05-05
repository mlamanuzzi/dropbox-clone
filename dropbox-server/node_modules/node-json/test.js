var requireJson = require('./').require;

var data = requireJson('./test/data.json');
console.log(data);
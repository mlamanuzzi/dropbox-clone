## node-json

> parse json with a loose standard  

## Usage

```
var requireJson = require('node-json').require;
var parseJson = require('node-json').parse;

/*
 * a.json content:
 */
 * {
 *   //comment
 *   "name": "aab"
 * }
 */

requireJson('a.json');

parseJson('{name:"xxxx"}');

```
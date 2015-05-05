let fs = require('fs')
let path = require('path')
let express = require('express')
let morgan = require('morgan')
let nodeify = require('bluebird-nodeify')
let mime = require('mime-types')
let rimraf = require('rimraf')
let mkdirp = require('mkdirp')
let nssocket = require('nssocket')
let net = require('net')
let JsonSocket = require('json-socket')
let argv = require('yargs').argv
require('songbird')

const NODE_ENV = process.env.NODE_ENV
const PORT = process.env.PORT || 8000
const ROOT_DIR = path.resolve(argv.dir || process.cwd())
let app = express()

if (NODE_ENV === 'development') {
	app.use(morgan('dev'))
}

// TCP SERVER
var port = 9838
var TCPHost = '127.0.0.1'
var server = net.createServer()

// keep list of all TCP clients connected
var clients = [];

server.listen(port);
server.on('connection', function(socket) { //This is a standard net.Socket
    socket = new JsonSocket(socket); //Now we've decorated the net.Socket to be a JsonSocket
    console.log('TCPSERVER: new client connected')
    clients.push(socket)
    socket.on('message', function(message) {
    	console.log("TCPSERVER: message received from HTTP server")
        broadcast(message, socket)
    });
});

app.listen(PORT, () => console.log('LISTENING @ http://127.0.0.1:' + PORT))

app.head('*', setFileMeta, sendHeaders, (req, res) => res.end())

app.post('*', setFileMeta, setDirDetails, (req, res, next) => {
	async() => {
		if (!req.stat) return res.send(405, 'File does not exist')
		if (req.isDir) return res.send(405, 'Path is a directory')
		await fs.promise.truncate(req.filePath, 0)
		req.pipe(fs.createWriteStream(req.filePath))
		let message = createJsonMessage("create", req.filePath, "file", req._readableState.buffer.toString())
		sendMessage(req, message, port, TCPHost)

		res.end()
	}().catch(next)
})

app.put('*', setFileMeta, setDirDetails, (req, res, next) => {
	async() => {
		if (req.stat) return res.send(405, 'File exists')
		await mkdirp.promise(req.dirPath)
		if (!req.isDir) {
			req.pipe(fs.createWriteStream(req.filePath))
			let message = createJsonMessage("create", req.filePath, "file", req._readableState.buffer.toString())
			sendMessage(req, message, port, TCPHost)
		}
		res.end()
	}().catch(next)
})

app.get('*', setFileMeta, sendHeaders, (req, res) => {
	if (res.body) {
		res.json(res.body)
		return
	}
	fs.createReadStream(req.filePath).pipe(res)
});

app.delete('*', setFileMeta, (req, res, next) => {
	async() => {
			if (!req.stat) {
				return res.send('400', 'Invalid path')
			}
			if (req.stat.isDirectory()) {
				await rimraf.promise(req.filePath)
			} else {
				await fs.promise.unlink(req.filePath)
				let message = createJsonMessage("delete", req.filePath, "file", null)
				sendMessage(req, message, port, TCPHost)
			}
			res.end()
		}().catch(next) // only call next if failure
})

function sendMessage(req, message, port, host) {	 
	let socket = new JsonSocket(new net.Socket()); //Decorate a standard net.Socket with JsonSocket
	socket.connect(port, host);
	socket.on('connect', function() { //Don't send until we're connected
    		socket.sendMessage(message);
	});
}

function broadcast(message, sender) {
	clients.forEach(function (client) {
  		client.sendMessage(message);
	});
	console.log(JSON.stringify(message))
}

function createJsonMessage(action, path, type, contents) {
	return {
		action: action,
		path: path,
		type: type,
		contents: contents,
		updated: (new Date).getTime()
	}
}

function sendHeaders(req, res, next) {
	nodeify(async() => {
		if (req.isDirectory()) {
			let files = await fs.promise.readdir(req.filePath)
			res.body = JSON.stringify(files);
			res.setHeader('Content-Length', res.body.length)
			res.setHeader('Content-Type', 'application/json')
			return
		}
		res.setHeader('Content-Length', stat.size)
		let contentType = mime - types.contentType(path.extname(filePath))
		res.setHeader('Content-Type', contentType)
	}(), next)
}

function setFileMeta(req, res, next) {
	req.filePath = path.resolve(path.join(ROOT_DIR, req.url))
	if (req.filePath.indexOf(ROOT_DIR) !== 0) {
		res.send(400, 'Invalid path')
		return
	}
	fs.promise.stat(req.filePath)
		.then(stat => req.stat = stat, () => req.stat = null)
		.nodeify(next)
}

function setDirDetails(req, res, next) {
	let endsWithSlash = req.filePath.charAt(req.filePath.length - 1) === path.sep
	let hasExt = path.extname(req.filePath) !== ''
	req.isDir = endsWithSlash || !hasExt
	req.dirPath = req.isDir ? req.filePath : path.dirname(req.filePath)
	next()
}
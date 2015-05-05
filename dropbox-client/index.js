let net = require('net')
let JsonSocket = require('json-socket')
let argv = require('yargs').argv
let path = require('path')
let fs = require('fs')
let mkdirp = require('mkdirp')
require('songbird')

let port = 9838;
let host = '127.0.0.1';

const ROOT_DIR = path.resolve(argv.dir || process.cwd())

let netSocket = new net.Socket()
netSocket.setKeepAlive(true)
let socket = new JsonSocket(netSocket)
socket.connect(port, host)

async function createFile(message) {
  console.log(message)
  let dirToCreate = path.dirname(path.resolve(ROOT_DIR + message.path))
  // TODO: only create directory if it does not exist
  await mkdirp.promise(dirToCreate)
  if (message.type === "file") {
    let fullPath = path.resolve(dirToCreate, path.basename(message.path))
    await fs.promise.writeFile(fullPath, message.contents.toString('utf-8')).then('File created successfully...')        
  }
}

async function deleteFile(message) {
  let fileToDelete = path.resolve(ROOT_DIR + message.path)
  await fs.promise.unlink(fileToDelete)
}

socket.on('connect', function() { //Don't send until we're connected
    console.log('CLIENT: connected to TCP server')
    socket.on('message', function(message) {
        console.log(message);
        switch (message.action) {
          case "create" :
            console.log('CLIENT: CREATE')
            createFile(message)
          break;
          case "update":
            console.log('CLIENT: UPDATE')
            createFile(message)
          break;
          case "delete":
            console.log('CLIENT: DELETE')
            deleteFile(message)
          break;
        }
    })
})
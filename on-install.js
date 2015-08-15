var concat = require('concat-stream')
var through = require('through')
var tar = require('tar-fs')
var zlib = require('zlib')
var http = require('http')

http.get('http://registry.npmjs.org/babel-runtime/latest', function(res){
  concat(res, function(err, json){
    if (err) throw err
    var uri = JSON.parse(json.toString()).dist.tarball
    http.get(uri, onTarball)
  })
})

function onTarball(res) {
  res.on('error', onError)
     .pipe(zlib.createUnzip())
     .on('error', onError)
     .pipe(tar.extract(__dirname + '/babel-runtime', {mapStream: mapStream, strip: 1}))
     .on('error', onError)
}

function onError(e) { throw e }

function mapStream(file, header) {
  if (!/helpers|regenerator/.test(header.name)) return file
  var buffer = ''
  return file.pipe(through(function onData(chunk){ buffer += chunk },
                           function onEnd(){
                             this.queue(new Buffer(fixRequires(buffer)))
                             this.queue(null)
                           }))
}

function fixRequires(src) {
  return src.replace(/require\("babel-runtime/g, 'require("..')
}

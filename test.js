var formidable = require('formidable'),
http = require('http'),
util = require('util');

http.createServer(function(req, res) {
if (req.url == '/upload' && req.method.toLowerCase() == 'post') {
// parse a file upload
var form = new formidable.IncomingForm();

form.hash = 'md5';
form.keepExtensions = true;
form.maxFieldsSize = 10 * 1024 * 1024;

form.parse(req, function(err, fields, files) {
  res.writeHead(200, {'content-type': 'text/plain'});
  res.write('received upload:\n\n');
  res.end(util.inspect({fields: fields, files: files}));

  const { name, type, path, hash, size } = files[0]
});

return;
}

// show a file upload form
res.writeHead(200, {'content-type': 'text/html'});
res.end(
'<form action="/upload" enctype="multipart/form-data" method="post">'+
'<input type="text" name="title"><br>'+
'<input type="file" name="upload" multiple="multiple"><br>'+
'<input type="submit" value="Upload">'+
'</form>'
);
}).listen(8080);
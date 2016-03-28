/* server.js */

var express = require('express');
var basicAuth = require('basic-auth-connect');
var fs = require('fs');
var exec = require('child_process').exec;
var bodyParser = require('body-parser');
var crypto = require('crypto');
var configFilePath = 'config';
var config = require('ini').parse(fs.readFileSync(configFilePath, 'utf-8'));
var multipart = require('connect-multiparty');
var im = require('imagemagick');
var multipartMiddleware = multipart();
var app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

// authentication
app.use(basicAuth(config.LOGIN_ID, config.LOGIN_PASS));

// Request body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// public folder to store assetss
app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

// edit new file
app.get('/new/', function(req, res) {
	var dt = new Date();
	var year = dt.getFullYear(),
		month = dt.getMonth()+1,
		day = dt.getDate();

	var content = "---\nlayout: post\ntitle: " + year + "년 " + month + "월 " + day + "일의 일상\ncategory: diary\ntags: []\n\n---\n\n<!-- more -->\n";

	if (month < 10) {
		month = "0" + month;
	}
	if (day < 10) {
		day = "0" + day;
	}

	var filename = year + "-" + month + "-" + day + "-" + "diary.md";

	console.log("[" + dt + "] /new/ : " + filename);
	res.render('pad', {content: content, filename: filename});
});

// edit existing file
app.get('/edit/:filename', function(req, res) {
	console.log("[" + new Date() + "] /edit/ : " + req.params.filename);

	var file = config.GIT_REPO + "/" + config.POST_DIR + "/" + req.params.filename,
		content;

	if (!fs.existsSync(file)) {
		console.log("create new file.");
		content = "---\nlayout: post\ntitle: \ncategory: diary\ntags: []\n\n---\n\n<!-- more -->\n";
	} else {
		content = fs.readFileSync(file, 'utf8');
	}

	res.render('pad', {content: content, filename: req.params.filename});
});

// save existing file
app.post('/save/:filename', function(req, res) {
	console.log("[" + new Date() + "] /save/ : " + req.params.filename);

	var filename = req.params.filename,
		data = req.body.data;

	if (!data) {
		console.log("save error. ");
		res.status(404).send('Failed to save');
		return;
	}
	
	fs.writeFile(config.GIT_REPO + "/" + config.POST_DIR + "/" + filename, data, function(err) {
		if (err) {
			res.status(404).send('Failed to save');
			throw err;
		}

		console.log(filename + ': write completed.');

		var response = {
			message: "success"
		}

		res.send(JSON.stringify(response));
	});
});

// upload attached file
app.post('/upload/:filename', multipartMiddleware, function(req, res) {
	console.log("[" + new Date() + "] /upload/ : " + req.params.filename);

	var filename = req.params.filename,
		file = req.files.uploadFile;

	if (!file) {
		console.log("upload error. ");
		res.status(404).send('Failed to upload');
		return;
	}

	var uploadPath = config.GIT_REPO + "/assets/" + filename.substring(0, filename.length-3);

	if (!fs.existsSync(uploadPath)) {
		fs.mkdirSync(uploadPath);
	}

	fs.readFile(file.path, function (err, data) {
		var target = uploadPath + "/" + file.originalFilename;
		fs.writeFile(target, data, function(err) {
			if (err) {
				res.status(404).send('Failed to upload');
				throw err;
			}

			var response = {
				message: "success",
				content: "\n\n![](__imgUrl__" + "/" + file.originalFilename + ")"
			};

			res.send(JSON.stringify(response));
		});
	});
});

// commit and push to git repository
app.post('/commit', function(req, res) {
	console.log("[" + new Date() + "] /commit/ ");

		var shellCommand = './commit.sh';
		shellCommand += ' --config \'' + configFilePath + '\'';

		exec(shellCommand, function (error, stdout, stderr) {
			if (error) {
				console.log('[!] Error running shell script: ' + error);
				res.status(404).send('Failed to commit');
				return;
			}

			console.log("[" + new Date() + "] commit complete.");

			var response = {
				message: "success"
			}

			res.send(JSON.stringify(response));
		});
});

// listen
var port = config.SERVER_PORT;
app.listen(port);

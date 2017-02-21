/* editor.js */

var express = require('express');
var basicAuth = require('basic-auth-connect');
var fs = require('fs');
var exec = require('child_process').exec;
var bodyParser = require('body-parser');
var crypto = require('crypto');
var configFilePath = __dirname + '/config';
var config = require('ini').parse(fs.readFileSync(configFilePath, 'utf-8'));
var multipart = require('connect-multiparty');
var im = require('imagemagick');
var multipartMiddleware = multipart();
var log4js = require('log4js');
var app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

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

// global
var logger = log4js.getLogger("editor.js");
var DEFAULT_COMMIT_MSG = "modify posts";

// edit new file
app.get('/new/', function(req, res) {
	var dt = new Date();
	var year = dt.getFullYear(),
		month = dt.getMonth()+1,
		day = dt.getDate();

	if (month < 10) {
		month = "0" + month;
	}

	if (day < 10) {
		day = "0" + day;
	}

	var filename = year + "-" + month + "-" + day + "-" + "diary.md",
	 	content = "---\nlayout: post\ntitle: " + year + "년 " + month + "월 " + day + "일의 일상\ncategory: diary\ntags: []\nalign: left\n\n---\n\n<!-- more -->\n";
	logger.info("/new/ : " + filename);

	var imgDir = getImageDir(filename);
	res.render('pad', {content: content, filename: filename, emojiDir: config.EMOJI_DIR, imgDir: imgDir});
});

// edit existing file
app.get('/edit/:filename', function(req, res) {
	var filename = req.params.filename;
	logger.info("/edit/ : " + filename);

	var file = config.GIT_REPO + "/" + config.POST_DIR + "/" + filename,
		content;

	if (!fs.existsSync(file)) {
		logger.info("create new file.");
		content = "---\nlayout: post\ntitle: \ncategory: diary\ntags: []\nalign: left\n\n---\n\n<!-- more -->\n";
	} else {
		content = fs.readFileSync(file, 'utf8');
	}

	var imgDir = getImageDir(filename);
	res.render('pad', {content: content, filename: filename, emojiDir: config.EMOJI_DIR, imageDir: imgDir});
});

// save existing file
app.post('/save/:filename', function(req, res) {
	logger.info("/save/ : " + req.params.filename);

	var filename = req.params.filename,
		data = req.body.data;

	if (!data) {
		logger.info("save error. ");
		res.status(404).send('Failed to save');
		return;
	}

	fs.writeFile(config.GIT_REPO + "/" + config.POST_DIR + "/" + filename, data, function(err) {
		if (err) {
			res.status(404).send('Failed to save');
			throw err;
		}

		logger.info(filename + ': write completed.');

		var response = {
			message: "success"
		}

		res.send(JSON.stringify(response));
	});
});

// upload attached file
app.post('/upload/:filename', multipartMiddleware, function(req, res) {
	logger.info("/upload/ : " + req.params.filename);

	var filename = req.params.filename,
		file = req.files.uploadFile;

	if (!file) {
		logger.info("upload error. ");
		res.status(404).send('Failed to upload');
		return;
	}

	var uploadPath = getImageDir(filename);

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
				message: "save success",
				content: "\n\n![](__imgUrl__" + "/" + file.originalFilename + ")"
			};

			res.send(JSON.stringify(response));
		});
	});
});

// deploy
app.post('/deploy', function(req, res) {
	logger.info("/deploy/ ");

	var shellCommand = __dirname + '/../blog_deploy.sh';
	exec(shellCommand, function (error, stdout, stderr) {
		if (error) {
			logger.info('[!] Error running shell script: ' + error);
			res.status(404).send('Failed to deploy');
			return;
		}

		if (stdout) {
			logger.info(stdout);
		}

		logger.info("deploy complete.");

		var response = {
			message: "deploy success"
		}

		res.send(JSON.stringify(response));
	});
});

// commit and push to git repository
app.post('/commit', function(req, res) {
	logger.info("/commit/ ");

	var shellCommand = __dirname + '/commit.sh';
	shellCommand += ' --config \'' + configFilePath + '\'';

	var commitMsg = DEFAULT_COMMIT_MSG;
	if (req.body.msg) {
		commitMsg = req.body.msg;
		shellCommand += ' --amend 1';
	}

	shellCommand += ' --commit_msg \'' + commitMsg + '\'';

	logger.info(shellCommand);
	exec(shellCommand, function (error, stdout, stderr) {
		if (error) {
			logger.info('[!] Error running shell script: ' + error);
			res.status(404).send('Failed to commit');
			return;
		}

		if (stdout) {
			logger.info(stdout);
		}

		logger.info("commit complete.");

		var response = {
			message: "commit success"
		}

		res.send(JSON.stringify(response));
	});
});

function getImageDir(filename) {
	var imgDir = config.GIT_REPO + "/assets/" + filename.substring(0, filename.length-3);
	return imgDir;
}

// listen
var port = config.SERVER_PORT;
app.listen(port);

/* public/script.js */

window.onload = function() {
    // Because highlight.js is a bit awkward at times
    var languageOverrides = {
        js: 'javascript',
        html: 'xml'
   	 };

	// TODO use config file
	var HOME_URL = "http://so-blog.net/";

    emojify.setConfig({ img_dir: document.getElementById('emoji_dir').value });

    var md = markdownit({
        html: true,
        highlight: function(code, lang) {
            if(languageOverrides[lang]) lang = languageOverrides[lang];
            if(lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(lang, code).value;
                }catch(e) {}
            }
            return '';
        }
    })
    .use(markdownitFootnote);

    function update(e) {
        setOutput(e.getValue());
    }

    function setOutput(val) {
        val = val.replace(/<equation>((.*?\n)*?.*?)<\/equation>/ig, function(a, b) {
            return '<img src="http://latex.codecogs.com/png.latex?' + encodeURIComponent(b) + '" />';
        });

        var out = document.getElementById('out');
        var old = out.cloneNode(true);
        out.innerHTML = md.render(val);
        emojify.run(out);

        var outVal = out.innerHTML,
            imageDir = document.getElementById('image_dir').value;

        outVal = outVal.replace(/__imgUrl__/ig, imageDir);
        out.innerHTML = md.render(outVal);

        var allold = old.getElementsByTagName("*");
        if (allold === undefined) return;

        var allnew = out.getElementsByTagName("*");
        if (allnew === undefined) return;

        for (var i = 0, max = Math.min(allold.length, allnew.length); i < max; i++) {
            if (!allold[i].isEqualNode(allnew[i])) {
                out.scrollTop = allnew[i].offsetTop;
                return;
            }
        }
    }

    var editor = CodeMirror.fromTextArea(document.getElementById('code'), {
        mode: 'gfm',
        lineNumbers: false,
        matchBrackets: true,
        lineWrapping: true,
        theme: 'base16-light',
        extraKeys: {"Enter": "newlineAndIndentContinueMarkdownList"}
    });

    editor.on('change', update);

    document.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var reader = new FileReader();
        reader.onload = function(e) {
            editor.setValue(e.target.result);
        };

        reader.readAsText(e.dataTransfer.files[0]);
    }, false);

    function saveAsMarkdownFile(code, name) {
        var blob = new Blob([code], { type: 'text/plain' });
        if (window.saveAs) {
            window.saveAs(blob, name);
        } else if (navigator.saveBlob) {
            navigator.saveBlob(blob, name);
        } else{
            url = URL.createObjectURL(blob);
            var link = document.createElement("a");
            link.setAttribute("href",url);
            link.setAttribute("download",name);
            var event = document.createEvent('MouseEvents');
            event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
            link.dispatchEvent(event);
        }
    }

    var save = document.getElementById('save');
    var commit = document.getElementById('commit');
    var deploy = document.getElementById('deploy');
    var uploadFile = document.getElementById('uploadFile');

    function toggleSave() {
        if (save.style.display == 'block') {
            save.style.display = 'none';
        } else {
            save.style.display = 'block';
            document.getElementById('save_msg').value = "";
            document.getElementById('save_msg').focus();
        }
    }

    function toggleCommit() {
        if (commit.style.display == 'block') {
            commit.style.display = 'none';
        } else {
            commit.style.display = 'block';
            document.getElementById('commit_msg').value = "";
            document.getElementById('commit_msg').focus();
        }
    }

    function toggleDeploy() {
        if (deploy.style.display == 'block') {
            deploy.style.display = 'none';
        } else {
            deploy.style.display = 'block';
            document.getElementById('deploy_msg').value = "";
            document.getElementById('deploy_msg').focus();
        }
    }

	document.getElementById('back').addEventListener('click', function() {
		var filename = document.getElementById('filename').value,
			re = /(\d{4})-(\d{2})-(\d{2})-(.+).md/g,
			match = re.exec(filename);

		var url = HOME_URL + "/" +  match[1] + "/" + match[2] + "/" + match[3] + "/" + match[4];
		document.location.href = url;
	});

    document.getElementById('download').addEventListener('click', function() {
        var filename = document.getElementById('filename').value;
        saveAsMarkdownFile(editor.getValue(), filename);
    });

    document.getElementById('toggle-save').addEventListener('click', toggleSave);
    document.getElementById('close-save').addEventListener('click', function() {
        save.style.display = 'none';
    });

    document.getElementById('toggle-commit').addEventListener('click', toggleCommit);
    document.getElementById('close-commit').addEventListener('click', function() {
        commit.style.display = 'none';
    });

    document.getElementById('toggle-deploy').addEventListener('click', toggleDeploy);
    document.getElementById('close-deploy').addEventListener('click', function() {
        deploy.style.display = 'none';
    });

    document.addEventListener('keydown', function(e) {
        if(e.keyCode == 83 && (e.ctrlKey || e.metaKey)) {
            toggleSave();

            e.preventDefault();
            return false;
        }

        if(e.keyCode === 27) {
            if (save.style.display == 'block') {
                save.style.display = 'none';
            }

            if (commit.style.display == 'block') {
                commit.style.display = 'none';
            }

            if (deploy.style.display == 'block') {
                deploy.style.display = 'none';
            }

            e.preventDefault();
            return false;
        }
    });

    document.getElementById('save_msg').addEventListener('keydown', function(e) {
        if(e.keyCode == 13) {
            if (!document.getElementById('save_msg').value) {
                alert("input the save message");
            } else {
                saveToServer(document.getElementById('save_msg').value);
                save.style.display = 'none';
            }
        }

        return false;
    });

    function saveToServer(msg) {
        var filename = document.getElementById('filename').value,
        payload = "&msg=" + msg + "&data=" + encodeURIComponent(editor.getValue());

        $.ajax({
            type: 'POST',
            url: "/save/" + filename,
            data: payload,
            success: function (response) {
                alert("save success.");

                if (uploadFile.value) {
                    $('#upload_form').ajaxForm({
                        beforeSubmit: function() {
                            document.getElementById('upload_form').msg.value = msg;
                            return true;
                        },
                        url: "/upload/" + filename,
                        dataType:'text',
                        success: function (response) {
                            alert("file upload success.");
                            editor.setValue(editor.getValue() + JSON.parse(response).content);
                            uploadFile.value = "";
                            update(editor);
                        },
                        error: function (response, status) {
                            alert("file upload error: " + status);
                        },
                        beforeSend:function() {

                        },
                        complete:function() {
                        }
                    }).submit();

                }
            },
            error: function (response, status) {
                alert("save error: " + status);
            }
        });
    }

    document.getElementById('commit_msg').addEventListener('keydown', function(e) {
        if(e.keyCode == 13) {
            if (!document.getElementById('deploy_msg').value) {
                var result = confirm("Do you want really amend commit with default commit message?");
                if (result) {
                    commitToServer(document.getElementById('commit_msg').value);
                }

                commit.style.display = 'none';
            }
        }

        return false;
    });


    function commitToServer(msg) {
        var filename = document.getElementById('filename').value,
        postUrl = "/commit/",
        payload = "&msg=" + msg;

        $.ajax({
            type: 'POST',
            url: postUrl,
            data: payload,
            success: function (response) {
                alert("save success.");
            },
            error: function (response, status) {
                alert("save error: " + status);
            }
        });
    }

    document.getElementById('deploy_msg').addEventListener('keydown', function(e) {
        if(e.keyCode == 13) {
            deployToServer(document.getElementById('deploy_msg').value);
            deploy.style.display = 'none';
        }

        return false;
    });


    function deployToServer(msg) {
        var filename = document.getElementById('filename').value,
        postUrl = "/deploy/",
        payload = "&msg=" + msg;

        $.ajax({
            type: 'POST',
            url: postUrl,
            data: payload,
            success: function (response) {
                alert("deploy success.");
            },
            error: function (response, status) {
                alert("deploy error: " + status);
            }
        });
    }

    update(editor);
    editor.focus();
};

/* public/script.js */

window.onload = function() {
    var converter = new showdown.Converter();
    var pad = document.getElementById('pad');
    var markdownArea = document.getElementById('markdown'); 
    var menu = document.getElementById('menu');
    var commit = document.getElementById('commit');
	var deploy = document.getElementById('deploy');
    var uploadFile = document.getElementById('uploadFile');

    // make the tab act like a tab
    pad.addEventListener('keydown',function(e) {
        if(e.keyCode === 9) { // tab was pressed
            // get caret position/selection
            var start = this.selectionStart;
            var end = this.selectionEnd;

            var target = e.target;
            var value = target.value;

            // set textarea value to: text before caret + tab + text after caret
            target.value = value.substring(0, start)
                            + "\t"
                            + value.substring(end);

            // put caret at right position again (add one for the tab)
            this.selectionStart = this.selectionEnd = start + 1;

            // prevent the focus lose
            e.preventDefault();
        }
    });

    document.addEventListener('drop', function(e){
      e.preventDefault();
      e.stopPropagation();

      var reader = new FileReader();
      reader.onload = function(e){
        pad.value = e.target.result;
      };

      reader.readAsText(e.dataTransfer.files[0]);
    }, false);

    function saveAsFile(code, name) {
      var blob = new Blob([code], { type: 'text/plain' });
      if(window.saveAs){
        window.saveAs(blob, name);
      }else if(navigator.saveBlob){
        navigator.saveBlob(blob, name);
      }else{
        url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.setAttribute("href",url);
        link.setAttribute("download",name);
        var event = document.createEvent('MouseEvents');
        event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
        link.dispatchEvent(event);
      }
    }

    function toggleMenu() {
        if (menu.style.display == 'block') {
            menu.style.display = 'none';
        } else {
            menu.style.display = 'block';
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

    document.getElementById('toggle-menu').addEventListener('click', toggleMenu);

    document.getElementById('close-menu').addEventListener('click', function(){
      menu.style.display = 'none';
    });

    document.getElementById('toggle-commit').addEventListener('click', toggleCommit);

    document.getElementById('close-commit').addEventListener('click', function(){
      commit.style.display = 'none';
    });

	document.getElementById('toggle-deploy').addEventListener('click', toggleDeploy);

	document.getElementById('close-deploy').addEventListener('click', function(){
		deploy.style.display = 'none';
	});

    document.addEventListener('keydown', function(e){
      if(e.keyCode == 83 && (e.ctrlKey || e.metaKey)){
        toggleMenu();

        e.preventDefault();
        return false;
      }

      if(e.keyCode === 27){
        if (menu.style.display == 'block') {
            menu.style.display = 'none';
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

    document.getElementById('save_msg').addEventListener('keydown', function(e){
      if(e.keyCode == 13){
        if (document.getElementById('save_msg').value) {
            saveToServer(document.getElementById('save_msg').value);
        }
        menu.style.display = 'none';
      }

      return false;
    });

    function saveToServer(msg) {
        var filename = document.getElementById('filename').value,
            payload = "&msg=" + msg + "&data=" + encodeURIComponent(pad.value);

        $.ajax({
          type: 'POST',
          url: "/save/" + filename,
          data: payload,
          success: function (response) {
            alert("save success.");

            if (uploadFile.value) {
              $('#upload_form').ajaxForm({
                  beforeSubmit: function(){
                    document.getElementById('upload_form').msg.value = msg;
                    return true;
                },
                url: "/upload/" + filename,
                dataType:'text',
                success: function (response) {
                  alert("file upload success.");
                  pad.value = pad.value + JSON.parse(response).content;
                  uploadFile.value = "";
                  convertTextAreaToMarkdown();
                },
                error: function (response, status) {
                  alert("file upload error: " + status);
                },
                beforeSend:function(){ 

                },
                complete:function(){
                }
               }).submit();

            }
          },
          error: function (response, status) {
            alert("save error: " + status);
          }
        });
    }
 
    document.getElementById('commit_msg').addEventListener('keydown', function(e){
      if(e.keyCode == 13){
        if (document.getElementById('commit_msg').value) {
            commitToServer(document.getElementById('commit_msg').value);
        }
        commit.style.display = 'none';
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

    document.getElementById('deploy_msg').addEventListener('keydown', function(e){
      if(e.keyCode == 13){
        if (document.getElementById('deploy_msg').value) {
            deployToServer(document.getElementById('deploy_msg').value);
        }
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
            alert("save success.");
          },
          error: function (response, status) {
            alert("save error: " + status);
          }
        });
    }

    var previousMarkdownValue;

    // convert text area to markdown html
    var convertTextAreaToMarkdown = function(){
        var markdownText = pad.value;
        previousMarkdownValue = markdownText;
        html = converter.makeHtml(markdownText);
        markdownArea.innerHTML = html;
    };

    var didChangeOccur = function(){
        if(previousMarkdownValue != pad.value){
            return true;
        }
        return false;
    };

    // check every second if the text area has changed
    setInterval(function(){
        if(didChangeOccur()){
            convertTextAreaToMarkdown();
        }
    }, 1000);

    // convert textarea on input change
    pad.addEventListener('input', convertTextAreaToMarkdown);

    // convert on page load
    convertTextAreaToMarkdown();
    pad.focus();
};

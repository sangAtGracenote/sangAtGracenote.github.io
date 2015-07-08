// output information
        function Output(msg) {
            var m = $("#messages");
            m.html( msg + m.html());
        }

        function ParseFile(file) {

            Output(
                "<p>File information: <strong>" + file.name +
                "</strong> type: <strong>" + file.type +
                "</strong> size: <strong>" + file.size +
                "</strong> bytes</p>"
            );
            
        } 
        function FileDragHover(e) {
            e.stopPropagation();
            e.preventDefault();
            e.target.className = (e.type == "dragover" ? "hover" : "");
        }

        function FileSelectHandler(e) {

            // cancel event and hover styling
            FileDragHover(e);

            // fetch FileList object
            var files = e.originalEvent.target.files || e.originalEvent.dataTransfer.files;

            // process all File objects
            for (var i = 0, f; f = files[i]; i++) {
                ParseFile(f);
                if (f.type == "audio/wav")
                {
                    Output("<p>sound file is ready!</p>");
                    $("#playwave").css("display", "inherit");

                    var reader = new FileReader();
                    reader.onload = function(e) {
                        initSound(e.target.result);
                    };
                    reader.readAsArrayBuffer(f);
                    

                }
                if (f.type == "text/plain")
                {
                    // This may be a timestamp file 
                    Output("<p>text file is ready!</p>");
                }
            }

        }

        function Init() {

            var fileselect = $("#fileselect"),
            filedrag = $("#filedrag"),
            submitbutton = $("#submitbutton");

            // file select
            fileselect.on("change", FileSelectHandler);

            // is XHR2 available?
            var xhr = new XMLHttpRequest();
            if (xhr.upload) {

            // file drop
                filedrag.on("dragover", FileDragHover);
                filedrag.on("dragleave", FileDragHover);
                filedrag.on("drop", FileSelectHandler);
                filedrag.css("display", "block");

                // remove submit button
                submitbutton.css("display", "none");
                $("#playwave").css("display", "none");
            }
        }

         if (window.File && window.FileList && window.FileReader) {
            Init();
            $("#startbutton").prop("disabled",true);
            $("#stopbutton").prop("disabled",true);
        }  

        Output("Hello! Upload wave file and timestamps file here. \n");


        if (!window.AudioContext) {
            alert('The Web Audio API is not supported in your browser!');
        }

        var context = new window.AudioContext();
        var source = null;
        var audioBuffer = null;

        function stopSound() {
            if (source) {
                source[source.stop ? 'stop' : 'noteOff'](0);
                $("#startbutton").prop("disabled",false);        
                $("#stopbutton").prop("disabled",true);        
            }
        }

        function playSound() {
            source = context.createBufferSource(); // Global so we can .noteOff() later.
            source.buffer = audioBuffer;
            source.loop = false;
            source.connect(context.destination);
            source[source.start ? 'start' : 'noteOn'](0);
            $("#startbutton").prop("disabled",true);        
            $("#stopbutton").prop("disabled",false);        
        }

        function initSound(arrayBuffer) {
            context.decodeAudioData(arrayBuffer, function(buffer) {
                audioBuffer = buffer;
                var buttons = document.querySelectorAll('button');
                $("#startbutton").prop("disabled",false);

                }, function(e) {
                console.log('Error decoding', e);
            }); 
        }

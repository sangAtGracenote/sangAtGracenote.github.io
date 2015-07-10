// output information

window.requestAnimFrame = (function(){
return  window.requestAnimationFrame       || 
  window.webkitRequestAnimationFrame || 
  window.mozRequestAnimationFrame    || 
  window.oRequestAnimationFrame      || 
  window.msRequestAnimationFrame     || 
  function( callback ){
  window.setTimeout(callback, 1000 / 60);
};
})();

var context = new window.AudioContext();
var source = null;
var audioBuffer = null;
var words = {};
var word_timestamps = {};
var lines = {}; 
var line_timestamps = {}; 
var currentWordIndex = 0;
var currentLineIndex = 0;
var startTime = 0;
var playing = false;
var line_level_sync = true;
demoBuffers = {};


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
            var reader = new FileReader();
            reader.onload = function(e) {
                initLyric(e.target.result);
            };
            reader.readAsText(f);
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

    var soundMap = {};
    for (var i in demo_list) {
        soundMap[i] = "./lyric_sync_data/demo/" + demo_list[i].music_filename;

        loadBuffer(soundMap[i], i, function(index){
            var s = $("#demo_options");
            s.append($('<option/>').attr("value",index).html(demo_list[index].artist + " - " + demo_list[index].title));
            console.log("loaded:" + demo_list[index].title);
            s.prop("disabled",false); 
        });
    }
 
    var s = $("#demo_options");
    s.prop("disabled",true); 
    s.change(function() {
        $("#playwave").css("display", "inherit");
        audioBuffer = demoBuffers[$("#demo_options").val()];
        $("#startbutton").prop("disabled",false);
    });

}




loadBuffer = function(url, i, callback) {
  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";
  console.log("url"+ url);
  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    context.decodeAudioData(
      request.response,
      function(buffer){
        demoBuffers[i] = buffer;
        callback(i);
      } ,
      function(error) {
        console.error('decodeAudioData error', error);
      }
    );
  }

  request.onerror = function() {
    alert('BufferLoader: XHR error');
  }

  request.send();
};




function stopSound() {
    if (source) {
        source[source.stop ? 'stop' : 'noteOff'](0);
        $("#startbutton").prop("disabled",false);        
        $("#stopbutton").prop("disabled",true);        
        playing = false;
        initHightlight();
    }
}

var animate = function(t) {
  
    var currentTime = (new Date()).getTime() - startTime+100;
    var increased = false;
    if (line_level_sync){
        while ( currentTime > line_timestamps[currentLineIndex]){
            currentLineIndex++;
            increased = true;
        }
        if (increased)
            $("#line_"+(currentLineIndex-1)).toggleClass("lyric_hightlight");
    }
    else{
        while ( currentTime > word_timestamps[currentWordIndex]){
            currentWordIndex++;
            while(word_timestamps[currentWordIndex] == "undefined")
                currentWordIndex++;
            increased = true;
        }
        if (increased)
            $("#word_"+(currentWordIndex-1)).toggleClass("lyric_hightlight");
    }

    if ( currentTime > word_timestamps[words.length-1])
    {
        playing = false;
        initHightlight();
        $("#startbutton").prop("disabled",false);        
        $("#stopbutton").prop("disabled",true);        
        
    }
    if (playing)
        requestAnimationFrame(animate);

};
function playSound() {
    source = context.createBufferSource(); // Global so we can .noteOff() later.
    source.buffer = audioBuffer;
    source.loop = false;
    source.connect(context.destination);
    source[source.start ? 'start' : 'noteOn'](0);
    startTime = (new Date()).getTime();
    currentWordIndex =0;
    currentLineIndex = 0;
    $("#startbutton").prop("disabled",true);        
    $("#stopbutton").prop("disabled",false);
    playing = true;
    animate(Date.now());
    line_level_sync = $('input[name=sync_level]:checked', '#upload').val() == "line";
    console.log(line_level_sync);
    initHightlight();
}

function initSound(arrayBuffer) {
    context.decodeAudioData(arrayBuffer, function(buffer) {
            audioBuffer = buffer;
            $("#startbutton").prop("disabled",false);
        }, function(e) {
        console.log('Error decoding', e);
    }); 
}

function initHightlight(){
    for (var i=0; i<words.length; i++){
        $("#word_"+(i)).removeClass("lyric_hightlight");
    }
    for (var i=0; i<lines.length; i++){
        $("#line_"+(i)).removeClass("lyric_hightlight");
    }
}

function initLyric(content){
    $("#lyric_display").html("");
    timestamps = content.split("\n");
    var line_cnt = 0;
    var line_start = true;
    var line =""
    var line_html = $('<div id = line_0></div>');
    var lyric_html = $('<div></div>');
    for (var i=0; i<timestamps.length; i++){
        var str_label_time = timestamps[i].split("\t");
        words[i] = (str_label_time[0]);
        word_timestamps[i] = parseFloat(str_label_time[1]) * 1000; // ms
        if (str_label_time[0].trim()=="."){ // end of line 
            lines[line_cnt] = line
            line = "";
            line_start = true;
            line_cnt++;
            lyric_html.append(line_html);
            line_html = $('<div id = line_'+line_cnt+'></div>');
        }
        else{
            line += " " + words[i];
            line_html.append("<span id=word_" + i + ">" +  words[i]+ "&nbsp;</span>");
            
            if (line_start){ //  starting of the line - log the timestamp 
                line_timestamps[line_cnt] = word_timestamps[i];
                line_start = false;
            }
        }


    }
    lines.length = line_cnt;
    words.length = timestamps.length;
    $("#lyric_display").append(lyric_html);
   
}


if (window.File && window.FileList && window.FileReader) {
    Init();
    $("#startbutton").prop("disabled",true);
    $("#stopbutton").prop("disabled",true);
}  

if (!window.AudioContext) {
    alert('The Web Audio API is not supported in your browser!');
}

Init()


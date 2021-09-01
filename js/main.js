/* DAQari - Simple Data acquisition software in a Chrome Web Browser
*
* Requires a board compatible with Arduino IDE programmer, or customizing serial output to conform to the required JSON printout.
*
* Copyright Nicholas Ravanelli, PhD
* Assistant Professor, School of Kinesiology, Lakehead University
*
* Visit https://github.com/nravanelli/DAQari for the most recent version and Readme on how to get set up
*/

//Global variables//
var EquationEval = new exprEval.Parser();
var fileHandle;
var recordingData = false;

//types of data that are logged as Global variables in the window:
var GlobablDataTypes = ["serialChannel", "transformSerial", "userChannel"];

var startRecordData = 0;
var GlobalConfigArray = {};
var serialConnect = false;
var initDrawGraphs = false;
var commentArray = {};
var firstRun = false;
var firstRun2 = false;
var initConfigComplete = false;
var serialRefreshrate = 0;
var loggerColumnCount = 0;
var dataLoggerArray = new CBuffer(7000);
var dataloggerCache = '';

//performance recording
var RecordDelay = 0;
var nextLogtime = 0;
var lastloggedDate = 0;


//Performance Timer function found here: http://jsfiddle.net/9pg9L/93/
(function ( window, document ) {
    window.requestAnimationFrame = (function() {
        return (
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            function(callback, element) {
                window.setTimeout(callback, 1000/60);
            }
        )
    })();

    window.performance = window.performance || {};
    performance.now = (function() {
        return performance.now    ||
            performance.webkitNow ||
            function() {
                return new Date().getTime();
            };
    })();
})( window, document );



$(document).ready(function() {

  //web-worker for retaining data logging while tab is inactive or out of focus, found here: https://jsfiddle.net/gowhari/pzywna6o/
  var workerBlob = new Blob([document.querySelector('#worker-code').textContent]);
  var webWorker = new Worker(window.URL.createObjectURL(workerBlob));
  var t1 = 0;
  webWorker.onmessage = function() {
  	if(recordingData){
      saveData();
    }
  }

    getConfigs();

    //onclick of inital config
    $('#initConfigModal-submit-btn').click(function () {
      initConfigComplete = true;
      initGraphs();
      var modalToggle = document.getElementById('initConfigModal');
      const modal = bootstrap.Modal.getInstance(modalToggle);
      modal.hide();
    });

    $('#serialChannelSettings-submit-btn').click(async () => {
          var data = $('#serialChannel-Settings-form').serializeArray().reduce(function(obj, item) {
                        obj[item.name] = item.value;
                        return obj;
                    }, {});
          for (var key in data){
            if(!data[key]){
              $('#'+key).addClass('error-input');
              $('#serialChannelsetting-submit-error').html('Error: missing data required.');
              console.log(key);
              return;
            }else{
              $('#'+key).removeClass('error-input');
            }
          }
          var id = data['serialChannel-id'];
          delete data['serialChannel-id'];
          for (var key in data){
            GlobalConfigArray['serialChannel'][id][key] = data[key];
          }
    });

    $('#userChannelSettings-submit-btn').click(async () => {
          var data = $('#userChannel-Settings-form').serializeArray().reduce(function(obj, item) {
                        obj[item.name] = item.value;
                        return obj;
                    }, {});
          for (var key in data){
            if(!data[key]){
              $('#'+key).addClass('error-input');
              $('#userChannelsetting-submit-error').html('Error: missing data required.');
              return;
            }else{
              $('#'+key).removeClass('error-input');
            }
          }
          let id = data['userChannel-id'];
          delete data['userChannel-id'];

          //lets check if this is the first userChannel, if not, lets create array
          if(typeof GlobalConfigArray['userChannel'] === 'undefined'){
            GlobalConfigArray['userChannel'] = [[]];
          };
          GlobalConfigArray['userChannel'][id] = [];
          for (var key in data){
            GlobalConfigArray['userChannel'][id][key] = data[key];
          }
          GlobalConfigArray['userChannel'][id]['chartConfig'] = {
                                            lineColor : "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);}),
                                            refreshRate : 100,
                                            duration: 10000,
                                            delay: 100,
                                        };
          drawGraph(id,'userChannel',true);
          var channelOrder = $('#DAQ-charts').sortable('toArray');
          updateDBkey('channelOrder',channelOrder);
    });

    $('#saveConfigModal-submit-btn').click(async () => {
      var name = $('#saveConfig-Name-input').val();
      if(!name){
        $('#saveConfigModal-submit-error').html('Error: give config a name');
        return;
      }
      if (/\s/.test(name)) {
        $('#saveConfigModal-submit-error').html('Error: No spaces in name');
        return;
      }
      if (name.includes("_")) {
        $('#saveConfigModal-submit-error').html('Error: Do not use underscores in name');
        return;
      }
      var saveddate = new Date();
      let info = {
        'title' : name,
        'author' : $('#saveConfig-CreatedBy-input').val(),
        'desc' : $('#saveConfig-Desc-input').val(),
        'date' : saveddate.toISOString(),
      };
      GlobalConfigArray['info'] = info;
      let key = 'SettingsConfig_'+name;
      updateDBkey(key,GlobalConfigArray);
      $('#saveConfigModal-submit-btn').html('<i class="far fa-check-circle"></i> Saved!');
      var modalToggle = document.getElementById('saveConfigModal');
      const modal = bootstrap.Modal.getInstance(modalToggle);
      modal.hide();
      getConfigs();
    });

    $('#downloadConfigModal-submit-btn').click(function () {
      var name = $('#downloadConfig-Name-input').val();
      if(!name){
        $('#downloadConfigModal-submit-error').html('Error: give config a name');
        return;
      }
      if (/\s/.test(name)) {
        $('#downloadConfigModal-submit-error').html('Error: No spaces in name');
        return;
      }
      if (name.includes("_")) {
        $('#downloadConfigModal-submit-error').html('Error: Do not use underscores in name');
        return;
      }
      name = name+'.txt';
      downloadConfig(name);
      var modalToggle = document.getElementById('downloadConfigModal');
      const modal = bootstrap.Modal.getInstance(modalToggle);
      modal.hide();
    });


    $('#uploadConfigModal-submit-btn').click(function () {
      var name = $('#uploadConfig-Name-input').val();
      if(!name){
        $('#uploadConfigModal-submit-error').html('Error: give config a name');
        return;
      }
      if (/\s/.test(name)) {
        $('#uploadConfigModal-submit-error').html('Error: No spaces in name');
        return;
      }
      if (name.includes("_")) {
        $('#uploadConfigModal-submit-error').html('Error: Do not use underscores in name');
        return;
      }
      let set = false;
      if($("#uploadConfig-set").is(':checked')){
        set = true;
      }
      uploadConfig(name,set);
      var modalToggle = document.getElementById('uploadConfigModal');
      const modal = bootstrap.Modal.getInstance(modalToggle);
      modal.hide();
    });


    $('#deleteConfigModal-submit-btn').click(async () => {
      //destroy tables, clear all chart objects
      var deleteselect = $('.delete-config-checkbox:checkbox:checked');
      let reload = false;
      for (let del of deleteselect){
        let id = del.id;
        let title = id.split('_');
        if(GlobalConfigArray['info']['title'] == title[1] ){
          if(confirm('You are about to delete the current configuration, this will restart DAQari. Are you sure?')){
            reload = true;
          }else{
            continue;
          }
        }
        await idbKeyval.del(del.id);
      }
      if(reload){
        location.reload();
      }
      getConfigs();
    });

    $('#DAQ-charts, .DAQ-large-card').sortable({
      items: ".draggable-graph-div",
      handle: ".draggable-icon",
      receive: function( event, ui ) {
        let divID = event.target.id;
        let divIDarr = divID.split('_');
        if(divIDarr[0] == 'LargeDataCard'){
          let chanDragDiv = ui.item[0].id;
          let chanDragDivarr = chanDragDiv.split('-');
          let chType = chanDragDivarr[1];
          let chNum = chanDragDivarr[2];
          $( "#DAQ-charts, .DAQ-large-card" ).sortable('cancel');
          //lets create div content
          $('#'+divID).html('<i class="far fa-times-circle clearDAQCardIcon" onclick="clearLargeDAQcard(\''+divID+'\');"></i><h3 class="card-title text-danger mb-1"><span class="'+chType+'-'+chNum+'-value">0</span> <span class="'+chType+'-'+chNum+'-unit"></span></h3><h5 class="lead mb-1 '+chType+'-'+chNum+'-title"></h5><div class="mb-1 text-muted small">'+chType+' '+chNum+'</div>');
          GlobalConfigArray[divID] = chType+'-'+chNum;
        }
      },
      connectWith: ".connectedSortable",
      update: function (event, ui) {
          var data = $("#DAQ-charts").sortable('toArray');
          GlobalConfigArray['channelOrder'] = data;
        },
    });

    $( ".DAQ-large-card" ).on( "sortover", function( event, ui ) {
        $("#"+event.target.id).addClass("DAQlargecard-hover");
      } );
    $( ".DAQ-large-card" ).on( "sortout", function( event, ui ) {
       $(".DAQ-large-card").removeClass("DAQlargecard-hover");
     });


    $('#userChannel-equation-input').on('input',function(e){
    var equation = EquationEval.parse($('#userChannel-equation-input').val());
    var variables = equation.variables();
    for (let variable of variables){
      let desc = variable.split('_');
        if(desc[0] == 'serialChannel' || desc[0] == 'userChannel'){
          $('#userChannel-equation-input').removeClass('error-input');
          $('#equationError').html('<span class="fw-bold text-success"><i class="far fa-check-circle"></i> Valid Equation</span>');
        }else{
          $('#userChannel-equation-input').addClass('error-input');
          $('#equationError').html('<span class="fw-bold text-danger">Error: '+variable+' does not exist.');
          break;
        }
        //lets also make sure the input exists
        let avail = false;
        var available_ch = $( "#DAQ-charts" ).sortable( "toArray" );
          for (let channel of available_ch){
            let availch = channel.split('-');
            if(desc[0] ==  availch[1] && desc[1] == availch[2]){
              avail = true;
              break;
            }else if(desc[0] == 'userChannel' && desc[1] == availch[2]){
              avail = true;
              break;
            }else{
              avail = false;
            }
          }
        if(avail === false){
            $('#userChannel-equation-input').addClass('error-input');
            $('#equationError').html('<span class="fw-bold text-danger">Error: '+variable+' does not exist.');
        }else{
            $('#userChannel-equation-input').removeClass('error-input');
            $('#equationError').html('<span class="fw-bold text-success"><i class="far fa-check-circle"></i> Valid Equation</span>');
        }
    }
    });

    //load selected config
    $('#loadConfig-btn').click(async () => {
      //Load saved config
      key = $('#configSelect').val();
      loadConfig(key);
    });

    //The SERIAL CONNECT FUNCTION(S)
    $('#serialConnect-btn').click(function(){
      let baudRate = $('#BaudrateSelect').val();

      const conn = SimpleSerial.connect({
          baudRate: baudRate,
          requestAccessonPageLoad: false,
        });


      conn.on("data", function(data) {
        let t1 = performance.now();
        //we need a delay since serial connections restart Arduinos
        $('#serialConnect-btn').prop("disabled", true);
        if(!initConfigComplete){
          if(!firstRun){
            setTimeout(function(){
              if(!$('#initConfigModal').hasClass('show')){
                var Modal = new bootstrap.Modal(document.getElementById('initConfigModal'), { backdrop: 'static', keyboard: false});
                Modal.show();
              }
            },1000);
            firstRun = true;
          }
          if(!firstRun2){
            setTimeout(function(){
                initSetup(data)
              },1000);
            firstRun2 = true;
            }

            if(firstRun & firstRun2){
              initSetup(data);
            }
        }else{
          //Start streaming data immediately
          dataStream(data);
        }

        //internal assessment of serial refresh rate in Hz
        serialRefreshrate = 1000 / ((performance.now() - t1));
      });

    });

    $('#submitComment-btn').click(function(){
      let commentTime = Date.now();
      commentArray[commentTime] = $('#fileComment-input').val();

    });

    $("#LogdataSwitch").change(function(){
        if ($(this).is(':checked')){
          recordingData = true;
          $("#datalogInterval").prop('disabled', true);
        }else{
          recordingData = false;
          $("#datalogInterval").prop('disabled', false);
          //write remaining data to file
          writeWebWorker();

          var lastloggedDate = nextLogtime = startRecordData = 0;
        }
      });

    $('#filename-input').click(async () => {
        try {
        var date = new Date().toISOString();
        var filenamesuggest = 'DAQari_'+date+'.txt';
                const options = {
                  suggestedName: filenamesuggest,
                  types: [
                    {
                      description: 'Text Files',
                      accept: {
                        'text/plain': ['.txt'],
                      },
                    },
                  ],
                };
            fileHandle = await window.showSaveFilePicker(options);
            await idbKeyval.set("datalogfile", fileHandle);
            $('#file-name-text').val(fileHandle.name);
            $('.logdata-settings').prop("disabled", false);
          } catch (error) {
            console.log(error.name, error.message);
          }
    });



    $("input[name='BaudrateSelect']").on('input', function(e){
        var selected = $(this).val();
        $('#serialConnect-btn').prop("disabled", false);
    });

});


//How to handle the first connection to an Arduino (i.e. not using a prior configuration)
function initSetup(data){
  //lets first make sure you have access to this function (only to be used when a configuration is NOT selected)
  if(!initConfigComplete){
      if(!Array.isArray(data)){
        $('#initConfigModal-arrayError').html('<i class="far fa-times-circle" style="color:red;"></i> Serial data is not in correct JSON array format.');
        return;
      }else{
        $('#initConfigModal-arrayError').html('<i class="far fa-check-circle" style="color: green;"></i> Serial input JSON array detected.');
        $('#initConfigModal-submit-btn').prop('disabled', false);
      }

      if(typeof GlobalConfigArray['serialChannel'] === 'undefined'){
        GlobalConfigArray['serialChannel'] = [[]];
      };
      if(GlobalConfigArray['serialChannel'].length > data.length){
        console.log(GlobalConfigArray['serialChannel'].length, data.length);
        //mismatch in channel identification, lets restart initiation script
        GlobalConfigArray['serialChannel'] = [[]];
        $('#initConfigModal-body').html('');

      }
      for (var i in data) {
        var value = Math.round((data[i] + Number.EPSILON) * 100) / 100;
      //lets check if there are specific settings on this channel:
      if(typeof GlobalConfigArray['serialChannel'][i] === 'undefined' || GlobalConfigArray['serialChannel'][i].length == 0){
        //lets create default array since this is a new config:
        GlobalConfigArray['serialChannel'][i] =
        { chartConfig:
          {
              lineColor : "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);}),
              refreshRate : 100,
              duration: 10000,
              delay: 10,
          }
        }
        $('#initConfigModal-body').append('<li class="list-group-item"><i class="far fa-check-circle" style="color: green;"></i> Channel '+i+' - Value: <span id="initConfigValue-'+i+'">'+value+'</span></li>');
      }
      $('#initConfigValue-'+i).html(value);

    }
  }
  serialConnect = true;
}

//this is the main function to handle Data from Serial
function dataStream(data){
  //lets just make sure that initConfig has been setup
  if(!initConfigComplete){
    return;
  }
  //serial connection is active
  serialConnect = true;

  //storing data as global variable
  window.serialChannel = data;
  //console.log(data);
  for (var i in data) {
    var value = Math.round((data[i] + Number.EPSILON) * 100) / 100;

      if(GlobalConfigArray['serialChannel'][i]['transform'] === 'on'){
         value = TransformData(GlobalConfigArray['serialChannel'][i],'serialChannel',value);
         if(typeof window.transformSerial == 'undefined' || !(window.transformSerial instanceof Array)){
           window.transformSerial = new Array();
         }
         window.transformSerial[i] = value;
       }
       //change title if set
       if(GlobalConfigArray['serialChannel'][i]['serialChannel-Name']){
         var channelName = GlobalConfigArray['serialChannel'][i]['serialChannel-Name'];
         changeInnerHTMLbyClass('serialChannel-'+i+'-title',channelName);
       }
       if(GlobalConfigArray['serialChannel'][i]['serialChannel-Unit']){
         //change units if Set
         var channelUnit = GlobalConfigArray['serialChannel'][i]['serialChannel-Unit'];
         changeInnerHTMLbyClass('serialChannel-'+i+'-unit',channelUnit);
       }
        changeInnerHTMLbyClass('serialChannel-'+i+'-value',value);
  };


  if(GlobalConfigArray['userChannel'] && GlobalConfigArray['userChannel'].length > 0){
    if(typeof window.userChannel == 'undefined' || !(window.userChannel instanceof Array)){
      window.userChannel = new Array();
    }
    var userChannels = GlobalConfigArray['userChannel'];
    for (var chNum in userChannels) {

        window.userChannel[chNum] =  TransformData(userChannels[chNum],'userChannel',null);
        //console.log( TransformData(userChannels[chNum],'userChannel',null));
        //change title if set
        var channelName = GlobalConfigArray['userChannel'][chNum]['userChannel-Name'];
        changeInnerHTMLbyClass('userChannel-'+chNum+'-title',channelName);
        //change units if Set
        var channelUnit = GlobalConfigArray['userChannel'][chNum]['userChannel-Unit'];
       changeInnerHTMLbyClass('userChannel-'+chNum+'-unit',channelUnit);
       changeInnerHTMLbyClass('userChannel-'+chNum+'-value',window.userChannel[chNum]);
      }
    }

  //save data if needed/requested
  let timenow = Date.now();

  //store incoming data in local array
  localDataStreamArray(timenow);

  if(startRecordData == 0 && recordingData) {
    startRecordData = Date.now();
    saveData();
  }

  if(recordingData)(setRecordTime(timenow,startRecordData));

  if(recordingData && $('#statusText').html() != 'Recording'){
      $('#statusText').html('Recording');
      $('#recordCircleIcon').removeClass('text-muted');
      $('#recordCircleIcon').addClass('text-danger');
      $('#recordCircleIcon').addClass('RecordBlink');
    }

  if(!recordingData && $('#statusText').html() != 'Not recording'){
      $('#statusText').html('Not recording');
      $('#recordCircleIcon').removeClass('text-danger');
      $('#recordCircleIcon').addClass('text-muted');
      $('#recordCircleIcon').removeClass('RecordBlink');
    }


}

function setRecordTime(timenow,timeinit) {
    let duration = Math.floor((timenow - timeinit) / 1000);
    let hour = Math.floor(duration /3600);
    let minute = Math.floor((duration - hour*3600)/60);
    let seconds = duration - (hour*3600 + minute*60);
    if(hour < 10)
      hour = "0"+hour;
    if(minute < 10)
      minute = "0"+minute;
    if(seconds < 10)
      seconds = "0"+seconds;
    $("#recordSeconds").html(seconds);
    $("#recordMinutes").html(minute);
    $("#recordHours").html(hour);
}

//function to store incoming data into local json array
function localDataStreamArray(time){
  let array = {};
  array[time] = {};
  for (let type of GlobablDataTypes) {
    if(typeof window[type] !== 'undefined'){
      array[time][type] = window[type];
    }
  }
  dataLoggerArray.push(array);

}

function writeWebWorker(){
  var dataWorker = new Worker("./js/composedata.js");
  dataWorker.onmessage = receivedCompiledData;
  dataWorker.postMessage({
    MessageType: 'compileData',
    dataset: dataLoggerArray.toArray(),
    interval: Number($("#datalogInterval").val()),
    lastWrite: lastloggedDate,
    currentWrite: nextLogtime,
    comments: commentArray,
  });
}
function saveData() {

    let interval = $("#datalogInterval").val();

    //default to every 5 seconds for writing to a file
    if(!interval || interval < 1000){ interval = 5000;}

    //if highspeed data acquisition (>1000 Hz) is desired, then we write to file less frequently to attempt to miss data points
    if(interval < 1000){interval = 5000;}

    let tnow = Math.floor(performance.now());
    let timeMs = Date.now();
    if(timeMs > nextLogtime){

        //is this the first new recording to a file?
        if(nextLogtime == 0){
          nextLogtime = timeMs;
        }
        writeWebWorker();
        lastloggedDate = nextLogtime;
        nextLogtime = nextLogtime + Number(interval);
      }
}

function receivedCompiledData(event){
  writeData(event.data);
}

async function writeData(string){
  const writableStream = await fileHandle.createWritable({ keepExistingData: true });
  const size = (await fileHandle.getFile()).size;
  await writableStream.write({
    type: "write",
    data: string,
    position: size,
  });
  await writableStream.close();
}

//Modal functions
function serialChannel_SettingsModal(ch){
    $('#serialChannel-SettingsLabel').html("Serial Channel: "+ch);
    $('#serialChannel-id').val(ch);
    $('#serialChannelsetting-submit-error').html('');

    //Reset the form or loads current channel config
    var inputs = $('#serialChannel-Settings-form').serializeArray().reduce(function(obj, item) {
                  obj[item.name] = item.value;
                  return obj;
              }, {});
    for (var key in inputs){
      if(key === 'serialChannel-id'){
        continue;
      }
      $('#'+key).val('');
      if(key == 'low-pc-input' || key == 'low-pc-input-equivalent'){
        $('#'+key).prop('value', 1);
        continue;
      }
      if(key == 'high-pc-input' || key == 'high-pc-input-equivalent'){
        $('#'+key).prop('value', 5);
        continue;
      }
      if(GlobalConfigArray['serialChannel'][ch][key] !== 'undefined'){
        $('#'+key).val(GlobalConfigArray['serialChannel'][ch][key]);
      }
    }
    var Modal = new bootstrap.Modal(document.getElementById('serialChannel_Settings'));
    Modal.show();
}

function userChannel_SettingsModal(ch){
    if(!ch){
      $('#userChannel-SettingsLabel').html("New Channel");
      if (!GlobalConfigArray['userChannel']){
        $('#userChannel-id').val('0');
      }else{
        let count = GlobalConfigArray['userChannel'].length;
        $('#userChannel-id').val(count);
      }
    }
    var Modal = new bootstrap.Modal(document.getElementById('userChannel_Settings'));
    Modal.show();
}

function saveConfigModalshow(){
  $('#saveConfig-Name-input').val("");
  $('#saveConfigModal-submit-btn').html('Save Config');
  var Modal = new bootstrap.Modal(document.getElementById('saveConfigModal'));
  Modal.show();
}

function downloadConfigModalshow(){
  $('#downloadConfig-Name-input').val("");
  var Modal = new bootstrap.Modal(document.getElementById('downloadConfigModal'));
  Modal.show();
}

function uploadConfigModalshow(){
  $('#uploadConfig-file').val("");
  $('#uploadConfigModal-submit-btn').html('Save Config');
  var Modal = new bootstrap.Modal(document.getElementById('uploadConfigModal'));
  Modal.show();
}

function deleteConfigModalshow(){
  $("#deleteConfiglist").html('');
  $("#configSelect option").each(function()
      {
        let val = $(this).val();
        let name = $(this).text();
        if(val.includes('SettingsConfig')){
          let div = '<div class="form-check m-2"><input class="form-check-input delete-config-checkbox" type="checkbox" value="'+val+'" id="'+val+'"><label class="form-check-label fw-bold" for="'+val+'">'+name+'</label></div>';
          $("#deleteConfiglist").append(div);
        }
      });

  var Modal = new bootstrap.Modal(document.getElementById('deleteConfigModal'));
  Modal.show();
}


function drawGraph(i,origin,divcreate){
      var graphcanvasid = 'canvas-'+origin+'-'+i;
      var graphdiv = 'channelParentdiv-'+origin+'-'+i;
      var linecolor = GlobalConfigArray[origin][i]['chartConfig']['lineColor'];
      var chartDuration = GlobalConfigArray[origin][i]['chartConfig']['duration'];
      var chartDurSeconds = chartDuration/1000;
      var chartObject = origin+'-Chartjs-' + i;
      if(divcreate){
        var charthtml = '<div class="card mb-2 draggable-graph-div" id="'+graphdiv+'"><div class="card-body"><div class="row w-100"><div class="h6 card-title d-flex"><div class="col-md-6"><a data-bs-toggle="collapse" href="#'+origin+'-collapse-'+i+',#'+origin+'-'+i+'-chartSettingsdiv" class="link-secondary collapse-icon" role="button"><i class="far fa-minus-square"></i></a> <i class="fas fa-arrows-alt draggable-icon"></i> <a class="link-secondary" role="button" onclick="'+origin+'_SettingsModal('+i+');"><i class="fas fa-cog"></i></a> '+origin+' '+i+'; <span id="'+origin+'-'+i+'-title" class="text-danger '+origin+'-'+i+'-title"></span> <i>Value: <span id="'+origin+'-'+i+'-value" class="'+origin+'-'+i+'-value"></span> <span id="'+origin+'-'+i+'-unit" class="'+origin+'-'+i+'-unit"></span></i></div><div class="col-md-6 d-flex flex-md-row-reverse"><div class="float-right collapse show" id="'+origin+'-'+i+'-chartSettingsdiv"> Duration: <span id="chartDurationlabel-'+origin+'-'+i+'">'+chartDurSeconds+'s</span> <i class="far fa-plus-square" data-origin="'+origin+'" data-id="'+i+'" onclick="chartDurationChange(this,\''+chartObject+'\',true)"></i> <i class="far fa-minus-square" data-origin="'+origin+'" data-id="'+i+'" onclick="chartDurationChange(this,\''+chartObject+'\',false)"></i> <label id="lineColor-'+origin+'-'+i+'-label" class="fas fa-eye-dropper" style="color: '+linecolor+';"><input type="color" class="inputColor" id="lineColor-'+origin+'-'+i+'" value="'+linecolor+'" data-origin="'+origin+'" data-id="'+i+'" oninput="chartLineColorChange(this,\''+chartObject+'\');"/></label> </div></div></div></div><div class="row w-100 collapse show" id="'+origin+'-collapse-'+i+'"><canvas id="'+graphcanvasid+'" style="max-height:100px"></canvas></div></div></div>';
        $("#DAQ-charts").append(charthtml);
        }


      //Chartjs create config
      const data = {
          datasets: [
            {
              label: origin+' '+i,
              data: [],
              borderColor: linecolor,
            }
          ]
        };
      const config = {
          type: 'line',
          data: data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: false,
            },
            elements: {
                point:{
                    radius: 0
                }
            },
            scales: {
              x: {
                type: 'realtime',
                realtime: {
                  duration: 10000,
                  refresh: 50,
                  frameRate: 15,
                  delay: 10,
                  onRefresh: chart => {
                      const now = Date.now();
                      let value = 0;
                      if(serialConnect == true){
                        if(window[origin][i]){
                          value = window[origin][i];
                        }
                        if(GlobalConfigArray[origin] && typeof GlobalConfigArray[origin][i] !== 'undefined'){
                          if(GlobalConfigArray[origin][i]['transform'] === 'on'){
                            value = window.transformSerial[i];
                          }
                        }
                      }

                      chart.data.datasets[0].data.push({
                        x : now,
                        y : value
                      });
                    }
                },
              },
              y: {
                title: {
                  display: false,
                }
              }
            },
            interaction: {
              intersect: false
            }
          }
        };
      var ctx = document.getElementById(graphcanvasid).getContext('2d');
      window[chartObject] = new Chart(ctx, config);
      if(divcreate){
      $('#DAQ-charts').sortable('refresh');
      }
}



/*
*
*
* Config Commands
*
*
*/

async function getConfigs(){
  let currentSelect = $("#configSelect").val();
  await idbKeyval.keys().then((keys) => {
    if(keys.length > 0){
      $("#configSelect").html('');
      $('#DeleteConfig-btn').prop('disabled', false);
    }else{
      $("#configSelect").html('<option>No stored configs</option>');$('#DeleteConfig-btn').prop('disabled', true);
    }
    for (var i=0 , j = keys.length ; i < j ;i++){
      let item = keys[i];
      let def = item.split('_');
      if(def[0] == 'SettingsConfig'){
        let name = def[1];
        $("#configSelect").append($('<option></option>').val(keys[i]).html(name));
      }
    }
    $('#configSelect').val(currentSelect);
  });
}

async function loadConfig(name){
  if(!name){
    return;
  }else{
      await idbKeyval.get(name).then((val) => {
        clearCurrentConfig();
        GlobalConfigArray = val;
        initGraphs();
      });
      await idbKeyval.set("lastconfigLoad", name);
      getConfigs();
      initConfigComplete = true;
    }
}

function downloadConfig(fileName) {
    var content = JSON.stringify(Object.assign({}, GlobalConfigArray));
    console.log(content, GlobalConfigArray);
    var a = document.createElement("a");
    var file = new Blob([content], {type: 'text/plain'});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

async function uploadConfig(name,set) {
          // DO Somthing
          let file = document.getElementById('uploadConfig-file').files[0];
          if (file) {
              var reader = new FileReader();
              reader.readAsText(file, "UTF-8");
              reader.onload = function (evt) {
                var filecontent = JSON.parse(evt.target.result);
                if(typeof filecontent === 'object' && filecontent !== null){
                  let configname = 'SettingsConfig_'+name;
                  updateDBkey(configname,filecontent);
                  getConfigs();
                  if(set){
                    setTimeout(function(){
                      clearCurrentConfig();
                      GlobalConfigArray = filecontent;
                      initGraphs();
                      $('#configSelect').val(configname);
                    },1000);
                  }
                  $('#uploadConfigModal-submit-btn').html('<i class="far fa-check-circle"></i> Complete!');
                  var modalToggle = document.getElementById('uploadConfigModal');
                  const modal = bootstrap.Modal.getInstance(modalToggle);
                  modal.hide();
                }
              }
              reader.onerror = function (evt) {
                  $("#uploadConfigModal-submit-error").html("Error reading file");
              }
          }
    getConfigs();
}

function initGraphs(){
  if(typeof GlobalConfigArray['channelOrder'] !== 'undefined' ){
    for (let channel of GlobalConfigArray['channelOrder']) {
          var items = channel.split('-');
          drawGraph(items[2],items[1],true);
      }
    }else{
      for(var i in GlobalConfigArray['serialChannel']){
        drawGraph(i,'serialChannel',true);
      }
    }
    for (var i=1 ; i < 5 ; i++){
        let divID = 'LargeDataCard_'+i;
        if(GlobalConfigArray[divID]){
          let item = GlobalConfigArray[divID].split('-');
          let chType = item[0];
          let chNum = item[1];
          $('#'+divID).html('<i class="far fa-times-circle clearDAQCardIcon" onclick="clearLargeDAQcard(\''+divID+'\');"></i><h3 class="card-title text-danger mb-1"><span class="'+chType+'-'+chNum+'-value">0</span> <span class="'+chType+'-'+chNum+'-unit"></span></h3><h5 class="lead mb-1 '+chType+'-'+chNum+'-title"></h5><div class="mb-1 text-muted small">'+chType+' '+chNum+'</div>');
          $('.DAQ-large-card').sortable('refresh');
        }
      }
      var channelorderinit = $('#DAQ-charts').sortable('toArray');
      GlobalConfigArray['channelOrder'] = channelorderinit;
      initDrawGraphs = true;
}

function clearLargeDAQcard(div){
  $('#'+div).html('<div class="card-title text-muted"><i class="far fa-hand-point-up"></i> <br> Drag Channel</div>');
  delete GlobalConfigArray[div];
  console.log(GlobalConfigArray);
}

function clearCurrentConfig(){
  if(typeof GlobalConfigArray['channelOrder'] !== 'undefined' ){
    for (let channel of GlobalConfigArray['channelOrder']) {
          var items = channel.split('-');
          var chartObject = items[1]+'-Chartjs-' + items[2];
          window[chartObject].destroy();
      }
      for (var i=1 ; i < 5 ; i++){
        let divid = '#LargeDataCard_'+i;
        $(divid).html('<div class="card-title text-muted"><i class="far fa-hand-point-up"></i> <br> Drag Channel</div>');
      }
      $('#DAQ-charts').html("");
    }
    GlobalConfigArray = {};
}

function deleteConfig(config){


}

async function updateDBkey(key,data){
  await idbKeyval.set(key, data);
}

function TransformData(array,type,rawvalue){
  if(type == 'serialChannel'){
    var xvalues = [];
    var yvalues = [];
    xvalues.push(parseFloat(array['low-pc-input']));
    yvalues.push(parseFloat(array['low-pc-input-equivalent']));
    xvalues.push(parseFloat(array['high-pc-input']));
    yvalues.push(parseFloat(array['high-pc-input-equivalent']));
    var regressiontype = array.transformtype;
        switch (regressiontype){
          case "linear":
          default:
              var result = linearRegression(yvalues,xvalues);
              var value = result['slope'] * rawvalue + result['intercept'];
      }
  }else if(type == 'userChannel'){
    let eq = array['userChannel-equation'];
    var eqEval = EquationEval.parse(eq);
    var eqVariables = eqEval.variables();
    var variables = [];
    for (let item of eqVariables){
      let desc = item.split('_');
      let channelType = desc[0];
      let channelNumber = desc[1];
      let varValue = window[channelType][channelNumber];
      variables[item] = varValue;
    }
    value = eqEval.evaluate(variables);
  }

  value = Math.round((value + Number.EPSILON) * 100) / 100;
  return value;
}

$(document).on('click', '.collapse-icon', function () {
  $(this).find('i').toggleClass('fa-plus-square fa-minus-square');
});

//functions for changing chart options:
function chartLineColorChange(el,chart){
  let color = el.value;
  let label = el.id+"-label";
  window[chart].data.datasets[0].borderColor = color;
  document.getElementById(label).style.setProperty('color', color);
  window[chart].update();
  GlobalConfigArray[el.dataset.origin][el.dataset.id]['chartConfig']['lineColor'] = color;
}

function chartDurationChange(el,chart,dir){
  if(dir){
    var newValue = GlobalConfigArray[el.dataset.origin][el.dataset.id]['chartConfig']['duration'] + 1000;
  }else{
    var newValue = GlobalConfigArray[el.dataset.origin][el.dataset.id]['chartConfig']['duration'] - 1000;
  }
  window[chart].options.scales.x.realtime.duration = newValue;
  window[chart].update('none');
  GlobalConfigArray[el.dataset.origin][el.dataset.id]['chartConfig']['duration'] = newValue;
  $('#chartDurationlabel-'+el.dataset.origin+'-'+el.dataset.id).html(newValue/1000 +'s');
}

function changeInnerHTMLbyClass(classid,value){
  element = document.getElementsByClassName( classid );

  for (i = 0; i < element.length; i++) {
    if(element[i].innerText != value){
      element[i].innerText = value;
    }
  }
}

//Regression Functions
function linearRegression(y,x){
    var lr = {};
    var n = y.length;
    var sum_x = 0;
    var sum_y = 0;
    var sum_xy = 0;
    var sum_xx = 0;
    var sum_yy = 0;

    for (var i = 0; i < y.length; i++) {

        sum_x += x[i];
        sum_y += y[i];
        sum_xy += (x[i]*y[i]);
        sum_xx += (x[i]*x[i]);
        sum_yy += (y[i]*y[i]);
    }

    lr['slope'] = (n * sum_xy - sum_x * sum_y) / (n*sum_xx - sum_x * sum_x);
    lr['intercept'] = (sum_y - lr.slope * sum_x)/n;
    lr['r2'] = Math.pow((n*sum_xy - sum_x*sum_y)/Math.sqrt((n*sum_xx-sum_x*sum_x)*(n*sum_yy-sum_y*sum_y)),2);
    return lr;
}

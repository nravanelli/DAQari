var EquationEval = new exprEval.Parser();
let fileHandle;
let recordingData = false;
let lastloggedDate = 0;
let startRecordData = 0;
var GlobalConfigArray = {};
let serialConnect = false;
let initDrawGraphs = false;
let lastComment = '';
let ignoreFirst = false;

$(document).ready(function() {
    getConfigs();
    //get last used config from localdb
    $.when(loadConfig(null)).then(function(){initGraphs()});

    $('#serialChannelSettings-submit-btn').click(async () => {
          var data = $('#serialChannel-Settings-form').serializeArray().reduce(function(obj, item) {
                        obj[item.name] = item.value;
                        return obj;
                    }, {});
          for (var key in data){
            if(!data[key]){
              $('#'+key).addClass('error-input');
              $('#serialChannelsetting-submit-error').html('Error: missing data required.');
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
          //console.log(GlobalConfigArray);
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
      let key = 'SettingsConfig_'+name;
      updateDBkey(key,GlobalConfigArray);
      $('#saveConfigModal-submit-btn').html('<i class="far fa-check-circle"></i> Saved!');
      var modalToggle = document.getElementById('saveConfigModal');
      const modal = bootstrap.Modal.getInstance(modalToggle);
      modal.hide();
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


    $('#ClearConfig-btn').click(async () => {
      //destroy tables, clear all chart objects
      await idbKeyval.clear();
      location.reload();
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
          $('#'+divID).html('<h3 class="card-title text-danger mb-1"><span class="'+chType+'-'+chNum+'-value">0</span> <span class="'+chType+'-'+chNum+'-unit"></span></h3><h5 class="lead mb-1 '+chType+'-'+chNum+'-title"></h5><div class="mb-1 text-muted small">'+chType+' '+chNum+'</div>');
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

    $('#LoadConfig-btn').click(async () => {
      //Load saved config
      key = $('#configSelect').val();
      await idbKeyval.get(key).then((val) => GlobalConfigArray = val);
    });


    //The SERIAL CONNECT FUNCTION(S)
    $('#serialConnect-btn').click(function(){
      let baudRate = $('#BaudrateSelect').val();

      const conn = SimpleSerial.connect({
          baudRate: baudRate,
          requestAccessonPageLoad: false,
        });


      conn.on("data", function(data) {

        //we need a delay since serial connections restart Arduinos
        if(!ignoreFirst){
          setTimeout(function() {
              ignoreFirst = true;
               dataStream(data);
             }, 3000);
        }else{
          dataStream(data);
        }


      });

    });

    $('#submitComment-btn').click(function(){
      $('#fileComment-input').data("comment", $('#fileComment-input').val());
    });

    $("#LogdataSwitch").change(function(){
        if ($(this).is(':checked')){
          recordingData = true;
        }else{
          recordingData = false;
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

//this is the main function to handle Data from Serial
function dataStream(data){
  if(!ignoreFirst){
    return;
  }
  window.serialChannel = data;

  for (var i in data) {
    var value = Math.round((data[i] + Number.EPSILON) * 100) / 100;

    //lets check if there are specific settings on this channel:
    if(typeof GlobalConfigArray['serialChannel'] === 'undefined'){
      GlobalConfigArray['serialChannel'] = [[]];
    };
    if(typeof GlobalConfigArray['serialChannel'][i] === 'undefined' || GlobalConfigArray['serialChannel'][i].length == 0){
      //lets create default array since this is a new config:
      GlobalConfigArray['serialChannel'][i] =
      { chartConfig:
        {
            lineColor : "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);}),
            refreshRate : 100,
            duration: 10000,
            delay: 100,
        }
      }

    }
      if(GlobalConfigArray['serialChannel'][i]['transform'] === 'on'){
         value = TransformData(GlobalConfigArray['serialChannel'][i],'serialChannel',value);
         if(typeof window.transformserial == 'undefined' || !(window.transformserial instanceof Array)){
           window.transformserial = new Array();
         }
         window.transformserial[i] = value;
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

    if(serialConnect == false){
      //console.log(GlobalConfigArray);
      //first connection so lets draw all the graphs
        if(!initDrawGraphs){
          if(typeof GlobalConfigArray['channelOrder'] !== 'undefined' ){
            for (let channel of GlobalConfigArray['channelOrder']) {
                  var items = channel.split('-');
                  drawGraph(items[2],items[1],true);
              }
          }else{
            for(var i in data){
              drawGraph(i,'serialChannel',true);
            }
        }
        var channelorderinit = $('#DAQ-charts').sortable('toArray');
        GlobalConfigArray['channelOrder'] = channelorderinit;
      }
      serialConnect = true;
      $('#serialConnect-btn').prop("disabled", true);
    }


  //save data if needed
  let timenow = getTimeValue();
  if(startRecordData == 0 && recordingData) { startRecordData = timenow; }
  if(recordingData)(setRecordTime(timenow,startRecordData));
  let interval = $("#datalogInterval").val();
    if(!interval){ interval = 5;}

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

  if((timenow - lastloggedDate) >= interval && recordingData){
              saveData(timenow);
  }
}



function getTimeValue() {
    var Time = Math.floor(Date.now() / 1000)
    return Time;
}

function setRecordTime(timenow,timeinit) {
    let duration = timenow - timeinit;
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


async function saveData(time) {
    lastloggedDate = time;
    //write to datalog file
    // Get the current file size.
      const writableStream = await fileHandle.createWritable({ keepExistingData: true });
      const size = (await fileHandle.getFile()).size;
      var dataset1 = window['serialChannel'];
      if(typeof window.transformserial == 'undefined')
      var dataset2 = window['transform'];
      var dataset3 = window['userChannel'];

      let output = time+',';

      //do not place new comment every time
      let newComment = $('#fileComment-input').data("comment");
      if(newComment){
        output += newComment+',';
        $('#fileComment-input').data("comment", '');
      }else{
        output += ',';
      }

      if(typeof window['serialChannel'] !== 'undefined'){
        let dataset = window['serialChannel'];
        for (var key in dataset) {
            output += dataset[key]+',';
        }
      }

      if(typeof window['transformserial'] !== 'undefined'){
        let dataset = window['transformserial'];
        for (var key in dataset) {
            output += dataset[key]+',';
        }
      }

      if(typeof window['userChannel'] !== 'undefined'){
        let dataset = window['userChannel'];
        for (var key in dataset) {
            output += dataset[key]+',';
        }
      }
      await writableStream.write({
        type: "write",
        data: output+" \r\n",
        position: size,
      });
      await writableStream.close();

}


//Modal functions
function serialChannel_SettingsModal(ch){
    $('#serialChannel-SettingsLabel').html("Serial Channel: "+ch);
    $('#serialChannel-id').val(ch);
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


function drawGraph(i,origin,divcreate){
      var graphcanvasid = 'canvas-'+origin+'-'+i;
      var graphdiv = 'channelParentdiv-'+origin+'-'+i;
      var linecolor = GlobalConfigArray[origin][i]['chartConfig']['lineColor'];
      var chartObject = origin+'-Chartjs-' + i;
      if(divcreate){
        var charthtml = '<div class="card mb-2 draggable-graph-div" id="'+graphdiv+'"><div class="card-body"><div class="row w-100"><div class="h6 card-title d-flex"><div class="col-md-6"><a data-bs-toggle="collapse" href="#'+origin+'-collapse-'+i+',#'+origin+'-'+i+'-chartSettingsdiv" class="link-secondary collapse-icon" role="button"><i class="far fa-minus-square"></i></a> <i class="fas fa-arrows-alt draggable-icon"></i> <a class="link-secondary" role="button" onclick="'+origin+'_SettingsModal('+i+');"><i class="fas fa-cog"></i></a> '+origin+' '+i+'; <span id="'+origin+'-'+i+'-title" class="text-danger '+origin+'-'+i+'-title"></span> <i>Value: <span id="'+origin+'-'+i+'-value" class="'+origin+'-'+i+'-value"></span> <span id="'+origin+'-'+i+'-unit" class="'+origin+'-'+i+'-unit"></span></i></div><div class="col-md-6 d-flex flex-md-row-reverse"><div class="float-right collapse show" id="'+origin+'-'+i+'-chartSettingsdiv">Chart Options: <label id="lineColor-'+origin+'-'+i+'-label" class="fas fa-eye-dropper" style="color: '+linecolor+';"><input type="color" class="inputColor" id="lineColor-'+origin+'-'+i+'" value="'+linecolor+'" data-origin="'+origin+'" data-id="'+i+'" oninput="chartLineColorChange(this,\''+chartObject+'\');"/></label></div></div></div></div><div class="row w-100 collapse show" id="'+origin+'-collapse-'+i+'"><canvas id="'+graphcanvasid+'" style="max-height:100px"></canvas></div></div></div>';
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
                  refresh: 100,
                  frameRate: 30,

                  onRefresh: chart => {
                      const now = Date.now();
                      let value = 0;
                      if(serialConnect == true){
                        if(window[origin][i]){
                          value = window[origin][i];
                        }
                        if(GlobalConfigArray[origin] && typeof GlobalConfigArray[origin][i] !== 'undefined'){
                          if(GlobalConfigArray[origin][i]['transform'] === 'on'){
                            value = window.transformserial[i];
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
  $("#configSelect").html('<option selected disabled>Select config...</option>');
  await idbKeyval.keys().then((keys) => {
    for (var i=0 , j = keys.length ; i < j ;i++){
      let item = keys[i];
      let def = item.split('_');
      if(def[0] == 'SettingsConfig'){
        let name = def[1];
        $("#configSelect").append($('<option></option>').val(keys[i]).html(name));
      }
    }
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
                  if(set){
                    clearCurrentConfig();
                    GlobalConfigArray = filecontent;
                    initGraphs();
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
      for (var i=1 ; i < 5 ; i++){
        let divID = 'LargeDataCard_'+i;
        if(GlobalConfigArray[divID]){
          let item = GlobalConfigArray[divID].split('-');
          let chType = item[0];
          let chNum = item[1];
          $('#'+divID).html('<h3 class="card-title text-danger mb-1"><span class="'+chType+'-'+chNum+'-value">0</span> <span class="'+chType+'-'+chNum+'-unit"></span></h3><h5 class="lead mb-1 '+chType+'-'+chNum+'-title"></h5><div class="mb-1 text-muted small">'+chType+' '+chNum+'</div>');
          $('.DAQ-large-card').sortable('refresh');
        }
      }
      initDrawGraphs = true;
    }
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

function deleteCurrentConfig(){

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

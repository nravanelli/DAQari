// Global variables & classes

var EquationEval = new exprEval.Parser();
let fileHandle;
let recordingData = false;
let lastloggedDate = 0;
let ChannelconfigArray = [];
let serialConnect = false;
let initDrawGraphs = false;

$(document).ready(function() {
    //get last used config from localdb
    $.when(UpdateConfig()).then(function(){initGraphs()});

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
          var localdbkey = 'serialChannel_'+data['serialChannel-id'];
          delete data['serialChannel-id'];
          await idbKeyval.set(localdbkey, data);
          UpdateConfig();
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
          var localdbkey = 'userChannel_'+data['userChannel-id'];
          let id = data['userChannel-id'];
          delete data['userChannel-id'];
          await idbKeyval.set(localdbkey, data);
          drawGraph(id,'userChannel',true);
          var channelOrder = $('#DAQ-charts').sortable('toArray');
          updateDBkey('channelOrder',channelOrder);
          UpdateConfig();

    });

    $('#ClearConfig-btn').click(async () => {
      //destroy tables, clear all chart objects
      await idbKeyval.clear();
      location.reload();
    });

    $('#DAQ-charts').sortable({
      items: ".draggable-graph-div",
      handle: ".draggable-icon",
      update: function (event, ui) {
          var data = $(this).sortable('toArray');
          updateDBkey('channelOrder',data);
        },
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


    $('#serialConnect-btn').click(function(){

      const conn = SimpleSerial.connect({
          baudRate: 57600,
          requestAccessonPageLoad: false,
        });


      conn.on("data", function(data) {
        if(serialConnect == false){

          //first connection so lets draw all the graphs
            if(!initDrawGraphs){
              if(typeof ChannelconfigArray['channelOrder'] !== 'undefined' ){
                for (let channel of ChannelconfigArray['channelOrder']) {
                      var items = channel.split('-');
                      drawGraph(items[2],items[1],true);
                  }
              }else{
                for(var i in data){
                  drawGraph(i,'serialChannel',true);
                }
            }

          }
          serialConnect = true;
        }
        window.serialChannel = data;


        for (var i in data) {
          var value = data[i];

          //lets check if there are specific settings on this channel:
          if(ChannelconfigArray['serialChannel'] && typeof ChannelconfigArray['serialChannel'][i] !== 'undefined'){
             if(ChannelconfigArray['serialChannel'][i]['transform'] === 'on'){
               value = TransformData(ChannelconfigArray['serialChannel'][i],'serialChannel',value);
               if(typeof window.transformserial == 'undefined' || !(window.transformserial instanceof Array)){
                 window.transformserial = new Array();
               }
               window.transformserial[i] = value;
             }
             //change title if set
             var channelName = ChannelconfigArray['serialChannel'][i]['serialChannel-Name'];
             var currentChannelName = $('#serialChannel-'+i+'-title').text();
             if(channelName !== currentChannelName){
               $('#serialChannel-'+i+'-title').text(channelName);
             }
             //change units if Set
             var channelUnit = ChannelconfigArray['serialChannel'][i]['serialChannel-Unit'];
             var currentChannelUnit = $('#serialChannel-'+i+'-unit').text();
             if(channelName !== currentChannelName){
               $('#serialChannel-'+i+'-unit').text(channelUnit);
             }
          }
          if(document.getElementById('serialChannel-value-'+i)){
            document.getElementById('serialChannel-value-'+i).innerHTML = value;
          }

        };

        //lets iterate through userChannels and update graphs/values
        if(ChannelconfigArray['userChannel']){
          if(typeof window.userChannel == 'undefined' || !(window.userChannel instanceof Array)){
            window.userChannel = new Array();
          }
          var userChannels = ChannelconfigArray['userChannel']
          for (var chNum in userChannels) {
              window.userChannel[chNum] =  TransformData(userChannels[chNum],'userChannel',null);
              //change title if set
              var channelName = ChannelconfigArray['userChannel'][chNum]['userChannel-Name'];
              var currentChannelName = $('#userChannel-'+chNum+'-title').text();
              if(channelName !== currentChannelName){
                $('#userChannel-'+chNum+'-title').text(channelName);
              }
              //change units if Set
              var channelUnit = ChannelconfigArray['userChannel'][chNum]['userChannel-Unit'];
              var currentChannelUnit = $('#userChannel-'+chNum+'-unit').text();
              if(channelName !== currentChannelName){
                $('#userChannel-'+chNum+'-unit').text(channelUnit);
              }

              if(document.getElementById('userChannel-value-'+chNum)){
                document.getElementById('userChannel-value-'+chNum).innerHTML = window.userChannel[chNum];;
              }
            }
          }


        //save data if needed
        let timenow = getTimeValue();
        let interval = $("#datalogInterval").val();
          if(!interval){ interval = 5;}
        if((timenow - lastloggedDate) >= interval && recordingData){
                    saveData(timenow);
        }
      })

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

});




function getTimeValue() {
    var Time = Math.floor(Date.now() / 1000)
    return Time;
}

async function saveData(time) {
    lastloggedDate = time;
    //write to datalog file
    // Get the current file size.
      const writableStream = await fileHandle.createWritable({ keepExistingData: true });
      const size = (await fileHandle.getFile()).size;
      var dataset = window['serialChannel'];

      let output = time+',';
      for (var key in dataset) {
          output += dataset[key]+',';
      }

      await writableStream.write({
        type: "write",
        data: output+" \r\n",
        position: size,
      });
      await writableStream.close();

}


function serialChannel_SettingsModal(ch){
    $('#serialChannel-SettingsLabel').html("Serial Channel: "+ch);
    $('#serialChannel-id').val(ch);
    var Modal = new bootstrap.Modal(document.getElementById('serialChannel_Settings'));
    Modal.show();
}

function userChannel_SettingsModal(ch){
    if(!ch){
      $('#userChannel-SettingsLabel').html("New Channel");
      if (!ChannelconfigArray['userChannel']){
        $('#userChannel-id').val('0');
      }else{
        let count = ChannelconfigArray['userChannel'].length;
        $('#userChannel-id').val(count);
      }
    }
    var Modal = new bootstrap.Modal(document.getElementById('userChannel_Settings'));
    Modal.show();
}


function drawGraph(i,origin,divcreate){

      var graphcanvasid = 'canvas-'+origin+'-'+i;
      var graphdiv = 'channelParentdiv-'+origin+'-'+i;
      var linecolor = "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);});
      var chartObject = origin+'-Chartjs-' + i;
      if(divcreate){
        var charthtml = '<div class="card mb-2 draggable-graph-div" id="'+graphdiv+'"><div class="card-body"><div class="row w-100"><div class="h6 card-title d-flex"><div class="col-md-6"><a data-bs-toggle="collapse" href="#'+origin+'-collapse-'+i+',#'+origin+'-'+i+'-chartSettingsdiv" class="link-secondary collapse-icon" role="button"><i class="far fa-minus-square"></i></a> <i class="fas fa-arrows-alt draggable-icon"></i> <a class="link-secondary" role="button" onclick="'+origin+'_SettingsModal('+i+');"><i class="fas fa-cog"></i></a> '+origin+' '+i+'; <span id="'+origin+'-'+i+'-title" class="text-danger"></span> <i>Value: <span id="'+origin+'-value-'+i+'"></span> <span id="'+origin+'-'+i+'-unit"></span></i></div><div class="col-md-6 d-flex flex-md-row-reverse"><div class="float-right collapse show" id="'+origin+'-'+i+'-chartSettingsdiv">Chart Options: <label id="lineColor-'+origin+'-'+i+'-label" class="fas fa-eye-dropper" style="color: '+linecolor+';"><input type="color" class="inputColor" id="lineColor-'+origin+'-'+i+'" value="'+linecolor+'" oninput="chartLineColorChange(this,\''+chartObject+'\');"/></label></div></div></div></div><div class="row w-100 collapse show" id="'+origin+'-collapse-'+i+'"><canvas id="'+graphcanvasid+'" style="max-height:100px"></canvas></div></div></div>';
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
                  delay: 100,
                  frameRate: 30,

                  onRefresh: chart => {
                      const now = Date.now();
                      let value = 0;
                      if(serialConnect == true){
                        value = window[origin][i];
                        if(ChannelconfigArray[origin] && typeof ChannelconfigArray[origin][i] !== 'undefined'){
                          if(ChannelconfigArray[origin][i]['transform'] === 'on'){
                            value = window.transformserial[i];
                          }
                        }
                      }

                      chart.data.datasets[0].data.push({
                        x : now,
                        y : value
                      });
                    }
                }
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

async function UpdateConfig(){
    ChannelconfigArray_new = [];
    await idbKeyval.entries().then((entries) => {
      for (var i=0 , j = entries.length ; i < j ;i++){
        let item = entries[i][0];
        let def = item.split('_');
        if(def[0] == 'serialChannel'){
            let channel = def[1];
            if (!ChannelconfigArray_new['serialChannel']) ChannelconfigArray_new['serialChannel'] = [];
            ChannelconfigArray_new['serialChannel'][channel] = entries[i][1];
        }
        if(def[0] == 'userChannel'){
            let channel = def[1];
            if (!ChannelconfigArray_new['userChannel']) ChannelconfigArray_new['userChannel'] = [];
            ChannelconfigArray_new['userChannel'][channel] = entries[i][1];
        }
        if(def[0] == 'channelOrder'){
          if (!ChannelconfigArray_new['channelOrder']) ChannelconfigArray_new['channelOrder'] = [];
          ChannelconfigArray_new['channelOrder'] = entries[i][1];
        }
      }
    }
    );
    ChannelconfigArray = ChannelconfigArray_new;
}

function initGraphs(){
  if(typeof ChannelconfigArray['channelOrder'] !== 'undefined' ){
    for (let channel of ChannelconfigArray['channelOrder']) {
          var items = channel.split('-');
          console.log(items);
          drawGraph(items[2],items[1],true);
      }
      initDrawGraphs = true;
    }
}

async function updateDBkey(key,data){
  await idbKeyval.set(key, data);
}

function TransformData(array,type,rawvalue){
  if(type == 'serialChannel'){
    var xvalues = [];
    var yvalues = [];
    xvalues.push(array['low-pc-input']);
    yvalues.push(array['low-pc-input-equivalent']);
    xvalues.push(array['high-pc-input']);
    yvalues.push(array['high-pc-input-equivalent']);
    var regressiontype = array.transformtype;
        switch (regressiontype){
          case "linear":
          default:
              var result = linearRegression(yvalues,xvalues);
              var value = result['slope'] * rawvalue + result['intercept'];
              return value;
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
    return value;
  }

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

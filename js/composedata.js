/*
WebWorker to handle data log agregation
*/

var GlobablDataTypes = ["serialChannel", "transformSerial", "userChannel"];

onmessage = function(event) {
  var dataStreamSnapshot = event.data.dataset;
  var loginterval = event.data.interval;
  var lastwritetime = event.data.lastWrite;
  var currentwritetime = event.data.currentWrite;
  var comments = event.data.comments;

  var result = compileData(dataStreamSnapshot,loginterval,lastwritetime,currentwritetime,comments);

  postMessage(result);
};

function compileData(dataStreamSnapshot,loginterval,lastwritetime,currentwritetime,comments){

  var timestamps = [];
  var lastItem = 0;
  for (var i = 0; i < dataStreamSnapshot.length; i++) {
    let time = Object.keys(dataStreamSnapshot[i]);
    timestamps[time] = i;
    lastItem = time;
  }
  tsKeys = Object.keys(timestamps);

  //first iterval of data to get
  var timestampfetch = lastwritetime + Number(loginterval);

  //if this is first time writing to file
  if(lastwritetime === 0){
    lastwritetime = currentwritetime;
    timestampfetch = currentwritetime;
  }

  var output = '';
  while (timestampfetch == lastwritetime || timestampfetch < lastItem){
    output += timestampfetch+',';
    var key = tsKeys.reduce(function (prev, curr) {
      return Math.abs(curr - timestampfetch) < Math.abs(prev - timestampfetch) ? curr : prev
    });


    let getPlaceholder = timestamps[key];
    let currentDataTS = dataStreamSnapshot[getPlaceholder][key];

    //insert comments here
    let comment = '';

    for(var key in comments ) {
      if(key < timestampfetch){
        comment = comments[key];
      }else{
        continue;
      }
    }
    output += comment+',';

    let columns = 0;
    for (let type of GlobablDataTypes) {
      if(typeof currentDataTS[type] !== 'undefined'){
        let dataset = currentDataTS[type];
        for (var key in dataset) {
            output += dataset[key]+',';
            columns++;
        }
      }
    }
    /*
    //Checks if we need to add the column headers to the file - possible that a channel was added after recording
    if(columns != loggerColumnCount){
      var columnNames = 'time,comment,';
      for (let type of GlobablDataTypes) {
        if(typeof currentDataTS[type] !== 'undefined'){
          let dataset = currentDataTS[type];
          for (var key in dataset) {
            let dataType = type;
            if(type == 'transformSerial'){
              dataType = 'serialChannel';
            }
            let chNamekey = dataType+'-Name';
            if(GlobalConfigArray[dataType][key][chNamekey] !== 'undefined'){
              columnNames += type+'_'+key+'('+GlobalConfigArray[dataType][key][chNamekey] + '),';
            }else{
              columnNames += type+'_'+key+',';
            }
          }
        }
      }
      output = columnNames + ' \r\n' + output;
      loggerColumnCount = columns;
    }
    */
    output += ' \r\n';

    timestampfetch = timestampfetch + Number(loginterval);
  }
  return output;
}

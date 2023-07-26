/*calculate the basic imformation

*/
function Summary ($harm) {

 var hostsList = [];
 var vulnersList = [];
 var $hosts = $harm.find('nodes');


  this.hostNum = function () {
    return $hosts.find('node').length;
  };


  this.vulnerabilitiesNum = function () {
    var vulNum = 0;
    $hosts.find('node').each(function (index) {
      var $host = $(this);
      vulNum += $host.find('vulnerability').length;
    });
    return vulNum;
  };


  this.metricsSummary = function(){
    var i = 1;
    var summaryList = [{index:1, name:"Total number of vulnerabilities:", value: this.vulnerabilitiesNum()}];
    var $summaries = $harm.find('summaries');
    $summaries.find('summary').each(function(index){
      if($(this).attr("name") != "Mean of attack path lengths"
    && $(this).attr("name") !="Mode of attack path lengths"
    && $(this).attr("name") != "Standard Deviation of attack path lengths"
    && $(this).attr("name") !="Shortest attack path length"){
        var summaryItem = {index:++i, name:$(this).attr("name"), value:Number($(this).attr("value")).toFixed(2)};
        summaryList.push(summaryItem);
      }
    });

    if($harm.find('summaries').length == 0){
        summaryList = [{index:1, name:"Total number of vulnerabilities:", value: this.vulnerabilitiesNum()},
          {index:2, name:"Total number of hosts:", value: this.hostNum()},
      ];
    };
    return summaryList;
  };


  this.metricsSummary_p = function(){
    var i = 1;
    var summaryList = [{index:1, name:"Total number of vulnerabilities:",
                        value: (Number(this.vulnerabilitiesNum())*0.8).toFixed(0)}];
    var $summaries = $harm.find('summaries_patched');
    $summaries.find('summary').each(function(index){
      if($(this).attr("name") != "Mean of attack path lengths"
    && $(this).attr("name") !="Mode of attack path lengths"
    && $(this).attr("name") != "Standard Deviation of attack path lengths"
    && $(this).attr("name") !="Shortest attack path length"){
        var summaryItem = {index:++i, name:$(this).attr("name"), value:Number($(this).attr("value")).toFixed(2)};
        summaryList.push(summaryItem);
      };
    });

    if($harm.find('summaries_patched').length == 0){
        summaryList = [];
    };
    return summaryList;
  };

  this.getPsvList = function(){
    var psvList = [];
    var i = 1 ;
    $harm.find('psv_tuple').each(function (index) {
      var $psv_tuple = $(this);
      var psv = {index: i++,
                name: $psv_tuple.find('vulnerability').text(),
                value: parseFloat($psv_tuple.find('value').text()).toFixed(2)};
      psvList.push(psv);
    });
    return psvList;
  };


  this.highVulnerHost = function(rate){
    var j = 0;
    var hostList = [];
    if(this.vulnerabilitiesNum>0){
      $hosts.find('node').each(function (index) {
        var $host = $(this);
        var hostData = {name:$host.attr('name'), vulNum:$host.find('vulnerability').length};
        hostList.push(hostData);

      });
      hostList.sort(function(a,b){
        return parseFloat(b.vulNum) - parseFloat(a.vulNum);
      });

      if(hostList.length<rate){
        rate = hostList.length;
      };


      for(var i =0; i<Math.ceil(rate); i++){
        hostData = {index:1+i, name:hostList[i].name, value:hostList[i].vulNum};
        hostsList.push(hostData);
      };
    };
    return hostsList;
  };


  this.highScoreVulner = function(rate){
    var i = 0;
    var vulnerList = [];
    $hosts.find('vulnerability').each(function(index){
      var $vulner = $(this);
      var poe = $vulner.find('probability');
      if(parseFloat(poe.text())>rate){
        var vulnerData = {name:$vulner.attr('name'), poe:parseFloat(poe.text()).toFixed(2)
                          // impact:$vulner.find('impact'),
                          // risk:$vulner.find('risk'), cost:$vulner.find('cost')
                          };
        vulnerList.push(vulnerData);
      };
    });
    vulnerList.sort(function(a,b){
      return parseFloat(b.poe) - parseFloat(a.poe);
    });

    for(var i =0; i<vulnerList.length; i++){
      vulnerData = {index:1+i, name:vulnerList[i].name, value:vulnerList[i].poe};
      vulnersList.push(vulnerData);
    };
    return vulnersList;
  };

};


function HostSummary($host){

  this.hostStaticSummary = function(){
    var $values = $host.find('host_values');
    var staticList = [{index:1, name:"Total number of vulnerabilities:", value: $host.find('vulnerability').length},
      {index:2, name:"Risk of Host:", value:Number($values.find('risk').text()).toFixed(2)},
      {index:3, name:"Cost of attack:", value:Number($values.find('cost').text()).toFixed(2)},
      {index:4, name:"Probability of attack:", value:Number($values.find('probability').text()).toFixed(2)},
      {index:5, name:"Impact of Host:", value:Number($values.find('impact').text()).toFixed(2)},
      // {index:6, name:"Mean of attack path lengths:", value: 0},
      // {index:7, name:"Mode of attack path lengths:", value:0 },
      // {index:8, name:"Standard Deviation of attack path lengths:", value:0 },
      // {index:9, name:"Shortest attack path length:", value: 0},
      // {index:10, name:"Return on Attack:", value:0 },
      // {index:11, name:"Density:", value:0 },
      ];
    return staticList;
  };


  this.vulnerList = function(){
    var vulnersList = [];
    var vulnerList = [];
    $host.find('vulnerability').each(function(index){
      var $vulner = $(this);
      var poe = $vulner.find('probability');

      var vulnerData = {name:$vulner.attr('name'), poe:Number(poe.text()).toFixed(2)
                        // impact:$vulner.find('impact'),
                        // risk:$vulner.find('risk'), cost:$vulner.find('cost')
                        };
      vulnerList.push(vulnerData);

    });
    vulnerList.sort(function(a,b){
      return parseFloat(b.poe) - parseFloat(a.poe);
    });

    for(var i =0; i<vulnerList.length; i++){
      vulnerData = {index:1+i, name:vulnerList[i].name, value:vulnerList[i].poe};
      vulnersList.push(vulnerData);
    };
    return vulnersList;
  };
};


/*Generate the Table of summary.
*/
function SummaryTable(location, header, summaryData){

  // container for array of tables
  var tableDiv = d3.select(location).append("div").attr("id", "tableDiv1");

  // initial data
  // console.table(summaryData);
  var data;
  var dataFormat = [];
  var dataitem;
  for(var i=0;i<summaryData.length;i++){
    dataitem ={index:1+i, name: summaryData[i].name, value:summaryData[i].vulNum};
    dataFormat.push(dataitem);
  }
  var initialData = [

    { table: header, rows: summaryData },
  ];

    // function in charge of the array of tables
    function update(data) {

      // select all divs in the table div, and then apply new data
      var divs = tableDiv.selectAll("div")
          // after .data() is executed below, divs becomes a d3 update selection
          .data(data,                     // new data
            function(d) { return d.table  // "key" function to disable default by-index evaluation
          })

      // use the exit method of the d3 update selection to remove any deleted table div and contents (which would be absent in the data array just applied)
      divs.exit().remove();

      // use the enter metod of the d3 update selection to add new ("entering") items present in the data array just applied
      var divsEnter = divs.enter().append("div")
          .attr("id", function(d) { return d.table + "Div"; })
          .attr("class", "well")

      // add title in new div(s)
      divsEnter.append("h5").text(function(d) { return d.table; });

      // add table in new div(s)
      var tableEnter = divsEnter.append("table")
          .attr("id", function(d) { return d.table })
          .attr("class", "table table-condensed table-striped table-bordered")

      // append table head in new table(s)
      tableEnter.append("thead")
        .append("tr")
          .selectAll("th")
          .data(["", "Name", "Value"]) // table column headers (here constant, but could be made dynamic)
        .enter().append("th")
          .text(function(d) { return d; })

      // append table body in new table(s)
      tableEnter.append("tbody");

      // select all tr elements in the divs update selection
      var tr = divs.select("table").select("tbody").selectAll("tr")
          // after the .data() is executed below, tr becomes a d3 update selection
          .data(
            function(d) { return d.rows; }, // return inherited data item
            function(d) { return d.index }    // "key" function to disable default by-index evaluation
          );

      // use the exit method of the update selection to remove table rows without associated data
      tr.exit().remove();

      // use the enter method to add table rows corresponding to new data
      tr.enter().append("tr");

      // bind data to table cells
      var td = tr.selectAll("td")
          // after the .data() is executed below, the td becomes a d3 update selection
          .data(function(d) { return d3.values(d); });   // return inherited data item

      // use the enter method to add td elements
      td.enter().append("td")               // add the table cell
          .text(function(d) { return d; })  // add text to the table cell
    }
  data = JSON.parse(JSON.stringify(initialData));
  update(data);
};

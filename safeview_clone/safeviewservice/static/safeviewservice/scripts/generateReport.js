function getPsv($harm){
  var psvList = [];
  var i = 1 ;
  $harm.find('psv_tuple').each(function (index) {
    var $psv_tuple = $(this);
    var psv = {index: i++,
              hostName:$psv_tuple.find('host').text(),
              vulnerName: $psv_tuple.find('vulnerability').text(),
              psvValue: Number($psv_tuple.find('value').text()).toFixed(2)};
    psvList.push(psv);
  });
  return psvList;
};


function getVulnerList($host){
  var vulnerList = [];
  var i =1;
  $host.find('vulnerability').each(function(index){
    var $vulner = $(this);
    var vulnerData = {index: i++,
                      name:$vulner.attr('name'),
                      probability:Number($vulner.find('probability').text()).toFixed(2),
                      impact: Number($vulner.find('impact').text()).toFixed(2),
                      risk: Number($vulner.find('risk').text()).toFixed(2),
                      cost: Number($vulner.find('cost').text()).toFixed(2)};
    vulnerList.push(vulnerData);

  });
  return vulnerList;
};


function getEstimation(vulnerPsvList, summaryList){
  var esList = [{name:'The priority patched vulnerabilities number:', value:vulnerPsvList.length},
                {name:"The total hours of patching the 20% vulnerabilities", value: (vulnerPsvList.length * 20/60).toFixed(2)},
                {name:"The cost of patching the 20% vulnerabilities", value:"$" + ((vulnerPsvList.length * 20)/60 * 50).toFixed(2)},
                {name:"The total hours of patching all vulnerabilities", value: (summaryList[0].value * 20/60).toFixed(2)},
                {name:"The cost of pathing the all vulnerabilities", value: "$" + ((summaryList[0].value * 20)/60 * 50).toFixed(2)},
              ];
  return esList;

};


function createPDF($harm){
  var pdf = new jsPDF();

  pdf.setFontType("bold");
  pdf.setFontSize(35);
  pdf.text(30,100,"Safelite Security Solution");

  pdf.addPage();//3rd page
  pdf.setFontSize(16);

  var columns = [
    {title: "Index", dataKey: "index"},
    {title: "Name", dataKey: "name"},
    {title: "Value", dataKey: "value"},
  ];

  var columnsPsv = [
    {title: "Index", dataKey: "index"},
    {title: "Host Name", dataKey: "hostName"},
    {title: "Vulnerability Name", dataKey: "vulnerName"},
    {title: "PSV value", dataKey: "psvValue"},
  ];

  basic_summary = new Summary($harm);
  var summaryList = basic_summary.metricsSummary();
  var hostList = basic_summary.highVulnerHost(10);
  var highPoeList = basic_summary.highScoreVulner(0.5);

  pdf.text(14, 30, 'Metrics summary');
  pdf.autoTable(columns, summaryList, {startY: 35, theme: 'striped'});

  if(hostList.length > 0 ){
    pdf.text(14, pdf.autoTable.previous.finalY + 20, 'The top 10 most vulnerable host');
    pdf.autoTable(columns, hostList, {startY: pdf.autoTable.previous.finalY + 25, theme: 'striped'});
  }


  var vulnerPsvList = getPsv($harm);
  if(vulnerPsvList.length>0){
    pdf.addPage();
    pdf.text(14, 30, 'Vulnerability Prioritization');
    pdf.autoTable(columnsPsv, vulnerPsvList, {
        startY: 35,
        margin: {horizontal: 7},
        bodyStyles: {valign: 'top'},
        styles: {overflow: 'linebreak'},}
      );
  };

  if(highPoeList.length > 0){
    if(vulnerPsvList.length < 1){
      pdf.addPage();
      pdf.text(14, 30, 'The vulnerabilities with high Probability Of Exploitation');
      pdf.autoTable(columns, highPoeList, {startY: 35, theme: 'striped'});
    }else{
      pdf.text(14, pdf.autoTable.previous.finalY + 20, 'The vulnerabilities with high Probability Of Exploitation');
      pdf.autoTable(columns, highPoeList, {startY: pdf.autoTable.previous.finalY + 25, theme: 'striped'});
    };
  };

  pdf.addPage();
  pdf.text(14, 30, 'The Radar Chart');

  var options = {
                format: 'PNG',
                "background": '#FFF',
            };

  pdf.addHTML($('#radarChart'),5, 31, options, function() {
    var string = pdf.output('datauristring');

    var columns_es=[
      {title: "Name:", dataKey: "name"},
      {title: "Value", dataKey: "value"},
    ];
    var esList = getEstimation(vulnerPsvList, summaryList);
    pdf.text(14, 225, 'The estimation');
    pdf.autoTable(columns_es, esList, {startY: 230, theme: 'striped'});


    pdf.setFontSize(16);
    var i = 1;
    var $hosts = $harm.find('nodes');

    $hosts.find('node').each(function (index) {
      var $host = $(this);
      if($host.attr('name')!='Attacker'){
        pdf.addPage();
        var $values = $host.find('host_values');
        var detailList = [
          {index:1, name:"Host Name:", value:$host.attr('name')},
          {index:2, name:"Host ID:", value: $host.attr('id')},
          {index:3, name:"vulnerabilities number:", value: $host.find('vulnerability').length},
          {index:4, name:"Impact of host", value: Number($values.find('impact').text()).toFixed(2)},
          {index:5, name:"Risk of host:", value: Number($values.find('risk').text()).toFixed(2)},
          {index:6, name:"Cost of attack:", value: Number($values.find('cost').text()).toFixed(2)},
          {index:7, name:"Probability of exploitation:", value: Number($values.find('probability').text()).toFixed(2)},
        ];
        pdf.text(14, 30, 'Host ' + i++ + ':  ' + $host.attr('name'));
        pdf.autoTable(columns, detailList, {startY: 35, theme: 'striped'});

        var columnsVulner = [
          {title: "Index", dataKey: "index"},
          {title: "Name", dataKey: "name"},
          {title: "Probability", dataKey: "probability"},
          {title: "Impact", dataKey: "impact"},
          {title: "Risk", dataKey: "risk"},
          {title: "Cost", dataKey: "cost"},
        ];
        var vulnerList = getVulnerList($host);
        if(vulnerList.length >0){
          pdf.text(14, pdf.autoTable.previous.finalY + 20, 'The vulnerabilities of host');
          pdf.autoTable(columnsVulner, vulnerList,
            {startY: pdf.autoTable.previous.finalY + 25,
              margin: {horizontal: 7},
              bodyStyles: {valign: 'top'},
              styles: {overflow: 'linebreak'},
              columnStyles: {columnStyles: {
            0: {columnWidth: 10},
            1: {columnWidth: 70},
            2: {columnWidth: 40},
            3: {columnWidth: 30},
            4: {columnWidth: 30},
            5: {columnWidth: 30},}}
            });

        };
      };

    });

    pdf.save("Safelite_Security_Solution.pdf");
  });

};

function addHarm($harm, harm_id){
    var harm = {"name": harm_id,};
    var hosts = [];
    var $hosts = $harm.find('nodes');

    $hosts.find('node').each(function (index) {
        var $host = $(this);
        // parse host information
        if($host.attr('name') != 'Attacker'){
          var host = {
            id: $host.attr('id'),
            name: $host.attr('name'),
            type: Element.HOST,
            group: null
        };
        if (host.name.indexOf("error") !== -1) {
        } else if (host.name.indexOf("timeout") !== -1) {
        } else {
            // parse metric values
            var $values = $host.find('host_values');
            host.impact = parseFloat($values.find('impact').text());
            if($host.find('vulnerability').length >= 1){
                host.children = [parse_vulnerability($host.find('vulnerabilities').children().first())];
            };
            hosts.push(host);
        }
      }
    });
    harm.children = hosts;
    return harm;
};

function parse_vulnerability($vulnerability) {
    var vulnerability = {};
    var childList = [];

    if ($vulnerability.is('vulnerability')) {
        vulnerability.type = 'vulnerability';
        vulnerability.id = $vulnerability.attr('id');
        vulnerability.name = $vulnerability.attr('name');
        if($vulnerability.attr('name').charAt(0) == 'C' && $vulnerability.attr('name').charAt(1) == 'V'){
          vulnerability.url = 'https://web.nvd.nist.gov/view/vuln/detail?vulnId='+ $vulnerability.attr('name');
      };
        var $values = $vulnerability.find('vulner_values');
        vulnerability.probability = parseFloat($values.find('probability').text()).toFixed(2);
    } else {
        vulnerability.children = childList;
        vulnerability.probability = 0;
        if ($vulnerability.is('and')) {
            vulnerability.name = 'and';
            vulnerability.type = 'and';
        } else if ($vulnerability.is('or')) {
            vulnerability.name = 'or';
            vulnerability.type = 'or';
        }  // unreachable else
        $vulnerability.children().each(function () {
            var child = parse_vulnerability($(this));
            vulnerability.probability += child.probability;
            vulnerability.children.push(child);
        });

    }
    return vulnerability;
}


function AttackTree(id, $harm, harm_id){
    var margin = {top: 20, right: 120, bottom: 20, left: 120};
    var width = 960 - margin.right - margin.left;
    var height = 800 - margin.top - margin.bottom;

    var i = 0,
        duration = 750,
        root;

    var tree = d3.layout.tree()
        .size([height, width]);

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });

    //Remove whatever chart with the same id/class was present before
    d3.select(id).select("svg").remove();

    var svg = d3.select(id).append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    root = addHarm($harm, harm_id);
    root.x0 = height / 2;
    root.y0 = 0;

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    root.children.forEach(collapse);
    update(root);

    d3.select(self.frameElement).style("height", "800px");

    function update(source) {
        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse();
        var links = tree.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(function(d) { d.y = d.depth * 180; });

        // Update the nodes…
        var node = svg.selectAll("g.atnode")
            .data(nodes, function(d) { return d.id || (d.id = ++i); });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "atnode")
            .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
            .on("click", click);

        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        var tooltip = d3.select(".tooltip");
        nodeEnter.append("text")
            .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
            .attr("dy", ".35em")
            .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
            .text(function(d) { return d.name; })
            .style("fill-opacity", 1e-6)
            .on("mouseover", function (d) {
              if(d.probability){
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip.html("Probability: " + d.probability)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px")
            }})
            .on("mouseout", function (host) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

        nodeUpdate.select("circle")
            .attr("r", 4.5)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the links…
        var link = svg.selectAll("path.atlink")
            .data(links, function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "atlink")
            .attr("d", function(d) {
                var o = {x: source.x0, y: source.y0};
                return diagonal({source: o, target: o});
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {x: source.x, y: source.y};
                return diagonal({source: o, target: o});
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    };

    // Toggle children on click.
    function click(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
            if(d.url){
              window.open(d.url);
            };
        }
        update(d);
    };
}

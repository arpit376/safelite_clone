/**
 *
 * @param harm
 * @param svg
 * @param width
 * @param height
 * @param charge
 * @param on_click
 */
function harm_upper(harm, svg, width, height, charge, on_click) {
    // Variables here.
    var link_distance = width / harm.nodes.length;

    var tx = 0, ty = 0;
    var opacity = 1.0;
    var stroke = 5;
    svg.append("rect")
        .attr("x", tx)
        .attr("y", ty)
        .attr("height", height)
        .attr("width", width)
        .style("stroke", "grey")
        .style("stroke-width", stroke)
        .style("fill", "white")
        .style("fill-opacity", opacity);


    this.on_tick = function() {
        this.link_elements.attr("x1", function (data) {
                return data.source.x;
            })
            .attr("y1", function (data) {
                return data.source.y;
            })
            .attr("x2", function (data) {
                return data.target.x;
            })
            .attr("y2", function (data) {
                return data.target.y;
            });
    };


    // Create the force graph object.
    this.force_graph = d3.layout.force()
    .size([width, height])
    .charge(charge)
    .linkDistance(link_distance)
    .on("tick", this.on_tick);



    // Initialise dragging.
    this.drag = this.force_graph.drag()
    .on("dragstart",
        function (data) {
            d3.select(this).classed("fixed", data.fixed = true);
        });


    //
    this.link_elements = svg.selectAll(".link")
    .data(harm.links)
    .enter()
    .append("line")
    .attr("class", "link");


    this.node_elements = svg.selectAll(".node")
    .data(harm.nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .call(force.drag);


    this.force_graph.nodes(harm["node_elements"])
    .links(harm.links)
    .start();


    this.node_elements.append("circle")
    .attr("r", calc_radius)
    .style("fill", function (data) {
        return color_chooser(data);
    });


    this.node_elements.append("text")
    .attr("dx", calc_radius)
    .attr("dy", ".35em")
    .text(function (data) {
            return data.name;
    })
    .style("fill", "white");


    this.node_elements.append("title")
    .text(function (data) {
        return data.name + "\n" +
            "Breach Probability: " + Math.round(data.value * 100) + "%";
    });


    this.node_elements.on("dbclick", on_click);
}


/**
 *
 * @param root
 * @param source
 * @param svg
 * @param width
 * @param height
 */
function harm_lower(root, source, svg, width, height) {
    var i = 0;
    var duration = 750;
    var shift = (width - get_depth(root) * 200) / 2;

    var tx = 0, ty = 0;
    var opacity = 1.0;
    var stroke = 5;
    svg.append("rect")
        .attr("x", tx)
        .attr("y", ty)
        .attr("height", height)
        .attr("width", width)
        .style("stroke", "grey")
        .style("stroke-width", stroke)
        .style("fill", "white")
        .style("fill-opacity", opacity);


    this.tree = d3.layout.tree()
    .size([height, width]);


    this.diagonal = d3.svg.diagonal()
    .projection(function (data) {
        return [data.y, data.x];
    });


    this.nodes = tree.nodes(root).reverse();

    this.links = tree.links(this.nodes);


    // Normalise for fixed - depth?
    this.nodes.forEach(function (node) {
        node.y = node.depth * 200 + shift;
    });


    // Update the nodes - seriously have no fucking idea what this is.
    this.node_elements = svg.selectAll("g.node")
    .data(this.nodes, function (node) {
        return node.id = ++i;
    });


    //
    this.node_enter = node.enter().append("g")
    .attr("class", "node")
    .attr("transform", function (d) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
    })
    //.on("dbclick", click); This was left commented out.


    this.node_enter.append("circle")
    .attr("r", 1e-6);


    this.node_enter.append("text")
    .attr("x", function (arg) {
        return arg.children || arg._children ? 0 : calc_radius(arg) + 2;
    })
    .attr("dy", function (arg) {
        return arg.children || arg._children ? (-calc_radius(arg) - 2) : 0;
    })
    .attr("text-anchor", function (arg) {
        return arg.children || arg._children ? "middle" : "start";
    })
    .text(function (arg) {
        return arg.name;
    })
    .style("fill-opacity", 1e-6)
    .style("fill", "white");


    this.node_enter.append("title")
    .text(function (arg) {
        return "Breach probability: " + Math.round(arg.value * 100) + "%";
    });


    // Transition nodes to their new position
    this.node_update = this.node_elements.transition()
    .duration(duration)
    .attr("transform",
        function (arg) {
            return "translate(" + arg.y + "," + arg.x + ")";
        });
    this.node_update.select("circle")
    .attr("r", calc_radius)
    .style("fill", function (node) {
        return color_chooser(node);
    });
    this.node_update.select("text")
    .style("fill-opacity", 1);


    this.node_exit = this.node_elements.exit().transition()
    .duration(duration)
    .attr("transform", function (node) {
        return "translate(" + source.y + "," + source.x + ")";
    })
    .remove();
    this.node_exit.select("circle")
    .attr("r", 1e-6);
    this.node_exit.select("text")
    .style("fill-opacity", 1e-6);


    // Update links.
    this.link_elements = svg.selectAll("path.link")
    .data(this.links, function (link) {
        return link.target.id;
    });
    // Enter any new links at the parent's previous position.
    this.link_elements.enter().insert("path", "g")
    .attr("class", "link")
    .attr("d", function (link) {
        var o = {x: source.x0, y: source.y0};
        return diagonal({source: o, target: o});
    });
    // Transition links to their new position.
    this.link_elements.transition()
    .duration(duration)
    .attr("d", diagonal);
    // Transition exiting nodes to the parent's new position.
    this.link_elements.exit().transition()
    .duration(duration)
    .attr("d", function (link) {
        var o = {x: source.x, y: source.y};
        return diagonal({source: o, target: o});
    })
    .remove();


    // Stash the old positions for the transition.
    this.node_elements.forEach(function (node) {
        node.x0 = node.x;
        node.y0 = node.y;
    });

}


/**
 * Utility function to determine the depth of an object.
 * @param obj
 * @returns {number}
 */
function get_depth(obj) {
    var depth = 0;
    if (obj.children) {
        obj.children.forEach(function (child) {
            var temp_depth = get_depth(child);
            if (temp_depth > depth) {
                depth = temp_depth;
            }
        })
    }
    return 1 + depth;
}

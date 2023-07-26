////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CONSTANTS
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Palette = ["#30638E", "#7EA8BE", "#FBD1A2", "#FC9F5B", "#FF5D73"];


var Palette = {
    // HIGH: 'Crimson',
    // LOW: 'SteelBlue'
    HIGH: 'Red',
    MEDIUM: 'Orange',
    LOW: 'Green'
};


function paletteInterpolation(n) {
    const lowToMedInterpolation = d3.interpolateHsl(Palette.LOW, Palette.MEDIUM);
    const medToHighInterpolation = d3.interpolateHsl(Palette.MEDIUM, Palette.HIGH);
    if (n < 0) n = 0;
    else if (n > 1) n = 1;

    if (n <= 0.5) {
        // 0-0.5 => 0-1.0
        return lowToMedInterpolation(2 * n)
    } else {
        // 0.5-1.0 => 0-1.0
        return medToHighInterpolation(2 * (n - 0.5));
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * GRAPH HELPER FUNCTIONS.
 * These are functions that will take a graph element and return the appropriate
 * label, colour of other attributes value based off the element values.
 */
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


/**
 * Collision function that takes an element, checks if it collides with others and attempts to resolve
 * any collisions.
 * @param elem          Node to check for collision.
 * @returns {Function}  Collision function.
 */
function collision(elem) {
    var r = (elem.type == Element.HOST && elem.expanded) ?
            240 : hostRadius(elem) * 2,
        nx1 = elem.x - r,
        nx2 = elem.x + r,
        ny1 = elem.y - r,
        ny2 = elem.y + r;
    return function (quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== elem)) {
            var x = elem.x - quad.point.x,
                y = elem.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r = elem.radius + quad.point.radius;
            if (l < r) {
                l = (l - r) / l * .5;
                elem.x -= x *= l;
                elem.y -= y *= l;
                quad.point.x += x;
                quad.point.y += y;
            }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function radius(node) {
    switch (node.type) {
        case Element.HOST:
            return hostRadius(node);
            break;

        case Element.GROUP:
            return groupRadius(node);
            break;

        default:
            break;
    }
}


/**
 * Radius function for host elements.
 * Determines the radius of a host as a function of it's impact.
 * @return {number}
 */
function hostRadius(host) {
    // if (!$.isNumeric(host.risk)) {
    //     return 5;
    // }
    if (host.name == "Attacker") {
        return 10;
    }
    if (host.type == Element.HOST) {
        return 5;
        // return 5 + 5 * host.impact;
    } else {
        return 5;
    }
}


/**
 * Radius function for group elements.
 * Determines the radius of a group as a function of it's size.
 * @param group
 * @returns {number}
 */
function groupRadius(group) {
    return 10 + 3 * group.size;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Link distancing function, determines the length of a link as the function of the host
 * elements it represents.
 * @param link
 * @returns {number}
 */
function linkDistance(link, index) {
    var source = link.source,
        target = link.target;

    var c = 10;  // element-gap constant

    var distance = 0;
    if (source.group && target.group && source.group == target.group) {
        if (source.type == Element.HOST && source.expanded) distance += 40;
        if (target.type == Element.HOST && target.expanded) distance += 40;
        if (distance == 0) distance = c;
    } else {
        if (source.group) {
            distance += 30 + c*source.group.size;
        } else {
            distance += 30;
        }
        if (target.group) {
            distance += 30 + c*target.group.size;
        } else {
            distance += 30;
        }
    }
    return distance;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Colouring function for host elements.
 * @param host
 * @return {string}
 */
function hostColour(host) {
    if (host.name.indexOf("error") !== -1) {
        return "grey";
    }
    if (host.name.indexOf("timeout") !== -1) {
        return "grey";
    }
    if (host.vulNum == 0 && host.name != "Attacker") {
        return "grey";
    }
    if (host.name == "Attacker") {
        return "black";
    } else {
        return paletteInterpolation(host.risk/10);
    }
}


/**
 * Colouring function for group elements.
 * @param group
 * @returns {string|*|string}
 */
function groupColour(group) {
    return "LightSlateGrey";
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 *
 * @return {string}
 */
function title(elem) {
    switch (elem.type) {
        case Element.HOST:
            return elem.name + "\n" +
                "Breach Probability: " + Math.round(elem.probability * 100) + "%";
            break;

        case Element.GROUP:
            return "[TODO] group.name";
            break;

        default:
            break;
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Text function, determines the text of the element that appears as a function of the name
 * and a significance threshold.
 * @return {string}
 */
function hostText(host) {
    if (host.name.indexOf("error") !== -1) {
        return "*";
    }
    if (host.name.indexOf("timeout") !== -1) {
        return "x";
    }
    if (!$.isNumeric(host.impact)) {
        return host.name;
    }
    if (host.name == "Attacker") {
        return host.name;
    } else if (host.impact > -1) {
        return host.name;
    }
}


/**
 * Stashes the original coordinates.
 * @param data
 */
function stash(data) {
    data.x0 = data.x;
    data.dx0 = data.dx;
}


/**
 * Given a node in a partition layout, return an array of all it's ancestor nodes, highest first,
 * but excluding the root.
 * @param node  A node in a partition layout.
 */
function getAncestors(node) {
    var path = [],
        current = node;
    while (current.parent) {
        path.unshift(current);
        current = current.parent;
    }
    return path;
}


/**
 * Map the node to a colour, using a attribute selection function.
 * @param node  The node in question.
 * @param fn    The attribute selection function, if not specified, compares on an assumed
 *              "value" attribute.
 * @returns {*} The colour (as a hex string - using the palette).
 */
function mapToPalette(node, fn) {
    if (fn == null) {
        fn = function (n) {
            return n.risk;
        };
    }
    // Then..
    if (fn(node) <= 0.20) {
        return Palette[0];
    } else if (0.20 <= fn(node) < 0.4) {
        return Palette[1];
    } else if (0.4 <= fn(node) < 0.6) {
        return Palette[2];
    } else if (0.6 <= fn(node) < 0.80) {
        return Palette[3];
    } else { // 0.85 < fn(node)
        return Palette[4];
    }
}


function inList(list, obj) {
    var i, listObj;
    for (i = 0; i < list.length; i++) {
        listObj = list[i];
        if (obj === listObj) {
            return true;
        }
    }
    return false;
}


function generateConvexHulls(nodes) {
    // Dictionary of group to possible hull points (subnodes.xy +- offset)
    var hullsPoints = {};
    var offset = 15;

    // Generate possible points for each hull.
    var groupPointsMap;
    var k, node;
    for (k = 0; k < nodes.length; k++) {
        node = nodes[k];

        if (node.type == Element.HOST && node.group) {
            groupPointsMap = hullsPoints[node.group.id] ||
                (hullsPoints[node.group.id] = {
                    group: node.group,
                    points: []
                });

            if (node.expanded) offset = 30;
            else offset = 15;

            groupPointsMap.points.push([node.x-offset, node.y-offset]);
            groupPointsMap.points.push([node.x-offset, node.y+offset]);
            groupPointsMap.points.push([node.x+offset, node.y+offset]);
            groupPointsMap.points.push([node.x+offset, node.y-offset]);
        } /*else if (node.type == Element.GROUP) {
            continue;
        } else {
            continue;
        }*/
    }

    var hulls = [];
    var groupId;
    for (groupId in hullsPoints) {
        hulls.push({
            group: hullsPoints[groupId].group,
            path: d3.geom.hull(hullsPoints[groupId].points)})
    }
    return hulls;
}


function getNodesLinks(node, links) {
    var nodesLinks = [];
    var i, link;
    for (i = 0; i < links.length; i++) {
        link = links[i];

        if (link.source == node || link.target == node) {
            nodesLinks.push(link);
        }
    }

    return nodesLinks;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * NODE RENDERING FUNCTIONS.
 * These are functions that will take a graph node and render it accordingly to it's expansion or
 * other future parameters.
 */
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Render the default representation of a node (a circle) and associate events (on mouse over etc).
 * @param d3$node   The node selection.
 * @param host      The node data itself.
 * @param i         The index.
 */
function renderHost(d3$node, host, index, onDoubleClick) {
    var menu = [
        {
            title: 'Scan',
            action: function(elm, d, i) {
                $.ajax({
                    type: "post",
                    url: "/safeview/scan/",
                    data: {
                        ip: d.name,
                        system_id: $("#system-choice").find(".selected").text(),
                        name: $("#collect-name").val()
                    },
                    success: function () {
                    },
                    error: function () {
                        console.log(arguments);
                    }
                });
            },
            disabled: false
        }
    ];
    var empty_menu = [
        {
            title: 'Not Reachable',
            disabled: true
        }
    ];

    var tooltip = d3.select(".tooltip");
    d3$node.append("circle")
        .attr("r", hostRadius)
        .style("fill", hostColour)
        .on("mouseover", function (host) {
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip.html(function (){
              if(host.name == "Attacker") return host.name;
              return host.name + "<br>Risk: " + Number(host.risk).toFixed(2)}
            )
                .style("left", (d3.event.pageX + 15) + "px")
                .style("top", (d3.event.pageY - 28) + "px")
        })
        .on("mouseout", function (host) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    d3$node.append("text")
        .attr("dx", hostRadius)
        .attr("dy", ".35em")
        .text(hostText);

    d3$node.on("dblclick", onDoubleClick);
    if (host.name.indexOf("error") !== -1) {
        d3$node.on('contextmenu', d3.contextMenu(empty_menu));
    } else if (host.name.indexOf("timeout") !== -1) {
        d3$node.on('contextmenu', d3.contextMenu(empty_menu));
    } else {
        d3$node.on('contextmenu', d3.contextMenu(menu));
    }
}


function renderGroup(d3$node, group, index, onDoubleClick) {
    var tooltip = d3.select(".tooltip");
    d3$node.append("circle")
        .attr("r", groupRadius)
        .style("fill", groupColour);

    d3$node.append("text")
        .attr("dx", groupRadius)
        .attr("dy", ".35em")
        .text(group.size);

    d3$node.on("dblclick", onDoubleClick)
}


/**
 * Takes a d3 node selection (group element) and renders within it a sunburst
 * based on the nodes vulnerability tree and relevant event handlers (e.g. on mouse over).
 * @param d3$node   D3 selection of node element (<g></g>)
 * @param host      The bound node data
 * @param i         The node index
 */
function renderHostSunburst(d3$node, host, index, onDoubleClick) {
    var height = 60,
        width = 60,
        r = Math.min(width, height) / 2,
        tooltip = d3.select(".tooltip");

    var on_mouseover = function (tree_node) {
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);
        if (tree_node.probability === undefined) {
            tooltip.html(tree_node.name)
                .style("left", (d3.event.pageX + 15) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        } else {
            tooltip.html(tree_node.name + "<br> Attack probability: " + Number(tree_node.probability).toFixed(2))
                .style("left", (d3.event.pageX + 15) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        }

        var sequenceArray = getAncestors(tree_node);
        d3$node.selectAll("path")
            .style("opacity", 0.3);

        d3$node.selectAll("path")
            .filter(function (tree_node) {
                if (tree_node === host) return true;
                return (sequenceArray.indexOf(tree_node) >= 0);
            })
            .style("opacity", 1);
    };

    var on_mouseout = function (host) {
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);

        d3$node.selectAll("path")
            .style("opacity", 1);
    };

    var partition = d3.layout.partition()
        .sort(null)
        .size([2 * Math.PI, r * r])
        .value(function (tree_node) {
            return tree_node.probability;
        });

    var arc = d3.svg.arc()
        .startAngle(function (data) {
            return data.x;
        })
        .endAngle(function (data) {
            return data.x + data.dx;
        })
        .innerRadius(function (data) {
            return Math.sqrt(data.y);
        })
        .outerRadius(function (data) {
            return Math.sqrt(data.y + data.dy);
        });

    var d3$path = d3$node.datum(host).selectAll("path")
        .data(partition.nodes)
        .enter().append("path")
        .attr("display", function (tree_node) {
            return tree_node.depth; // ? null : "none"; // hides the innermost ring
        })
        .attr("d", arc)
        .style("stroke", "#fff")
        .style("fill", function (tree_node) {
            if (tree_node.type == "host" || tree_node.type == "vulnerability") {
                return paletteInterpolation(tree_node.probability);
            } else { // tree_node.type == "and" | "or"
                return "#777";
            }
        })
        .style("fill-rule", "evenodd")
        .each(stash)
        .on("mouseover", on_mouseover)
        .on("mouseout", on_mouseout);

    d3$node.append("text")
        .attr("dx", hostRadius)
        .attr("dy", ".35em")
        .text(hostText);

    d3$node.on("dblclick", onDoubleClick);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * THE HARM GRAPH CLASS
 */
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const Element = {
    HOST: 0,
    GROUP: 1
};

/**
 * HarmGraph class.
 *
 * Encapsulates all d3 graph manipulate and data binding.
 * What Harm elements are desired to be shown on the graph are stored externally of this class
 * and then given to it / removed from it when necessary by the externally operating code - in
 * which space the entire Harm itself will persist.
 *
 * Created by montgomeryAnderson on 6/06/16.
 *
 * @param d3$svg    The d3 selection of the SVG to render the graph within.
 * @param width     The width of the render.
 * @param height    The height of the render.
 * @constructor
 */
function HarmGraph(d3$svg, width, height) {
    // The force layout object.
    var force;
    // The view group inside the SVG - on which the scaling and translations are performed (zoom and drag).
    var view;

    var zoomListener;
    var dragListener;

    // Arrays of the data elements.
    var nodes = [];
    var links = [];
    var layers = [];
    // The render element (render filtered data elements).
    var render = {};

    // Note: variables / parameters prefixed with d3$ are d3 selectors.
    var d3$nodes;
    var d3$links;
    var d3$hulls;


    this.onTick = function () {
        var q = d3.geom.quadtree(nodes),
            i = 0,
            n = nodes.length;

        while (++i < n) q.visit(collision(nodes[i]));

        // Link update
        d3$links
            .attr("x1", function (link) {
                return link.source.x;
            })
            .attr("y1", function (link) {
                return link.source.y;
            })
            .attr("x2", function (link) {
                return link.target.x;
            })
            .attr("y2", function (link) {
                return link.target.y;
            });

        // Node update
        d3$nodes
            .attr("cx", function (node) {
                var r = radius(node);
                return node.x = Math.max(r, Math.min(width - r, node.x))
            })
            .attr("cy", function (node) {
                var r = radius(node);
                return node.y = Math.max(r, Math.min(height - r, node.y));
            })
            .attr("transform", function (node) {
                return "translate(" + node.x + "," + node.y + ")";
            });

        // Hull update
        var curve = d3.svg.line()
            .interpolate("cardinal-closed")
            .tension(0.85);

        d3$hulls.data(generateConvexHulls(render.nodes));
        d3$hulls.attr("d", function (hull) { return curve(hull.path); });
    };


    this.onDragStart = function (node) {
        d3.event.sourceEvent.stopPropagation();
        d3.select(this).classed("dragging", true);
        force.start();
    };


    this.onDrag = function (node) {
        d3.select(this)
            .attr("cx", node.x = d3.event.x)
            .attr("cy", node.y = d3.event.y);
    };


    this.onDragEnd = function (node) {
        d3.select(this).classed("dragging", false);
    };


    this.onZoom = function () {
        view.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    };


    /**
     * Method of HarmGraph to call to re-create the graph and selector elements
     * from the (assumed to be modified) nodes and links list.
     */
    this.initialise = function () {
        render = this.generateRender();

        force = d3.layout.force()
            .size([width, height])
            .gravity(0.05)
            .charge(-300)
            .linkDistance(linkDistance)
            .on("tick", this.onTick);

        // Define the zoom and drag behaviour.
        zoomListener = d3.behavior.zoom()
            .scaleExtent([0.1, 3])
            .on("zoom", this.onZoom);
        d3$svg
            .attr("pointer-events", "all")
            .attr("viewBox", "0 0 " + width + " " + height)
            .attr("preserveAspectRatio", "xMinYMid")
            .call(zoomListener)
            .on("dblclick.zoom", null);

        view = d3$svg.append("g");

        dragListener = d3.behavior.drag()
            .origin(function (node) { return node; })
            .on("dragstart", this.onDragStart)
            .on("drag", this.onDrag)
            .on("dragend", this.onDragEnd);


        // Define the div for the tooltip.
        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        // Creates the graph data structure.
        force
            .nodes(render.nodes)
            .links(render.links)
            .start();

        d3$links = view.selectAll(".link");
        d3$nodes = view.selectAll(".node");
        d3$hulls = view.selectAll(".hull");

        this.update();

        // Calm down the start of the force.
        var ticker = 0;
        while ((force.alpha() > 1e-2) && (ticker < 50)) {
            force.tick();
            ticker++;
        }
    };


    /**
     * Rendering function used to generate and regenerate the svg elements from the render data.
     */
    this.update = function () {
        this.updateHulls();
        this.updateLinks();
        this.updateNodes();
        force.start();
    };

    this.updateLinks = function () {
        // bind data
        d3$links = d3$links.data(render.links, function (link) { return link.id });
        // define enter
        d3$links.enter()
            .append("line")
            .attr("class", "link")
            .style("stroke-width", function (link) { return link.size || 1; });
        // define exit
        d3$links.exit().remove();
    };

    this.updateNodes = function () {
        // bind data
        d3$nodes = d3$nodes.data(render.nodes, function (node) { return node.id });
        // define enter
        d3$nodes.enter()
            .append("g")
            .attr("class", "node")
            .each(function (node, index) {
                var d3$node = d3.select(d3$nodes[0][index]);
                switch (node.type) {
                    case Element.HOST:
                        if (node.expanded)
                            renderHostSunburst(d3$node, node, index, this.collapseHost.bind(this));
                        else
                            renderHost(d3$node, node, index, this.expandHost.bind(this));
                        break;
                    case Element.GROUP:
                        renderGroup(d3$node, node, index, this.expandGroup.bind(this));
                        break;
                    default:
                        console.error("Unknown element type '" + node.type +"'");
                        break;
                }
            }.bind(this))
            .call(force.drag);
        // define exit
        d3$nodes.exit().remove();
        // um title here too? idk
        d3$nodes.append("title", title);

        // Bring nodes to the front initially..
        d3$nodes.each(function () {
            this.parentNode.appendChild(this);
        });
        // ..and on mouseover
        d3$nodes.on("mouseover", function () {
            this.parentNode.appendChild(this);
        });

        d3$nodes.call(dragListener);
    };


    this.updateHulls = function () {
        var curve = d3.svg.line()
            .interpolate("cardinal-closed")
            .tension(0.85);

        // bind data
        d3$hulls = d3$hulls.data(generateConvexHulls(render.nodes), function (hull) { return hull.group.id });
        // define enter
        d3$hulls.enter()
            .append("path")
            .attr("class", "hull")
            .attr("d", function (hull) {
                return curve(hull.path);
            })
            .style("fill", function (hull) {
                return "LightGrey";
            })
            .on("dblclick", this.collapseGroup.bind(this));
        // define exit
        d3$hulls.exit().remove();
    };


    this.generateRender = function () {
        // render all if no layers exist
        if (layers.length == 0) {
            return {
                nodes: nodes,
                links: links
            }
        }

        // Otherwise..
        var render = {
            nodes: [],
            links: []
        };

        var i, node;
        // ..add in un-layered nodes..
        for (i = 0; i < nodes.length; i++) {
            node = nodes[i];
            if (node.group == null) {
                render.nodes.push(node);
            }
        }

        // ..then begin processing layers..
        var layer = layers[0];
        var group;
        var j;
        for (i = 0; i < layer.length; i++) {
            group = layer[i];

            // on generate render - if dynamically modifying it, may always have a
            // non-zero group size / starting collapsed.
            if (group.size == 0) {  // if expanded
                for (j = 0; j < group.elements.length; j++) {
                    node = group.elements[j];
                    render.nodes.push(node);
                }
            } else {
                render.nodes.push(group);
            }
        }

        // alternative approach
        var link, linkSource, linkTarget;
        var renderLink;
        var exists, existingRenderLink;
        for (i = 0; i < links.length; i++) {
            link = links[i];
            linkSource = nodes[link.source];
            linkTarget = nodes[link.target];
            renderLink = {
                id: null,
                source: null,
                target: null,
                size: 1
            };

            // if internal link within a collapsed group
            if (linkSource.group && linkTarget.group &&
                linkSource.group == linkTarget.group &&
                linkSource.group.size > 0)
                continue;  // skip it

            // if source non-grouped or in expanded group, point to it
            if (!linkSource.group || (linkSource.group && linkSource.group.size == 0)) {
                renderLink.source = render.nodes.indexOf(linkSource);
                renderLink.id = linkSource.id;
            } else {  // else point to it's group
                renderLink.source = render.nodes.indexOf(linkSource.group);
                renderLink.id = linkSource.group.id;
            }

            // similarly with the target
            if (!linkTarget.group || (linkTarget.group && linkTarget.group.size == 0)) {
                renderLink.target = render.nodes.indexOf(linkTarget);
                renderLink.id += "-" + linkTarget.id;
            } else {
                renderLink.target = render.nodes.indexOf(linkTarget.group);
                renderLink.id += "-" + linkTarget.group.id;
            }

            // check if the newly made link exists - if so, increase size
            exists = false;
            for (j = 0; j < render.links.length; j++) {
                existingRenderLink = render.links[j];
                if (existingRenderLink.source == renderLink.source &&
                    existingRenderLink.target == renderLink.target) {
                    existingRenderLink.size++;
                    exists = true;
                    break;
                }
            }
            // otherwise, add it to the render
            if (!exists) render.links.push(renderLink);
        }

        // return
        return render;
    };


    this.addNode = function (node) {
        node.expanded = false;
        // node.x = width / 2;
        // node.y = height / 2;
        nodes.push(node);
    };


    this.addLink = function (link) {
        links.push(link);
    };


    this.addLayer = function (layer) {
        layers.push(layer);
    };


    this.addNodes = function (nodes) {
        var i_node, node;
        for (i_node = 0; i_node < nodes.length; i_node++) {
            node = nodes[i_node];
            this.addNode(node);
        }
    };


    this.addLinks = function (links) {
        var i_link, link;
        for (i_link = 0; i_link < links.length; i_link++) {
            link = links[i_link];
            this.addLink(link);
        }
    };


    this.addLayers = function (layers) {
        var i_layer, layer;
        for (i_layer = 0; i_layer < layers.length; i_layer++) {
            layer = layers[i_layer];
            this.addLayer(layer);
        }
    };


    this.addEntireJsonHarm = function (harm) {
        this.addNodes(harm.nodes);
        this.addLinks(harm.links);
    };


    this.addEntireHarm = function ($harm) {
        var hosts = [], links = [], layers = [];

        var $hosts = $harm.find('nodes');
        $hosts.find('node').each(function (index) {
            var $host = $(this);
            // parse host information
            var host = {
                id: $host.attr('id'),
                name: $host.attr('name'),
                type: Element.HOST,
                group: null
            };
            // parse metric values
            var $values = $host.find('host_values');
            host.impact = parseFloat($values.find('impact').text());
            host.risk = parseFloat($values.find('risk').text());
            host.vulNum = parseFloat($host.find('vulnerability').length);
            host.children = [parse_$vulnerability($host.find('vulnerabilities').children().first())];
            hosts.push(host);
        });

        var $links = $harm.find('edge');
        $links.each(function (index) {
            var $link = $(this);
            // parse link information
            var link = {
                id: index,
                source: parseInt($link.find('source').text()),
                target: parseInt($link.find('target').text())
            };
            // parse metric values (when existing)
            var $values = $link.find('values');
            links.push(link);
        });

        // Parse the upper layers.
        $harm.find('layer').each(function (index) {
            var $layer = $(this);
            var layer = [];
            $layer.find('group').each(function (index) {
                var $group = $(this);
                var group = {
                    id: index,
                    indices: [],
                    elements: [],
                    size: 0,
                    type: Element.GROUP
                };
                $group.find('element').each(function () {
                    // group.size++;  // comment this line to start groups expanded
                    group.indices.push(parseInt($(this).text()));
                });
                layer.push(group);
            });
            layers.push(layer);
        });

        if (layers.length > 0) {
            // Link the bottom upper layer with the nodes..
            var layer = layers[0],
                group, index;
            var i, j;
            for (i = 0; i < layer.length; i++) {  // groups in the layer
                group = layer[i];

                for (j = 0; j < group.indices.length; j++) {  // elements of the group
                    index = group.indices[j];
                    // Link each to the other
                    hosts[index].group = group;
                    group.elements.push(hosts[index]);
                }
            }

            // Link the upper layers[1..] with their respective lower layers..
            var k;
            for (i = 1; i < layers.length; i++) {  // layers (excluding the lowest 0) (1..n)
                layer = layers[i];

                for (j = 0; j < layer.length; j++) {  // groups in the layer
                    group = layer[j];

                    for (k = 0; k < group.indices.length; k++) {  // elements of the group
                        index = group.indices[k];
                        // Link to lower layer
                        layers[i - 1][index].group = group;
                        group.elements.push(layers[i - 1][index]);
                    }
                }
            }
        }

        this.addNodes(hosts);
        this.addLinks(links);
        this.addLayers(layers);
    };


    this.isExternalLink = function (link) {
        return link.source.group != link.target.group;
    };


    this.isInternalLink = function (link) {
        return link.source.group == link.target.group;
    };


    this.expandHost = function (host, index) {
        // Store the position prior expansion
        var pos = {x: host.x, y: host.y};
        var d3$node = d3.select(d3$nodes[0][render.nodes.indexOf(host)]);
        d3$node.selectAll("*").remove();
        host.expanded = true;
        renderHostSunburst(d3$node, host, index, this.collapseHost.bind(this));
        // Set the new position and it's previous position to the prior position
        host.x = pos.x;
        host.y = pos.y;
        host.px = pos.x;
        host.py = pos.y;

        force.start();
    };


    this.collapseHost = function (host, index) {
        // Store the position prior collapse
        var pos = {x: host.x, y: host.y};
        var d3$node = d3.select(d3$nodes[0][render.nodes.indexOf(host)]);
        d3$node.selectAll("*").remove();
        host.expanded = false;
        renderHost(d3$node, host, index, this.expandHost.bind(this));
        // Set the new position and it's previous position to the prior position
        host.x = pos.x;
        host.y = pos.y;
        host.px = pos.x;
        host.py = pos.y;

        force.start();
    };


    this.collapseGroup = function(hull, index) {
        var group = hull.group,
            groupLinks = [];
        var centroid = {x: 0, y: 0};
        // Iterate of the groups (rendered) nodes
        var i, node, renderNodeIndex;
        for (i = 0; i < group.elements.length; i++) {
            node = group.elements[i];
            // Sum the coordinates for centroid calculation
            centroid.x += node.x;
            centroid.y += node.y;

            // Remove the node from the render mesh
            renderNodeIndex = render.nodes.indexOf(node);
            render.nodes.splice(renderNodeIndex, 1);

            // Remove all group links from the render mesh
            var nodesLinks = getNodesLinks(node, render.links);
            var j, nodeLink, collapsedLink, renderLinkIndex;
            for (j = 0; j < nodesLinks.length; j++) {
                nodeLink = nodesLinks[j];

                // Remove the link from the render mesh
                renderLinkIndex = render.links.indexOf(nodeLink);
                render.links.splice(renderLinkIndex, 1);

                // Create a new collapsed link
                collapsedLink = {
                    id: null,
                    source: nodeLink.source.group && nodeLink.source.group == group ? group : nodeLink.source,
                    target: nodeLink.target.group && nodeLink.target.group == group ? group : nodeLink.target,
                    size: 1
                };
                // create a unique link id for the new collapsed link
                collapsedLink.id = collapsedLink.source.id + "-" + collapsedLink.target.id;

                if (collapsedLink.source == collapsedLink.target)
                    continue;

                // If existing, up the size
                var k, existingRenderLink, exists = false;
                for (k = 0; k < groupLinks.length; k++) {
                    existingRenderLink = groupLinks[k];
                    if (existingRenderLink.source == collapsedLink.source &&
                        existingRenderLink.target == collapsedLink.target) {
                        existingRenderLink.size++;
                        exists = true;
                        break;
                    }
                }
                // Otherwise, add to the render
                if (!exists) groupLinks.push(collapsedLink);
            }
        }
        // Initiate exit for removed links and nodes
        this.update();

        // Average the coordinate sum to get the centroid
        centroid.x /= group.elements.length;
        centroid.y /= group.elements.length;
        // Set the expanded size
        group.size = group.elements.length;
        group.x = centroid.x;
        group.px = centroid.x;
        group.y = centroid.y;
        group.py = centroid.y;

        render.nodes.push(group);
        for (i = 0; i < groupLinks.length; i++) {
            render.links.push(groupLinks[i]);
        }

        // Initiate enter for added group nodes and links
        this.update();
    };


    this.expandGroup = function(group, index) {
        var renderIndex;
        // Remove the node from the render
        renderIndex = render.nodes.indexOf(group);
        render.nodes.splice(renderIndex, 1);
        // Remove the groups links
        var groupsLinks = getNodesLinks(group, render.links);
        var i, groupLink;
        for (i = 0; i < groupsLinks.length; i++) {
            groupLink = groupsLinks[i];
            // Remove the link from the render
            renderIndex = render.links.indexOf(groupLink);
            render.links.splice(renderIndex, 1);
        }
        group.size = 0;

        // Initiate exit for removed group and links
        this.update();

        // Add in all children
        var node;
        for (i = 0; i < group.elements.length; i++) {
            node = group.elements[i];
            render.nodes.push(node);
        }
        // Add in all their links
        var nodesLinks, nodeLink;
        for (i = 0; i < group.elements.length; i++) {
            node = group.elements[i];
            // Iterate over each hosts links, adding them accordingly
            nodesLinks = getNodesLinks(nodes.indexOf(node), links);
            var j, renderLink,
                linkSource, linkTarget;
            for (j = 0; j < nodesLinks.length; j++) {
                nodeLink = nodesLinks[j];
                linkSource = nodes[nodeLink.source];
                linkTarget = nodes[nodeLink.target];
                renderLink = {
                    id: null,
                    source: null,
                    target: null,
                    size: 1
                };

                // if source non-grouped or in expanded group, point to it
                if (!linkSource.group || (linkSource.group && linkSource.group.size == 0)) {
                    renderLink.source = render.nodes.indexOf(linkSource);
                    renderLink.id = linkSource.id;
                } else {  // else point to it's group
                    renderLink.source = render.nodes.indexOf(linkSource.group);
                    renderLink.id = linkSource.group.id;
                }

                // similarly with the target
                if (!linkTarget.group || (linkTarget.group && linkTarget.group.size == 0)) {
                    renderLink.target = render.nodes.indexOf(linkTarget);
                    renderLink.id += "-" + linkTarget.id;
                } else {
                    renderLink.target = render.nodes.indexOf(linkTarget.group);
                    renderLink.id += "-" + linkTarget.group.id;
                }

                render.links.push(renderLink);
            }
        }

        // Initiate enter for added hosts and links
        this.update();
    };


    this.dump = function () {
        return {
            nodes: nodes,
            links: links,
            layers: layers,
            render: render
        }
    };
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Harm graph utility functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function parse_$vulnerability($vulnerability) {
    var vulnerability = {
        children: []
    };
    if ($vulnerability.is('vulnerability')) {
        vulnerability.type = 'vulnerability';
        vulnerability.id = $vulnerability.attr('id');
        vulnerability.name = $vulnerability.attr('name');
        var $values = $vulnerability.find('vulner_values');
        vulnerability.probability = parseFloat($values.find('probability').text());
    } else {
        vulnerability.probability = 0;
        if ($vulnerability.is('and')) {
            vulnerability.name = 'and';
            vulnerability.type = 'and';
        } else if ($vulnerability.is('or')) {
            vulnerability.name = 'or';
            vulnerability.type = 'or';
        }  // unreachable else
        $vulnerability.children().each(function () {
            var child = parse_$vulnerability($(this));
            vulnerability.probability += child.probability;
            vulnerability.children.push(child);
        });

    }
    return vulnerability;
}

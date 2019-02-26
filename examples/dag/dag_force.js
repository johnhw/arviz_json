function drawDAG(arviz_data) {
    var width = 960,
        height = 500

    var dag = arviz_data.sample_stats.attrs.graph;
    var vars = Object.keys(dag);
    var nodes = [];
    var links = [];

    for (k in dag) {
        // color by variable type
        var types = {
            "observed": 0,
            "free": 1,
            "deterministic": 2,
            "potential": 3
        }
        // exclude variables with trailing underscore (auto-transformed)
        if (k.slice(-1) !== '_') {
            console.log(dag[k]);
            nodes.push({
                "id": k,
                "group": types[dag[k].type]
            });


            for (var i = 0; i < dag[k].parents.length; i++) {
                var source = dag[k].parents[i];
                links.push({
                    "source": source,
                    "target": k,
                    "value": 10
                })
            }
        }
    }


    var svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height");

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function (d) {
            return d.id;
        }))
        .force("x", d3.forceX().x(50).strength(function (d) {
            if (d.group == 0) {
                return -0.1;
            } else {
                return 0;
            }
        }))
        .force("charge", d3.forceManyBody().strength(-500))
        .force("center", d3.forceCenter(width / 2, height / 2));


    var link = svg.append("g")
        .attr("class", "link")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("stroke-width", 2.0);

    var node = svg.append("g")
        .attr("class", "node")
        .selectAll("g")
        .data(nodes)
        .enter().append("g")

    var circles = node.append("circle")
        .attr("r", 5)
        .attr("fill", function (d) {
            return color(d.group);
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    var labels = node.append("text")
        .text(function (d) {
            return d.id;
        })


    node.append("title")
        .text(function (d) {
            return d.id;
        });

    simulation
        .nodes(nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(links);

    function ticked() {
        link
            .attr("x1", function (d) {
                return d.source.x;
            })
            .attr("y1", function (d) {
                return d.source.y;
            })
            .attr("x2", function (d) {
                return d.target.x;
            })
            .attr("y2", function (d) {
                return d.target.y;
            });

        node
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
    }


    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

}

/////////////////////////////////////////////////////////////////////////////////////
// Entry point        
load_npz("switchpoint.npz").then(npz_data => drawDAG(reassemble_arviz(npz_data)));
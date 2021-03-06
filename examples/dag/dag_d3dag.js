// based on the d3-dag example: https://beta.observablehq.com/@erikbrinkman/d3-dag-sugiyama 
function drawDAG(arviz_data) {
    var width = 960,
        height = 500

    function createCanvas() {
        // create canvas
        var svgWidth = width,
            svgHeight = height;
        var margin = {
            top: 60,
            right: 100,
            bottom: 100,
            left: 100
        };
        width = svgWidth - margin.left - margin.right;
        height = svgHeight - margin.top - margin.bottom;
        var svg = d3.select('svg')
            .attr("width", svgWidth)
            .attr("height", svgHeight)
            .attr("id", "canvas");


        // main group for all elements
        var g = svg.append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")"
            );
        return g;
    }

    g = createCanvas();

    var original_dag = arviz_data.sample_stats.attrs.graph;
    var vars = Object.keys(original_dag);
    var dag_nodes = [];
    var dag_types = {};

    for (k in original_dag) {
        // color by variable type
        var types = {
            "observed": 0,
            "free": 1,
            "deterministic": 2,
            "potential": 3
        }
        // exclude variables with trailing underscore (auto-transformed)
        if (k.slice(-1) !== '_') {
            var type = types[original_dag[k].type];
            dag_types[k] = type;
            dag_nodes.push({
                "id": k,
                "parentIds": original_dag[k].parents,
                "type": type
            });
        }
    }

    // construct the DAG and the layout from it
    dag = d3.dagStratify()(dag_nodes);
    layout = d3.sugiyama().size([width, height]);
    // Use computed layout
    layout(dag);

    const steps = dag.size();

    // color the points using scheme category 20
    const interp = d3.scaleOrdinal(d3.schemeCategory20);
    const colorMap = {};
    dag.each((node, i) => {
        colorMap[node.id] = interp(dag_types[node.id]);
    });

    // How to draw edges
    const line = d3.line()
        .curve(d3.curveCatmullRom)
        .x(d => d.x)
        .y(d => d.y);

    const defs = g.append('defs');



    // Plot edges
    g.append('g')
        .selectAll('path')
        .data(dag.links())
        .enter()
        .append('path')
        .attr('d', ({
            data
        }) => line(data.points))
        .attr('stroke-width', 3)
        .attr('stroke', ({
            source,
            target
        }) => {
            const gradId = `${source.id}-${target.id}`;
            const grad = defs.append('linearGradient')
                .attr('id', gradId)
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', source.x)
                .attr('x2', target.x)
                .attr('y1', source.y)
                .attr('y2', target.y);
            grad.append('stop').attr('offset', '0%').attr('stop-color', colorMap[source.id]);
            grad.append('stop').attr('offset', '100%').attr('stop-color', colorMap[target.id]);
            return `url(#${gradId})`;
        });


    // Select nodes
    const nodes = g.append('g')
        .selectAll('g')
        .data(dag.descendants())
        .enter()
        .append('g')
        .attr('transform', ({
            x,
            y
        }) => `translate(${x}, ${y})`);

    // Plot node circles
    nodes.append('circle')
        .attr('r', 50)
        .attr('fill', n => colorMap[n.id])
        .attr('stroke-width', 10)
        .attr('stroke', '#000');

    // Add text to nodes
    nodes.append('text')
        .text(d => d.id)
        .attr('font-weight', 'bold')
        .attr('font-family', 'sans-serif')
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('fill', 'white');

}


/////////////////////////////////////////////////////////////////////////////////////
// Entry point        
load_npz("switchpoint.npz").then(npz_data => drawDAG(reassemble_arviz(npz_data)));
function drawChart(arviz_data) {

    var observed = arviz_data.observed_data;
    var posterior = arviz_data.posterior;
    var prior = arviz_data.prior;



    // Remap values
    function remap(property, varname, fn) {
        property.vars[varname].array.data = property.vars[varname].array.data.map(fn);
    }

    // remap transformed variables            
    remap(posterior, "switchpoint", x => x + 1960);
    remap(posterior, "poverty_at_switchpoint", x => x + 50);
    remap(prior, "switchpoint", x => x + 1960);
    remap(prior, "poverty_at_switchpoint", x => x + 50);

    remap(observed, "year", x => x + 1960);
    remap(observed, "y", x => x + 50);


    function extractColumnData(property, columns) {
        // select                
        var raw_data = {};
        for (var i = 0; i < columns.length; i++) {
            raw_data[columns[i]] = getData(property, columns[i]);
        }

        // transpose 
        var data = [];
        for (var i = 0; i < raw_data[columns[0]].length; i++) {
            var row = {};
            for (var j = 0; j < columns.length; j++) {
                row[columns[j]] = raw_data[columns[j]][i];
            }
            data.push(row);
        }
        return data;
    }

    var data = extractColumnData(observed, ["year", "y"]);


    ///////////////////////////////////////////////////////
    // Create SVG objects
    var width, height;

    function createCanvas() {
        // create canvas
        var svgWidth = 1000,
            svgHeight = 400;
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


    // construct axis objects
    var x = d3.scaleLinear().rangeRound([0, width]);
    var y = d3.scaleLinear().rangeRound([height, 0]);

    // construct the line 
    var line = d3.line()
        .x(function (d) {
            return x(d.year)
        })
        .y(function (d) {
            return y(d.y)
        })
    x.domain(d3.extent(data, function (d) {
        return d.year;
    }));
    y.domain([0, 100]);

    // add axis guides
    g.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .attr("class", "tickLabel")

        .append("text")
        .attr("class", "axisLabel")
        .attr("text-anchor", "middle")
        .attr("dy", "40px")
        .text("Year");


    g.append("g")
        .call(d3.axisLeft(y))
        .attr("class", "tickLabel")
        .append("text")
        .attr("class", "axisLabel")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "-50px")
        .attr("text-anchor", "end")
        .text("Poverty rate");

    // add scatter plot
    g.append("g")
        .attr("class", "scatterplot")
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.y))
        .attr("r", 2);


    var useExpectation = true;
    var priorWeight = 0.0;
    var priorIntegrator = 0.0;

    function enable_anim() {
        useExpectation = false;
    }

    function disable_anim() {
        useExpectation = true;

    }

    function dwell() {
        priorIntegrator = 0.01;
    }

    function relax() {
        priorIntegrator = -0.05;
    }

    // add interaction
    d3.select("svg")
        .on("mousedown", dwell)
        .on("mouseup", relax)
        .on("mouseenter", enable_anim)
        .on("mouseleave", disable_anim);

    function subsample(arr, n) {
        var length = arr.length;
        var indexs = Array.from({
            length: n
        }, (_) => Math.floor(Math.random() * length));
        var result = [];
        for (var i = 0; i < n; i++) {
            result.push(arr[indexs[i]]);
        }
        return result;

    }

    function setPredictiveScatter(samples) {




        // add scatter plot
        g.append("g")
            .attr("id", "posterior_predictive")
            .attr("class", "scatterplot")
            .selectAll("circle")
            .data(subsample(samples, 150))
            .enter()
            .append("circle")
            .attr("cx", d => x(d.year + 1960))
            .attr("cy", d => y(d.y + 50))
            .attr("r", 1);

    }

    // draw a piecewise linear path, with a given
    // std. dev ribbon plot
    function setLinePath(sampleData, sigma, switchpoint) {
        d3.select("#mean").remove();
        d3.selectAll("#ribbon").remove();
        d3.select("#splitline").remove();


        g.append("path")
            .datum(sampleData)
            .attr("id", "mean")
            .attr("d", line);

        // convert data units to screen units on y axis
        var sigma_width = 2 * (y(0) - y(sigma));

        g.append("path")
            .datum(sampleData)
            .attr("id", "ribbon")
            .attr("stroke-width", sigma_width)
            .attr("d", line);

        g.append("path")
            .datum(sampleData)
            .attr("id", "ribbon")
            .attr("stroke-width", 2 * sigma_width)
            .attr("d", line);


        g.append("line")
            .attr("id", "splitline")
            .attr("x1", x(switchpoint))
            .attr("y1", y(0.0))
            .attr("x2", x(switchpoint))
            .attr("y2", y(100.0));
    }


    ///////////////////////////////////////////////////////////////////////
    // Animation loop
    //

    function clip(x) {
        if (x > 1.0) return 1.0;
        if (x < 0.01) return 0.01;
        return x;
    }
    // update prior weight, by saturated integration
    function updateState() {
        priorWeight = clip(priorWeight + priorIntegrator);
    }

    function drawSample() {
        // select a random sample, and draw the corresponding model

        var var_list = ["sigma", "left_slope", "right_slope",
            "switchpoint", "poverty_at_switchpoint"
        ];
        var pSample;
        d3.selectAll("#posterior_predictive").remove();

        if (useExpectation) {
            // static mean
            pSample = getExpectation(posterior, var_list);
        } else if (priorWeight > 1e-2) {
            // weighted sample between random prior and posterior                    
            pSample = getLinearSample(prior, posterior, var_list, priorWeight);
        } else {
            // plain posterior sample
            var sampleIndex = getSample(posterior, var_list);
            pSample = sampleIndex.sample;
            var pIndex = sampleIndex.index;

            // Note: posterior predictive **does not** match the current posterior trace sample!!!
            // this needs to be fixed
            console.log(arviz_data.posterior_predictive);
            setPredictiveScatter(extractColumnData(arviz_data.posterior_predictive, ["year", "y"]));
        }

        function map_line(at, slope, from, offset) {
            return offset + (at - from) * slope;
        }

        // construct the linear segments
        var sample_data = [{
                year: 1820,
                y: map_line(1820, pSample.left_slope, pSample.switchpoint, pSample.poverty_at_switchpoint)
            },
            {
                year: pSample.switchpoint,
                y: map_line(pSample.switchpoint, pSample.left_slope, pSample.switchpoint, pSample.poverty_at_switchpoint)
            },
            {
                year: 2010,
                y: map_line(2010, pSample.right_slope, pSample.switchpoint, pSample.poverty_at_switchpoint)
            },
        ];

        setLinePath(sample_data, pSample.sigma, pSample.switchpoint);

        // update state variables
        updateState();
    }

    ///////////////////////////////////////////////////////////////////            
    // begin animating the draws
    window.setInterval(function () {
        drawSample();
    }, 50);
}

/////////////////////////////////////////////////////////////////////////////////////
// Entry point        
load_npz("switchpoint.npz").then(npz_data => drawChart(reassemble_arviz(npz_data)));
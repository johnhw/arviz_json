function showStats(arviz) {
    var sample_attrs = arviz.sample_stats.attrs;        

    var kvs = {
      "Inference Library": sample_attrs.inference_library,
      Version: sample_attrs.inference_library_version,
      Date: sample_attrs.created_at
    };

    function createTable(d, fns) {
      var table = [];
      for (k in d) {
        var v = d[k];
        table.push([k].concat(fns.map(fn => fn(v))));
      }
      return table;
    }
    
    if(sample_attrs.graph)
    {
        var variable_table = createTable(sample_attrs.graph, [
        d => d.type,
        d => d.parents.join(", "),
        d => d.distribution.type,
        d => d.distribution.shape
        ]);
    }

    var source = document.getElementById("entry-template").innerHTML;
    var template = Handlebars.compile(source);

    // print shape of arrays nicely
    Handlebars.registerHelper("shape", function(shape) {
      return "(" + shape.join(", ") + ")";
    });

    // print dtypes in a human readable form
    var dtype_names = {
      "<f8": "float64",
      "<f4": "float32",
      "|b1": "boolean",
      "<i8": "int64",
      "<i2": "int16",
      "<i1": "int8",
      "<i2": "int16",
      "<i4": "int32",
      "<u8": "uint64",
      "<u2": "uint16",
      "<u1": "uint8",
      "<u2": "uint16",
      "<u4": "uint32"
    };

    Handlebars.registerHelper("dtype", function(dtype) {
      return dtype_names[dtype];
    });

    // show title cased, deslugified titles
    Handlebars.registerHelper("title", function(title) {
      return (
        title.charAt(0).toUpperCase() + title.slice(1).replace("_", " ")
      );
    });

    // show shortened version of long arrays
    Handlebars.registerHelper("elide", function(seq) {
      if (seq.length > 6) {
        return (
          seq.slice(0, 3).join(", ") + ", ..., " + seq.slice(-3).join(", ")
        );
      } else return seq.join(", ");
    });

    console.log(arviz);

    // template for an xarray, showing the dimensions, coords and vars
    Handlebars.registerPartial(
      "xarray",
      `            
        {{!--  Dimensions   }}
        {{!--               
            <table class="table">                
                <thead class="thead-dark">
                    <tr> <th> Dimension </th> <th> Size </th> 
                </thead>
                
                {{#each dims}}                
                <tr> <td> {{@key}} </td> <td> {{this}} </td> </tr>
                {{/each}}
            </table>            
        --}}
        
        {{!-- Variables; where the real meat is --}}
        <table class="table table-striped table-hover">
            <thead class="thead-dark">
            <tr> <th> Variable </th> <th> Shape </th> <th> dtype </th> </tr>
            </thead>
            {{#each vars}}                
            <tr> <td> {{@key}} </td> <td> {{shape this.shape}} </td> <td> {{dtype this.dtype}} </td> </tr>
            {{/each}}
        </table>


        {{!-- Coordinates --}}

        {{!--
            <table class="table table-striped table-hover">
                    <thead class="thead-dark">
                    <tr> <th> Coord </th> <th> Values </th> </tr>
                    </thead>
                    {{#each coords}}                
                    <tr> <td> {{@key}} </td> <td> {{elide this}} </td> </tr>
                    {{/each}}
                </table>
        --}}

      `
    );

    var html = template({
      title: "Inference results",
      basic_attribute: kvs,
      variable_header: ["Name", "Type", "Parents", "Distribution", "Shape"],

      variable_table: variable_table,
      xarrays: {
        sampler_statistics: arviz.sample_stats,
        observed: arviz.observed_data,
        posterior_trace: arviz.posterior,
        posterior_predictive: arviz.posterior_predictive,
        prior: arviz.prior
      }
    });

    $(".template-holder").append(html);
    console.log(html);

    // add navbar functionality
    // hide all sections but the clicked one
    $("ul.nav li").each(function() {          
      $(this).on("click", function(f) {
        // hide everything
        $(".hideable").each(function() {
          $(this).addClass("d-none");
        });
        // unhide the target
        var target = $(this).attr("data-target");
        $("#" + target).removeClass("d-none");
      });
    });
  }
  /////////////////////////////////////////////////////////////////////////////////////
  // Entry point
  load_npz("switchpoint.npz").then(npz_data => showStats(reassemble_arviz(npz_data)));        
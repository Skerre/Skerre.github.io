import { key_socioe_layer_fillopacity, key_socioe_layer_markers } from "./constants.js";

var interact_maps = {};
var interact_info = {};
var interact_legend = {};


function highlightFeature(elem_id, e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: "#666",
        dashArray: "",
        fillOpacity: 0.7,
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }

    interact_info[elem_id].update(layer.feature.properties);
}

function getScMeans(geojson) {
    let features = geojson.features;
    let values = [];
    for (let i = 0; i < features.length; i++) {
        values.push(features[i].properties._mean);
    }
    return values;
}

// TODO: 
function partitionVals(vals, level) {
    let min = vals[0] == null? 0: vals[0];
    let max = vals[0] == null? 0: vals[0];

    for (let i = 0; i < vals.length; ++i) {
        if (vals[i] < min) {
            min = vals[i];
        }
        if (vals[i] > max) {
            max = vals[i];
        }
    }

    function _counts_bins(left, right, vals) {
        /* This is a helper function */
        var chunk_size = right - left;
        var bin_interval = chunk_size / 3; // div by 3
        var left_bin = [];
        var mid_bin = [];
        var right_bin = [];
        var bins = [left_bin, mid_bin, right_bin];
        var most_points_bin_idx = 0;
        for (let i = 0; i < vals.length; i++) {
            let current_most_piont_bin = bins[most_points_bin_idx];
            if (vals[i] < left + bin_interval && vals[i] >= left) {
                left_bin.push(vals[i]);
                if (left_bin.length > current_most_piont_bin.length) {
                    most_points_bin_idx = 0;
                }
            } else if (vals[i] < left + 2 * bin_interval 
                && vals[i] >= left + bin_interval ) {
                    mid_bin.push(vals[i]);
                if (mid_bin.length > current_most_piont_bin.length) {
                    most_points_bin_idx = 1;
                }
            } else if (vals[i] >= left + 2 * bin_interval && vals[i] < right) {
                right_bin.push(vals[i]);
                if (right_bin.length > current_most_piont_bin.length) {
                    most_points_bin_idx = 2;
                }
            }
        }
        // return the 3 intervals and the bin with most points
        var intervals = [
            [left, left + bin_interval],
            [left + bin_interval, left + 2 * bin_interval],
            [left + 2 * bin_interval, right]
        ]
        var bin_with_most_points = bins[most_points_bin_idx];
        return {intervals, most_points_bin_idx, bin_with_most_points};
    }

    // found the largest boundary
    // partition [min, max] to 3 bins, and count 
    var result_intervals = [[min, max]];
    var current_bin_idx = 0;
    var bin_with_most_points = vals;
    for (let i = 0; i < level; i++) {
        let cur_interval = result_intervals[current_bin_idx];
        let partition_rst = _counts_bins(
            cur_interval[0], cur_interval[1], bin_with_most_points);
        let new_intervals = [];
        new_intervals = new_intervals.concat(
            result_intervals.slice(0, current_bin_idx), 
            partition_rst.intervals,
            result_intervals.slice(current_bin_idx+1, result_intervals.length)
        );
        // update result interval
        result_intervals = new_intervals;
        bin_with_most_points = partition_rst.bin_with_most_points;
        current_bin_idx = current_bin_idx + partition_rst.most_points_bin_idx;
    }
    return result_intervals;
}

var colorMap = {
    7: '#00800A',
    6: '#7BCA0C',
    5: '#E8FF2C',
    4: '#FFFA2C',
    3: '#FFDE2C',
    2: '#FFAF2C',
    1: '#FF362C',
    0: '#FF362C', //#FFEDA0
}

var colorMap_inverted = {
    0: '#00800A',
    1: '#7BCA0C',
    2: '#E8FF2C',
    3: '#FFFA2C',
    4: '#FFDE2C',
    5: '#FFAF2C',
    6: '#FF362C',
    7: '#FF362C', //#FFEDA0
}
    // if (feature.invert_color = false){
    //     console.log("we are not inverted")
    //     return colorMap[bin_idx];
    // }
    // console.log(feature.invert_color)
    // if (feature.invert_color = false){
    //     console.log("we are inverted")
    //     return colorMap_inverted[bin_idx];
    // }
    // else {
    //     console.log("we are not inverted")
    //     return colorMap[bin_idx];
    // }

function getStyleFunc(intervals, geojson) {
    //console.log(geojson.invert_color)
    var check = geojson.invert_color
    //console.log(check)
    function _getColor(v, check) {
        let bin_idx = -1;
        // linear search through intervals        
        for (let i = 0; i < intervals.length; ++i) {
            let x = intervals[i];
            if (v > x[0] && v <= x[1]) {
                bin_idx = i;
            }
        }
        //console.log(check)
        if (check == true){
            //console.log("we are inverted")
            return colorMap_inverted[bin_idx];
        }
        if (check == false){
            //console.log("we are not inverted")
            return colorMap[bin_idx];
        } else {
            //console.log("we are not inverted")
            return colorMap[bin_idx];
        }
        //return colorMap[bin_idx]
    }

    function _getStyle(feature) {
        //  console.log(feature)
        // console.log(geojson)
        return {
            fillColor: _getColor(feature.properties._mean, check),
            weight: 2,
            opacity: 1,
            color: "white",
            dashArray: "3",
            fillOpacity: global_states[key_socioe_layer_fillopacity],
        };
    }
    return _getStyle;
}

function hasNullFeature(geojson, property_name = "_mean") {
    var foundNull = false;
    geojson.features.forEach( (e) => {
        if (e.properties[property_name] == null || e.properties[property_name] == undefined) {
            foundNull = true;
        }
    });
    return foundNull;
}

export let add_interactive_layer_onclick = (map, e, elem_id, geojson) => {
    // console.log('geojson');
    // console.log(getScMeans(geojson));
    // console.log('dynamic intervals');
    var val_intervals = partitionVals(getScMeans(geojson), 3);
    if (val_intervals.length > colorMap.length) {
        window.alert('Add more colorMap entries to make legend working properly.');
    }
    console.log('invert color:',geojson.invert_color)
    console.log('elem-id' + elem_id);
    // console.log(val_intervals);
    if (e.target.checked) {
        // control that shows state info on hover
        interact_info[elem_id] = L.control();

        interact_info[elem_id].onAdd = function (map) {
            this._div = L.DomUtil.create("div", "info");
            this.update();
            return this._div;
        };
        const formatter = new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
        });
        interact_info[elem_id].update = function (props) {
            // console.log(geojson.name)
            // console.log(geojson.details)
            this._div.innerHTML =
                `<h5> ${geojson.name}</h5>` +
                `<p> ${geojson.details} </p>` +
                (props
                    ? "Admin Unit: " + "<b>" + props.NAME_2 + 
                    // "</b><br />" + `<p>${geojson.details}</p>` +
                    "</b><br /> Value : " + formatter.format(props._mean)
                    : "Hover Mouse over ROI");
        };

        interact_info[elem_id].addTo(map);

        var geo;
        function resetHighlight(e) {
            geo.resetStyle(e.target);
            interact_info[elem_id].update();
        }
        function zoomToFeature(e) {
            map.fitBounds(e.target.getBounds());
        }

        function onEachFeature(feature, layer) {
            layer.on({
                mouseover: (e) => {
                    highlightFeature(elem_id, e);
                },
                mouseout: resetHighlight,
                click: zoomToFeature,
            });
            let layer_center = layer.getBounds().getCenter();
            let val_to_display = feature.properties._mean;
            val_to_display = val_to_display? val_to_display:0;
            if (geojson.display__mean) {
                let mean_marker = L.marker(layer_center, {
                    icon: L.divIcon({
                        className: 'label',
                        html: val_to_display.toFixed(2),
                        iconSize: 1,
                    })
                }).addTo(map);
                
                if (global_states[key_socioe_layer_markers] == undefined) {
                    global_states[key_socioe_layer_markers] = [];
                }
                global_states[key_socioe_layer_markers].push(mean_marker);
            }
        }
        geo = L.geoJson(geojson, { style: getStyleFunc(val_intervals, geojson), onEachFeature: onEachFeature });
        // geo = L.geoJson(geojson, { style: getStyleFunc(val_intervals), onEachFeature: onEachFeature });
        geo.addTo(map);
        interact_maps[elem_id] = geo;

        // legend
        interact_legend[elem_id] = L.control({ position: "bottomright" });
        var legendContentId = "legend-content";
        function legendContent() {
            var contentHasNull = hasNullFeature(geojson, '_mean');
            var labels = [];

            for (var i = 0; i < val_intervals.length; i++) {
                let interval = val_intervals[i];
                let legend_color = colorMap[i]; 
                labels.push(
                    '<i style="background:' +
                    legend_color +
                    '"></i> ' +
                    interval[0].toFixed(3) +
                    (interval[1].toFixed(3) != undefined ? " &ndash; " + interval[1].toFixed(3) : "+")
                );  
            }
            if (contentHasNull) {
                labels.push(
                    '<i style="background:white"></i> No data'
                );
            }
            return labels.join("<br>");
        }
        function showLegend() {
            var div = document.getElementById(legendContentId);
            div.innerHTML = legendContent();
        }

        function hideLegend() {
            var legend_content = document.getElementById(legendContentId);
            legend_content.innerHTML = "";
        }

        interact_legend[elem_id].onAdd = function (map, geojson) {
            var div = L.DomUtil.create("div", "info legend");
            div.setAttribute("style", "display: grid;");
            var click_counter = 0;
            var btn = L.DomUtil.create("button", "legend-button", div);
            var legend_content = L.DomUtil.create("div", "", div);
            legend_content.setAttribute("id", legendContentId);
            legend_content.innerHTML = legendContent();
            btn.innerHTML = "Legend"
            //this.btn.innerHTML = `<h5> ${geojson.name}</h5>`

            btn.addEventListener("click", (e) => {
                click_counter += 1;
                // console.log("click_counter", click_counter);
                if (click_counter % 2 == 1) {
                    // hide
                    hideLegend();
                } else {
                    showLegend();
                }
            });
            btn.setAttribute("style", "all: unset; cursor: pointer; margin: auto;");

            return div;
        };

        interact_legend[elem_id].addTo(map);
        function _updateStyleFunc(v) {
            global_states[key_socioe_layer_fillopacity] = parseFloat(v) / 100.0;
            // geo.resetStyle(getStyleFunc(val_intervals));
            let _styleFunc = getStyleFunc(val_intervals, geojson);
            let layers = geo.getLayers();
            for (let i = 0; i < layers.length; i++) {
                let layer = layers[i];
                layer.setStyle(_styleFunc(layer.feature));
            }
        }
        $(`${elem_id}-opacity-val`).on('input', (e) => {
            _updateStyleFunc(e.target.value);
            // change the value of slider
            $(`${elem_id}-opacity-slide`).val(e.target.value);
        });
        // another event listener
        $(`${elem_id}-opacity-slide`).on('input', (e) => {
            _updateStyleFunc(e.target.value);
            // change the value of input field
            $(`${elem_id}-opacity-val`).val(e.target.value);
        });

    } else {
        interact_maps[elem_id].remove();
        interact_info[elem_id].remove();
        interact_legend[elem_id].remove();

        $(`${elem_id}-slide`).on('input', (e) => {
            // empty func
        });

        if (global_states[key_socioe_layer_markers]) {
            global_states[key_socioe_layer_markers].forEach( e => {
                e.remove();
            });
            global_states[key_socioe_layer_markers] = [];
        }
    }
    $(`${elem_id}-slide-div`).toggle();
};
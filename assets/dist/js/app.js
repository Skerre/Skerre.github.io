import { analyze_test } from './data_analyze.js';
import { key_sv_score_entities, key_main_map, key_rect_shape } from './constants.js';
import { add_interactive_layer_onclick } from './interact_map.js';

// 23.02: Fixed decimal for Lat Lng to 2
const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});


// x: lat, y: lng
function isMarkerInsidePolygon(x, y, poly) {
    var inside = false;
    for (var ii = 0; ii < poly.getLatLngs().length; ii++) {
        var polyPoints = poly.getLatLngs()[ii];
        for (var i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
            var xi = polyPoints[i].lat,
                yi = polyPoints[i].lng;
            var xj = polyPoints[j].lat,
                yj = polyPoints[j].lng;
            var intersect =
                yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
    }

    return inside;
}

var basicosm = L.tileLayer(
    "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
    {
        attribution:
            'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: "mapbox/streets-v11",
        tileSize: 512,
        zoomOffset: -1,
        accessToken:
            "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw",
    }
);

$(document).ready(function () {
    var mymap = L.map("mapid", {
        crs: L.CRS.EPSG3857,
        layers: [basicosm]
    }).setView([38.917275, 71.014469], 7);
    mymap.pm.addControls({
        position: "topleft",
        drawCircle: false,
        drawRectangle: false,
        drawCircle: false,
        drawMarker: false,
        drawCircleMarker: false,
        drawPolygon: false,
        drawPolyline: false,
        cutPolygon: false,
        editMode: false,
        dragMode: false,
        rotateMode: false,
    });
    // register mymap into global_states, so it is accessible from outside.
    global_states[key_main_map] = mymap;

    $("#select-data-column").on(
        "click",
        get_onclick_func_for_select_column(mymap)
    );
    fill_modal($("#myModal")[0], mymap);

    /* This example is similar to the leaflet-layer-control.js example:
     * (https://gist.github.com/geog4046instructor/65f38124e3f56f11c9461b23335c0c92)
     * but this example only adds basemaps (tileLayer) to the control.
     */

    // let osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");

    // create a satellite imagery layer
    let satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    );
    let osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
    let mapbox = L.tileLayer(
        "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
        {
            attribution:
                'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, \
                 Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            maxZoom: 18,
            id: "mapbox/streets-v11",
            tileSize: 512,
            zoomOffset: -1,
            accessToken:
                "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw",
        }
    );

    // create an object to hold layer names as you want them to appear in the basemap switcher list
    let basemapControl = {
        OSM: osm,
        Satellite: satellite,
        MapBox: mapbox
    };

    L.control.layers(basemapControl).addTo(mymap);
    // DONE: added scale
    L.control.scale().addTo(mymap);

    mymap.on("pm:drawstart", ({ workingLayer }) => {
        // clean up old rectangular
        if (global_states.hasOwnProperty(key_rect_shape)) {
            global_states[key_rect_shape].remove();
            delete global_states[key_rect_shape];
        }
        workingLayer.on("pm:vertexadded", (e) => {
            console.log({ vertexadded: e });
        });
    });

    mymap.on("pm:create", ({ shape, layer }) => {
        // console.log({ "shape created": shape, "shape obj": layer });
        if (shape == "Rectangle") {
            global_states[key_rect_shape] = layer;
        } else {
            alert("Unknown shape drawn!");
        }
    });

    // aoi_polygon moved to 'assets/dist/js/aoi.js'

    $("#show-aoi").on("click", function (e) {
        console.log("clicked show-aoi link");
        // console.log(e);
        var SHOW_ = "Show Area of Interest";
        var HIDE_ = "Hide Area of Interest";
        if (e.target.innerText == SHOW_) {
            $("#show-aoi").text(HIDE_);
            aoi_polygon.addTo(mymap);
        } else {
            $("#show-aoi").text(SHOW_);
            aoi_polygon.remove();
        }
    });

    var entities = {};
    var scrapped_legend = L.control({ position: "topright" });
    scrapped_legend.onAdd = function (map) {
        var div = L.DomUtil.create("div", "info legend");
        let labels = ["<strong>Legend</strong>"];
        let categories = ["Very High", "High", "Medium", "Low", "Very Low"];
        let cat_colors = ["red", "orange", "yellow", "green", "LightGreen"];

        for (var i = 0; i < categories.length; i++) {
            div.innerHTML += labels.push(
                '<div class="rectangle" style="width:20px; height:10px; display:inline-block; background:' +
                cat_colors[i] +
                '"></div> ' +
                (categories[i] ? categories[i] : "+")
            );
        }
        div.innerHTML = labels.join("<br>");
        return div;
    };
    $("#show-scrapped").on("click", function (e) {
        console.log("show-scrapped clicked");
        var SHOW_ = "Show Vulnerability";
        var HIDE_ = "Hide Vulnerability";

        // color names refer to: https://www.w3schools.com/colors/colors_names.asp

        let color_map = {};

        color_map["Very High"] = "Red";
        color_map["High"] = "Orange";
        color_map["Middle"] = "Yellow";
        color_map["Low"] = "LightGreen";
        color_map["Very Low"] = "Green";

        let legend_container = $("#show-scrapped-legends");
        legend_container.empty(); // remove old content
        legend_container.append(
            $('<p style="padding-left: 20px;"> Categories </p>')
        );

        var _ul_list = $("<ul>");
        for (let entity_type in color_map) {
            var li_item = $("<li>").attr({
                style: "margin-left: 20px; margin-top: 5px;",
            });
            let _check_box = $("<input>").attr({
                type: "checkbox",
                checked: true,
                id: "scrapped-data-ctrl-" + entity_type,
            });

            let _check_box_label = $("<label>").text(entity_type).attr({
                style: "margin-left: 5px; ",
            });

            li_item.append(_check_box);
            li_item.append(
                `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" style="margin-top:-6px;"><circle cx="10" cy="10" r="6" fill="${color_map[entity_type]}" /></svg>`
            );

            li_item.append(_check_box_label);

            _ul_list.append(li_item);
            _check_box.on("click", function () {
                console.log(
                    entity_type.toString(),
                    "checkbox clicked, checked",
                    this.checked
                );
                if (this.checked) {
                    for (let _idx = 0; _idx < entities[entity_type].length; _idx++) {
                        entities[entity_type][_idx].addTo(mymap);
                    }
                } else {
                    for (let _idx = 0; _idx < entities[entity_type].length; _idx++) {
                        entities[entity_type][_idx].remove();
                    }
                }
            });
        }
        
        legend_container.append(_ul_list);
        legend_container.toggle();

        // TODO: toggle data points based on selection.
        if (Object.keys(entities).length == 0) {
            for (let _type in color_map) {
                entities[_type] = [];
            }
        }

        if (e.target.innerText == SHOW_) {
            scrapped_legend.addTo(mymap);
            $.getJSON("/scrapped-data", function (data) {
                for (let idx = 1; idx < data.length; idx++) {
                    var entity1 = data[idx];
                    var latlng = [parseFloat(entity1[1]), parseFloat(entity1[0])];
                    let entity_type1 = entity1[5];
                    let type_remap = "others";
                    // let entity_source = entitiy[6];
                    if (entity_type1 in color_map) {
                        type_remap = entity1[5];
                    }
                    let centroid_color = color_map[type_remap];
                    var c = L.circleMarker(latlng, {
                        radius: 6,
                        color: centroid_color,
                        fillOpacity: 0.6,
                        stroke: false,
                    });
                    c.raw_data = data[idx];
                    // var c = L.marker(latlng);

                    // bind mouse over text message
                    let _msg =
                        "<b> DHS Cluster: " +
                        entity1[2] +
                        "</b> <br>Lat: " +
                        formatter.format(entity1[1]) +
                        ", Lng: " +
                        formatter.format(entity1[0]) +
                        "<br>Vulnerability Class: " +
                        entity1[5] +
                        " <br>" +
                        "Urban / Rural: " +
                        entity1[6];
                    c.bindPopup(_msg);

                    // show and hide the message
                    c.on("mouseover", function () {
                        this.openPopup();
                    });
                    c.on("mouseout", function () {
                        this.togglePopup();
                    });
                    c.on("click", function () {
                        this.togglePopup();
                    });
                    c.addTo(mymap);
                    entities[type_remap].push(c);
                }
            });
            $("#show-scrapped").text(HIDE_);
            global_states[key_sv_score_entities] = entities;

        } else {
            for (let _type in entities) {
                // console.log("remove type", _type, entities[_type]);
                for (let _idx = 0; _idx < entities[_type].length; _idx++) {
                    entities[_type][_idx].remove();
                }
            }
            scrapped_legend.remove();
            entities = {};
            $("#show-scrapped").text(SHOW_);

            delete global_states[key_sv_score_entities];
        }
    });

    $("#draw-aoi").on("click", function (e) {
        if (drawedPolygon == null) {
            alert("Didn't draw the Area of Interests");
            return;
        }
        alert("Capture drawn ploygon " + drawedPolygon._latlngs);

        let points = [];
        for (let _type in entities) {
            for (let _idx = 0; _idx < entities[_type].length; _idx++) {
                let c = entities[_type][_idx];
                let x = c._latlng["lat"];
                let y = c._latlng["lng"];
                let _inside = isMarkerInsidePolygon(x, y, drawedPolygon);
                if (_inside) {
                    points.push(c.raw_data);
                }
            }
        }
        console.log(`num of entities inside poly: ${points.length}`);
        function summary_stat(points) {
            let num_of_types = {};
            for (let pidx in points) {
                let p = points[pidx];
                // heads [lat, lng, name, Score, Urban / Rural, type3, source]
                for (let _i = 3; _i < 6; _i++) {
                    let t = p[_i];
                    if (t != "") {
                        if (t in num_of_types) {
                            num_of_types[t][0] += 1;
                            num_of_types[t][1].push(p);
                        } else {
                            num_of_types[t] = [1, []];
                        }
                    }
                }
            }
            return num_of_types;
        }
        let stat_points = summary_stat(points);

        function _dis(p1, p2) {
            // assume lat, lng in first two fields
            // return distance in meters
            return mymap.distance(
                L.latLng(parseFloat(p1[0]), parseFloat(p1[1])),
                L.latLng(parseFloat(p2[0]), parseFloat(p2[1]))
            );
        }
        function average_points_distance(points) {
            const average = (array) => array.reduce((a, b) => a + b) / array.length;
            let distances = [];
            for (let i = 0; i < points.length; ++i) {
                let p1 = points[i];
                for (let j = i + 1; j < points.length; ++j) {
                    let p2 = points[j];
                    let _d = _dis(p1, p2);
                    distances.push(_d);
                }
            }
            return average(distances);
        }
        function show_stats(_stats) {
            let stat_table = $("#stat-table");
            stat_table.empty();
            for (let _type in stat_points) {
                // filter out some none-sense type
                if (
                    _type == "point_of_interest" ||
                    _type == "internet" ||
                    _type == "building" ||
                    _type == "health"
                ) {
                    continue;
                }
                let avg_dis = "N/A";
                let n = stat_points[_type][0];
                if (n > 2) {
                    avg_dis = average_points_distance(stat_points[_type][1]);
                }
                stat_table.append(
                    `<tr><td>${_type}</td> <td> ${n} </td> <td> ${avg_dis} </td> </tr>`
                );
            }
        }
        show_stats(stat_points);
    });

    $("#fetch-aoi").on("click", function (e) {
        if (drawedPolygon == null) {
            alert("Didn't draw area ploygon");
            return;
        }

        $.getJSON(
            "/user_aoi/" +
            JSON.stringify({
                poly: drawedPolygon._latlngs[0],
                bounds: drawedPolygon._bounds,
            }),
            function (data) {
                console.log("get response from server :");
                console.log(data);
                alert("Fetch status " + data["msg"]);
                $("#fetch-aoi-loading").toggle();
            }
        );
        $("#fetch-aoi-loading").toggle();
    });

    // DONE: BIND these tileLayers to the dropdown menu and rename them
    // I know I am forcing opacity here, so maybe it can be moved to the users manual input (i saw you included some sliders for this purpose) Remove it here if it disturbs your code.

    var SSA1 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:XGBoost_tuned_scaled_clipped_final",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:xgboost",
    });

    var SSA2 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:Random_Forest_tuned_scaled_clp_final",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:xgboost",
    });

    var SSA3 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_NTL",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });

    var SSA4 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_cellt",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });

    var SSA5 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_edu_dd_spd_10k_4326",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });

    var SSA6 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_finan_dd_spd_10k_4326",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });

    var SSA7 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "	sdg-ai-lab:scaled_r_norm_health_dd_spd_10k",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });

    var SSA8 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_maxtemp_feb",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });
    var SSA9 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_pop",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });
    var SSA10 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_precip",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });
    var SSA11 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_road_density",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });
    var SSA12 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_rwi_heatmap_filled_final",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });
    var SSA13 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_slope",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });
    var SSA14 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_NDVI",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });
    var SSA15 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_GDP_2015_intp",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });
    var SSA16 = L.tileLayer.wms("http://129.151.226.125/geoserver/sdg-ai-lab/wms", {
        layers: "sdg-ai-lab:scaled_r_norm_DEM_Large",
        format: "image/png",
        transparent: true,
        version: "1.1.0",
        style: "sdg-ai-lab:ntl_0_255_style"
    });

    var additional_layers = [
        SSA1, // XGboost 1
        SSA2, // Random Forest 2
        SSA5, // edu 3
        SSA6, // finan 4
        SSA7, // health 5
        SSA12, // rwi 6
        SSA15, // gdp 7
        SSA3, // NTL 8
        SSA4, // cellt 9
        SSA9, // pop 10
        SSA11, // road 11
        SSA10, // precp 12
        SSA8, // maxtemp 13
        SSA14, // ndvi 14
        SSA13, // slope 15
        SSA16 // dem 16
    ];

    // Fixed: meaningful names
    var layer_names = [
        "XGBoost SV Prediction",
        "Random Forest SV Prediction",
        "Educational",
        "Financial",
        "Health",
        "Relative Wealth",
        "GPD Income",
        "Nightlight Intensity",
        "Celltower Density",
        "Population Density",
        "Road Density",
        "Precipitation",
        "Maximum Winter Temp",
        "Plant Health",
        "Slope",
        "Elevation"
    ];

    var add_layer_prefix = "add-layer-";
    for (let i = 1; i <= 50; i++) {
        let layer_id = "#" + add_layer_prefix + i.toString();
        let slide_box_id = "#layer-" + i.toString() + "-slide-div";
        let layer_label_id = "#" + add_layer_prefix + i.toString() + "-label";
        let _layer_name = layer_names[i - 1];
        $(layer_label_id).text(_layer_name);

        $(layer_id.toString()).change(function () {
            console.log("Toggled layer " + i + slide_box_id.toString());
            $(slide_box_id.toString()).toggle(this.checked);

            // bind the additional layer control
            if (this.checked) {
                // index fix, i from 1 instead of 0
                let _layer = additional_layers[i - 1];
                _layer.addTo(mymap);
                legend.remove();
                legend2.addTo(mymap);
            } else {
                let _layer = additional_layers[i - 1];
                _layer.remove();
                console.log(_layer);
                legend2.remove();
            }
        });

        let _updateOpacity = (opVal) => {
            let _layer = additional_layers[i - 1];
            _layer.options["opacity"] = parseFloat(opVal) / 100.0;
            _layer.remove();
            _layer.addTo(mymap);
        };
        // DONE: change the opacity of the overlay layer
        $(`#layer-${i}-val`).on("input", (e) => {
            _updateOpacity(e.target.value);
            $(`#layer-${i}-slide`).val(e.target.value);
        });

        $(`#layer-${i}-slide`).on("input", (e) => {
            _updateOpacity(e.target.value);
            $(`#layer-${i}-val`).val(e.target.value);
        });

    }

    // Legends
    var legend = L.control({ position: "topright" });
    legend.onAdd = function (map) {
        var div = L.DomUtil.create("div", "info legend");
        let labels = ["<strong>Legend</strong>"];
        let categories = ["Very High", "High", "Medium", "Low", "Very Low"];
        let cat_colors = ["red", "orange", "yellow", "LightGreen", "Green"];

        for (var i = 0; i < categories.length; i++) {
            div.innerHTML += labels.push(
                '<div class="rectangle" style="width:20px; height:10px; display:inline-block; background:' +
                cat_colors[i] +
                '"></div> ' +
                (categories[i] ? categories[i] : "+")
            );
        }
        div.innerHTML = labels.join("<br>");
        return div;
    };

    // Legends
    var legend2 = L.control({ position: "topright" });
    legend2.onAdd = function (map) {
        var div2 = L.DomUtil.create("div2", "info legend2");
        let labels2 = ["<strong>Geo Layer Legend</strong>"];
        let categories2 = ["Lowest", "Low", "Medium", "High", "Highest"];
        let cat_colors2 = ["CornflowerBlue", "LightGreen", "Yellow", "orange", "red"];

        for (var i = 0; i < categories2.length; i++) {
            div2.innerHTML += labels2.push(
                '<div class="rectangle" style="width:20px; height:10px; display:inline-block; background:' +
                cat_colors2[i] +
                '"></div> ' +
                (categories2[i] ? categories2[i] : "+")
            );
        }
        div2.innerHTML = labels2.join("<br>");
        return div2;
    };

    $("#interact-layer-1").change(function (e) {
        legend.remove();
        add_interactive_layer_onclick(mymap, e, "#interact-layer-1", rf); //
        // let labels = ['<strong>Legend</strong>'];
        // div.innerHTML = labels.join('<br>');
    });
    $("#interact-layer-2").change(function (e) {
        legend.remove();
        add_interactive_layer_onclick(mymap, e, "#interact-layer-2", xgb);
    });
    $("#interact-layer-3").change(function (e) {
        legend.remove();
        add_interactive_layer_onclick(mymap, e, "#interact-layer-3", edu);
    });
    $("#interact-layer-4").change(function (e) {
        legend.remove();
        add_interactive_layer_onclick(mymap, e, "#interact-layer-4", heal);
    });
    $("#interact-layer-5").change(function (e) {
        legend.remove();
        add_interactive_layer_onclick(mymap, e, "#interact-layer-5", finan);
    });
    $("#interact-layer-6").change(function (e) {
        legend.remove();
        add_interactive_layer_onclick(mymap, e, "#interact-layer-6", pop);
    });
    $("#interact-layer-7").change(function (e) {
        legend.remove();
        add_interactive_layer_onclick(mymap, e, "#interact-layer-7", cell);
    });
    $("#interact-layer-8").change(function (e) {
        legend.remove();
        add_interactive_layer_onclick(mymap, e, "#interact-layer-8", ntl);
    });
    $("#interact-layer-9").change(function (e) {
        legend.remove();
        add_interactive_layer_onclick(mymap, e, "#interact-layer-9", ele);
    });
    $("#interact-layer-10").change(function (e) {
        legend.remove();
        add_interactive_layer_onclick(mymap, e, "#interact-layer-10", ndvi);
        legend.remove();
    });
    $("#interact-layer-11").change(function (e) {
        legend.remove();
        add_interactive_layer_onclick(mymap, e, "#interact-layer-11", lu);
    });
    $("#interact-layer-12").change(function (e) {
        legend.remove();
        add_interactive_layer_onclick(mymap, e, "#interact-layer-12", temp);
    });
});


analyze_test();

var show_demo_data = 0;

var intensity_data_mean = 0;

var _dsv_demo_map_circles = [];
var _dsv_demo_processed_data = [];
var _points_legend = undefined;

let __clean_map_circles = () => {
    for (let i = 0; i < _dsv_demo_map_circles.length; i++) {
        _dsv_demo_map_circles[i].remove();
    }
    if (_points_legend != undefined) {
        _points_legend.remove();
    }
};

let _draw_data_points = (map, processed, column_name) => {
    // remove old ones first
    __clean_map_circles();

    _dsv_demo_map_circles = [];
    for (let idx = 0; idx < processed.length; idx++) {
        let e = processed[idx];
        let latlng = [e[0], e[1]];

        let color = undefined;
        let msg = undefined;
        color = "hsl(" + e[2] * 120 + ", 100%, 50%)";
        msg = `<b> Survey point: ${idx} </b> <br> Lat: ${e[0]}, Lng: ${e[1]}, <br>
                ${column_name}: ${e[2]} <br>`;

        var c = L.circleMarker(latlng, { radius: 7, color: color, fillOpacity: 3, stroke: false });
        c.raw_data = e;
        c.bindPopup(msg);
        // show and hide the message
        c.on('mouseover', function () {
            this.openPopup();
        });
        c.on('mouseout', function () {
            this.togglePopup();
        });
        c.on('click', function () {
            this.togglePopup();
        });
        c.addTo(map);

        _dsv_demo_map_circles.push(c);
    }

    var legend = L.control({ position: 'topright' });
    legend.onAdd = function (map) {
        
        var contents = [
            // `<strong>${column_name}</strong>`, 
            '<div style="width:50px; height:10px; display:inline-block; background: linear-gradient(hsl(0, 100%, 50%), hsl(120, 100%, 50%))></div>'
        ];
        var div = $('<div>').attr({class: "info legend width-fixed-200"});
        div.append($('<strong>').text(column_name));
        div.append($('<br>'));
        div.append($('<div>').attr({
            style: "width:80px; height:20px; display:inline-block; background: linear-gradient(0.25turn, hsl(0, 100%, 50%), hsl(120, 100%, 50%)); margin: 5px; float: left",
        }));
        div.append($("<div>").text(": 0 - 1").attr({style: "float:left; margin: 7px; width: auto"}));

        return div[0];
    };
    _points_legend = legend;
    legend.addTo(map);
};

let process_dsv_demo_data = (map, data, column_name) => {
    let _mean = (arr) => {
        let sum = 0;
        for (let i = 0 ; i < arr.length; i++) {
            sum += arr[i];
        }
        return sum / arr.length;
    };

    // fixed decimal places to 2; 28.02.22
    let intensity_vals = [];
    let processed_data = [];
    for (let idx = 1; idx < data.length; idx ++) {
        let entry = data[idx];
        let lat = entry[1].toFixed(2);
        let lng = entry[2].toFixed(2);
        let indicator = entry[3].toFixed(2);

        intensity_vals.push(indicator);
        processed_data.push([lat, lng, indicator]);
    }
    intensity_data_mean = _mean(intensity_vals);

    _dsv_demo_processed_data = processed_data;
    _draw_data_points(map, processed_data, column_name);

};

window.get_onclick_func_for_select_column = (map) => {
    const SHOW_DSV_DATA = "Show DSV Indicators";
    const HIDE_DSV_DATA = "Hide DSV Indicators";
    function _change_text(e) {
        if (show_demo_data == 0) {
            show_demo_data += 1;
            $("#"+e.target.id).text(HIDE_DSV_DATA);
        } else {
            show_demo_data -= 1;
            $("#" + e.target.id).text(SHOW_DSV_DATA);
        }
        $("#show-dsv-column-selection").toggle();
    }

    // I added some new elements here. Is this correct?
    // No, following functions are not going to work any more. 
    // because contents in the modal window are dynamically generated 
    // check the `_handle_column_select` function below

    /**
     *  added data 
     * */ 
    function _onclick(e) {
        _change_text(e);
        console.log("Target_id:",e.target.id)
        if (show_demo_data > 0) {
            let default_column_name = "How often uses internet";
            $.getJSON(
                `dsv-indicators/${default_column_name}`,
                (data) => {
                    console.log(data)                                                             // Data is being fetched here!
                    process_dsv_demo_data(map, data, default_column_name);
                }
            );
        } else {
            __clean_map_circles();
        }
    }
    return _onclick;
}

let get_modal_entry = (name, idx, fn) => {
    console.log("Column found: ",idx)
    let entry = $('<div>').attr({class:"form-check"});
    let input_item = $('<input>').attr({
        class: "form-check-input",
        type: "radio",
        name: `modal-entry-input`,
        id: `modal-entry-input-id-${idx}`
    });
    if (idx == 0) {
        input_item.attr({checked:true});
    }
    let label = $('<label>').attr({
        class: "form-check-label",
        for: `modal-entry-input-id-${idx}`
    });
    
    label.append(name);
    entry.append(input_item);
    entry.append(label);

    input_item.on('click', fn);

    return entry;
}

let _handle_column_select = (entry_idx, entry_key, map) => {
    return (e) => {
        console.log(`clicked entry ${entry_idx}, ${entry_key}`);
        $.getJSON(`dsv-indicators/${entry_key}`, (data) => {
            process_dsv_demo_data(map, data, entry_key);
        });
    }
};

// pass in the map object, because later modal selection is operating on the map
window.fill_modal = (modal_elem, map) => {
    $.getJSON("assets/dist/user_data/somedata.json", function(json_data) {
        console.log(json_data);

        let modal_content = $("#" + modal_elem.id + " .modal-content .modal-body")[0];

        modal_content = $(modal_content);
        modal_content.empty();
        let modal_content_form = $('<form>');

        let entry_idx = 0;
        for (let key in json_data) {
            console.log(key, json_data[key]);
            let entry = get_modal_entry(key, 
                entry_idx, _handle_column_select(entry_idx, key, map));
            modal_content_form.append(entry);
            entry_idx ++;
        }
        modal_content.append(modal_content_form);
    });
}


// export {get_onclick_func_for_select_column};
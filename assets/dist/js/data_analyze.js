import './global_states.js';
import { key_rect_shape, key_sv_score_entities } from './constants.js';

function sv_points_within_rect(rect) {
    let upper_right = rect._bounds._northEast;
    let lower_left = rect._bounds._southWest;
    let rst = [];
    if (global_states.hasOwnProperty(key_sv_score_entities)) {
        let entities = global_states[key_sv_score_entities];
        // console.log(entities)
        for (let category in entities) {
            for (let p of entities[category]) {
               let _lat = p._latlng['lat'];
               let _lng = p._latlng['lng'];
               if (_lat > lower_left.lat && _lat < upper_right.lat && 
                _lng > lower_left.lng && _lng < upper_right.lng) {
                    rst.push(p);
                }
            }
        }

    } else {
        alert("No sv data points on the map");
    }
    return rst;
}

export function handle_analyze_click(e) {
    if (global_states.hasOwnProperty(key_rect_shape)) {
        let rect = global_states[key_rect_shape];
        let data_entities = sv_points_within_rect(rect);
        console.log(data_entities);
        alert("Selected boundary has " + data_entities.length + " items");
    } else {
        alert("No area is selected");
    }
}

export function analyze_test() {
    console.log("hello from module");
}

document.querySelector('#analyze-button').addEventListener('click', handle_analyze_click);
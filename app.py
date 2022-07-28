from distutils.log import debug
from flask import Flask, request, send_from_directory, send_file
import json
import csv
import os
from typing import List
import pandas as pd

# set the project root directory as the static folder, you can set others.
app = Flask("DSVI_Tajikistan_Web_Demo", static_url_path="")


@app.route("/assets/<path:path>")
def send_assets(path):
    return send_from_directory("assets", path)

user_defined_aoi_data = []

@app.route("/scrapped-data")
def send_data():
    if len(user_defined_aoi_data) == 0:
        data_file = "assets/SV_scores.csv"
        if not os.path.exists(data_file):
            raise RuntimeError(f"file not exist: {data_file}")
            ### Fixed encoding, when the csv file has a faulty encoding:
        with open(data_file, encoding = "ISO-8859-1") as in_file:
            reader = csv.reader(in_file)
            data = list(reader)
        return json.dumps(data)
    else:
        return json.dumps(user_defined_aoi_data)

def _check_file(filepath):
    if not os.path.exists(filepath):
        raise RuntimeError(f'file not found {filepath}')

@app.route("/dsv-demo-data")
def new_demo_data():
    data_file = "assets/demotool_data.csv"
    _check_file(data_file)
    
    with open(data_file ) as in_file:
        reader = csv.reader(in_file)
        data = list(reader)
    return json.dumps(data)

@app.route("/dsv-indicators/<column_name>")
def get_data_by_column_name(column_name):
    """
    Missing
    """
    data_file = "assets/demotool_data.csv"
    print(f"Get request from column name {column_name}")

    column_name = column_name.strip()
    _check_file(data_file)
    d = pd.read_csv(data_file)
    res_data = list(zip(d["Cluster number"], d["lat"], d["lon"], d[column_name]))
    print("First Entry of lat",res_data["lat"][0])
    return json.dumps(res_data)
    

@app.route("/user_aoi/<polygon>")
def user_aoi(polygon):
    """TODO: invoke data fetching procedure from OSM data"""
    polygon = json.loads(polygon)
    def _compile_polygon_as_list(points) -> List[List]:
        ret = []
        for p in points:
            latlng = [p['lat'], p['lng']]
            ret.append(latlng)
        return ret
    print(f"get a user defined AOI {polygon}")

    global user_defined_aoi_data
    user_defined_aoi_data = scraping(_compile_polygon_as_list(polygon['poly']))
    # return json.dumps(fetched_entities)
    print(f'fetched for user {len(user_defined_aoi_data)}')
    return json.dumps({"msg": "ok"})


@app.route("/")
def main():
    return send_file("index.html")


if __name__ == "__main__":
    app.config["CACHE_TYPE"] = "null"
    app.run()

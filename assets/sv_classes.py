# -*- coding: utf-8 -*-
"""
Created on Wed Jul 27 00:13:39 2022

@author: martin.szigeti
"""

import pandas as pd

df = pd.read_csv(r"C:\Users\martin.szigeti\Documents\GitHub\DSV_Tool_Demo\web_demo\assets/Cleaned_dataset_final.csv")

def sv_scorer(sv):
    if sv == 1:
        return "Very High"
    if sv == 2:
        return "High"
    if sv == 3:
        return "Middle"
    if sv == 4:
        return "Middle"
    if sv == 5:
        return "Low"
    if sv == 6:
        return "Very Low"
    else:
        return False
# create a new column based on condition
df['Score'] = df['SV_scaled_std'].apply(sv_scorer)
# display the dataframe

df.to_csv(r"C:\Users\martin.szigeti\Documents\GitHub\DSV_Tool_Demo\web_demo\assets/Cleaned_dataset_final.csv", index = False)

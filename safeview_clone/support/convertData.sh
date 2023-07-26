#!/bin/bash
if [ -z "$1" ]
then
    echo "Defaulting data directory to '../data'"
    dir="../data"
else
    dir="$1"
fi

for system_dir in "$dir"/* 
do
    echo "Converting $system_dir ..";
    for harm in "$system_dir"/* 
    do
        echo "Converting $harm ..";
        python3 convert.py "$harm";
    done
done

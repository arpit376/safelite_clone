"""
Ok... so this file is just an emulated data base, loading files from the file system and storing them in memory. From
there, any requests to the server will be read from the servers memory (this is essentially how it is currently done
and I of course intend to replace it with a database - this is just temporary to mimic the original server in DJango).
"""
import os

from safeviewservice.models import *
from pathlib import Path
import json
import lxml.etree as etree

_initialised = False
SYSTEMS = dict()


def cached_data():
    if not _initialised:
        load_data()
    else:
        return SYSTEMS


def load_data():
    # Read the systems (directories within the data folder).
    system_paths = get_system_paths()

    for system_path in system_paths:
        snapshots = [item for item in system_path.iterdir()]
        harms = list()

        for snapshot in snapshots:
            harms.append(parse_harm(json.load(snapshot.open('r'))))

        SYSTEMS[system_path] = System(system_path, harms)


def parse_harm(json_harm):
    host_list = []
    # Iterate over the nodes dict.
    for json_host in json_harm["nodes"]:
        # The first layer is entirely hosts & each one will contain A SINGLE root vulnerability tree element in it's
        # list of children.
        if len(json_host["children"]) > 0:
            vulnerability_tree = parse_vulnerability_tree(json_host["children"][0])
        else:
            vulnerability_tree = None
        host = Host(json_host["id"], json_host["name"], json_host["value"], vulnerability_tree)
        host_list.append(host)

    links = []
    # Iterate over the edges / links dict.
    for json_link in json_harm["links"]:
        link = (host_list[json_link["source"]].uid, host_list[json_link["target"]].uid)
        links.append(link)

    # Convert host list to a dictionary of hosts with id's as keys.
    host_dict = dict()
    for host in host_list:
        host_dict[host.uid] = host

    return Harm(host_dict, links)


def parse_vulnerability_tree(json_element):
    """
    Takes the children list of each host in json and converts it into a object based vulnerability tree.
    :param json_element:     The json decoded list of a given hosts "children".
    :return:                        The root of the vulnerability tree (either a Vulnerability or a [logical] Gate).
    """
    # First we check if we are at a leaf (sibling in json encoding).
    # NOTE: This is the recursive base / terminating case.
    if json_element["type"] == "sibling":
        return Vulnerability(json_element["id"], json_element["name"], json_element["value"])
    # Otherwise, we check if we are at a Gate (AND or OR).
    elif json_element["type"] == "or" or json_element["type"] == "and":
        children = [parse_vulnerability_tree(child) for child in json_element["children"]]
        return Gate(json_element["id"], json_element["type"], children)
    else:
        # TODO: Definitely should have some kind of error in this case.
        return None


def get_system_paths():
    """
    Gets the currently existing systems in the data folder.
    Systems exist as directories within this folder, each containing all the snapshots of the system states as
    json formatted HARMs.
    :return:
    """
    data_folder = Path("./data")
    systems = [item for item in data_folder.iterdir() if item.is_dir()]
    return systems


########################################################################################################################
# Method 2
# Supporting the following restful interface.
# GET   /systems/
#           returns a list of system id's for choice, like the original (current) "system1".
#           used to display what systems are available to choose from.
# GET   /systems/<system_id>/
#           used to get the full data harms of a chosen system.
########################################################################################################################
def get_systems():
    systems = os.listdir("./data")

    xml_systems = etree.Element('systems')
    for system_id in systems:
        xml_system = etree.Element('system', attrib={'id': system_id})
        xml_systems.append(xml_system)
    return xml_systems


def get_system(system_id):
    # NOTE: This is entirely optimistic - ssh, no tears.
    snapshots = list()  # AKA harms
    # Create the system path.
    system_path = "./data/{0}/".format(system_id)
    # Get the path of all snapshots within the systems.
    snapshots = [snapshot_file.strip(".xml") for snapshot_file in os.listdir(system_path)]
    xml_system = etree.Element('system', attrib={'id': system_id})
    for harm_id in snapshots:
        xml_harm = etree.Element('harm', attrib={'id': harm_id})
        xml_system.append(xml_harm)
    return xml_system


def get_harm(system_id, harm_id):
    # NOTE: This is entirely optimistic - ssh, no tears.
    # Create the system path.
    system_path = "./data/{0}/".format(system_id)
    # Get the path of all snapshots within the systems.
    for snapshot_filename in os.listdir(system_path):
        if snapshot_filename.strip(".xml") == harm_id:
            snapshot_path = system_path + "/" + snapshot_filename
            return etree.parse(open(snapshot_path)).getroot()
            # ...much optimism is needed.

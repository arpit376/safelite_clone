from django.db import models
from pathlib import Path


# Create your models here.
# NOTE: Currently the models are simple - not hooked into DJango's migration system or any DB, purely memory based.
class Harm:
    def __init__(self, nodes, edges):
        # A dictionary of node IDs to node objects.
        self.nodes = nodes
        # A list of two ID tuples representing the edge.
        self.edges = edges


class Host:
    def __init__(self, uid, name, impact, vulnerability_tree):
        self.uid = uid
        self.name = name
        self.impact = impact
        # Points to the root element of the vulnerability tree.
        self.vulnerability_tree = vulnerability_tree


class Vulnerability:
    def __init__(self, uid, name, prob_of_exploitation):
        self.uid = uid
        self.name = name
        self.prob_of_exploitation = prob_of_exploitation


class Gate:
    def __init__(self, uid, operator, children):
        self.uid = uid
        self.operator = operator
        self.children = children


class System:
    def __init__(self, path, snapshots=None):
        self.path = path
        self.snapshots = snapshots if snapshots is not None else []

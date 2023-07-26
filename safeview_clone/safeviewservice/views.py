from __future__ import print_function

import json
import os
import time

import lxml.etree as etree
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from harmat import write_to_file, convert_to_xml, parse_xml, convert_to_safeview
from harmat.parsers.tiscovery_parser import tiscovery_parser
from harmat.parsers.xml_parser import convert_edge_to_xml
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework_xml.parsers import XMLParser
from rest_framework_xml.renderers import XMLRenderer
from six.moves import queue
from tiscovery.sniffer import run_sniffer

from cluster.models import Cell
from cluster.tools.scanner import create_scan, get_progress, get_json_report
from cluster.tools.activescan import nmapScanner
from safeviewservice import data
from safeviewservice.serializers import UserSerializer
from cvss import CVSS, CVSSConversionError

__SLEEP_INTERVAL = 10
__SYSTEM_PATH = 'data'

@ensure_csrf_cookie
def ajax_scan_all(request):
    if request.method != 'POST':
        raise Exception('Invalid request method')

    cell = Cell.objects.first()
    scan_queue = queue.Queue()  # queue for vul scans
    result_name = request.POST['name']
    system_id = request.POST['system_id']

    # find all relevant hosts
    _dump = os.path.join("results", "network", "%s.json" % result_name)
    with open(_dump, 'r') as ufile:
        upper = json.load(ufile)
        for host in upper['nodes']:
            host_id = host['id']
            if host_id != "Attacker":  # don't scan Attacker
                scan_queue.put(host_id)

    while not scan_queue.empty():
        scan_host(cell, scan_queue.get(), result_name, system_id)

    return render(request, "safeview/index.html")


@ensure_csrf_cookie
def ajax_delete_harm(request):
    if request.method == 'POST':
        system = request.POST['system']
        harm = request.POST['harm']
        for xml in os.listdir(os.path.join(__SYSTEM_PATH, system)):
            if harm in xml:
                os.remove(os.path.join(__SYSTEM_PATH, system, xml))
                break
    return render(request, "safeview/index.html")

def scan_host(cell, target, result_name, system_id):
    print("scanning host...", target)
    scan_id = create_scan(cell, target)
    while True:
        progress = get_progress(cell, scan_id)
        print(progress)
        if progress == 100.0:
            break
        time.sleep(__SLEEP_INTERVAL)
    _dump = os.path.join("results", "network", "%s.json" % result_name)
    _output = os.path.join('data', system_id, '%s.xml' % result_name)
    with open(_dump, 'r') as ufile:
        upper = json.load(ufile)
        try:
            json_file = open(get_json_report(cell, scan_id, target))
        except TypeError: # no scan found
            return None
        with json_file as lfile:
            for u in upper['nodes']:
                if u['id'] == target:
                    u['vulnerabilities'] = []
                    for l in json.load(lfile):
                        nvt = l['nvt']
                        cvss_base_vector = nvt['tags'][17:43]
                        u['vulnerabilities'].append({
                            nvt['name']: {
                                'risk': float(nvt['cvss_base']),
                                'probability': float(nvt['cvss_base']) / 10,
                                'cost': 1,
                                'impact': 1,
                                'cve': ", ".join(nvt['cves']),
                                'info': nvt['tags'][52:],
                                'cvss_base_vector': cvss_base_vector
                            }
                        })
                    break
    with open(_dump, 'w') as ufile:
        ufile.write(json.dumps(upper))
    write_to_file(convert_to_xml(tiscovery_parser(_dump)), _output)

@ensure_csrf_cookie
def ajax_scan_host(request):
    if request.method == 'POST':
        cell = Cell.objects.first()
        target = request.POST["ip"]
        result_name = request.POST["name"]
        system_id = request.POST["system_id"]
        scan_host(cell, target, result_name, system_id)
    return render(request, "safeview/index.html")


@ensure_csrf_cookie
def ajax_update_file(request):
    if request.method != 'POST':
        raise Exception('Invalid request method')
    result_name = request.POST['name']
    system_id = request.POST['system_id']
    configs = {
        'percent' : float(request.POST['percent']) / 100,
        'alpha' : float(request.POST['alpha']),
        'entry_points': request.POST['entry_points'].split('\n')
    }
    _output = os.path.join('data', system_id, '%s.xml' % result_name)
    output = os.path.join('data', system_id, '%s_harm.xml' % result_name)
    h = parse_xml(_output)
    with open(_output, 'rb') as file:
        old_xml = etree.parse(file).getroot()
    new_xml = convert_to_safeview(h, configs)
    write_to_file(merge_xml(old_xml, new_xml), output)
    return render(request, "safeview/index.html")

@ensure_csrf_cookie
def ajax_delete_file(request):
    if request.method != 'POST':
        raise Exception('Invalid request method')
    result_name = request.POST['name']
    system_id = request.POST['system_id']
    os_path = os.path.join('data', system_id, '%s.xml' % result_name)
    os.remove(os_path)
    return render(request, "safeview/index.html")


def is_in(old_node, new_nodes):
    for new_node in new_nodes:
        if old_node.attrib['name'] == new_node.attrib['name']:
            return True
    return False

def merge_xml(old, new):
    inverse_mapping_dict = {}
    for index, node in enumerate(old[0]):
        inverse_mapping_dict[str(index)] = node.attrib['name']

    nodes_to_add = []
    for old_node in old[0]:
        if not is_in(old_node, new[0]):
            nodes_to_add.append(old_node)
    new[0].extend(nodes_to_add)

    index_mapping_dict = {}
    for index, node in enumerate(new[0]):
        index_mapping_dict[node.attrib['name']] = str(index)
    # find new mapping
    edges_to_add = []
    for edge in old[1]:
        s = index_mapping_dict[inverse_mapping_dict[edge[0].text]]
        t = index_mapping_dict[inverse_mapping_dict[edge[1].text]]
        edges_to_add.append(convert_edge_to_xml(s,t))
    new[1].extend(edges_to_add)
    return new

def upload_file(request):
    #system_id = request.POST['system_id']
    system_id = 'field'
    for key, file in request.FILES.items():
        name = os.path.splitext(os.path.basename(file.name))[0]

        _dir = os.path.join("results", "network")
        _network_dir = os.path.join('data', system_id)
        _dump = os.path.join("results", "network", "%s.json" % name)
        _output = os.path.join('data',system_id ,'%s.xml' % name)
        if not os.path.exists(_dir):
            os.makedirs(_dir)
        if not os.path.exists(_network_dir):
            os.makedirs(_network_dir)

        dest = open(_dump, 'w')
        # Write uploaded file to directory
        if file.multiple_chunks:
            for c in file.chunks():
                dest.write(c)
        else:
            dest.write(file.read())
        dest.close()

        h = tiscovery_parser(_dump)
        write_to_file(convert_to_xml(h), _output)
    return render(request, "safeview/index.html")


@ensure_csrf_cookie
def toggle_data_collection(request):
    if request.method == 'POST':
        duration = int(request.POST["duration"])
        name = request.POST["name"]
        system_id = request.POST['system_id']
        print("Data collection for %d seconds" % duration)
        _dir = os.path.join("results", "network")
        _network_dir = os.path.join('data', system_id)
        _dump = os.path.join("results", "network", "%s.json" % name)
        _output = os.path.join('data', system_id, '%s.xml' % name)
        if not os.path.exists(_dir):
            os.makedirs(_dir)
        if not os.path.exists(_network_dir):
            os.makedirs(_network_dir)
        run_sniffer(_dump, "config.json", timeout=duration)
        h = tiscovery_parser(_dump)
        print("Data collection finished")
        write_to_file(convert_to_xml(h), _output)
    return render(request, "safeview/index.html")

def network_discovery(request):
    if request.method == 'POST':
        # TODO: input validation
        name = request.POST['name']
        system_id = request.POST['system_id']
        filterstr = request.POST['filter']
        scantype = int(request.POST['scan_type'])
        extra_args = request.POST['args']

        if scantype == 0:
            raise NotImplementedError()
        elif scantype == 1:
            scanner = nmapScanner(filterstr, extra_args=extra_args)
        else:
            raise TypeError("scantype is wack! Should be either 0 or 1 but got: {}".format(scantype))
        with open('config.json', 'r') as json_file:
            config = json.load(json_file)
            gateway = config['gateway']
        output = scanner.to_dict(gateway)
        _dump = os.path.join("results", "network", "%s.json" % name)
        network_dir = os.path.join("results", "network")
        _output = os.path.join('data', system_id, '%s.xml' % name)
        if not os.path.exists(network_dir):
            os.makedirs(_dump)
        with open(_dump, 'w') as json_dump:
            json_dump.write(json.dumps(output))
        h = tiscovery_parser(_dump)
        write_to_file(convert_to_xml(h), _output)
    return render(request, "safeview/index.html")

class SafeviewView(APIView):
    """
    A view that returns the harm data in XML format.
    """
    renderer_classes = (XMLRenderer,)
    parser_classes = (XMLParser,)

    def get(self, request):
        return render(request, "safeview/index.html")


class SystemList(APIView):
    """
    A view that returns the harm data in XML format.
    """
    renderer_classes = (XMLRenderer,)
    parser_classes = (XMLParser,)
    def get(self, request):
        et_systems = data.get_systems()
        systems_str = etree.tostring(et_systems)
        return HttpResponse(systems_str, content_type="xml")


class SystemDetail(APIView):
    """
    A view that returns the harm data in XML format.
    """
    renderer_classes = (XMLRenderer,)
    parser_classes = (XMLParser,)

    def get(self, request, system_id):
        et_system = data.get_system(system_id)
        system_str = etree.tostring(et_system, encoding='utf8', method='xml')
        return HttpResponse(system_str, content_type="xml")


class HarmDetail(APIView):
    """
    A view that returns the harm data in XML format.
    """
    renderer_classes = (XMLRenderer,)
    parser_classes = (XMLParser,)

    def get(self, request, system_id, harm_id):
        et_harm = data.get_harm(system_id, harm_id)
        harm_str = etree.tostring(et_harm, encoding='utf8', method='xml')
        return HttpResponse(harm_str, content_type="xml")


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

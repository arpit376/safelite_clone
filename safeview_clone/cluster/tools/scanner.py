from __future__ import print_function
import os
import time
import json
from openvas_lib import VulnscanManager, report_parser
from openvas_lib import VulnscanServerError, VulnscanScanError
from openvas_lib.common import AuditNotFoundError
from xml.etree import ElementTree
from logger import SafeliteLogger

OPENVAS_PROFILES = [
    (1, 'Discovery'),
    (2, 'Full and fast'),
    (3, 'Full and fast ultimate'),
    (4, 'Full and very deep'),
    (5, 'Full and very deep ultimate'),
    (6, 'Host Discovery'),
    (7, 'System Discovery')
]


log = SafeliteLogger('Scanner')

def _try_connect_to_server(host, username, password, port=9390, interval=10):
    host = str(host)
    log.info('Attempting to connect to OpenVAS server at: ' + host)
    scanner = VulnscanManager(str(host), str(username), str(password), port=port, timeout=100)
    log.info('Successfully connected to server {}'.format(host))
    return scanner


def create_scan(cell, target, prof=None):
    log.info('Initiating scan on %s' % target)
    if cell.vendor == 1:
        scanner = _try_connect_to_server(cell.ip, cell.username, cell.password, port=cell.port)
        try:
            profile = 'Discovery'
            for index, name in OPENVAS_PROFILES:
                if cell.profile == index:
                    profile = name
                    break
            print(profile)
            if prof is not None:
                profile = prof
            scan_id, _ = scanner.launch_scan(target=str(target), profile=str(profile))
            return scan_id
        except VulnscanScanError:
            log.warning('Scanner is not ready, please wait for a while...')
    else:
        raise NotImplementedError
    return None


def get_progress(cell, scan_id):
    log.info('Fetching scan progress %s' % scan_id)
    if cell.vendor == 1:
        scanner = _try_connect_to_server(cell.ip, cell.username, cell.password, port=cell.port)
        for id_ in scanner.get_all_scans.values():
            if scan_id == id_:
                return scanner.get_progress(str(scan_id))
    else:
        raise NotImplementedError
    return 0.0


def delete_scan(cell, scan_id):
    log.info('Deleting scan %s' % scan_id)
    if cell.vendor == 1:
        scanner = _try_connect_to_server(cell.ip, cell.username, cell.password, port=cell.port)
        try:
            scanner.delete_scan(str(scan_id))
        except AuditNotFoundError:
            log.warning('Failed to delete scan %s' % scan_id)
    else:
        raise NotImplementedError


def get_xml_report(cell, scan_id, target, outpath='results'):
    log.info('Fetching xml scan report for %s' % target)
    if not os.path.exists(outpath):
        os.mkdir(outpath)
    if cell.vendor == 1:
        scanner = _try_connect_to_server(cell.ip, cell.username, cell.password, port=cell.port)
        xml_outfile = os.path.join(outpath, '%s.xml' % target)
        report_id = scanner.get_report_id(str(scan_id))
        response = scanner.get_report_xml(report_id)
        ElementTree.ElementTree(response[0]).write(xml_outfile)
        return xml_outfile
    else:
        raise NotImplementedError


def get_json_report(cell, scan_id, target, outpath='results'):
    _REPLACE_ATTRIBS = ['_OpenVASResult__', '_OpenVASNVT__', '_OpenVASPort__']
    log.info('Fetching json scan report for %s' % target)
    if not os.path.exists(outpath):
        os.mkdir(outpath)
    if cell.vendor == 1:
        json_outfile = os.path.join(outpath, '%s.json' % target)
        xml_outfile = get_xml_report(cell, str(scan_id), str(target), outpath=outpath)
        report_content = report_parser(xml_outfile, False)
        with open(json_outfile, 'w') as ofile:
            jsonstring = json.dumps(report_content, default=lambda o: o.__dict__)
            for attr in _REPLACE_ATTRIBS:
                jsonstring = jsonstring.replace(attr, '')
            ofile.write(jsonstring)
        return json_outfile
    else:
        raise NotImplementedError()

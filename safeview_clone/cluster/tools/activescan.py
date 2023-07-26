from __future__ import print_function
import nmap

class nmapScannerError(Exception): pass

class nmapScanner(nmap.PortScanner):
    def __init__(self, ip, extra_args=''):
        super(nmapScanner, self).__init__()
        self.ip = ip
        self.extra_args=extra_args

    def to_dict(self, gateway_ip):
        print('nmap scanning')
        self.scan(hosts=self.ip, arguments=self.extra_args)
        print('nmap scanning finished')
        all_hosts = self.all_hosts()
        hostlist = [{'id': host, 'scanned': False} for host in all_hosts]
        linklist = [{'source': gateway_ip, 'target': host} for host in all_hosts if host != gateway_ip]
        out_dict = {'nodes': hostlist, 'links': linklist}
        return out_dict



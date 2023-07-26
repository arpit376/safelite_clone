class CVSS(object):
    cvss_base_dict ={
        'access_vector': {
            'L': 0.395,
            'A': 0.646,
            'N': 1.0
        },
        'access_complexity': {
            'H': 0.35,
            'M': 0.61,
            'L': 0.71
        },
        'authentication': {
            'M': 0.45,
            'S': 0.56,
            'N': 0.704
        },
        'confidentiality': {
            'N': 0,
            'P': 0.275,
            'C': 0.660
        },
        'integrity': {
            'N': 0,
            'P': 0.275,
            'C': 0.660
        },
        'availability': {
            'N': 0,
            'P': 0.275,
            'C': 0.660
        },
    }

    def __init__(self, cvss_base_vector_string):
        if len(cvss_base_vector_string) != 26:
            raise CVSSConversionError('invalid cvss base vector')
        self.vector_string = cvss_base_vector_string
        self.dictified = {}
        self.dictify()

    def dictify(self):
        vs = self.vector_string
        self.dictified['access_vector'] = self.cvss_base_dict['access_vector'][vs[3]]
        self.dictified['access_complexity'] = self.cvss_base_dict['access_complexity'][vs[8]]
        self.dictified['authentication'] = self.cvss_base_dict['authentication'][vs[13]]
        self.dictified['confidentiality'] = self.cvss_base_dict['confidentiality'][vs[17]]
        self.dictified['integrity'] = self.cvss_base_dict['integrity'][vs[21]]
        self.dictified['availability'] = self.cvss_base_dict['availability'][vs[25]]

    def impact(self):
        int_sum = self.dictified['confidentiality'] + self.dictified['integrity'] + self.dictified['availability']
        return int_sum / (0.66 * 3)

class CVSSConversionError(Exception): pass

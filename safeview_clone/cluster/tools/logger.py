import logging


class SafeliteLogger(logging.Logger):
    def __init__(self, name, level=0):
        super(SafeliteLogger, self).__init__(self)
        self.name = name
        self.setLevel(logging.DEBUG)
        fh = logging.FileHandler('safelite.log')
        fh.setLevel(logging.DEBUG)
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)
        self.addHandler(fh)
        self.addHandler(ch)

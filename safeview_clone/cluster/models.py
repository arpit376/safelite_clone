from django.db import models
from cluster.tools.scanner import create_scan, delete_scan


OPENVAS_PROFILES = [
    (1, 'Discovery'),
    (2, 'Full and fast'),
    (3, 'Full and fast ultimate'),
    (4, 'Full and very deep'),
    (5, 'Full and very deep ultimate'),
    (6, 'Host Discovery'),
    (7, 'System Discovery')
]


class Cell(models.Model):
    name = models.CharField(max_length=100)
    ip = models.CharField(max_length=100)
    username = models.CharField(max_length=20)
    password = models.CharField(max_length=20)
    port = models.IntegerField(default=9390)
    profile = models.IntegerField(choices=OPENVAS_PROFILES, default=1)
    vendor = models.IntegerField(choices=[
        (1, "openvas")
    ], default=1)

    class Meta:
        ordering = ('name', )

    def save(self, *args, **kwargs):
        super(Cell, self).save(*args, **kwargs)

    def __unicode__(self):
        return '%s' % (self.name)


class Scan(models.Model):
    name = models.CharField(max_length=100)
    target = models.GenericIPAddressField()
    cell = models.ForeignKey(Cell, on_delete=models.CASCADE, related_name='cell_scan')
    scan_id = models.CharField(max_length=100)

    class Meta:
        ordering = ('name', )

    def save(self, *args, **kwargs):
        if not self.pk:
            profile = OPENVAS_PROFILES[0][0]
            for id_, pro  in OPENVAS_PROFILES:
                if self.cell.profile == id_:
                    profile = pro
                    break
            self.scan_id = create_scan(self.cell, self.target)
        super(Scan, self).save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.pk:
            delete_scan(self.cell, self.scan_id)
        super(Scan, self).delete(*args, **kwargs)

    def __unicode__(self):
        return '%s' % (self.name)

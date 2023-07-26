# Safelite

Currently only supports Python 2.7.




## Installation Instructions

### 1. Clone this repository including submodules.

```
git clone https://bitbucket.org/safeviewserver/safeview --recursive

```

### 2. Install its dependencies.

Use pip or otherwise to install required packages.

```
cd safeview
pip install -r requirements.txt
```

### 3. Install harmat and tiscovery

```
cd harmat
python setup.py install
cd ../tiscovery
python setup.py install
```

For this I would recommend using a virtualenv.

### 4. Installing nmap + OpenVAS

Installing nmap differs between Operating Systems.
Refer to [https://nmap.org/download.html](https://nmap.org/download.html).

Installing OpenVAS can be a painful process. For the easiest way, I recommend using Docker.

```
docker run -d -p 443:443 -p 9390:9390 --name openvas mikesplain/openvas
```

For more details refer to: [https://hub.docker.com/r/mikesplain/openvas/](https://hub.docker.com/r/mikesplain/openvas/)

### 5. Superuser + Migrations

Create a file named as `config.json`. and find out the network information of your computer and add them follow the format below.
```
{
    "host_ip": "192.168.1.10",
    "allowed_hosts":["u'localhost'", "10.32.30.250","192.168.10", "127.0.0.1"],
    "gateway": "192.168.1.1",
    "network_interface": "en0"
}
```

Now, we need to migrate some databases for Django.

```
python manage.py makemigrations cluster && python manage.py migrate
```

Then create a user for Safelite.

```
python manage.py createsuperuser
```

### 7. Run the Safelite Server

On Linux/Mac
```
sudo python manage.py runserver 
```

On Windows:
```
python manage.py runserver 
```
But make sure the terminal has admin privileges.

Now you can access the Web UI. Usually at [http://localhost:8000](http://localhost:8000)

### 6. Connect OpenVAS to Safelite

Lastly, you will need to connect OpenVAS to Safelite to use any vulnerability scanning features.

To do this:

 * Access the admin page at [http://localhost:8000/admin](http://localhost:8000/admin)
 * Add a Cell to the cluster
 * Set scanning options to:
    - Name: Anything you want
    - Username: `admin`
    - Password: `admin`
    - IP address: `localhost`
    - Port: `9390`
    - Discovery: `Full and Very Fast`.










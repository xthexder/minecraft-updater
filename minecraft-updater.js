var http = require('http')
  , querystring = require('querystring')
  , fs = require('fs');

// Config
var configFile = {};
if (fs.existsSync(__dirname + '/config.json')) {
  configFile = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
}

var config = require('hashish').merge(process.env, configFile);

var post_data = querystring.stringify({
  'username' : config['mine-user'],
  'password': config['mine-pass'],
  'redirect': '/demo',
  'remember': 'true'
});

var login_options = {
  host: 'minecraft.net',
  port: '80',
  path: '/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': post_data.length
  }
};

var demo_options = {
  host: 'minecraft.net',
  port: '80',
  path: '/demo',
  method: 'GET',
  headers: {
    'Cookie': ''
  }
};

var flush_options = {
  host: 'myc.xthexder.info',
  port: '80',
  path: '',
  method: 'GET',
};

var version = "0";

update();

setInterval(update, 600000); // Every 10 minutes

function update(state) {
  if (state == 1) {
    console.log("Logging in");

    var post_req = http.request(login_options, function(res) {
        if (res.statusCode == 302 && res.headers['location'].indexOf('/demo') >= 0) {
          var cookie = "";
          var tmp = res.headers['set-cookie'];
          var space = false;
          for (var i = 0; i < tmp.length; i++) {
            cookie += tmp[i] + ";";
          }
          demo_options.headers['Cookie'] = cookie;
          update(2);
        } else {
          console.log('Failed: ' + res.headers['location']);
        }
    });

    post_req.write(post_data);
    post_req.end();
  } else {
    http.request(demo_options, function(res) {
      res.setEncoding('utf8');
      var str = '';
      res.on('data', function(chunk) {
        str += chunk;
      });
      res.on('end', function() {
        var index = str.indexOf('latestVersion" value="');
        if (index < 0) {
          if (state != 2) update(1);
        } else {
          var nversion = str.substr(index + 22, str.indexOf('"', index + 22) - index - 22);
          if (version != nversion) {
            version = nversion;
            console.log('Update: ' + nversion);
            sendUpdate();
          }
        }
      });
    }).end();
  }
}

function sendUpdate() {
  flush_options.path = '/mcupdate/dfjgklj54yn2094305gn039g4j3g09?' + version;
  http.request(flush_options, function(res) {
    res.setEncoding('utf8');
    var str2 = '';
    res.on('data', function(chunk) {
      str2 += chunk;
    });
    res.on('end', function() {
      if (str2 != version) {
        console.log("Failed to send update: " + str2);
        setTimeout(sendUpdate, 60000); // Try again in 1 minute
      } else console.log("Update sent");
    });
  }).end();
}
var https = require('https')
  , http = require('http')
  , querystring = require('querystring')
  , fs = require('fs');

// Config
var configFile = {};
if (fs.existsSync(__dirname + '/config.json')) {
  configFile = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
}

var config = require('hashish').merge(process.env, configFile);

var api_key = config['api-key'];

var post_data = querystring.stringify({
  'username': config['mine-user'],
  'password': config['mine-pass'],
  'redirect': 'https://minecraft.net/demo',
  'remember': 'false'
});

var post2_data = {
  'authenticityToken': '',
  'questionId': '',
  'answer': config['mine-answer']
};

var login_options = {
  host: 'minecraft.net',
  port: '443',
  path: '/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(post_data)
  }
};

var challenge_post_options = {
  host: 'minecraft.net',
  port: '443',
  path: '/challenge',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': '',
    'Cookie': ''
  }
};

var challenge_options = {
  host: 'minecraft.net',
  port: '443',
  path: '/challenge',
  method: 'GET',
  headers: {
    'Cookie': ''
  }
};

var demo_options = {
  host: 'minecraft.net',
  port: '443',
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

updateVersion();

setInterval(updateVersion, 600000); // Every 10 minutes

function doQuestion() {
  console.log("[Updater] Answering challenge question");
  challenge_options.headers['Cookie'] = demo_options.headers['Cookie'];
  https.request(challenge_options, function(res) {
    var tmp = res.headers['set-cookie'];
    for (var i = 0; i < tmp.length; i++) {
      if (tmp[i].indexOf('PLAY_SESSION') == 0) {
        challenge_post_options.headers['Cookie'] = demo_options.headers['Cookie'] = tmp[i] + ";";
        break;
      }
    }
    res.setEncoding('utf8');
    var str = '';
    res.on('data', function(chunk) {
      str += chunk;
    });
    res.on('end', function() {
      var index = str.indexOf('authenticityToken" value="');
      var index2 = str.indexOf('questionId" value="');
      var authenticityToken = str.substr(index + 26, str.indexOf('"', index + 26) - index - 26);
      var questionId = str.substr(index2 + 19, str.indexOf('"', index2 + 19) - index2 - 19);
      post2_data['authenticityToken'] = authenticityToken;
      post2_data['questionId'] = questionId;
      var data = querystring.stringify(post2_data);
      challenge_post_options.headers['Content-Length'] = Buffer.byteLength(data);

      var post_req = https.request(challenge_post_options, function(res) {
        res.setEncoding('utf8');
        var str = '';
        res.on('data', function(chunk) {
          str += chunk;
        });
        res.on('end', function() {
          if (str.indexOf('passed') >= 0) {
            updateVersion();
          } else {
            console.log("[Updater] Failed to answer security question: " + str);
          }
        });
      });

      post_req.write(data);
      post_req.end();
    });
  }).end();
}

function updateVersion(state) {
  if (state == 1) {
    console.log("[Updater] Logging in: " + config['mine-user']);

    var post_req = https.request(login_options, function(res) {
        if (res.statusCode == 302 && res.headers['location'].indexOf('/demo') >= 0) {
          var tmp = res.headers['set-cookie'];
          for (var i = 0; i < tmp.length; i++) {
            if (tmp[i].indexOf('PLAY_SESSION') == 0) {
              demo_options.headers['Cookie'] = tmp[i] + ";";
              break;
            }
          }
          updateVersion(2);
        } else {
          console.log('[Updater] Failed: ' + res.headers['location']);
        }
    });

    post_req.write(post_data);
    post_req.end();
  } else {
    https.request(demo_options, function(res) {
      if (res.statusCode == 302 && res.headers['location'].indexOf('/challenge') >= 0) {
        doQuestion();
        return;
      }
      res.setEncoding('utf8');
      var str = '';
      res.on('data', function(chunk) {
        str += chunk;
      });
      res.on('end', function() {
        var index = str.indexOf('latestVersion" value="');
        if (index < 0) {
          if (state != 2) updateVersion(1);
        } else {
          var nversion = str.substr(index + 22, str.indexOf('"', index + 22) - index - 22);
          if (version != nversion) {
            version = nversion;
            console.log('[Updater] Update: ' + nversion);
            sendUpdate();
          }
        }
      });
    }).end();
  }
}

function sendUpdate() {
  flush_options.path = '/mcupdate/' + api_key + '?' + version;
  http.request(flush_options, function(res) {
    res.setEncoding('utf8');
    var str = '';
    res.on('data', function(chunk) {
      str += chunk;
    });
    res.on('end', function() {
      if (str != version) {
        console.log("Failed to send update: " + str);
        setTimeout(sendUpdate, 60000); // Try again in 1 minute
      } else console.log("Update sent");
    });
  }).end();
}
